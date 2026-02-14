# OC Maker 后端服务

Related: FEAT-OC-MAKER, [生图服务架构文档](./service-generation-architecture.md)

## 概述

OC Maker 后端服务负责处理原创角色的创建、管理、生成等业务逻辑，基于新一代生图服务架构实现角色立绘和头像生成功能。

> 注：本服务文档覆盖“OC Maker 业务侧的编排与落库闭环”。底层生图通用能力请以 `docs/2-implementation/backend/service-generation-architecture.md` 为准。

## 服务架构

### 核心服务结构

```
OC Maker Service
├── Character Service          // 角色 CRUD 操作
├── QuickGeneration            // 一句话快速生成 OC（文本解析 + 创建角色）
├── CharacterGeneration       // 角色立绘生成
├── AvatarGeneration         // 头像生成
└── Config Management        // 统一配置管理
```

### 核心服务

#### Character Service

- **位置**: `src/services/character.ts`
- **职责**: 角色CRUD操作
- **主要方法**:
  - `createCharacter()` - 创建角色（会员数量限制校验）
  - `getUserCharacters()` - 获取用户角色列表
  - `getFavoritedCharacters()` - 获取收藏角色
  - `updateCharacter()` - 更新角色
  - `deleteCharacter()` - 删除角色
  - `recordCharacterRemix()` - 记录角色衍生

#### CharacterGeneration Service

- **位置**: 继承自 `BaseGenerationService`
- **职责**: 角色立绘生成
- **API**: `POST /api/oc-maker/characters/generate-image`
- **处理流程**:
  1. 校验请求参数（Zod）
  2. 组装 `CharacterGenerationRequest` 并创建 generation 任务
  3. 生成结果通过 webhook 写入 `generation_images`（默认先写临时URL）
  4. （可选）将生成结果绑定回 `characters.profile_generation_image_uuid`
- **实现文件**:
  - `src/app/api/oc-maker/characters/generate-image/route.ts`
  - `src/services/generation/character/character-generation-service.ts`

> 说明：当前实现使用“前端实时 character_data”进行生成，不读取数据库角色数据。若要做到“生成结果自动挂到角色”，需要通过 `character_uuids` 或后处理逻辑完成绑定（见下文“现状与差异”与“推荐闭环实现”）。

#### 生成类型与计费口径（统一规则）

- 一级类型（type）：`character`（角色相关视觉生成统一归类）
- 二级类型（sub_type）：用于区分场景，不作为计费口径
  - `full_body`：立绘（OC 立绘生成、详情页新增立绘）
  - `avatar`：头像
  - `design_sheet`：设定稿/分解稿（如有）
- gen_type：仅作为请求意图，最终必须映射到 sub_type
- 计费口径：通过 `metadata.credits_override` + `metadata.credits_trans_type` 控制，不与 `sub_type` 绑定

**OC 业务固定口径（当前确认）**

- 完整 OC 快速生成：`type=character` / `sub_type=full_body` / `credits_override=40`
- 单次立绘生成：`type=character` / `sub_type=full_body` / `credits_override=30`
- 头像生成：`type=character` / `sub_type=avatar` / `credits_override=10`（若沿用默认可不设置）

> 说明：以上为当前固定口径，后续“手动调整设置”时仅调整 override/config，不改 sub_type。配置入口：`src/configs/generation/credits.ts`。

#### AvatarGeneration Service

- **位置**: 继承自 `BaseGenerationService`
- **职责**: 角色头像生成
- **API**: `POST /api/oc-maker/characters/generate-avatar`feature
- **处理流程**:
  1. 验证参考图片
  2. 构建生成请求
  3. 调用服务自动处理多分辨率生成
  4. 返回任务信息
- **实现文件**:
  - `src/app/api/oc-maker/characters/generate-avatar/route.ts`
  - `src/services/generation/avatar/avatar-generation-service.ts`
  - `src/services/generation/avatar/avatar-prompt-builder.ts`

#### Config Management

- **位置**: `src/lib/config-manager.ts`
- **职责**: 统一管理角色相关配置（主题、预设等）

#### QuickGeneration Service

- **位置**: `src/services/generation/character/quick-generation-service.ts`
- **职责**: 一句话描述 → 结构化角色数据 → 创建角色记录；可选自动触发立绘生成
- **API**: `POST /api/oc-maker/quick-generate`
- **关键点**:
  - Prompt 模板从 `src/configs/prompts/oc-quick-generation.json` 加载
  - oc生成中文本解析不扣除积分
  - 自动生图复用 `CharacterGenerationService` 的创建任务与扣费逻辑

## 现状与差异（与 FEAT-OC-REBUILD 的“快速生成闭环”）

### 1) 快速生成图片链路未形成“角色绑定闭环”

- `QuickGenerationService` 会创建一条 `character` 的生图任务，并返回 `generation_task.uuid`；
- 但当前任务创建时未传 `character_uuids`，仅写入 `metadata.character_uuid`；
- 生图完成后 webhook 会写入 `generation_images`，但不会自动回写 `characters.profile_generation_image_uuid` / `characters.avatar_generation_image_uuid`；
- 结果：角色详情页仅依赖 `characters.*_generation_image_uuid` 时，会出现“生成了但页面仍无立绘/头像”的状态。（2026-01-18 更新：quick-generate 已补充 `character_uuids` 并在 webhook 成功后自动回写 profile/avatar 字段）

### 2) “快速生成=立绘+头像”未完全实现

- 当前 quick-generate 自动生图只覆盖立绘（profile/full body），不会自动生成头像任务。

### 3) 前端进度展示需要复用通用 status API（但 OC Maker 未接入）

- 通用状态查询：`GET /api/generation/status/[generation_uuid]`（`src/app/api/generation/status/[generation_uuid]/route.ts`）
- 前端轮询 Hook：`src/hooks/useGenerationPolling.ts`
- OC Maker 页面跳转到详情页后，目前没有把 `generation_task.uuid` 映射为可视化进度/完成回写动作。

### 4) Prompt 配置化的缺口

- quick-generate 的 LLM prompt：已配置化（`src/configs/prompts/oc-quick-generation.json`）
- 角色立绘 prompt：已配置化（`src/configs/prompts/character-generation.json`）
- 头像 prompt：当前仍硬编码在 `src/services/generation/avatar/avatar-prompt-builder.ts`（建议纳入 `src/configs/prompts/`）

### 近期修复（2026-01-18）

- Quick generate 自动立绘任务现在会传入 `character_uuids` 并设置 `metadata.auto_attach_profile` / `metadata.auto_fill_avatar_from_profile`
- Webhook 成功落图后，`BaseGenerationService` 会根据上述标记自动写回 `characters.profile_generation_image_uuid`，并在头像为空时同步使用首张立绘图填充 `avatar_generation_image_uuid`

### 统一口径补充（2026-01-26）

- 角色立绘统一归类为 `sub_type=full_body`；`gen_type` 仅表达请求意图
- 计费统一走 credits override，不再依赖 `sub_type`

## 推荐闭环实现（后端侧）

### 目标

实现“快速生成（文本）→ 创建角色 → 自动生成立绘（可选）→ 自动生成头像（可选）→ 结果稳定落到角色字段 → 前端可轮询展示”的稳定闭环。

### 方案 A：异步补写 + 编排（推荐，保持 webhook 极简）

1. quick-generate 创建立绘 generation 时传 `character_uuids: [character.uuid]`
2. webhook 仅写 `generation_images`（临时URL）与 `generations.status`
3. 由独立扫描/补写任务：
   - 将立绘 generation 的首张 `generation_images.uuid` 写回 `characters.profile_generation_image_uuid`
   - 可选：立绘绑定完成后，自动触发 avatar generation（参考图使用该立绘URL），并在完成后写回 `characters.avatar_generation_image_uuid`

### 方案 B：Webhook 内快速落库（可行但需严格控制复杂度）

在 webhook 处理成功并写入 `generation_images` 后，按 `generations.sub_type` 立即回写角色字段（只做轻量 DB update）。

### 契约要点（必须统一）

- 角色关联：使用 `character_uuids`（强契约字段），不要依赖 metadata 作为绑定依据
- 结果写回字段：
  - `sub_type = 'full_body'` → `characters.profile_generation_image_uuid`
  - `sub_type = 'avatar'` → `characters.avatar_generation_image_uuid`

## 影响文件（实现与排查入口）

- Quick generate：`src/app/api/oc-maker/quick-generate/route.ts`、`src/services/generation/character/quick-generation-service.ts`
- 立绘生成：`src/app/api/oc-maker/characters/generate-image/route.ts`、`src/services/generation/character/character-generation-service.ts`
- 头像生成：`src/app/api/oc-maker/characters/generate-avatar/route.ts`、`src/services/generation/avatar/avatar-generation-service.ts`
- 状态查询：`src/app/api/generation/status/[generation_uuid]/route.ts`、`src/services/generation/base/base-generation-service.ts`
- Webhook：`src/app/api/generation/webhook/route.ts`
- Prompt 配置：`src/configs/prompts/oc-quick-generation.json`、`src/configs/prompts/character-generation.json`

## 与生图服务架构的集成

- **角色立绘生成**: 使用 `CharacterGenerationService`
- **头像生成**: 使用 `AvatarGenerationService`
- **统一状态管理**: 复用通用的状态查询和 Webhook 处理
- **配置化分辨率**: 使用统一的分辨率配置系统
- **多提供方适配**: 支持KIE、OpenAI等提供方

## 状态字段写入规则

- 写入位置：`characters.status`
- 默认值：`archived`
- 自动生成：生成成功后将角色 `status` 置为 `archived`
- 手动创建：在生成立绘成功后将角色 `status` 置为 `archived`

## 关键流程

### 角色创建流程

1. 验证用户会员等级和OC数量限制
2. 校验角色数据（名称、性别、扩展属性等）
3. 创建角色记录
4. 如果是衍生角色，更新原角色的remix_count

### 角色立绘生成流程

1. 验证角色存在性和归属权
2. 构建包含角色完整信息的提示词
3. 创建生成任务（继承BaseGenerationService）
4. 生成完成后通过Webhook自动关联角色

### 头像生成流程

1. 验证参考图片URL
2. 根据提供方自动选择合适的模型
3. 创建多分辨率头像生成任务
4. 返回生成任务信息

## 变更历史

- 2025-10-20 v1.0 初始版本
- 2025-10-22 FEAT-my-ocs-favorites 新增收藏列表功能
- 2026-01-04 FEAT-QUICK-GEN 新增快速生成服务与接口（/api/oc-maker/quick-generate）
- 2026-01-12 FEAT-OC-REBUILD 补齐“快速生成闭环”后端说明（绑定、落库、进度、prompt配置化缺口）
- 2026-01-26 FEAT-OC-REBUILD 统一生成类型与计费口径（影响：立绘/头像/快速生成）
