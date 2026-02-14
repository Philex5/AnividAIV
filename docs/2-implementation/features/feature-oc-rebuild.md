# OC 系统重构（FEAT-OC-REBUILD）

**Related**:

- PRD：`docs/1-specs/PRD.md`
- Tasks：`docs/3-operations/tasks/tasks-feature-oc-rebuild.md`
- Feature：`docs/2-implementation/features/feature-worlds.md`
- Feature：`docs/2-implementation/features/feature-primary-portrait.md`

## 背景与目标（最终方案）

### 背景问题

- 扁平化字段难以扩展（新增属性需要改表 + 改 API + 改 UI）。
- 角色详情页内容组织弱，缺少主题化能力与分享传播载体。
- OC Maker 入口交互偏传统表单，缺少“搜索框主导”的快速生成体验。

### 目标

- **模块化存储（Modules JSONB）**：角色核心信息以结构化模块落库，保证可扩展性与可校验性。
- **入口与详情页重构**：OC Maker 快速生成 + 手动创建；详情页支持查看/编辑模式切换。
- **Tag + 分享卡片**：增强检索与传播能力。
- 世界观系统拆分至 `docs/2-implementation/features/feature-worlds.md` 统一治理。

## 验收标准（最终口径）

- 角色支持模块化存储：`appearance` / `personality` / `background` / `art` / `skills`。
- `/oc-maker` 为搜索框主导的快速生成模式，同时提供“从 0 开始”的手动创建。
- 快速生成进度弹窗不可关闭，直到生成完成并跳转至角色详情页。
- 快速生成必须补齐总览（brief_introduction）、小传故事（background_story）、personality tags、extended attributes、能力雷达默认维度值与具体技能。
- 立绘生成提示词需明确禁止图片内出现任何文字或水印。
- 快速生成默认头像为立绘上半部分的裁切结果，不直接使用整张立绘。
- 角色详情页支持查看/编辑模式切换（无需页面跳转）。
- 角色支持 tags 编辑、保存与检索（含规范化与预置推荐）。
- 支持生成并分享角色分享卡片（图片输出 + 缓存）。
- 世界观能力验收见 `docs/2-implementation/features/feature-worlds.md`。

## 系统流程（最终方案）

### 1) OC Maker（快速生成 / 手动创建 / 引导创建）

- 快速生成：
  - 前端请求 `POST /api/oc-maker/quick-generate`（核心字段：`description`, `auto_generate_image`, `art_style`）。
  - 服务端解析描述并创建角色（落 `modules`），可选触发生成任务（generation）。
  - **LLM 分段生成（2-3 次）**：单次生成难度过高，必须拆分并顺序执行，确保信息完整度。
    - Step 1: Appearance（外观与身份）
      - 输出：`appearance`（name/age/gender/species/role/body_type/eye_color/hair_color/hair_style/accessories/outfit_style/appearance_features）
      - 说明：仅产出外观与身份，避免混入背景或性格字段；失败时直接抛错并终止流程
    - Step 2: Background（总览 + 小传故事）
      - 输出：`background.brief_introduction`、`background.background_story`、`background.background_segments（title+content)`
      - 说明：总览与小传故事必须语义区分；segments 用于结构化剧情要点，不要求完整配图
    - Step 3: Personality + Skills（性格与能力）
      - 输出：`personality.personality_tags`、`personality.extended_attributes`、`personality.greeting`、`personality.quotes`
      - 输出：`skills.stats`（默认维度：STR/INT/AGI/VIT/DEX/LUK，1-10）与 `skills.abilities`（3-5 个技能卡）
      - 说明：tags 为去重数组，extended_attributes 为 key-value 结构；greeting 为数组（3 句打招呼语句），用于 chat 开始时随机选择一条作为开场白；如需降本，可在低负载时合并 Step 2 与 Step 3
    - Prompt 模板：统一放在 `src/configs/prompts/`，建议拆分为 `oc-quick-generation-base` / `oc-quick-generation-personality` / `oc-quick-generation-skills`
- 新增 skill 指导：
  - 目标：保证 skills.abilities 的 type/icon 与既有类型一致，展示时可直接映射图标。
  - 类型范围：`Default` / `Magic` / `Elemental` / `Physical` / `Psychic` / `Spatial` / `Buff` / `Summoning` / `Shapeshifting` / `Technological` / `Potion` / `Unique`。
  - 生成规则：`abilities[].type` 必须为上述枚举之一，`abilities[].icon` 必须与 `type` 一致；如缺失或不合法，服务端统一归一化为 `Default`。
  - 展示规则：前端根据 `type`（或 `icon`）映射 `skills/{Type}.webp`，确保图标稳定。
  - 新增 skill 类型时需修改：
    - `src/lib/skills.ts`：新增类型枚举并保持大小写一致。
    - `src/i18n/messages/en.json`、`src/i18n/messages/ja.json`：补充 `skill_icons` 文案。
    - `public/assets/skills/`：新增对应 `Type.webp` 图标资源。
    - `src/configs/prompts/oc-quick-generation.json`：更新 skills abilities 的 type/icon 约束枚举。
    - `src/lib/config-manager.ts`：同步默认 prompt 里的 type/icon 枚举。
- **生成类型口径**：`type=character` / `sub_type=full_body`（Full-body Key Art），计费使用 `credits_override=50`。
  - **立绘提示词约束**：必须包含"no text / no watermark / no captions"等禁止文字元素的约束。
  - **头像处理**：立绘生成完成后自动触发 AI 头像生成任务（使用 `nano-banana` 模型），基于立绘生成 512x512 头像。
  - 前端跳转到 `/characters/{uuid}?mode=edit` 继续完善（如已完成基础生成）或直接进入 `/characters/{uuid}`。
- 引导创建（手动从 0 开始）：
  - 前端请求 `POST /api/oc-maker/characters` 创建最小占位角色。
  - 前端跳转到 `/characters/{uuid}?mode=create`。
- **创建模式 (Create Mode)**：通过分步引导（Basic Info -> Visuals -> Personality -> Story -> Skills）引导用户完成首次创建。
  - 创建模式中不提供 Settings 步骤：`visibility_level` 按订阅状态自动设置（订阅用户为 `private`，非订阅为 `public`），移除 `allow_remix` 设置。

### 2) 角色详情页（查看/编辑/创建切换）

- 查看模式：展示背景、头像、tags、分享入口与模块化信息。
- 编辑模式：在同页完成 tags 编辑、modules 编辑、背景设置。
- 创建模式：分步引导式 UI，用于首次完善角色信息，包含 AI 生成辅助与随机骰子。

## 数据模型（最终口径）

### characters（增量改造）

- 新增：`modules`（JSONB）、`tags`（JSONB array）、`background_url`（预留）、`status`、`world_uuid`。
- 模块化为主：角色数据以 `modules` 为唯一写入来源（`appearance` / `personality` / `background` / `art` / `skills`）。
- 根字段保留（高频筛选/兼容）：`name` / `gender` / `age` / `species` / `role` / `brief_introduction` / `personality_tags`，其值由 `modules` 同步。
- skills 子模块：`stats`（能力雷达，`label` / `value`）与 `abilities`（技能卡片，`id` / `name` / `type` / `level` / `description`）。
- DDL：`src/db/migrations/0002_0011_combined.sql`

module所有字段：

```
{
  "art": {
    "gallery": [
      {
        "id": "de514915-f59a-4ca3-a73a-4dbe32f9bd2e",
        "url": "https://artworks.anividai.com/generations/de514915-f59a-4ca3-a73a-4dbe32f9bd2e/thumb_1_desktop.png",
        "type": "generation",
        "label": "Full-body Key Art"
      },
      {
        "id": "5f0a2a1c-9e6f-4b49-a3e0-62c0b1e7e9f1",
        "url": "5f0a2a1c-9e6f-4b49-a3e0-62c0b1e7e9f1",
        "type": "user_upload",
        "label": "User Upload"
      },

    ],
    "fullbody_style": "anime"
  },
  "skills": {
    "stats": [
      {
        "label": "STR",
        "value": 9
      },
      {
        "label": "INT",
        "value": 9
      },
      {
        "label": "AGI",
        "value": 10
      },
      {
        "label": "VIT",
        "value": 8
      },
      {
        "label": "DEX",
        "value": 6
      },
      {
        "label": "LUK",
        "value": 9
      }
    ],
    "abilities": [
      {
        "id": "55d2e49c-fb43-4326-adf7-6f467c99ebb0",
        "icon": "Elemental",
        "name": "leaf Magic",
        "level": 4,
        "description": "using the power of nature"
      }
    ]
  },
  "appearance": {
    "age": 1200,
    "name": "Aelion",
    "role": "Forest Sage",
    "gender": "male",
    "species": "elf",
    "body_type": "slim",
    "eye_color": "#228b22",
    "hair_color": "#c0c0c0",
    "hair_style": "wavy",
    "accessories": [
      "necklace"
    ],
    "outfit_style": "Flowing forest robes",
    "appearance_features": [
      "Ancient wooden staff"
    ]
  },
  "background": {
    "background_story": "",
    "brief_introduction": "",
    "background_segments": [
      {
        "id": "177d05b1-d04c-4836-aa11-b9f2727be014",
        "title": "xxxx",
        "content": "xxx",
        "image_url": "xxx"
      },
    ]
  },
  "personality": {
    "quotes": [],
    "greeting": [
      "Greetings, traveler. The forest welcomes you.",
      "Ah, another seeker of wisdom. How may I guide you?",
      "Welcome, friend. Nature has brought us together for a reason."
    ],
    "personality_tags": [
      "calm",
      "protective"
    ],
    "extended_attributes": {
      "motivation": "Guard the ancient forest"
    }
  }
}


```

### 画廊与主图规则（Full-body Key Art）

- 画廊图片类型对外统一为：`generation` / `user_upload`，不再展示 portrait 文案。
- 主图由 `profile_generation_image_uuid` 指向任意画廊条目（与类型无关），必须为 UUID。
- 用户上传图片不需要指定 portrait 类型，默认 `type=user_upload`。
- 组件支持 UUID 与 URL 双模式，但 OC 详情页画廊图片/视频必须具备 UUID；用户头像与背景图可仅保存 URL。
- 对外仅展示 **Full-body Key Art** badge，且全局仅允许一个 primary。

### 角色状态（status）

- 目的：记录角色状态用于后续特殊展示（与 generation 状态不同维度）。
- 默认值：`archived`
- 更新规则：
  - 自动生成：生成成功后将角色 `status` 置为 `archived`。
  - 手动创建：在生成立绘成功后将角色 `status` 置为 `archived`。

## API 影响清单（最终口径）

- OC Maker：`docs/2-implementation/api/oc-maker.md`
  - `src/app/api/oc-maker/quick-generate/route.ts`
  - `src/app/api/oc-maker/characters/route.ts`
  - `src/app/api/oc-maker/characters/[uuid]/route.ts`
  - `src/app/api/oc-maker/characters/generate-image/route.ts`
  - `src/app/api/oc-maker/characters/generate-avatar/route.ts`
  - `src/app/api/oc-maker/config/route.ts`
- Generation（轮询/图片详情/Webhook）：
  - `src/app/api/generation/status/[generation_uuid]/route.ts`
  - `src/app/api/generation/image/[uuid]/route.ts`
  - `src/app/api/generation/webhook/route.ts`
- 分享卡片：
  - `src/app/api/og/character/[uuid]/route.ts`
- 世界观 API 见：`docs/2-implementation/features/feature-worlds.md`

## 前端影响清单（最终口径）

- OC Maker（重构）：`docs/2-implementation/frontend/page-oc-maker-redesign.md`
- 角色详情页（重构）：`docs/2-implementation/frontend/page-character-detail-redesign.md`
- 组件文档：
  - `docs/2-implementation/frontend/component-tag-editor.md`
  - `docs/2-implementation/frontend/component-share-card.md`
- 世界观相关前端方案见：`docs/2-implementation/features/feature-worlds.md`
- 图片解析规则补充：`docs/2-implementation/frontend/page-character-detail-redesign.md`

## 后端影响清单（最终口径）

- Character Modules：`docs/2-implementation/backend/service-character-modules.md`
- OC Maker Service：`docs/2-implementation/backend/service-oc-maker.md`
- 数据迁移方案：`docs/2-implementation/backend/data-migration-to-modules.md`
- 世界观服务见：`docs/2-implementation/features/feature-worlds.md`

## 数据迁移（已执行 SQL，待验证）

### 已执行内容（现状）

- DDL：`src/db/migrations/0002_0011_combined.sql`（结构变更 + preset seed）。
- 数据迁移 SQL：`docs/2-implementation/backend/sql/oc-rebuild-characters-data-migration.sql`（将 legacy 扁平字段写入 `modules`，并补齐 `tags`）。

### 必须完成的验证（不通过即视为迁移未完成）

1. 基础一致性：
   - `characters.modules` 不应为 `NULL`（或仅允许极少数“异常样本”并记录 UUID）。
   - `characters.tags` 必须为 JSON array。
2. 样本核对（人工抽样）：
   - 抽样 20 个角色：对比 legacy 字段与 `modules` 映射是否一致（至少覆盖有/无 accessories、background_segments 的场景）。
3. 回滚可行性：
   - 确认备份已存在，并且回滚脚本可执行（仅验证，不在此阶段执行回滚）。

### 推荐验证方式（两选一）

- 方式 A（脚本）：运行 `scripts/verify-migration.ts`，并保存输出 JSON 到测试报告中。
- 方式 B（Dashboard SQL）：执行 `docs/2-implementation/backend/sql/oc-rebuild-characters-data-migration.sql` 末尾的 “Quick checks” 查询并截图/保存结果。

## 生成能力设计（待实现）

本章节补齐“详情页立绘/头像/背景图生成”的最终设计口径，用于后续实现与验收。

> 现状说明：`/api/oc-maker/characters/generate-image` 与 `/api/oc-maker/characters/generate-avatar` 已存在，但详情页当前未接入触发入口、轮询/选择、以及把选定结果写回角色字段的链路；背景图当前仅支持颜色/URL 设置与默认背景注入，未实现“AI 生成背景图”。

### 0) 统一 Prompt 构建方案（覆盖 3 个场景）

**目标**：所有“立绘/头像”生成入口统一使用 `src/configs/prompts/character-generation.json`，消除字段丢失与多套逻辑并存问题。

**统一入口**：

- **唯一模板**：`src/configs/prompts/character-generation.json`
- **唯一 Builder**：`src/services/generation/character/character-prompt-builder.ts`
  - 优先 `buildPromptFromModules`（`src/lib/character-prompt.ts`），将 `modules` 作为唯一数据源构建 Prompt
  - 不再允许前端自行拼接完整 prompt 直接传入（避免绕过模板）

**字段口径**：

- **立绘生成使用 `appearance` + `personality.personality_tags`**，无需传入 `background / art / skills`
- 输入需包含 `modules.appearance` 与 `modules.personality.personality_tags`
  - 另需根字段 `name / gender / age / species / role`
- 若 `modules` 不完整，由服务端使用 `buildModulesFromLegacyFields` 仅补齐 `appearance` 与 `personality.personality_tags` 并回写
- `appearance_features`、`accessories` 等数组字段必须保持数组格式（禁止拼接为单字符串）
- **模板同步**：`src/configs/prompts/character-generation.json` 增加 `personality_tags` 字段映射（与 `modules.personality.personality_tags` 对应）

**三场景统一流程**：

1. **OC 快速生成（QuickCreationHero）**
   - 由 `quick-generation-service` 生成 `modules`
   - 创建立绘任务时传入 `character_data.modules`
   - 后端用 `CharacterPromptBuilder` 基于模板构建 prompt
2. **OC 手动生成（Character 创建模式）**
   - 前端使用统一的 `buildCharacterGenerationPayload()` 组装 `modules + art_style`
   - 调用 `/api/oc-maker/characters/generate-image` 时 **不传 prompt**
   - 后端以 `modules` 生成 prompt
3. **OC 详情页编辑模式（appearance & style tab）**
   - 与创建模式共用相同 payload 构建函数与接口
   - 只允许通过 `modules` 触发生成，禁止单独拼 prompt

**兼容与兜底**：

- 若请求中存在 `prompt`/`custom_prompt_additions`，仅允许作为追加片段（append）使用，不得覆盖模板
- 任何缺失字段必须在服务端补齐并记录日志，避免 silent drop

### 生成类型与计费口径（统一规则）

- 一级类型（type）：`character`
- 二级类型（sub_type）：`full_body`（立绘）、`avatar`（头像）、`design_sheet`（设定稿/分解稿）
- gen_type：仅作为请求意图，必须映射到 sub_type，不作为计费依据
- 计费：通过 `metadata.credits_override` + `metadata.credits_trans_type` 控制
  - **完整 OC 快速生成**：`credits_override=50`（立绘 40 + 头像 10）
  - **手动创建模式**：`credits_override=40`（立绘 40 + 头像 10，头像不单独计费）
  - **Edit 模式**：`credits_override=30`（仅立绘，不包含头像）
  - **独立头像生成**：`credits_override=10`（仅用于手动触发的头像生成）

### 头像自动生成策略（2026-02-05 更新）

**目标**：快速生成和手动创建模式自动产出默认头像，使用 AI 模型基于立绘生成。

**生成规则**：

- 使用 `nano-banana` 模型
- 基于立绘 URL 作为 `reference_image_urls[0]`
- 生成 `aspect_ratio: 1:1` 的 512x512 头像
- 不单独计费（已包含在立绘生成费用中）

**触发入口**：

- **OC 快速生成**：`metadata.auto_generate_avatar=true` → 立绘完成后 `BaseGenerationService.autoGenerateAvatarFromProfile`
- **手动创建模式**：`metadata.auto_generate_avatar=true` → 立绘完成后自动触发头像生成
- **Edit 模式**：不自动生成头像，用户需手动触发

**实现要点**：

- `BaseGenerationService` 新增 `autoGenerateAvatarFromProfile()` 方法
- 在 `handleWebhookCallback` 中检测 `auto_generate_avatar` 标记
- 动态导入 `AvatarGenerationService` 避免循环依赖
- 头像生成失败不影响主流程

### A. 立绘（full_body）重新生成

**目标**：编辑模式下，基于当前角色 modules 触发 Full-body Key Art 生成，用户确认选图后写回 `characters.profile_generation_image_uuid`。

**交互**：

- 入口：详情页 Full-body Key Art 区提供 “Regenerate” 按钮（仅 Owner + Edit Mode）。
- 弹窗字段：`art_style`（默认继承）、`aspect_ratio`（默认 `2:3`）、`model_uuid`（默认 `google/nano-banana`）、`custom_prompt_additions`（可选）。
- 输出：进度展示（polling）→ 候选图列表 → 用户选择 1 张设为当前立绘。

**接口契约**：

- 触发：`POST /api/oc-maker/characters/generate-image`（`gen_type=full_body`）→ 返回 `generation_uuid`
- 轮询：`GET /api/generation/status/{generation_uuid}`（处理 pending/processing/completed/failed）
- 写回：`PUT /api/oc-maker/characters/{uuid}`，Body：`{ "profile_generation_image_uuid": "<generation_image_uuid>" }`

**约束**：

- 生成成功不自动替换：必须由用户选择确认。
- 失败/超时不可静默：必须展示英文错误信息并允许重试。

### B. 头像（Avatar）生成 / 替换

**目标**：编辑模式下，基于参考图（默认立绘）生成头像，用户确认选图后写回 `characters.avatar_generation_image_uuid`。

**交互**：

- 入口：头像区域菜单（仅 Owner + Edit Mode）：Generate from profile / Upload / Crop（后两项仅预留）。
- 参考图规则：
  - 有立绘：默认使用立绘 URL 作为 `reference_image_urls[0]`
  - 支持上传和从 gallery 中选取

**接口契约**：

- 触发：`POST /api/oc-maker/characters/generate-avatar`（`reference_image_urls` 必填）→ 返回 `generation_uuid`
- 轮询：`GET /api/generation/status/{generation_uuid}`
- 写回：`PUT /api/oc-maker/characters/{uuid}`，Body：`{ "avatar_generation_image_uuid": "<generation_image_uuid>" }`

### C. 设定稿/分解稿（design_sheet）生成

**目标**：详情页基于现有立绘生成 breakdown sheet，并将结果写入画廊（不自动替换立绘/头像）。

**接口契约**：

- 触发：`POST /api/anime-generation/create-task`（`gen_type=design_sheet`）
- 轮询：`GET /api/generation/status/{generation_uuid}`
- 写回：由前端选择结果并写入 gallery（见图片资产统一策略）

**约束**：

- 仅 Owner 可触发；API 层不做 prompt 长度与 `reference_image_urls` URL 格式校验，避免 breakdown 模板过长或内部 URL 形态导致失败。
- 触发时 `visibility_level` 设为 `public` 以绕过订阅限制，但不会进入社区展示逻辑。

## 测试要点（最终口径）

- OC Maker：快速生成、手动创建、配置加载与错误态（401/402/400）。
- 角色详情页：查看/编辑切换、modules 编辑保存、tags 增删、分享卡片生成。
- 迁移相关：迁移后查询性能回归（GIN/表达式索引命中情况）、数据一致性验证、异常样本处理流程。
- 生成能力（待实现后新增回归）：生成触发、轮询、失败处理、选图写回、刷新一致性。

## 变更历史

- 2026-01-05 FEAT-OC-REBUILD 初始立项（影响：数据模型/API/前端 UI）
- 2026-01-12 FEAT-OC-REBUILD 文档收敛为最终方案（移除冗余章节，补齐生成能力设计与任务拆分）
- 2026-01-16 FEAT-OC-REBUILD 角色状态字段与归档规则补充（影响：数据模型）
- 2026-01-21 FEAT-OC-REBUILD 移除 legacy 字段写入，统一使用 modules（影响：API/服务端）
- 2026-01-21 FEAT-OC-REBUILD 补充 skills 子模块说明（影响：数据模型/详情页）
- 2026-01-25 FEAT-IMAGE-ASSET-UNIFY 统一角色图片解析规则（影响：角色详情页读取）
- 2026-01-26 FEAT-OC-REBUILD 统一生成类型与计费口径（影响：OC 快速生成/立绘/头像）
- 2026-01-27 FEAT-OC-REBUILD 放宽 breakdown sheet 生成参数校验（影响：生成 API/详情页）
- 2026-01-27 FEAT-OC-REBUILD breakdown sheet 生成强制 public 可见度（影响：详情页生成）
- 2026-01-27 FEAT-OC-REBUILD 快速生成拆分为 2-3 次 LLM 并补齐小传/性格/技能细节（影响：OC 快速生成）
- 2026-01-28 FEAT-OC-REBUILD 创建模式移除 settings 步骤并收敛可见性规则（影响：角色详情页创建）
- 2026-01-28 FEAT-primary-portrait 主立绘选择与回退规则归档（影响：详情页画廊）
- 2026-01-29 FEAT-OC-REBUILD 画廊 UUID 约束与 Full-body Key Art 文案统一（影响：画廊/主图/上传）
- 2026-01-31 FEAT-OC-REBUILD 统一立绘 prompt 构建与自动头像裁剪策略（影响：生成流程/详情页/图像处理）
- 2026-02-03 FEAT-OC-REBUILD greeting 字段改为数组格式并区分 brief_introduction（影响：数据模型/快速生成/手动创建/Prompt 模板）
- 2026-02-04 FEAT-OC-REBUILD 头像自动处理改造为 Cloudflare Workers 兼容（影响：图像处理/头像裁剪/auto-avatar API）
  - 新增 `WorkersImageProcessor` 使用 Canvas API 替代 Sharp
  - `ImageProcessor` 自动检测运行环境并选择合适的图像处理方式
  - `auto-avatar` API runtime 改为 "edge" 支持 Workers
- 2026-02-05 FEAT-OC-REBUILD 头像生成改为 AI 模型生成方式（影响：计费/生成流程/文档）
  - 快速生成和手动创建模式使用 `nano-banana` 模型自动生成头像
  - 移除自动裁剪逻辑，改为手动触发选项
  - 计费调整：快速生成 50 credits，手动创建 40 credits，Edit 模式 30 credits
- 2026-02-05 FEAT-OC-REBUILD 移除 /auto-avatar API（影响：头像裁剪功能）
  - 头像生成完全由 webhook 触发 AI 模型生成
  - 移除前端自动裁剪调用（`CharacterDetailClient.tsx` 中的 2 处调用）
  - 移除 `syncAvatarAfterGenerationRef` 相关逻辑
  - 删除 API 路由文件 `src/app/api/oc-maker/characters/[uuid]/auto-avatar/route.ts`
- 2026-02-05 FEAT-OC-REBUILD 暂时注释导出功能待完善（影响：角色详情页 ActionBar）
  - 注释 `ExportDropdown` 组件，待功能完善后上线
  - 保留 `ShareMenu` 分享功能

