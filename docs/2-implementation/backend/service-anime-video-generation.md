**Related**:
- 总体架构：`docs/2-implementation/backend/service-generation-architecture.md`
- API 契约（视频）：`docs/2-implementation/api/anime-video.md`
- API 契约（统一能力）：`docs/2-implementation/api/generation.md`
- Feature（历史背景）：`docs/2-implementation/features/feature-anime-video-generation.md`

# 服务：Anime Video Generation（视频生成服务）

## 责任边界

- 处理视频生成任务的创建、计费、状态维护、webhook 回调入库、失败退款与“webhook 晚到”恢复。
- 保持视频参数与图片参数隔离（视频使用独立 provider/adapter 体系），但接入统一的 `status/webhook/handle-failure` 通道。

## 关键实现落点（以文件为准）

- 服务主类：`src/services/generation/video/video-generation-service.ts`
- 参数校验：`src/services/generation/video/video-types.ts`（`VideoParamsSchema`）
- Prompt 构建：`src/services/generation/video/video-prompt-builder.ts`
- Provider 路由：`src/services/generation/providers/video-ai-provider.ts`
- 模型适配器（示例）：
  - `src/services/generation/providers/wan-video-adapter.ts`
  - `src/services/generation/providers/kling-video-adapter.ts`
  - `src/services/generation/providers/sora2-video-adapter.ts`
  - `src/services/generation/providers/sora2-pro-video-adapter.ts`
- 延迟转存与首帧：`src/services/generation/file-transfer-service.ts`、`src/services/generation/video-processor.ts`

## 数据落库与约束

- `generations`：
  - `type="video"`，`sub_type` 作为视频子场景标识（如 `anime_video`）
  - `metadata.video` 保存视频参数快照（便于复用/排障）
  - `metadata.webhook_token` 用于 webhook 鉴权（见总体架构文档）
- `generation_videos`：
  - 保存 `video_url/poster_url/quality` 等
  - 唯一约束：`(generation_uuid, quality)`（避免同清晰度重复插入）
  - `status` 默认 `archived`（用于后续展示分层）

## 核心流程（不展开代码）

### 1) 创建任务

- 解析与校验请求 → 生成 `generation_uuid` → 写入 `generations(status=pending, metadata.webhook_token, metadata.video...)`
- 调用 `VideoAIProvider.createVideoTask()` 创建远程任务（callbackUrl 包含 `?token=...`）
- 事务内完成：
  - `decreaseCredits(..., generation_uuid, tx)`
  - 更新 `generations(remote_task_id/status=processing)`

### 2) Webhook 回调

- 入口统一：`POST /api/generation/webhook`
- 安全校验与 `resultUrls` allowlist 在入口完成（见 `docs/2-implementation/backend/service-generation-architecture.md`）
- 工厂按 `taskId` 反查 generation 并路由到 `VideoGenerationService.handleWebhookCallback()`
- 成功：写入 `generation_videos`（临时URL），更新 `generations.status=completed`，并在需要时 `restoreCredits()`（处理轮询兜底先退款的竞态）
- 失败：更新 `generations.status=failed`，调用 `refundCredits()`（软删除扣款记录）

### 3) 轮询失败兜底

- 入口统一：`POST /api/generation/handle-failure`
- 服务端鉴权后路由到 `VideoGenerationService.safeHandlePollingFailure()`
- 幂等策略：已终态直接跳过；标记失败后允许后续 success webhook 覆盖并恢复积分

## 安全与一致性要点

- webhook 伪造防护：使用 `metadata.webhook_token` 做 token 鉴权（在统一 webhook 路由校验）
- 结果注入防护：`resultUrls` 仅允许 `https` 且域名在 allowlist/`*.kie.ai`
- 原子性：扣费与 `remote_task_id/status` 更新同事务，避免不一致
- 幂等：视频通过唯一约束与状态判断避免重复入库；成功允许覆盖失败（处理 webhook 晚到）

## 变更历史

- 2026-01-15 FIX-generation-security：接入 webhook token 鉴权与 URL allowlist；创建任务扣费与状态更新事务化；对齐 success 覆盖 failed 的竞态策略
