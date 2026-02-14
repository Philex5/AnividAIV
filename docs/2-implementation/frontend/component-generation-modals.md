**Related**: `docs/2-implementation/features/feature-generator-modals.md`

通用生成弹窗用于在任意页面嵌入图片/视频生成流程，采用轮询 + Webhook 的统一状态机制，优先走“模板 + 参数”的最简调用方式，不做预设与默认值兜底。

## 组件位置

- 图片弹窗：`src/components/generation/ImageGenerationModal.tsx`
- 视频弹窗：`src/components/generation/VideoGenerationModal.tsx`
- 生成中弹窗：`src/components/generation/GenerationStatusModal.tsx`
- 类型定义：`src/components/generation/generation-modal-types.ts`

## 设计要点

- 两个独立组件，不通过同一组件切换类型
- 文案通过 `copy` 传入，避免组件内硬编码
- 组件不做场景预设，所有参数由调用方传入
- prompt 通过模板自动构建，组件只负责替换变量与校验
- UI 使用 `glass-panel` 与主题色叠加的磨砂玻璃风格

## 参数结构（概览）

- `open`/`onOpenChange`: 控制弹窗显隐
- `genType`：生成任务类型（与模板文件名一一对应）
- `templateParams`：模板变量的 key-value 对（如 `locale`、`name`、`scene`）
- `generationParams`：生成请求的完整参数（如 `model_uuid`、`resolution`、`quantity`、`reference_image_urls`）
- `copy`：来自页面级 i18n 的文案包

## 模板来源

- 模板统一放在 `src/configs/prompts/` 下的场景目录中
- 模板文件名与 `genType` 对齐，例如：`src/configs/prompts/ocs/oc_events.json`
- 模板可包含 `prompt` 或 `llm_build`，变量由调用方提供

## LLM 提取层

- 通过 `useExtractPrompt=true` 启用
- 读取同一模板 JSON 内的 `llm_build` 与 `output_rules`
- 调用统一 API：`POST /api/anime-generation/build-extract-prompt`
- `required_fields` 缺失必须抛错并阻断生成
- LLM 输出为空或被清理后为空必须抛错

## 交互流程

1. 调用方传入 `genType` 与 `templateParams`
2. 组件使用模板替换变量并校验必填字段
3. 启用 LLM 提取层时调用 `/api/anime-generation/build-extract-prompt`
4. 提交创建任务（图片：`/api/anime-generation/create-task`，视频：`/api/anime-video/create-task`）
5. 前端轮询 `/api/generation/status/[uuid]`
6. Webhook 更新服务端状态，轮询端拿到结果
7. 弹窗展示结果并触发回调

## 关键约束

- 缺少模板或变量时必须抛错，不做兜底
- 组件不提供默认 model/resolution 等预设
- 结果展示使用服务端返回 URL，不在前端拼接
- LLM 提取层缺少 `llm_build` 配置时必须抛错

## Major Event 示例（oc_events）

场景：OC 详情页「Background」tab 的 Major Event 生成事件配图。

- `genType`: `oc_events`
- 模板：`src/configs/prompts/ocs/oc_events.json`
- `templateParams`（由调用方提供）：
  - `locale`：`en`
  - `eventTitle`：事件标题
  - `eventContent`：事件内容
  - `characterName`：角色名
- `generationParams`（由调用方提供）：
  - `model_uuid`: `google/nano-banana`
  - `resolution`: 按 nano banana 配置传入
  - `quantity`: 1~4
  - `reference_image_urls`: 可选，角色立绘 URL 列表

## 角色立绘示例（character）

场景：OC 详情页「Visuals」右侧立绘生成。

- `genType`: `character`
- 模板：`src/configs/prompts/character-generation.json`（前端使用 `buildPromptFromModules` 生成 prompt）
- `generationParams`（由调用方提供）：
  - `model_uuid`: `google/nano-banana`
  - `aspect_ratio`: `3:4`
  - `image_resolution`: `3:4`
  - `batch_size`: 1
  - `character_uuids`: 当前角色 UUID
  - `reference_image_urls`: 可选（设计稿/立绘参考）

## World cover 示例（world_cover）

场景：World 创建/编辑页封面图生成，走无弹窗模式。

- `genType`: `world_cover`
- 模板：`src/configs/prompts/world-cover.json`
- `useExtractPrompt`: `true`
- `templateParams`（由调用方提供）：
  - `world_name`：必填
  - `world_genre` / `world_description` / `world_tags` / `world_species`
  - `world_climate` / `world_regions` / `world_tech_magic` / `world_theme_colors`
  - `world_factions` / `world_history` / `world_extra`
  - `scene_hint`：可空
- `generationParams`（由调用方提供）：
  - `model_uuid`: 使用场景配置
  - `aspect_ratio`: 统一约束
  - `image_resolution`: 与模型配置一致
  - `batch_size`: 1

## 影响范围

- 相关 Feature：`docs/2-implementation/features/feature-generator-modals.md`
- 复用组件：`src/components/ui/*`、`src/app/theme.css`
