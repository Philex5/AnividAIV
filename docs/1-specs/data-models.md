# AnividAI 数据模型设计 v1.0（视频生成对齐）

## 概述

本文档定义了 AnividAI 项目的完整数据模型，包括继承自 ShipAny 框架的基础表结构和针对动漫图片生成功能的扩展表结构。

**文件位置：src/db/schema.ts**

统一口径补充（FEAT-manager-system）：

- 会员（Member）判定：以 `users.is_sub = true` 且 `users.sub_expired_at >= NOW()` 为准。
- 生成类型：以 `generations.type` 为唯一类型来源，不依赖图片/视频子表的类型字段。

## 框架继承表结构 (已有)

### 用户相关

#### users 表

用户基础信息表，继承自 ShipAny 框架

字段补充（FEAT-admin-user-attribution）：

- `users.signup_country`：注册国家码（ISO 3166-1 alpha-2；示例：`GB`）
- `users.signup_ref`：注册来源参数 `ref`（示例：`xxx`）
- `users.signup_utm_source`：注册来源参数 `utm_source`（示例：`google`）

迁移文件：

- `src/db/migrations/0007_add_user_attribution.sql`

受影响代码：

- `src/db/schema.ts`
- `src/auth/handler.ts`
- `src/models/user.ts`
- `src/components/admin/users/UsersTable.tsx`

变更历史：

- 2026-01-15 FEAT-admin-user-attribution 新增 users 注册国家与来源字段（影响：表/页面）

字段补充（FEAT-USER-PROFILE）：

- `users.gender`：`male | female | other`
- `users.bio`：用户简介（text）
- `users.background_url`：用户详情页背景图 URL（text）
- `users.display_name`：显示名（默认取 Google 用户名；用户修改后以最新值为准）
- `users.avatar_url`：用户头像引用（支持 URL 或 `image_uuid`）
  - 仅允许引用**当前用户本人**作品的 `image_uuid`
  - 即使作品为私有，若作为头像引用也允许公共展示

迁移文件：

- `src/db/migrations/0010_add_user_profile_fields.sql`
- `src/db/migrations/0011_backfill_display_name.sql`

受影响代码（规划）：

- `src/db/schema.ts`
- `src/models/user.ts`
- `src/services/user-profile.ts`
- `src/app/api/users/[id]/profile/route.ts`
- `src/lib/image-resolve.ts`
- `src/hooks/useResolvedImage.ts`
- `src/app/api/generation/image-resolve/[uuid]/route.ts`

变更历史：

- 2026-01-19 FEAT-USER-PROFILE 规划新增用户 profile 字段（影响：表/API/服务）
- 2026-01-30 FEAT-USER-PROFILE 头像字段支持 URL/UUID 与归属限制（影响：表/API/服务）

#### credits 表

用户积分/额度管理表（支持聚合视图，加速余额计算）

字段要点：

- `user_uuid` 用户标识
- `credits` 正数为入账，负数为出账
- `created_at` 交易创建时间（用于时间窗口过滤）
- `expired_at` 入账积分的到期时间（可空）

索引（FEAT-credits-calc-optimize）：

- `idx_credits_user_uuid_created_at(user_uuid, created_at desc)`
- `idx_credits_user_uuid_expired_at(user_uuid, expired_at)`
- `idx_credits_created_at(created_at)`

聚合视图（基线）：`user_credit_balances`

- 设计：按 `user_uuid` 聚合 `balance/total_earned/total_used/last_event_at/next_expiring_at`
- 迁移文件：`src/db/migrations/0003_credits_aggregation_view.sql`
- 如后续性能不足，考虑切换为物化视图并使用 `REFRESH MATERIALIZED VIEW CONCURRENTLY`

示例 SQL：

```
SELECT
  user_uuid,
  SUM(CASE WHEN credits > 0 THEN credits ELSE credits END) AS balance,
  SUM(CASE WHEN credits > 0 THEN credits ELSE 0 END)       AS total_earned,
  SUM(CASE WHEN credits < 0 THEN -credits ELSE 0 END)      AS total_used,
  MAX(created_at)                                          AS last_event_at,
  MIN(CASE WHEN expired_at IS NOT NULL AND expired_at >= NOW() THEN expired_at ELSE NULL END) AS next_expiring_at
FROM credits
GROUP BY user_uuid;
```

受影响代码：

- 服务层：`src/services/credit.ts`
- API：`src/app/api/get-user-credits/route.ts`

变更历史：

- 2025-10-29 FEAT-credits-calc-optimize 新增视图与索引，落库迁移 0003

#### user_incentives 表（新增，用户激励）

用户激励明细表，用于记录用户签到、分享等激励行为，并通过 `reward_date` + 唯一约束实现“每日幂等”。

字段要点：

- `user_uuid` 用户标识
- `type` 激励类型（`check_in` / `share_sns`）
- `reward_amount` 本次发放积分数
- `reward_date` UTC日期（DATE，逻辑上对应 `YYYY-MM-DD`），用于每日幂等
- `streak_count` 连续天数（仅签到场景）
- `metadata` JSONB 扩展信息（分享平台、页面等）
- `created_at` 记录创建时间（timestamptz）

约束与索引：

- 唯一约束（幂等）：`unique_user_incentive_daily(user_uuid, type, reward_date)`
- `idx_user_incentives_user(user_uuid)`
- `idx_user_incentives_type_date(type, created_at)`
- `idx_user_incentives_user_type_date(user_uuid, type, created_at)`

受影响代码：

- Model：`src/models/incentive.ts`
- Service：`src/services/incentive.ts`

迁移文件：

- `src/db/migrations/0005_add_user_incentives.sql`
- `src/db/migrations/0006_add_user_incentives_reward_date.sql`

### 支付相关

#### orders 表

订单管理表，支持 Stripe 和 Creem

聚合视图（建议-管理员分析）：

- `vw_orders_daily_revenue(date, revenue)`：仅统计 `status='paid'` 的订单金额，按日聚合。

### 其他框架表

- **apikeys**: API密钥管理
- **categories**: 分类管理
- **posts**: 内容管理
- **affiliates**: 联盟推广
- **feedbacks**: 用户反馈

#### feedbacks 表

用户反馈表，用于收集和管理用户反馈信息

**字段说明：**

- `id`: 主键，自增整数
- `created_at`: 创建时间（时间戳）
- `status`: 反馈状态（varchar, 50字符）
- `user_uuid`: 用户UUID（varchar, 255字符）
- `content`: 反馈内容（text）
- `rating`: 评分（integer）
- `type`: **反馈类型**（varchar, 50字符）- 2025-11-19新增，用于区分反馈的具体类型
  - `general`: 一般反馈（默认值）
  - `bug_report`: 错误报告
  - `feature_request`: 功能请求
  - `user_experience`: 用户体验反馈

**索引：**

- `idx_feedbacks_type(type)`: 用于按反馈类型查询

**变更历史：**

- 2025-11-19: 新增 `type` 字段以支持反馈分类管理

### 系统通知

#### notifications 表（新增，规划）

系统通知主表，支持单用户通知与全站公告（公告通过 `audience_scope=global` 表示）。

字段要点：

- `id` 通知ID（uuid）
- `audience_scope` 受众范围（`user` / `global` / `segment`）
- `target_user_uuid` 指定用户（`audience_scope=user` 时必填）
- `type` 通知类型（`generation` / `subscription` / `credits` / `announcement` / `security` / `system`）
- `level` 通知级别（`info` / `success` / `warning` / `error`）
- `title` 标题（varchar 200）
- `content` 正文（text）
- `action_url` 关联跳转链接（可空）
- `action_label` 行为按钮文案（可空）
- `status` 状态（`active` / `inactive` / `deleted`）
- `metadata` JSONB 扩展字段（事件来源、资源ID等）
- `created_by` 创建人（system/admin）
- `created_at` 创建时间（timestamptz）
- `expires_at` 过期时间（可空）

索引建议：

- `idx_notifications_scope_created_at(audience_scope, created_at desc)`
- `idx_notifications_target_user(target_user_uuid, created_at desc)`
- `idx_notifications_status(status, created_at desc)`

#### notification_user_states 表（新增，规划）

用户通知状态表，用于记录阅读/归档状态（“读状态”与通知主体解耦，支持公告类通知的按用户读取）。

字段要点：

- `id` 主键（uuid）
- `notification_id` 通知ID（外键）
- `user_uuid` 用户ID
- `read_at` 已读时间（可空）
- `archived_at` 归档时间（可空）
- `created_at` 创建时间（timestamptz）

约束与索引：

- 唯一约束：`unique_notification_user(notification_id, user_uuid)`
- `idx_notification_user_states_user(user_uuid, read_at, created_at desc)`
- `idx_notification_user_states_notification(notification_id)`

受影响代码（规划）：

- `src/db/schema.ts`
- `src/models/notification.ts`
- `src/services/notification.ts`
- `src/app/api/notifications/*`

迁移文件（规划）：

- `src/db/migrations/00xx_add_notifications.sql`

## AnividAI 扩展表结构

### OC Maker 角色创建相关

#### oc_worlds 表（新增）

世界观系统管理表，用于定义不同的主题世界观（如Generic、Cyberpunk、Fantasy等）

**设计原则**：

- 核心字段+JSONB扩展相结合，平衡性能与灵活性
- 配置文件驱动（`src/configs/worlds/{slug}.json`）
- JSONB数组字段使用GIN索引优化查询性能

**字段说明**：

**基础信息**：

- `id` (serial, primary key) - 主键
- `slug` (varchar 80, not null) - URL友好标识（同一创建者范围内唯一）
- `name` (varchar 100, not null) - 世界观名称
- `genre` (varchar 50, nullable) - 世界流派（如 Fantasy, Cyberpunk, Slice of Life）
- `description` (text, nullable) - 世界观描述（最多500字）
- `cover_image_url` (text, nullable) - 封面图URL
- `allow_join` (boolean, default: true, not null) - 是否允许非 owner 将 OC 关联到该世界观

**核心设定字段（新增，用于世界观页面展示和筛选）**：

- `tags` (jsonb, default: '[]') - 视觉/主题标签列表（数组）
  - 格式：`["Neon", "Magic", "Medieval", "Dystopia"]`
  - 用途：细粒度搜索、AI 生成参考、社区探索
  - 索引：GIN索引支持数组元素查询
- `species` (jsonb, default: '[]') - 主要种族列表（数组）
...
**索引**：

- `uniq_oc_worlds_creator_slug` (unique) - (creator_uuid, slug) 唯一性
- `idx_oc_worlds_creator_uuid` - 创建者查询
- `idx_oc_worlds_is_preset` - 预置/自定义筛选
- `idx_oc_worlds_visibility_level` - 可见性筛选
- `idx_oc_worlds_genre` - 流派筛选
- `idx_oc_worlds_tags` (GIN) - 标签数组查询
- `idx_oc_worlds_species` (GIN) - 种族数组查询
- `idx_oc_worlds_climate` - 气候筛选
- `idx_oc_worlds_regions` (GIN) - 地区数组查询
- `idx_oc_worlds_tech_magic` - 科技体系筛选
- `idx_oc_worlds_factions` (GIN) - 势力查询
- `idx_oc_worlds_history` (GIN) - 历史事件查询

**性能优化策略**：

1. **高频查询字段**（species, climate, regions, tech_magic_system）提升到表级，避免JSONB嵌套查询
2. **GIN索引**：JSONB数组字段（species, regions, factions, history_timeline）使用GIN索引支持高效的数组元素查询
3. **预置世界观缓存**：预置世界观配置在服务启动时加载到内存，TTL 5小时
4. **用户自定义世界观缓存**：进程内内存缓存（Server Memory Cache），TTL 1小时

**实现文件**：

- Model层：`src/models/oc-world.ts`
- Service层：`src/services/world.ts`
- API层：`src/app/api/worlds/route.ts`
- 类型定义：`src/types/world.ts`
- 迁移文件：`src/db/migrations/0002_0011_combined.sql`
- 迁移文件：`src/db/migrations/0014_worlds_genre_tags.sql`
- 配置文件：`src/configs/worlds/preset-worlds.json`
- 详细设计文档：`docs/2-implementation/backend/world-detailed-fields.md`

#### characters 表（重构）

AI角色创建与管理主表

**重构变更（FEAT-OC-REBUILD）**：

**核心调整**：

1. **去除theme系统**：删除theme_id字段，改用world_uuid关联世界观表
2. **模块化存储**：新增modules字段（JSONB），存储扩展属性
3. **Tag系统**：新增tags字段（JSONB），支持自定义标签
4. **背景图支持**：新增background_url字段，支持自定义/AI生成背景

**新增字段**：

- `world_uuid` (uuid, nullable) - 关联oc_worlds表，替代theme_id
- `modules` (JSONB, nullable) - 模块化存储扩展属性，包含：
  - `appearance`: 外观模块（body_type, hair_color, eye_color, outfit_style, accessories等）
  - `personality`: 性格模块（personality_tags, quotes, welcome_message, extended_attributes等）
  - `background`: 背景模块（brief_introduction, background_story, background_segments等）
  - `art`: 艺术风格模块（fullbody_style、avatar_style、gallery等）
    - `art.gallery`: 角色视觉素材列表（数组）
      - `id`: string（稳定标识）
      - `url`: string（http/https URL 或 image_uuid）
      - `type`: `portrait` | `design_sheet` | `artwork` | `upload`
      - `label`: string（可选）
      - `meta`: record<string, string>（可选）
- `tags` (JSONB, default: '[]') - 自定义标签数组，支持GIN索引搜索
- `background_url` (text, nullable) - 角色详情页背景图URL
- `status` (varchar) - 角色状态（默认 `archived`）
- `avatar_generation_image_uuid` (varchar, nullable) - 角色头像关联 generation_images 表 UUID
- `profile_generation_image_uuid` (varchar, nullable) - 角色主立绘关联 generation_images 表 UUID（Primary Portrait）

**主立绘规则（FEAT-primary-portrait）**：

- `profile_generation_image_uuid` 必须指向 `modules.art.gallery` 中 `type=portrait` 的条目（若存在）
- 当 primary 被删除且仍有其他 portrait，默认取排序第一张 portrait 作为新 primary

**状态规则**：

- 自动生成：生成成功后将角色 `status` 置为 `archived`
- 手动创建：在生成立绘成功后将角色 `status` 置为 `archived`

**根字段（同步镜像/高频筛选）**：
角色字段以 `modules` 为唯一写入源，根字段用于高频筛选与兼容读取，值由服务层从 `modules` 同步：

- `name` - modules.appearance.name
- `gender` - modules.appearance.gender
- `age` - modules.appearance.age
- `species` - modules.appearance.species
- `role` - modules.appearance.role
- `brief_introduction` - modules.background.brief_introduction
- `personality_tags` - modules.personality.personality_tags

**索引优化**：

- `idx_characters_world(world_uuid)` - 世界观查询
- `idx_characters_tags(tags)` - GIN索引支持Tag搜索

**Zod Schema验证**：

- 文件位置：`src/types/oc.ts`（`CharacterModulesSchema`）
- 严格验证modules结构，确保数据一致性

**实现文件**：

- Model层：`src/models/character.ts`
- Service层：`src/services/character.ts`, `src/services/generation/character/`
- 迁移文件：`src/db/migrations/0002_0011_combined.sql`
- Schema定义：`src/types/oc.ts`

#### 数据迁移策略（FEAT-OC-REBUILD）

**迁移范围**：

- characters表扁平化字段 → modules JSONB
- theme_id → world_uuid映射

**迁移步骤**：

1. 新增字段（modules, world_uuid, tags, background_url）
2. 数据转换（旧字段映射到modules）
3. 验证数据完整性
4. 保留旧字段3个月（回滚窗口）

**迁移脚本**：

- 文件位置：`scripts/migrate-characters-to-modules.ts`
- 分批执行：每批1000条
- 失败重试：记录失败UUID到日志

**字段映射规则**：

```
modules.appearance: {
  body_type, hair_color, hair_style, eye_color,
  outfit_style, accessories, appearance_features
}

modules.personality: {
  personality_tags, quotes, welcome_message,
  extended_attributes
}

modules.background: {
  brief_introduction, background_story, background_segments
}

modules.art: {
  fullbody_style: art_style || 'default'
}
```

**world view映射**：

- theme_id='generic' → world_uuid=oc_worlds.slug='generic' 的 uuid
- theme_id=null → world_uuid=oc_worlds.slug='generic' 的 uuid
- 其他theme → 根据 slug 映射到 oc_worlds.uuid（无映射则 fallback 到 generic）

**验证脚本**：

- 文件位置：`scripts/verify-migration.ts`
- 检查项：modules完整性、world_uuid有效性、冗余字段同步

#### character_generations 表

角色相关的AI生成历史记录

- `generation_type`：记录生成内容类型（如 `image`、`chat`、`story`）
- `generation_uuid`：关联统一 `generations.uuid`
- `parameters`：JSON 快照，保存生成使用的模型、风格、参考图等参数，便于复用与追踪
- `visibility_level`：枚举 `public`/`private` 控制展示范围

#### character_remixs 表

角色衍生关系管理

#### user_interactions 表

用户与各种内容的交互记录（明细表）

**字段要点：**

- `user_uuid`: 用户标识
- `art_id`: 资源UUID（字符串）
- `art_type`: 资源类型（character, image, video, world, comment）
- `interaction_type`: 交互类型（like, favorite, share 等）
- `metadata`: JSON格式，存储额外信息
- `created_at`, `updated_at`: 时间戳

**约束：**

- 唯一约束：`(user_uuid, art_id, art_type, interaction_type)` - 同一用户对同一资源的同一类型交互只能有一条记录

**索引：**

- `idx_user_interactions_user(user_uuid)` - 用户维度查询
- `idx_user_interactions_art(art_id, art_type)` - 资源维度查询
- `idx_user_interactions_type(interaction_type)` - 交互类型查询
- `idx_user_interactions_user_art_type(user_uuid, art_type)` - 用户+资源类型组合查询

**设计说明：**
此表仅作为明细记录，支持：

1. 用户维度查询（"我的点赞/收藏列表"）
2. 用户交互状态查询（"是否已点赞/收藏"）
3. 数据一致性校验基准

统计数据通过冗余字段存储在资源表（characters, generation_images, generation_videos, oc_worlds）中，详见"社交统计字段设计"部分。
世界观使用 `oc_worlds` 的冗余统计字段承载计数，评论数与分享数同步更新。

### 社交统计字段设计

**设计原则：**
为提升社区列表查询性能，在所有可展示资源表中添加冗余统计字段，采用**双写策略**：

- 明细记录：user_interactions 表记录每个用户的交互行为
- 冗余统计：资源表直接存储统计计数，列表查询时直接读取

**统计字段：**
所有资源表（characters, generation_images, generation_videos, oc_worlds）统一包含：

- `like_count` (integer, default: 0, not null) - 点赞数
- `favorite_count` (integer, default: 0, not null) - 收藏数
- `comment_count` (integer, default: 0, not null) - 评论数（仅 oc_worlds）
- `share_count` (integer, default: 0, not null) - 分享数（仅 oc_worlds）

**索引优化：**

- `idx_[table]_like_count(like_count DESC)` - 支持"热门排序"查询

**双写机制：**
通过 Service 层事务保证一致性：

```typescript
await db().transaction(async (tx) => {
  // 1. 插入/删除 user_interactions 明细记录
  await upsertUserInteraction(data);

  // 2. 更新资源表统计字段（原子操作）
  await incrementStat(artType, artId, "like_count");
});
```

**原子更新：**
使用 SQL 原子操作避免并发问题：

```sql
UPDATE [table]
SET like_count = like_count + 1
WHERE uuid = ?
```

**数据校验：**
定期执行 `scripts/verify-social-stats.ts` 校验冗余字段与聚合结果一致性，发现不一致时可自动修复。

**实现文件：**

- Model层：`src/models/social-stats.ts`
- Service层：`src/services/user-interaction.ts`
- API层：`src/app/api/community/artworks/[uuid]/like/route.ts`, `favorite/route.ts`
- 迁移文件：`src/db/migrations/0009_add_social_stats.sql`
- 校验脚本：`scripts/verify-social-stats.ts`

### generations 表

生成任务总表，记录各种类型的生成物的生成任务相关

- 字段要点（2025-11-02 更新）：
  - `type`：一级任务类型，对齐业务主类目（image/video/character 等）
  - `sub_type`：二级任务类型，对应具体应用（如 `anime`、`avatar`、`action_figure` 等），为空表示尚未归类

聚合视图（建议-管理员分析）：

- `vw_generations_daily_counts(date, total, success, failed, type_counts json)`：基于 `generations` 的按日聚合；`type_counts` 为各类型计数映射（如 `{anime:10,video:2}`）。
- `vw_generation_failures_daily(date, type, failed_count)`：失败任务按日聚合（`status='failed'`）。
- `vw_generations_type_summary(type, total, last_updated_at)`：各类型总量与最近更新时间。

### 图片生成相关

#### generation_images 表

具体生成图片结果表 - 简化字段，专注核心功能

**新增字段**：

- `status` (varchar) - 图片状态（默认 `archived`）

### 视频生成数据模型

#### 生成类型定义

- 在 `generations.type` 中新增并使用取值：`video`（与 `anime/character/avatar` 并列）。
- 视频专属参数统一收敛到 `generations.metadata.video`，字段建议：
  - `duration`（秒）
  - `ratio`（如 `1:1|9:16|16:9`）
  - `resolution`（与模型配置一致，如 `480p|580p|720p|1080p`）
  - `motion`、`style`

#### generation_videos 表

用途：视频生成的明细结果表（同一生成可能存在多清晰度，多行表示）。

- 主键：`id`（identity），唯一键：`uuid`
- 关联：`generation_uuid`（→ `generations.uuid`），`user_uuid`
- 模型：`model_id`（具体模型标识符，如 `sora-2-text-to-video`、`runway`）
- 清晰度：`quality`（如 `720p/1080p`、`standard/high`）
- 资源：`video_url`、`poster_url`（可空）、`reference_image_url`（引用图片URL列表）
- 参数：`generation_params`（完整生成参数副本，JSON字符串格式）
- 技术：`codec`、`duration_seconds`、`ratio`、`resolution`
- 可见性：`visibility_level`（默认 `private`）
- 状态：`status`（默认 `archived`）
- 时间：`created_at`、`updated_at`

索引：

- `idx_generation_videos_generation_uuid(generation_uuid)`
- `idx_generation_videos_user_uuid(user_uuid)`
- `idx_generation_videos_quality(quality)`
- `idx_generation_videos_model_id(model_id)`
- 唯一：`uniq_generation_video_quality(generation_uuid, quality)`（同生成下限制每种清晰度一条）

#### 视频模型参数转换规则

由于不同视频模型的参数定义差异较大，需要建立统一的转换规则：

**Sora2/Sora2-Pro模型**：

- `duration_seconds`: 从 `n_frames` 直接转换（10→10s, 15→15s）
- `ratio`: 从 `aspect_ratio` 转换（portrait→9:16, landscape→16:9）
- `quality`: 从 `size` 参数映射（standard/high）
- `resolution`: 置空（该模型系列无此参数）

**Runway模型**：

- `duration_seconds`: 从 `duration` 提取数字（5s→5, 10s→10）
- `ratio`: 从 `aspectRatio` 转换（vertical→9:16, horizontal→16:9）
- `quality`: 直接映射 `quality` 参数（720p/1080p）
- `resolution`: 根据 `quality` 计算（720p→1280x720, 1080p→1920x1080）

**通用规则**：

- `generation_params`: 完整保存原始请求参数（JSON字符串）
- `model_id`: 存储精确的模型标识符
- 如模型无对应参数，相关字段保持NULL

### 内容展示相关

#### 社区作品聚合（MVP 统一视图方案）

目标：不新增 `artworks` 表，直接基于现有分表（`generation_images`、`generation_videos`、`characters`）构建统一查询视图，服务社区页。

- 统一视图：`community_artworks_view`（或 API 层 UNION 标准化）
  - 标准字段：
    - `type` enum: `oc | image | video`
    - `source_type` enum: `character | generation_image | generation_video`
    - `source_uuid` text
    - `author_uuid` text
    - `title` text
    - `cover_url` text
    - `media_urls` jsonb（oc: 1~3 预览；video: 封面 + 可选片段；image: 单图）
    - `tags` text[]（可为空）
    - `meta` jsonb（仅存 code，如 `model_code/style_code/race_code/accessory_codes[]`，展示名走系统级 i18n）
    - `created_at` timestamptz
  - 可见性：仅纳入 `public` 内容；具体字段从源表映射

- 统计聚合（MVP 两种策略）
  - A. 实时聚合：查询时从 `user_interactions` 以 `(source_type, source_uuid)` 聚合 `likes/views/comments`（简单但在高并发下较慢）
  - B. 轻量聚合表：`community_artwork_stats_mvp(source_type, source_uuid, likes, views, comments, hot_score)`，由异步任务定期回填（推荐）

- 排序语义：
  - `newest`: 直接用视图 `created_at desc`

## 运维与成本

### operation_costs 表（FEAT-manager-system）

用途：按月份与平台维度手工录入运营成本，辅助盈利分析。

字段：

- `id` identity
- `month` varchar(7) 记账月份，格式 `YYYY-MM`
- `platform` varchar(50) 平台/供应商（如 openai/replicate/r2）
- `amount` integer 金额（单位：最小货币单位，如分）
- `currency` varchar(10) 货币（默认 USD）
- `note` text 备注
- `created_at` timestamptz
- `updated_at` timestamptz

约束与索引：

- 唯一：`uniq_operation_costs_month_platform(month, platform)`
- 索引：`idx_operation_costs_month(month)`、`idx_operation_costs_platform(platform)`

迁移：更新 `src/db/schema.ts` 并通过 `pnpm db:generate` 生成迁移，执行 `pnpm db:migrate` 落库。

变更历史：

- 2025-10-31 FEAT-manager-system 新增 operation_costs 表
  - `top`: 按 `likes desc` 或 `likes + α·comments + β·views`
  - `trending`: 使用 `hot_score`（若采用策略B），或运行期计算（策略A）

- 索引与性能：
  - 依赖源表索引：
    - `generation_images`: `(visibility_level, created_at, user_uuid)`, `(gen_type)` 等
    - `generation_videos`: `(visibility_level, created_at, user_uuid)`
    - `characters`: `(visibility_level, created_at, user_uuid)`
  - 如使用物化视图：在视图上建 `(type, created_at)`、`(author_uuid, created_at)` 索引，周期刷新（如每 1–5 分钟）

- SEO/路由与详情：
  - 详情 ID 使用 `(source_type, source_uuid)` 组合或编码后的 `id`；前端路由 `/community/[type]/[id]` 对应到源表查询
  - SEO slug 可在 API 层按 title 派生（不落库）

- 国际化约定（通用要素）
  - 通用元素（模型/风格/种族/配饰等）在 `meta` 中仅保存 code；名称从系统级 i18n 读取：`src/i18n/messages/en.json`
  - 页面/操作文案使用页面级 i18n：`src/i18n/pages/community/en.json`

## 数据关系图

```
users (ShipAny框架)
  ├── credits (积分系统)
  ├── orders (支付订单)
  ├── characters (OC角色)
  │   ├── character_generations (角色生成历史)
  │   ├── character_assets (角色资源)
  │   └── character_chats (角色聊天)
  ├── character_remixs (角色衍生关系)
  ├── user_interactions (通用交互记录)
  └── generations (生成请求)
      └── generation_images (具体图片生成请求)

## 运营成本（新增）

### operation_costs 表（手工录入）

用途：按“月份+平台”记录成本，支持手工录入与历史追溯，服务盈利分析。

- 字段：
  - `id` identity 主键
  - `month` 文本（YYYY-MM）
  - `platform` 文本（如 openai/deepseek/storage）
  - `amount` int（以最小货币单位或统一币种计，遵循后端配置）
  - `currency` 文本（如 USD）
  - `note` 文本（可空）
  - `created_at` timestamptz
  - `updated_at` timestamptz

- 索引：
  - 组合索引 `(month, platform)`

- 迁移要点：
  - 新增表 `operation_costs`
  - 可追加唯一约束 `(month, platform)` 以避免重复录入（如需）

- 受影响代码：
  - model（新增）：`src/models/operation-cost.ts`
  - service（新增）：`src/services/operation-cost.ts`
  - revenue 服务：`src/services/admin/revenue.ts`

### 管理分析视图（汇总）

- `vw_orders_daily_revenue(date, revenue)`：来自 `orders`（paid）。
- `vw_generations_daily_counts(date, total, success, failed, type_counts json)`：来自 `generations`。
- `vw_generation_failures_daily(date, type, failed_count)`：来自 `generations`（failed）。
- `vw_generations_type_summary(type, total, last_updated_at)`：来自 `generations`。

- 迁移要点：
  - 以只读视图形式创建；如后续性能瓶颈，可替换为物化视图并增加索引（例：`(date)`、`(type, date)`）。

变更历史：
- 2025-10-31 FEAT-manager-system 新增 operation_costs 表与管理员分析视图说明（影响：API/表/页面）


JSON配置文件:
- src/configs/models/ai-models.json (AI模型配置)
- src/configs/styles/anime_styles.json (动漫风格参数)
- src/configs/parameters/scenes.json (场景参数)
- src/configs/parameters/outfits.json (服饰参数)
- src/configs/parameters/actions.json (动作参数)
- src/configs/parameters/camera-motions.json (视频运镜参数)
- src/configs/characters/personality-tags.json (性格标签配置)
- src/configs/characters/hair-colors.json (发色选项配置)
- src/configs/characters/eye-colors.json (眼色选项配置)
- src/configs/characters/body-types.json (体型选项配置)
- src/configs/characters/art-styles.json (立绘风格配置)
- src/configs/characters/templates.json (角色模板配置)
- src/configs/gallery/anime-example-gallery.json (生图示例)
- src/configs/gallery/oc-example-gallery.json (OC示例)
- src/configs/gallery/video-example-gallery.json (视频示例)
```

### 关系说明

- **1:N 关系**:
  - `users` → `characters`: 一个用户可以创建多个角色
  - `users` → `generations`: 一个用户可以有多个生成请求
  - `characters` → `character_generations`: 一个角色可以有多个生成历史
  - `characters` → `character_assets`: 一个角色可以有多个资源文件
  - `characters` → `character_chats`: 一个角色可以有多个聊天记录
  - `generations` → `generation_images`: 一个请求可以生成多张图片
- **M:N 关系**:
  - `users` ↔ `characters/images` (通过 `user_interactions`): 用户可以与多种内容类型交互
  - `characters` ↔ `characters` (通过 `character_remixs`): 角色之间的衍生关系
- **配置引用关系**:
  - `generations` 和 `generation_images` 表中的配置字段（如 `model_name`, `style_preset`）直接引用JSON配置文件中的key值
  - 不再使用外键约束，改为程序逻辑验证配置的有效性
- **JSON配置文件**:
  - 所有配置数据存储在版本控制的JSON文件中
  - 支持热更新和灵活的配置管理
  - 便于国际化和多环境部署

## 索引策略

### 核心查询索引

#### OC Maker 相关索引

- `characters.user_id + created_at`: 用户角色列表查询
- `characters.visibility_level`: 公开角色筛选
- `characters.user_id + visibility_level`: 用户权限角色查询
- `characters.visibility_level + like_count + created_at`: 热门公开角色排序
- `characters.remixed_from_uuid`: Remix关系查询
- `character_generations.character_id`: 角色生成历史查询
- `character_chats.character_id + user_id`: 用户与角色聊天记录
- `user_interactions.user_id + art_id + art_type + interaction_type`: 用户交互记录
- `user_interactions.art_type`: 按内容类型筛选交互
- `user_interactions.user_id + art_type`: 用户在特定类型内容上的交互
- `character_remixs.original_character_id`: 角色衍生关系查询

#### 图片生成相关索引

- `generations.user_uuid + created_at`: 用户生成历史查询
- `generations.status`: 批量状态检查
- `generations.type`: 按类型筛选生成记录
- `generations.user_uuid + type`: 用户特定类型生成历史
- `generations.aspect_ratio`: 按比例筛选生成记录
- `generation_images.generation_uuid`: 查询特定请求的所有图片
- `generation_images.generation_uuid + image_index`: 按序号查询图片

### 性能优化索引

- `generations.created_at`: 按时间分页
- `generation_images.status`: 批量查询图片状态
- `generation_images.moderation_status`: 内容审核管理
- `generation_images.style_preset`: 按风格查询图片
- `generation_images.scene_preset`: 按场景查询图片

### 批量生成专用索引

- `generation_images.generation_uuid + image_index`: 确保同批次图片的有序查询
- `generations.counts`: 按请求图片数量统计
- `generations.success_count`: 按成功率分析

### JSON配置查询优化

- 配置数据由JSON文件加载到内存，提供快速查询
- 支持缓存机制和热更新
- 配置数据的索引和筛选通过程序逻辑实现

### 一键复用专用索引

- `generation_images.generation_params`: JSON参数快速访问
- `generation_images.original_prompt`: 原始提示词搜索
- `generation_images.model_name + style_preset`: 组合参数查询

### 视频生成相关索引

- `generation_videos.generation_uuid`：查询某次生成的全部视频变体
- `generation_videos.user_uuid`：用户维度查询
- `generation_videos.quality`：按清晰度筛选
- 唯一：`generation_videos(generation_uuid, quality)` 确保同生成下质量唯一

## JSON配置文件管理

所有配置数据现在通过 `src/configs/` 目录下的JSON文件管理：

### 配置文件结构（对齐仓库实际结构）

```
src/configs/
├── models/
│   └── ai-models.json
├── styles/
│   └── anime_styles.json
├── parameters/
│   ├── scenes.json
│   ├── outfits.json
│   ├── actions.json
│   └── camera-motions.json
├── characters/
│   └── characters.json
└── gallery/
    ├── anime-example-gallery.json
    ├── oc-example-gallery.json
    └── video-example-gallery.json
```

## 备注与一致性

- 部分文档中“规划中”的表（如 `character_chats/user_interactions/...`）需与实际 schema 进度同步；若未落地则视为占位说明。
- 错误信息统一英文；页面文案采用页面级 i18n 配置，避免混用全局 messages。

### 配置加载机制

- 服务启动时加载JSON配置文件到内存
- 支持热更新和配置缓存
- 提供配置验证和错误处理
- 支持多环境配置管理

### 国际化支持

所有配置文件使用 `i18n_name_key` 和 `i18n_description_key` 字段，通过ShipAny框架的国际化系统获取多语言翻译。

## 图片生成类型定义

### 当前支持类型

- **anime**: 动漫插画 (MVP核心功能)
- **character**: 角色设计 (后续扩展)
- **background**: 背景图 (后续扩展)

### 类型扩展说明

每种类型可以有：

- 独特的风格预设
- 不同的生成参数范围
- 特定的AI模型支持
- 分类的画廊展示

## 一键复用功能实现

### 参数记录机制

每张生成图片在 `generation_images` 表中完整记录：

1. **JSON参数**: `generation_params` 字段存储完整参数副本
2. **关键字段**: 展开存储便于查询的关键参数
3. **最终提示词**: `final_prompt` 记录经过处理的完整提示词
4. **原始输入**: `original_prompt` 保留用户原始输入

### 一键复用流程

```javascript
// 1. 获取图片参数
GET /api/generation-image/{uuid}/reuse-params
{
  "original_prompt": "a beautiful girl",
  "parameters": {
    "style": "ghiblio",
    "scene": "forest",
    "outfit": "hanfu",
    "model": "sdxl",
    "aspect_ratio": "1:1"
  }
}

// 2. 应用到生成器
function applyImageParams(params) {
  setPrompt(params.original_prompt);
  setStylePreset(params.parameters.style);
  setScenePreset(params.parameters.scene);
  setOutfitPreset(params.parameters.outfit);
  // ... 其他参数
}
```

## 国际化方案说明

### i18n Key 映射方案

采用 ShipAny 框架的国际化系统，将数据库中的多语言字段改为 i18n key，通过框架获取翻译：

1. **数据库字段调整**: 将 `display_name` → `i18n_name_key`，`description` → `i18n_description_key`
2. **翻译文件组织**: 在 `src/i18n/pages/anime-generator/` 下按类别组织翻译
3. **前端适配**: 创建 `useParameterTranslations` hook 处理参数翻译
4. **数据迁移**: 分阶段迁移现有数据为 i18n key 格式

### 翻译文件结构示例

```json
// src/i18n/pages/anime-generator/en.json
{
  "styles": {
    "ghiblio": {
      "name": "Ghiblio Style",
      "description": "Studio Ghiblio inspired anime art style"
    }
  },
  "scenes": {
    "forest": {
      "name": "Magical Forest",
      "description": "Ancient trees with filtered sunlight"
    }
  }
}
```

## AnividAI 扩展：Video Generation（新增）

说明：沿用 `generations` 统一任务表，不新增专属视频参数字段；所有视频专属参数放入 `generations.metadata.video`（JSON）。另新增视频资源表存储不同清晰度与封面。

### 表：generations（约定）

- 约定字段：
  - `type`: enum('image','video') — 标识视频任务为 `video`
  - `metadata`: jsonb — 保存专属参数：
    ```json
    {
      "video": {
        "duration_seconds": 5,
        "ratio": "9:16",
        "resolution": "720p",
        "model": "kling-vX",
        "presets": { "style": "anime" },
        "motion": "pan"
      }
    }
    ```

代码位置（涉及）：

- 模型与迁移：`src/db/schema.ts`、`src/db/migrations/`（如需为 metadata 增加索引）
- 服务：`src/services/generation.ts` 或 `src/services/video-generation.ts`
- API：`src/app/api/anime-video/create-task/route.ts`、`src/app/api/generation/status/[uuid]/route.ts`

### 表：generation_videos（新增）

- 字段：
  - `id` pk
  - `generation_uuid` fk -> generations.uuid
  - `video_url` text
  - `poster_url` text（封面使用视频首帧提取）
  - `quality` text — '720p' | '1080p'
  - `codec` text — 'h264' 等
  - `created_at` timestamp

代码位置（涉及）：

- 模型与迁移：`src/db/schema.ts`、`src/db/migrations/`
- 存储工具：`src/lib/storage/`、`src/lib/r2-utils.ts`

### 配置

- 分辨率档位：`src/configs/generation/resolution-configs.ts`（新增视频配置）
- 提示词模板：`src/configs/prompts/video/*.json`

---

## Chat with OC 聊天相关

### character_chats 表

角色对话消息记录表

字段：

- `id` pk (identity)
- `uuid` varchar(255) unique - 消息唯一标识
- `user_uuid` varchar(255) - 用户 UUID
- `character_uuid` varchar(255) - 角色 UUID (→ characters.uuid)
- `session_id` varchar(255) - 会话 ID,用于分组多轮对话
- `message_index` integer - 消息在会话中的序号 (1,2,3...)
- `role` varchar(20) - 消息角色: `user` | `assistant` | `system`
- `content` text - 消息内容
- `metadata` jsonb - 扩展元数据 (token 消耗、模型版本、情绪标签等)
- `is_archived` boolean default false - 是否已归档 (分层存储标记)
- `archived_at` timestamptz - 归档时间
- `archived_to_r2` boolean default false - 是否已物理归档到 R2 (true 表示主表可删除)
- `archive_metadata` jsonb - 归档元数据 (R2 路径、文件大小、压缩率等)
- `created_at` timestamptz default now()

索引：

- `idx_character_chats_session(session_id, message_index)` - 会话消息查询
- `idx_character_chats_character(character_uuid, created_at)` - 角色维度查询
- `idx_character_chats_user(user_uuid, created_at)` - 用户维度查询
- `idx_character_chats_archived(is_archived, created_at)` - 归档查询

代码位置：

- 模型与迁移：`src/db/schema.ts`、`src/db/migrations/`
- 服务：`src/services/chat/chat-service.ts`
- API：`src/app/api/chat/send-message/route.ts`、`src/app/api/chat/history/route.ts`

### chat_sessions 表

聊天会话元数据管理表

字段：

- `id` pk (identity)
- `session_id` varchar(255) unique - 会话唯一标识
- `user_uuid` varchar(255) - 用户 UUID
- `character_uuid` varchar(255) - 角色 UUID
- `title` varchar(255) - 会话标题 (自动生成或用户编辑)
- `message_count` integer default 0 - 消息总数
- `last_message_at` timestamptz - 最后一条消息时间
- `context_window_size` integer default 20 - 滑动窗口大小 (轮次)
- `total_tokens_used` integer default 0 - 累计消耗 token 数
- `total_credits_used` integer default 0 - 累计消耗积分 (MC)
- `archived_message_count` integer default 0 - 已归档到 R2 的消息数
- `last_archived_at` timestamptz - 最后一次归档时间
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

索引：

- `idx_chat_sessions_user_character(user_uuid, character_uuid)` - 用户-角色会话查询
- `idx_chat_sessions_updated(updated_at)` - 按更新时间排序

代码位置：

- 模型与迁移：`src/db/schema.ts`、`src/db/migrations/`
- 服务：`src/services/chat/chat-service.ts`
- API：`src/app/api/chat/sessions/route.ts`

### 聊天配置

聊天相关配置存储在 JSON 文件中：

- `src/configs/chat/chat-limits.json` - 会员等级限制配置
- `src/configs/prompts/character-chat.json` - 角色聊天提示词模板

配置示例：

```json
// chat-limits.json
{
  "free": {
    "context_window_size": 10,
    "max_tokens_per_message": 4096,
    "max_message_length": 2000
  },
  "pro": {
    "context_window_size": 20,
    "max_tokens_per_message": 8192,
    "max_message_length": 5000,
    "rate_limit_per_minute": 50,
    "rate_limit_per_day": 2000
  }
}
```

### 聊天索引策略

核心查询索引：

- `character_chats.session_id + message_index` - 会话消息有序查询
- `character_chats.character_uuid + created_at` - 角色历史消息
- `character_chats.is_archived + created_at` - 归档消息管理
- `chat_sessions.user_uuid + character_uuid` - 用户与特定角色的会话列表
- `chat_sessions.updated_at` - 会话按活跃度排序

性能优化：

- 热数据 (is_archived=false) 保持在主表,快速查询
- 冷数据定期归档,减少主表大小
- 会话级缓存 (Redis) 减少数据库查询

## Story Lab 数据模型（规划）

Related: FEAT-story-lab (`docs/2-implementation/features/feature-story-lab.md`)

目标：支持 Story Lab 的阶段化编排、中间结构存储、局部重试与可观测日志。

### story_lab_runs 表（新增，规划）

字段：
- `id` pk (identity)
- `uuid` varchar(255) unique - run 唯一标识
- `user_uuid` varchar(255) - 所属用户
- `title` varchar(255) - run 标题
- `script_content` text - 原始脚本
- `language` varchar(20) - en/ja
- `status` varchar(30) - `draft|parsing|planning|generating|packaging|completed|error`
- `current_phase` varchar(30) - 当前阶段
- `world_uuid` uuid nullable - 绑定世界观
- `character_uuids` varchar(1000) nullable - 逗号分隔角色 UUID
- `metrics` jsonb - 统计信息（成功率、重试次数、耗时）
- `last_error_code` varchar(100) nullable
- `last_error_message` text nullable
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

索引：
- `idx_story_lab_runs_user(user_uuid, created_at desc)`
- `idx_story_lab_runs_status(status, updated_at desc)`
- `idx_story_lab_runs_world(world_uuid)`

### story_lab_scenes 表（新增，规划）

字段：
- `id` pk (identity)
- `uuid` varchar(255) unique
- `run_uuid` varchar(255)
- `scene_index` integer
- `summary` text
- `intent` varchar(255)
- `location` varchar(255)
- `time_label` varchar(100)
- `participants` jsonb
- `raw_payload` jsonb - LLM 原始结构
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

索引：
- `idx_story_lab_scenes_run(run_uuid, scene_index)`

### story_lab_shots 表（新增，规划）

字段：
- `id` pk (identity)
- `uuid` varchar(255) unique
- `run_uuid` varchar(255)
- `scene_uuid` varchar(255)
- `shot_index` integer
- `camera` varchar(100)
- `composition` varchar(100)
- `motion` varchar(100)
- `duration_seconds` integer
- `dialogue_ref` text nullable
- `prompt_snapshot` text nullable
- `anchor_snapshot` jsonb nullable
- `generation_uuid` varchar(255) nullable - 关联现有 generations.uuid
- `status` varchar(30) - `planned|queued|processing|completed|failed`
- `retry_count` integer default 0
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

索引：
- `idx_story_lab_shots_run(run_uuid, shot_index)`
- `idx_story_lab_shots_scene(scene_uuid, shot_index)`
- `idx_story_lab_shots_generation(generation_uuid)`
- `idx_story_lab_shots_status(status, updated_at desc)`

### story_lab_logs 表（新增，规划）

字段：
- `id` pk (identity)
- `uuid` varchar(255) unique
- `run_uuid` varchar(255)
- `phase` varchar(30)
- `event_type` varchar(50) - started/succeeded/failed/retry/export
- `input_snapshot` jsonb
- `output_snapshot` jsonb
- `provider` varchar(100) nullable
- `error_code` varchar(100) nullable
- `error_message` text nullable
- `duration_ms` integer nullable
- `created_at` timestamptz default now()

索引：
- `idx_story_lab_logs_run(run_uuid, created_at desc)`
- `idx_story_lab_logs_phase(phase, created_at desc)`

### 与现有生成表的关系

- `story_lab_shots.generation_uuid` -> `generations.uuid`
- 媒体产物仍存于：
  - `generation_images`（图片镜头）
  - `generation_videos`（视频镜头）
- Story Lab 不重复存媒体 URL 主副本，仅存“编排侧结构 + 关联 ID”。

涉及代码文件（规划）：
- `src/db/schema.ts`
- `src/models/generation.ts`
- `src/services/generation/factory/generation-service-factory.ts`
- `src/services/story-lab/*`
- `src/app/api/story-lab/*`

---

## 变更历史

- 2026-02-11 FEAT-story-lab 新增 Story Lab 规划数据模型（runs/scenes/shots/logs）与 generation 关联关系说明（影响：表/API/服务）

- 2025-09-03 FEAT-001 创建AnividAI数据模型设计v1.0，新增generations、style_presets、ai_models、gallery_images表
- 2025-09-03 FEAT-001 增加type字段支持多类型图片生成，完善风格预设的类型适配
- 2025-09-03 FEAT-001 优化支持批量生成：拆分generation_images表，完善索引和关系设计
- 2025-09-03 FEAT-002 升级为专业参数系统：新增parameter_configs表，支持灵活参数管理和图生图功能
- 2025-09-03 FEAT-003 实现一键复用功能：扩展generation_images表记录完整参数，简化预设表为quick_start_presets
- 2025-09-09 FEAT-001 简化数据模型：移除传统SD参数字段，更新AI模型配置支持gpt-image-1和nano-banana
- 2025-09-09 FEAT-001 增加任务跟踪字段：在generations和generation_images表中增加remote_task_id、callback_received、remote_status等字段，支持KieAI异步任务模式，设置nano-banana为默认模型
- 2025-09-08 FEAT-004 国际化适配：将所有配置表的display_name和description字段改为i18n_name_key和i18n_description_key，采用ShipAny框架的国际化系统
- 2025-09-09 FEAT-005 配置化改造：删除ai_models、style_presets、quick_start_presets、gallery_images表，改为JSON配置文件管理，简化数据库结构并提高配置管理效率
- 2025-09-22 FEAT-OC-MAKER OC Maker数据模型设计：新增characters、character_generations、character_assets、character_chats、character_remixs、user_interactions表，支持角色创建、管理、交互和衍生功能
- 2025-09-25 FEAT-OC-MAKER 简化主题系统：删除oc_themes、theme_species、theme_presets表，改为纯JSON配置文件方案，characters表仅保留theme_id字段用于关联，通过src/configs/oc-themes/配置文件实现主题化功能
- 2025-09-26 FEAT-OC-MAKER 重构交互表：将user_character_interactions表重构为user_interactions通用交互表，新增art_type字段支持character、image等多种内容类型，增加metadata字段存储扩展信息，优化索引策略提升查询性能
- 2025-09-27 FEAT-OC-MAKER 扩展角色数据模型：新增extended_attributes、background_segments、body_type、hair_color、eye_color、art_style、forked_from_id字段，支持扩展属性、背景分段、详细外观设定和Fork功能，补充角色相关配置文件
- 2025-09-27 FEAT-OC-MAKER 文档清理：删除过期的character_presets和card_style_templates表定义，清理历史引用，保持文档结构清晰一致
- 2025-10-02 FEAT-MODEL-REFACTOR 数据模型字段调整：generation_images表移除actual_width/actual_height/remote_task_id/remote_status/status/is_favorite/download_count/file_size/thumbnail_url字段，新增visibility_level/action_preset/thumbnail_mobile/thumbnail_desktop/thumbnail_detail字段；characters表字段重命名allow_fork→allow_remix/forked_from_id→remixed_from_uuid/fork_count→remix_count，character_remixs表字段重命名forked_character_id→remixed_character_id/fork_type→remix_type
- 2025-10-02 FEAT-GEN-TYPE 新增图片类型字段：generation_images表新增gen_type字段用于标识生成图片的具体类型（anime/avatar/character/background/logo/portrait等），新增对应索引idx_gen_type和复合索引idx_gen_type_visibility，更新相关TypeScript类型定义
- 2025-10-02 FEAT-PRESET-REFACTOR 预设参数重构：移除generations表中的单独预设字段（style_preset/scene_preset/outfit_preset/action_preset/aspect_ratio），简化为style字段存储样式信息；保留TypeScript接口中的预设参数用于应用逻辑，在数据写入时进行JSON化处理；更新AnimePromptBuilder支持完整预设处理逻辑
- 2025-10-03 FEAT-PRO-SUBSCRIPTION Pro订阅功能：在users表新增is_sub、sub_expired_at、sub_plan_type字段，支持订阅用户pro状态管理，通过实时过期时间比较判断pro权限有效性
- 2025-10-18 FEAT-OC-MAKER 调整角色生成历史表：移除prompt_used字段，统一使用parameters JSON快照记录生成参数，确保OC生成记录与业务逻辑兼容
- 2025-10-22 FEAT-community 更新：采用统一视图（MVP），暂不创建 artworks 表；通过 community_artworks_view 或 API 层 UNION 聚合，统计使用实时聚合或轻量聚合表
- 2025-10-25 FEAT-video-params 优化视频数据模型：generation_videos表新增model_id、generation_params、reference_image_url字段，建立模型参数转换规则，支持sora2/sora2-pro/runway等不同模型的参数标准化存储
- 2025-10-27 FEAT-CHAT Chat with OC数据模型设计：新增character_chats、chat_sessions表，支持角色对话记录、会话管理、分层存储和可配置上下文窗口，集成积分扣费机制
- 2025-10-27 FEAT-CHAT-ARCHIVE 优化聊天归档策略：character_chats表新增archived_to_r2、archive_metadata字段支持物理归档到Cloudflare R2；chat_sessions表新增archived_message_count、last_archived_at字段追踪归档状态；采用gzip压缩+批量归档降低存储成本约73%
- 2025-10-28 MIGRATION-CLEANUP 数据库迁移整合：清理冗余迁移文件(19个迁移合并为单一clean migration 0000_previous_energizer.sql)，修复字段拼写错误(apperance_features→appearance_features)，重新生成干净的迁移历史，创建验证脚本scripts/verify-migrations.ts确保journal与实际数据库状态一致，备份旧迁移文件至migrations_backup_20251028_cleanup
- 2025-11-02 FEAT-generation-taxonomy 新增 generations.sub_type 字段与索引，支撑两级类型分类（影响：表/文档）
- 2025-11-08 FEAT-social-stats 统一社交统计字段设计：为characters、generation_images、generation_videos表添加like_count、favorite_count冗余字段，删除characters表的view_count、remix_count、generation_count字段；实现事务双写机制（user_interactions明细表+资源表冗余字段同步更新）；创建通用统计Model（src/models/social-stats.ts）、优化community Service查询性能、添加数据校验脚本（scripts/verify-social-stats.ts）
- 2025-11-12 DATABASE-CONSOLIDATION 数据库配置整理与迁移重建：归档历史迁移文件（14个）至src/db/migrations/archive/old-migrations/；基于schema.ts重新生成干净的单一初始迁移0000_initial_schema.sql（27KB，495行，包含全部23个表）；删除废弃的种子数据文件src/db/seed-data/；创建数据库部署说明文档src/db/README.md；更新验证脚本scripts/verify-migrations-simple.ts支持全部23个表检查；确保生产环境可通过单一迁移文件快速复制数据库结构（相关文件：src/db/schema.ts、src/db/migrations/0000_initial_schema.sql、src/db/README.md）
- 2026-01-16 FEAT-STATUS-ARCHIVE 为characters/generation_images/generation_videos新增status字段，默认archived（影响：数据模型）
- 2026-01-21 FEAT-subscription 会员字段更名：users.is_pro/pro_expired_at/pro_plan_type → users.is_sub/sub_expired_at/sub_plan_type（影响：表/服务/API/前端）
- 2026-01-22 FEAT-WORLDS oc_worlds 可见性字段调整为 visibility_level（影响：表/服务/API）
- 2026-01-23 FEAT-WORLDS 世界观社交属性复用 user_interactions/comments，新增 oc_worlds 统计字段说明（影响：表/文档）
- 2026-01-28 FEAT-WORLDS oc_worlds 新增 allow_join 字段（影响：表/服务/API）
- 2026-01-28 FEAT-primary-portrait 明确 characters 主立绘与 modules.art.gallery 规范（影响：表/文档）
- 2026-02-06 FEAT-NOTIFICATIONS 新增系统通知数据模型规划（影响：表/API/服务）
