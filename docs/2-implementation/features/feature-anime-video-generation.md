# FEAT-anime-video-generation — 动漫视频生成功能方案与评估

Related: FEAT-anime-video-generation

## 背景与目标

- 背景：AnividAI 以 OC（原创角色）为核心，现已具备动漫生图（image）等能力，需补齐“AI 动漫视频生成（text2video）”并统一到现有生成框架（Model → Service → API）与页面级 i18n、Credits 计费、回调/轮询等机制。
- 目标：
  - 用户可在 `AI Anime Video Generator` 页面发起视频生成任务，支持 Prompt、模型、时长、比例、分辨率、运镜、参考图/角色等参数；
  - 后端统一使用生成服务创建任务、扣费、回调入库、状态查询与失败退款；
  - 前端使用统一轮询钩子与页面级 i18n 展示生成进度、结果与示例；
  - 产物可长期可用（落盘/R2 与封面图/海报可选）。

参考（PRD段落，待锚点补充）：docs/1-specs/PRD.md

## 验收标准（初版）

- 发起任务：登录用户可成功创建视频任务，返回 `generation_uuid`；
- 计费与风控：创建任务时按模型配置正确扣减 Credits，失败自动退款；
- 回调/轮询：
  - Webhook 成功落库视频地址并把生成记录置为 `completed`；
  - 轮询接口在 5 分钟内拿到 `completed` 或 `failed`，超时触发失败处理与退款（幂等）；
- 参数支持：支持 Prompt、`model_id`、`aspect_ratio`、`duration`、`resolution`、`motion`、`style_preset`、参考图/角色；
- 前端体验：
  - 未登录侧：展示示例视频瀑布流，点击示例可一键带参；
  - 已登录侧：完整参数面板、生成按钮与状态提示，结果可播放/下载；
- i18n：仅使用页面级翻译 `src/i18n/pages/ai-anime-video-generator/en.json`，无硬编码文案；
- 水印策略：免费用户生成的视频在交付前完成水印处理，付费用户不加水印；
- 数据：生成主表与视频明细表规范入库，具备可追溯性。

## 系统级流程（文字）

1. 前端页面（VideoGenerator）

- 组装参数并调用 `POST /api/anime-video/create-task` 创建任务；
- 启动 `useGenerationPolling` 轮询 `/api/generation/status/{uuid}`；
  video 智能轮询优化实现：`docs/3-operations/changelog/changelog-video-polling-optimization.md`

2. API 入参校验与任务创建

- `src/app/api/anime-video/create-task/route.ts`
  - 认证（获取用户 UUID）；
  - Zod 校验 `VideoParamsSchema`；
  - 若带 `character_uuid` 自动解析为 `reference_image_url`；
  - 调用 `videoGenerationService.createGeneration()`；

3. Service 侧

- `src/services/generation/video/video-generation-service.ts`
  - 从配置取模型、校验 Credits、构建 Prompt（`VideoPromptBuilder`）；
  - 通过 `KieAIProvider` 发起任务并写入 `generations` 主表；
  - 扣减 Credits；

4. Webhook 回调

- `src/app/api/generation/webhook/route.ts`
  - 解析 KieAI（或映射）回调负载，提取结果 URL/状态；
  - 交由 `services/generation` 工厂 `handleWebhookCallback` 路由到视频服务；
  - 视频服务执行免费用户水印处理、入库 `generation_videos`、更新状态并必要时退款；

5. 状态查询与失败兜底

- `GET /api/generation/status/{generation_uuid}` 读取状态与结果；
- `POST /api/generation/handle-failure` 轮询失败/超时兜底（避免双花，幂等）。

## 实现现状与关键文件

- 前端页面与组件
  - 页面：`src/app/[locale]/(default)/ai-anime-video-generator/page.tsx`
  - 生成器：`src/components/video/VideoGenerator.tsx`
  - 示例瀑布流：`src/components/video/VideoExamplesWaterfall.tsx`
  - 播放卡片：`src/components/video/VideoPlayerCard.tsx`
  - 轮询：`src/hooks/useGenerationPolling.ts`
  - 页面级 i18n：`src/i18n/pages/ai-anime-video-generator/en.json`

- 配置
  - 模型：`src/configs/models/ai-models.json`（含 Wan2.5 与 Kling-Video）
  - 页面用参数：`src/lib/configs/index.ts`（getVideoModels/getCameraMotions/getVideoExamples）
  - 示例视频：`src/configs/gallery/video-example-gallery.json`
  - gen_type 展示白名单：`src/configs/gen-type-display.ts`

- 后端 API/Service
  - 创建任务：`src/app/api/anime-video/create-task/route.ts`
  - 状态查询：`src/app/api/generation/status/[generation_uuid]/route.ts`
  - 失败兜底：`src/app/api/generation/handle-failure/route.ts`
  - Webhook：`src/app/api/generation/webhook/route.ts`
  - 视频服务：`src/services/generation/video/video-generation-service.ts`
  - 统一路由工厂：`src/services/generation/factory/generation-service-factory.ts`
  - KieAI Provider 与适配器（Wan/GPT4o/Nano）：`src/services/generation/providers/*`
  - 水印服务：`src/services/generation/video/video-watermark-service.ts`（Cloudinary overlay 触发器）

- 数据模型
  - 主表/公用：`src/db/schema.ts`（`generations`）
  - 视频表：`src/db/schema.ts`（`generation_videos`）
  - 读写：`src/models/generation-video.ts`

## 状态字段（status）

- 目的：为后续特殊展示提供依据（与 generation 任务状态区分）。
- 适用表：`generation_videos`（视频）、`generation_images`（图片）
- 默认值：`archived`
- 写入规则：创建明细记录时写入默认值，回调仅更新 generation 状态与结果，不改动 `status`。

## gen_type 记录与展示策略

- 生成侧不对 gen_type 做白名单过滤，按请求原样记录。
- 展示侧由场景白名单控制可见性，避免新增 gen_type 时改动多处逻辑。

## 与既有"AI Anime Generator（生图）"机制对比

- 统一性（正向）：
  - 前端轮询复用 `useGenerationPolling`；
  - 页面级 i18n 规范一致；
  - 认证、状态查询、Webhook 总线和 Credits 基本逻辑一致；

- 架构隔离（当前方案）：
  - 视频生成使用独立的 `VideoAIProvider` 和模型特定的 `VideoAdapter`，完全不影响现有图片生成；
  - 失败兜底路径已修复：`/api/generation/handle-failure` 通过 `GenerationServiceFactory` 按类型路由；
  - 参数透传已完善：所有视频参数正确传递到各模型 Adapter；
  - Schema 对齐已完成：`VideoParamsSchema` 支持 `480p/580p/720p/1080p` 与模型配置一致；
  - 计费策略简化：直接在各 Adapter 中实现模型特定的计费逻辑；

## 完成度评估（2025-10-21 更新）

- ✅ 已完成（M1 架构一致性与稳定性）：
  - 页面与组件齐全，示例瀑布流与一键带参；
  - 创建任务 API 与 Zod 校验、用户鉴权；
  - Credits 扣减、Webhook 入库、状态查询、前端轮询与超时兜底；
  - 数据表 `generation_videos` 与读写模型；
  - **失败处理统一**：通过 `GenerationServiceFactory` 路由，使用正确的 `VideoGenerationRefund` 类型；
  - **参数处理完善**：支持 `task_subtype`、`duration_seconds`、`fps` 等新字段；
  - **计费逻辑优化**：每个 Adapter 实现自己的计费算法（Wan2.5、Kling）；
  - **模型差异处理**：独立的 `VideoAIProvider` 处理不同模型的参数转换；

- ⏳ 进行中/待优化：
  - **Kling 模型**：已实现 `KlingVideoAdapter`，支持基本功能；
  - **Quote 接口**：已实现 `/api/anime-video/quote` 提供费用预估；
  - 媒资落盘：视频结果未落 R2，`poster_url` 为空（优先级较低）；
  - 多质量源：UI 多质量切换，结果源未带 `quality`（优先级较低）；

## 当前架构总览（2025-10-22）

### 独立的视频参数系统

- `VideoGenerationParams`：统一的前端参数接口，支持 `character_uuid` 和 `character_image_url`
- `VideoBaseAdapter`：视频模型基础适配器，包含 `calculateCredits()` 方法
- `VideoAIProvider`：独立的视频 Provider，不影响图片生成
- `ModelImageParams`：模型图片参数配置接口，定义图片支持策略

### 图片参数处理策略（2025-10-22 新增）

#### 单图模型（Wan 2.2, Kling v2.5, Runway）

- **配置**: `image_params.supports_oc_and_reference = false`
- **UI行为**: 选择OC后，参考图上传自动禁用并显示Tooltip提示
- **参数优先级**: `character_image_url` > `reference_image_url`
- **API字段**:
  - Wan/Kling: `image_url`
  - Runway: `imageUrl` (注意大小写)

#### 多图模型（Sora2 - 待实现）

- **配置**: `image_params.supports_oc_and_reference = true`
- **UI行为**: 可同时选择OC和上传参考图
- **参数顺序**: `[reference_image, oc_image]` (参考图在前)
- **API字段**: `image_urls` (数组)

#### 实现细节

- 前端通过 `selectedModel.config.image_params.supports_oc_and_reference` 判断是否禁用参考图
- API层将 `character_uuid` 解析为 `character_image_url`
- Adapter层根据图片参数自动选择 text2video 或 image2video 模型

### 模型特定适配器

- `WanVideoAdapter`：处理 Wan2.5 模型
  - 参数转换：`quality` → `resolution`，自动选择 text/image 模型
  - 图片处理：优先使用 `character_image_url`，否则使用 `reference_image_url`
  - 计费逻辑：按分辨率和时长计算（480p=40mc, 720p=80mc等）
- `KlingVideoAdapter`：处理 Kling v2.5 模型
  - 参数转换：时长映射到 Kling 格式（5s, 10s）
  - 图片处理：优先使用 `character_image_url`，否则使用 `reference_image_url`
  - 计费逻辑：按时长计算（5s=210MC, 10s=420MC）
  - 已扩展 Kling 3.0：`model=kling-3.0/video`，参数包含 `prompt`、`duration(3-15)`、`mode(std/pro)`、`multi_shots`、`multi_prompt`、`sound`、`kling_elements`、(`aspect_ratio` 或 `image_urls`)
  - Kling 3.0 约束：`image_urls` 最多 2 张；`multi_shots=true` 时必须且仅能传 1 张首帧图，并且必须传 `multi_prompt`；非 multi-shot 模式首帧/尾帧均可选（可不传图）；`multi_prompt` 单段 3-12s，累计不超过 15s；非 multi-shot 时长 3-15s
  - Kling 3.0 计费（按 `mode + sound + duration`，每秒计费）：
    - Standard（`mode=std`）：`sound=false` 为 `60MC/s`（`$0.06/s`），`sound=true` 为 `90MC/s`（`$0.09/s`）
    - Pro（`mode=pro`）：`sound=false` 为 `85MC/s`（`$0.085/s`），`sound=true` 为 `120MC/s`（`$0.12/s`）
    - 总费用公式：`total_mc = rate_per_second_mc * duration_seconds`

### Kling 3.0 交互更新（2026-02-11）

- 视频侧面板移除“模式下拉”，默认首尾帧模式；
- 不展示 OC 选择器与旧的通用参考图区；
- 固定展示两个 `ReferenceImageUpload`：首帧、尾帧，并提供虚线占位提示；
- 若模型支持 multi-shot（当前仅 Kling 3.0），展示 `multi-shot` 开关：
  - 关闭：首尾帧模式，首帧/尾帧均可选，可不上传图片；
  - 开启：进入 multi-shot，必须上传首帧图，尾帧上传禁用；
  - 开启后展示 `prompt + duration` 分段卡片，支持新增与删除；
  - 模板作用域：`multi-shot` 开启时，模板逐段作用于 `multi_prompt[].prompt`；关闭时模板作用于外层 `prompt`。
- 后端参数：
  - `video_mode`: `start_end_frame | multi_shot`
  - `multi_shots`: 与开关同步
  - `multi_prompt`: 分段脚本（总时长 <= 15s）
  - `prompt`：仅 `multi_shots=false` 使用；`multi_shots=true` 不作为模板承载字段
- `duration` 规则：
  - 在 `Video Parameters` 区域移除 Kling 3.0 的 `duration` 参数；
  - `multi-shot` 关闭时，直接使用卡片 1（`prompt`）的 `duration`；
  - `multi-shot` 开启时，使用各卡片分段 `duration` 并累加校验总时长。
- `RunwayVideoAdapter`：处理 Runway 模型（新增）
  - 参数转换：使用 `imageUrl` 字段（注意大小写）
  - 图片处理：优先使用 `character_image_url`，否则使用 `reference_image_url`
  - 计费逻辑：按时长和质量计算（720p 5s=12mc, 1080p 5s=30mc）

### 服务层重构

- `VideoGenerationService` 使用 `VideoAIProvider` 进行模型路由
- 参数转换：前端统一参数 → 模型特定参数
- 动态计费：调用 Adapter 的 `calculateCredits()` 方法

## 已实现的接口

- ✅ `POST /api/anime-video/create-task`：创建视频生成任务
- ✅ `POST /api/anime-video/quote`：费用预估（新增）
- ✅ `GET /api/generation/status/[uuid]`：状态查询（复用）
- ✅ `POST /api/generation/webhook`：回调处理（复用）
- ✅ `POST /api/generation/handle-failure`：失败兜底（已修复）

## 后续计划与里程碑

M2（Provider 扩展，已部分完成）

- ✅ 新增 `KlingVideoAdapter` 支持 Kling 模型；
- ✅ 模型选择时自动路由到正确适配器；
- ⏳ 新增其他模型适配器（Runway、Veo3.1、Sora2）；

M3（媒资管控与体验优化）

- 媒资：
  - 将视频结果拉取并落 R2（大文件直链转存），生成首帧海报，填充 `poster_url`；
  - 为生成结果生成基于用户的持久路径，保障长期可访问；

## 免费视频水印处理（更新）

- 处理时机：Webhook 成功回调后、结果入库前。
- 判断依据：以生成时的会员等级为准，`free` 必须加水印。
- 实现方式：完全移除自部署 Python 服务，改为直接调用 Cloudinary 官方 Video Transform API，步骤如下：
  1. `video-watermark-service.ts` 根据传入的 `videoUrl` 先调用 `POST https://api.cloudinary.com/v1_1/<cloud_name>/video/upload`，通过 `file=<videoUrl>` 触发远程抓取上传。
  2. 构造派生视频的 transformation。根据官方文档，使用远程 LOGO (https://artworks.anividai.com/assets/logo.webp) 需先对其进行 base64 编码作为 layer 标识。
  3. 最终 URL 格式（需带签名以支持 `l_fetch`）：`https://res.cloudinary.com/<cloud_name>/video/upload/s--<sig>--/l_fetch:<BASE64_LOGO_URL>,g_south_east,x_10,y_10,w_0.15,fl_relative,o_70/fl_layer_apply/<public_id>.mp4`（注：为简化签名校验，此处移除了版本号 `v<version>` 路径段）。
  4. 水印参数（对应 FFmpeg 的 `overlay=W-w-10:H-h-10`）：
     - `g_south_east`: 右下角对齐。
     - `x_10,y_10`: 10px 边距偏移。
     - `w_0.15`: LOGO 宽度占视频比例（15%）。
     - `fl_relative`: 宽度相对视频容器计算。
     - `o_70`: 70% 不透明度。
     - `fl_layer_apply`: 视频叠加层必需标识。
- 环境变量：
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - `VIDEO_WATERMARK_LOGO_URL`: 默认为 `https://artworks.anividai.com/assets/logo.webp`

## 变更历史

- 2026-01-16 FEAT-anime-video-generation 补充图片/视频状态字段与默认值（影响：数据模型）
- 多质量：
  - 若提供方支持多清晰度输出，存储并在前端注入 `quality` 选项；
- 观感：
  - 生成完成通知/进度提示更细化；

M4（文档与测试）

- API 契约：新增/更新 `docs/2-implementation/api/video-generation.md`（签名、请求/响应、错误码）；
- 数据模型：更新 `docs/1-specs/data-models.md`，补充 `generation_videos` 字段与约束；
- 前端/后端文档：
  - 前端：`docs/2-implementation/frontend/page-ai-video-generator.md`，结构/状态/交互与字段映射；
  - 后端：`docs/2-implementation/backend/service-anime-video-generation.md`，责任边界/数据流/幂等/重试；
- 测试：
  - 用例：`tests/test-cases/FEAT-anime-video-generation-*.md`（主路径/错误/回归至少三类）；
  - 执行结果记录至 `tests/test-reports/`；

## 影响清单（已更新）

- API（已新增/更新）：
  - ✅ `src/app/api/anime-video/quote/route.ts`（新增Quote接口）
  - ✅ `src/app/api/generation/handle-failure/route.ts`（修复路由逻辑）
- 数据模型：
  - ✅ `src/types/video-provider.ts`（新增视频参数类型）
  - ⏳ docs/1-specs/data-models.md（待更新`generation_videos`字段说明）
- 前端：
  - ⏳ docs/2-implementation/frontend/page-ai-video-generator.md（待更新）
- 后端：
  - ✅ docs/2-implementation/backend/service-anime-video-generation.md（已存在）
- 新增文件：
  - ✅ `src/services/generation/providers/video-ai-provider.ts`
  - ✅ `src/services/generation/providers/wan-video-adapter.ts`
  - ✅ `src/services/generation/providers/kling-video-adapter.ts`

## 风险与依赖

- 外部依赖：KieAI/Kling 提供方可用性、限流与回调格式差异；
- 环境变量：`KIE_AI_API_KEY`、`NEXT_PUBLIC_WEBHOOK_URL` 必需；如接入 Kling，还需其 Access/Secret；
- 大文件传输：视频转存与带宽/时延影响，需要异步化与任务化处理；
- 幂等：Webhook 与轮询失败兜底需严格保证一次性退款与状态置位。

## 变更历史

- 2026-02-13 FEAT-anime-video-generation 调整 Kling 3.0 图参约束：multi-shot 必须首帧，非 multi-shot 可无图
- 2026-02-13 FEAT-anime-video-generation 修正 Kling 3.0 multi-shot 模板作用域到 `multi_prompt[].prompt`
- 2026-02-13 FEAT-anime-video-generation 对齐 Kling 3.0 新按秒计费（统一 MC 口径：60/90/85/120 MC/s）
- 2026-02-12 FEAT-anime-video-generation 对齐 Kling 3.0 新按秒计费（统一 MC 口径：100/150/135/200 MC/s）
- 2026-02-11 FEAT-anime-video-generation Kling 3.0 默认首尾帧 + multi-shot 开关交互
- 2025-10-22 新增图片参数处理策略：支持单图/多图模型差异化处理，实现OC优先逻辑，新增Runway模型适配器
- 2025-10-21 FEAT-anime-video-generation 初稿：现状梳理/对比评估/后续计划
