# 统一生成架构（图片 + 视频）

Related:
- 图片服务：`docs/2-implementation/backend/service-anime-generation.md`
- 视频服务：`docs/2-implementation/backend/service-anime-video-generation.md`
- 统一 API 契约：`docs/2-implementation/api/generation.md`
- 图片 API 契约：`docs/2-implementation/api/anime-generation.md`
- 视频 API 契约：`docs/2-implementation/api/anime-video.md`
- Provider 契约（KIE）：`docs/1-specs/model_apis/kie_api_specs.md`

## 目标与边界

- 目标：用“工厂 + 基类复用”的方式统一图片生成任务的创建、状态查询、回调处理、积分一致性，并让视频生成以独立系统接入同一套 webhook/status 能力。
- 边界：本文描述“生成系统的整体结构与契约落点”，不重复展开各业务生成类型的参数细节与 UI 行为；细节在图片/视频各自文档与 API 契约中维护。

## 目录结构（以源码为准）

- 工厂与统一分发：`src/services/generation/factory/generation-service-factory.ts`
- 图片基类与通用逻辑：`src/services/generation/base/base-generation-service.ts`
- 图片具体服务：
  - Anime：`src/services/generation/anime/anime-generation-service.ts`
  - Character：`src/services/generation/character/character-generation-service.ts`
  - Avatar：`src/services/generation/avatar/avatar-generation-service.ts`
  - Background：`src/services/generation/background/background-generation-service.ts`
- 视频服务（独立系统）：`src/services/generation/video/video-generation-service.ts`
- Prompt Builder 调度器：`src/services/generation/prompt-builders/prompt-builder-dispatcher.ts`
- Webhook 安全工具：`src/services/generation/webhook/webhook-security.ts`
- 延迟转存与后处理：
  - 转存服务：`src/services/generation/file-transfer-service.ts`
  - 图片后处理：`src/services/generation/image-processor.ts`
  - 视频后处理：`src/services/generation/video-processor.ts`
  - 定时任务：`src/services/generation/cron/file-transfer-cron.ts`

## 数据模型（关键字段）

（表结构详见 `src/db/schema.ts` 与 `docs/1-specs/data-models.md`）

- `generations`
  - `uuid`：生成任务 ID（前端轮询与展示主键）
  - `type/sub_type`：类型路由（工厂使用）
  - `remote_task_id`：Provider taskId（webhook 反查主键）
  - `status`：`pending | processing | completed | failed`
  - `credits_cost`：本次任务扣费（用于展示/对账）
  - `metadata.webhook_token`：webhook 鉴权 token（本项目新增并依赖）
  - `file_transfer_status/temp_url_expires_at`：延迟转存状态
- `generation_images`
  - `generation_uuid`：归属 generation
  - `image_url`：临时或 R2 URL
  - 唯一约束：`(generation_uuid, image_url)`（用于 webhook 幂等去重）
    - Migration：`src/db/migrations/0006_unique_generation_image_url.sql`
- `generation_videos`
  - `generation_uuid`：归属 generation
  - `video_url/poster_url`：临时或 R2 URL
  - 唯一约束：`(generation_uuid, quality)`（已存在，用于幂等）

## 核心流程（统一视角）

### 1) 创建任务（图片/视频）

- 创建 generation 记录：`status=pending`，并生成 `metadata.webhook_token`
  - 图片：`src/services/generation/base/base-generation-service.ts`
  - 视频：`src/services/generation/video/video-generation-service.ts`
- 创建远程任务成功后：事务内完成“扣费 + 更新 `remote_task_id/status=processing`”
  - 图片：`src/services/generation/base/base-generation-service.ts`
  - 视频：`src/services/generation/video/video-generation-service.ts`

### 1.1) 创建任务参数校验（图片）

- `POST /api/anime-generation/create-task` 仅保留必填字段校验（`gen_type`、`model_uuid` 等）。
- 不做 prompt 长度限制与 `reference_image_urls` URL 格式限制，避免 owner 专用链路（如 breakdown sheet）因模板长度或内部 URL 形态被阻断。

### 2) 状态查询（统一）

- 入口：`GET /api/generation/status/[generation_uuid]`
  - 路由：`src/app/api/generation/status/[generation_uuid]/route.ts`
  - 内部：工厂按 `generations.type/sub_type` 分发到对应 service 的 `getGenerationStatus()`

### 3) Webhook 回调（统一入口 + 类型分发）

- 入口：`POST /api/generation/webhook`
  - 路由：`src/app/api/generation/webhook/route.ts`
  - 关键约束：
    - 必须携带 `?token=...`（见“Webhook 安全”）
    - success 回调必须携带有效 `resultUrls`
    - `resultUrls` 必须通过 allowlist 校验（见“Webhook 安全”）
- 分发：`handleWebhookCallback(taskId, state, resultUrls, failMsg)`
  - 工厂实现：`src/services/generation/factory/generation-service-factory.ts`

### 4) 轮询失败兜底（统一入口）

- 入口：`POST /api/generation/handle-failure`
  - 路由：`src/app/api/generation/handle-failure/route.ts`
  - 鉴权：内部 secret 或登录态 + owner 校验（见“失败兜底鉴权”）
  - 分发：按 generation 类型路由到对应 service 的 `safeHandlePollingFailure()`

## 状态与幂等策略（解决“卡死/重复写入/错退积分”）

### 状态归一化

- Webhook 入口将 Provider 回调状态归一化为 `success | fail`，再交给 service 处理。
- DB 中最终状态使用 `generations.status`：`pending | processing | completed | failed`。

### success 覆盖 failed（允许 webhook 晚到修正）

- 图片：`BaseGenerationService.handleWebhookCallback()` 允许 `success` 覆盖此前被轮询兜底标记的 `failed`。
- 视频：`VideoGenerationService.handleWebhookCallback()` 同策略。

### 结果幂等去重

- 图片：
  - 逻辑去重：按 `generation_uuid + image_url` 过滤已存在记录（避免重复插入）
  - DB 去重：`generation_images(generation_uuid, image_url)` 唯一索引兜底
- 视频：依赖 `generation_videos(generation_uuid, quality)` 唯一索引（同质量不重复）

## 积分一致性（扣费/退款/恢复）

- 扣费时机：远程任务创建成功后才扣费，避免“未创建 taskId 先扣费”。
- 原子性：扣费与 `remote_task_id/status` 更新同事务，避免“扣费成功但状态未更新/丢 taskId”。
- 退款机制：失败时调用软删除退款（按 `generation_uuid` 定位扣款记录并作废）
  - `src/services/credit.ts`（`refundCredits` / `restoreCredits`）
- webhook 晚到成功的恢复：若轮询兜底已作废扣款，成功 webhook 需要恢复作废记录
  - 图片：`src/services/generation/base/base-generation-service.ts`
  - 视频：`src/services/generation/video/video-generation-service.ts`
- 积分重写（Credits Override）：
  - 目的：将“计费口径”从 `type/sub_type` 解耦，允许同一 `sub_type` 以不同费用执行。
  - 入口：`metadata.credits_override` + `metadata.credits_trans_type`（在创建任务时写入）。
  - 读取位置：`src/services/generation/base/base-generation-service.ts`（`resolveCreditsCost()` / `resolveCreditsTransType()`）。
  - 约束：以 override 为最高优先级；若未提供则回退到模型默认价格。
  - OC 口径示例（配置化来源）：完整 OC 快速生成 40、单次立绘 30（详见 `docs/2-implementation/backend/service-oc-maker.md`）。

## Webhook 安全（必须）

### 1) token 鉴权（防伪造回调/结果注入）

- token 生成与写入：创建任务时写入 `generations.metadata.webhook_token`
- callbackUrl 形态：`/api/generation/webhook?token=<webhook_token>`
- 校验入口：`src/app/api/generation/webhook/route.ts` 会按 `taskId` 反查 generation 并校验 token；失败返回 `401`

### 2) resultUrls 白名单（防注入任意 URL / data: 等协议）

- 校验实现：`src/services/generation/webhook/webhook-security.ts`
- 规则：
  - 仅允许 `https`
  - 域名允许：`*.kie.ai`、`*.googleapis.com`、`*.googleusercontent.com` 或 allowlist
- allowlist 来源：
  - `NEXT_PUBLIC_STORAGE_DOMAIN` / `STORAGE_DOMAIN` 自动提取 hostname
  - `GENERATION_RESULT_URL_HOST_ALLOWLIST`（逗号分隔 hostname）

## 失败兜底鉴权（必须）

- 路由：`src/app/api/generation/handle-failure/route.ts`
- 允许两类调用：
  - 内部调用：`Authorization: Bearer $INTERNAL_API_SECRET`
  - 用户调用：需登录且 generation 归属当前用户，否则 `401/403`

## 延迟转存（临时URL → R2）

- webhook 路径只做“最小验证 + 存库 + 状态更新”，避免 provider 重试与长尾阻塞。
- 文件转存与缩略图/首帧等后处理由定时任务异步完成：
  - `src/services/generation/cron/file-transfer-cron.ts`
  - `src/services/generation/file-transfer-service.ts`

## 变更历史

- 2026-01-15 FIX-generation-security：webhook token 鉴权、resultUrls 白名单、状态归一化、success 覆盖 failed、handle-failure 鉴权、视频扣费事务化、历史查询避免 N+1、`generation_images` 增加唯一索引
- 2026-01-26 FEAT-OC-REBUILD 补充积分重写机制说明（影响：计费口径）
- 2026-01-27 FIX-OC-REBUILD 放宽 anime create-task 参数校验（影响：breakdown sheet 生成）
