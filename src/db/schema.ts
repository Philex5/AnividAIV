import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
  json,
  jsonb,
  uuid,
  index,
  date,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    email: varchar({ length: 255 }).notNull(),
    created_at: timestamp({ withTimezone: true }),
    nickname: varchar({ length: 255 }),
    display_name: varchar({ length: 255 }),
    avatar_url: varchar({ length: 255 }),
    gender: varchar({ length: 20 }),
    bio: text(),
    background_url: text(),
    locale: varchar({ length: 50 }),
    signin_type: varchar({ length: 50 }),
    signin_ip: varchar({ length: 255 }),
    signin_provider: varchar({ length: 50 }),
    signin_openid: varchar({ length: 255 }),
    signup_country: varchar({ length: 10 }),
    signup_ref: varchar({ length: 255 }),
    signup_utm_source: varchar({ length: 255 }),
    invite_code: varchar({ length: 255 }).notNull().default(""),
    updated_at: timestamp({ withTimezone: true }),
    invited_by: varchar({ length: 255 }).notNull().default(""),
    is_affiliate: boolean().notNull().default(false),
    is_sub: boolean().notNull().default(false),
    sub_expired_at: timestamp({ withTimezone: true }),
    sub_plan_type: varchar({ length: 50 }),
  },
  (table) => [
    uniqueIndex("email_provider_unique_idx").on(
      table.email,
      table.signin_provider
    ),
  ]
);

// Orders table
export const orders = pgTable("orders", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  order_no: varchar({ length: 255 }).notNull().unique(),
  created_at: timestamp({ withTimezone: true }),
  user_uuid: varchar({ length: 255 }).notNull().default(""),
  user_email: varchar({ length: 255 }).notNull().default(""),
  amount: integer().notNull(),
  interval: varchar({ length: 50 }),
  expired_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }).notNull(),
  stripe_session_id: varchar({ length: 255 }),
  credits: integer().notNull(),
  currency: varchar({ length: 50 }),
  sub_id: varchar({ length: 255 }),
  sub_interval_count: integer(),
  sub_cycle_anchor: integer(),
  sub_period_end: integer(),
  sub_period_start: integer(),
  sub_times: integer(),
  product_id: varchar({ length: 255 }),
  product_name: varchar({ length: 255 }),
  valid_months: integer(),
  order_detail: text(),
  paid_at: timestamp({ withTimezone: true }),
  paid_email: varchar({ length: 255 }),
  paid_detail: text(),
});

// API Keys table
export const apikeys = pgTable("apikeys", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  api_key: varchar({ length: 255 }).notNull().unique(),
  title: varchar({ length: 100 }),
  user_uuid: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
});

// Credits table
export const credits = pgTable(
  "credits",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    trans_no: varchar({ length: 255 }).notNull().unique(),
    created_at: timestamp({ withTimezone: true }),
    user_uuid: varchar({ length: 255 }).notNull(),
    trans_type: varchar({ length: 50 }).notNull(),
    credits: integer().notNull(),
    order_no: varchar({ length: 255 }),
    expired_at: timestamp({ withTimezone: true }),
    actived_at: timestamp({ withTimezone: true }).notNull(),
    // 新增字段：关联生成任务
    generation_uuid: varchar({ length: 255 }),
    // 新增字段：软删除机制
    is_voided: boolean().default(false),
    voided_at: timestamp({ withTimezone: true }),
    voided_reason: varchar({ length: 255 }),
  },
  (table) => [
    index("idx_credits_generation_uuid").on(table.generation_uuid),
    index("idx_credits_user_valid").on(
      table.user_uuid,
      table.is_voided,
      table.expired_at
    ),
    index("idx_credits_voided_at").on(table.voided_at),
  ]
);

// Categories table
export const categories = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull().unique(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  status: varchar({ length: 50 }),
  sort: integer().notNull().default(0),
  created_at: timestamp({ withTimezone: true }),
  updated_at: timestamp({ withTimezone: true }),
});

// Posts table
export const posts = pgTable("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: varchar({ length: 255 }).notNull().unique(),
  slug: varchar({ length: 255 }),
  title: varchar({ length: 255 }),
  description: text(),
  content: text(),
  created_at: timestamp({ withTimezone: true }),
  updated_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
  cover_url: varchar({ length: 255 }),
  author_name: varchar({ length: 255 }),
  author_avatar_url: varchar({ length: 255 }),
  locale: varchar({ length: 50 }),
  category_uuid: varchar({ length: 255 }),
});

// Affiliates table
export const affiliates = pgTable("affiliates", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_uuid: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }).notNull().default(""),
  invited_by: varchar({ length: 255 }).notNull(),
  paid_order_no: varchar({ length: 255 }).notNull().default(""),
  paid_amount: integer().notNull().default(0),
  reward_percent: integer().notNull().default(0),
  reward_amount: integer().notNull().default(0),
});

// Feedbacks table
export const feedbacks = pgTable(
  "feedbacks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    created_at: timestamp({ withTimezone: true }),
    status: varchar({ length: 50 }),
    user_uuid: varchar({ length: 255 }),
    content: text(),
    rating: integer(),
    // 新增字段：用于区分用户反馈的具体类型
    type: varchar({ length: 50 }).notNull().default("general"), // general, bug_report, feature_request, user_experience
  },
  (table) => [
    index("idx_feedbacks_type").on(table.type),
  ]
);

// Generations - AI生成任务记录表
export const generations = pgTable(
  "generations",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    user_uuid: varchar({ length: 255 }).notNull(),
    created_at: timestamp({ withTimezone: true }),
    updated_at: timestamp({ withTimezone: true }),

    // 生成类型
    type: varchar({ length: 50 }).notNull().default("anime"), // anime, avatar, character
    sub_type: varchar({ length: 100 }), // 细化的二级类型，例如 anime, avatar, action-figure

    // 生成请求信息
    prompt: text().notNull(),
    model_id: varchar({ length: 100 }).notNull(),
    style_preset: varchar({ length: 100 }), // 样式预设

    // 参考图片
    reference_image_url: varchar({ length: 500 }), // 参考图片URL

    // 批量生成设置
    counts: integer().notNull().default(1), // 请求生成的图片数量
    success_count: integer().default(0), // 实际成功生成的数量

    // 任务跟踪 (支持KieAI异步任务模式)
    remote_task_id: varchar({ length: 255 }), // KieAI远程任务ID
    callback_received: boolean().default(false), // 是否已收到webhook回调
    last_query_time: timestamp({ withTimezone: true }), // 最后查询远程状态的时间

    // 状态和结果
    status: varchar({ length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
    progress: integer().default(0), // 0-100

    // 消耗和统计
    credits_cost: integer().notNull().default(1), // 按请求收费，不按图片数量
    generation_time: integer(), // 总生成时间(秒)

    // 错误信息
    error_message: text(),
    error_code: varchar({ length: 50 }),

    // 元数据 (存储额外的业务信息)
    metadata: json(),

    // 角色关联 (OC Maker功能)
    character_uuids: varchar({ length: 1000 }), // 逗号分隔的角色UUID列表

    // 可见性控制
    visibility_level: varchar({ length: 20 }).notNull().default("private"), // public, private

    // 文件转存状态 (延迟转存策略)
    file_transfer_status: varchar({ length: 20 }).default("pending"), // pending, transferring, completed, failed, skipped
    temp_url_expires_at: timestamp({ withTimezone: true }), // 临时URL过期时间
    transfer_retry_count: integer().default(0), // 转存重试次数
  },
  (table) => [
    index("idx_generations_user_uuid").on(table.user_uuid),
    index("idx_generations_type").on(table.type),
    index("idx_generations_sub_type").on(table.sub_type),
    index("idx_generations_status").on(table.status),
    index("idx_generations_visibility_level").on(table.visibility_level),
    index("idx_generations_model_id").on(table.model_id),
    index("idx_generations_created_at").on(table.created_at),
    index("idx_generations_remote_task_id").on(table.remote_task_id),
    index("idx_generations_character_uuids").on(table.character_uuids),
    // 文件转存索引
    index("idx_generations_file_transfer_status").on(table.file_transfer_status),
    index("idx_generations_temp_url_expires").on(table.temp_url_expires_at),
    // 复合索引用于优化查询用户最后活跃时间
    index("idx_generations_user_created").on(table.user_uuid, table.created_at),
  ]
);

// Generation Images table - 生成的图片记录
export const generationImages = pgTable(
  "generation_images",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    generation_uuid: varchar({ length: 255 }).notNull(), // 关联generations表
    user_uuid: varchar({ length: 255 }).notNull(), // 用户UUID，便于快速检索用户图片

    // 批次信息
    image_index: integer().notNull(), // 在同批次中的序号 (1,2,3,4)

    // 图片类型
    gen_type: varchar({ length: 50 }), // anime, avatar, character,etc

    style: varchar({ length: 50 }),
    // 图片文件
    image_url: varchar({ length: 500 }).notNull(),

    // 多尺寸缩略图
    thumbnail_mobile: varchar({ length: 500 }), // 移动端缩略图
    thumbnail_desktop: varchar({ length: 500 }), // 桌面端缩略图
    thumbnail_detail: varchar({ length: 500 }), // 详情页缩略图

    // 完整参数记录 (支持一键复用)
    generation_params: text(), // 完整的生成参数副本
    final_prompt: text(), // 经过参数处理后的完整提示词

    // 关键参数字段 (便于查询和展示)
    original_prompt: text(), // 用户输入的原始提示词
    model_id: varchar({ length: 100 }),
    reference_image_url: varchar({ length: 500 }),

    // 生成时间
    generation_time: integer(), // 该张图片的生成时间(秒)

    // 可见性控制
    visibility_level: varchar({ length: 20 }).notNull().default("private"), // public, private

    // 内容审核状态
    moderation_status: varchar({ length: 20 }).notNull().default("normal"), // normal, banned, featured

    // 展示状态
    status: varchar({ length: 20 }).notNull().default("archived"),

    // 社交统计字段
    like_count: integer().default(0).notNull(),
    favorite_count: integer().default(0).notNull(),
    comment_count: integer().default(0).notNull(),

    // 元数据
    created_at: timestamp({ withTimezone: true }),
    updated_at: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("idx_generation_images_generation_uuid").on(table.generation_uuid),
    uniqueIndex("uniq_generation_image_url").on(
      table.generation_uuid,
      table.image_url
    ),
    index("idx_generation_images_user_uuid").on(table.user_uuid),
    index("idx_generation_images_gen_type").on(table.gen_type),
    index("idx_generation_images_style").on(table.style),
    index("idx_generation_images_visibility_level").on(table.visibility_level),
    index("idx_generation_images_gen_type_visibility").on(
      table.gen_type,
      table.visibility_level
    ),
    index("idx_generation_images_style_visibility").on(
      table.style,
      table.visibility_level
    ),
    index("idx_generation_images_user_visibility").on(
      table.user_uuid,
      table.visibility_level
    ),
    index("idx_generation_images_model_id").on(table.model_id),
    index("idx_generation_images_like_count").on(table.like_count),
    index("idx_generation_images_comment_count").on(table.comment_count),
    index("idx_generation_images_moderation_status").on(table.moderation_status),
  ]
);

// Generation Videos table - 生成的视频记录
export const generationVideos = pgTable(
  "generation_videos",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    generation_uuid: varchar({ length: 255 }).notNull(), // link to generations
    user_uuid: varchar({ length: 255 }).notNull(),

    // Model information
    model_id: varchar({ length: 100 }), // 具体模型ID (sora-2-text-to-video, sora-2-pro-text-to-video等)

    // Quality identifier, e.g. 720p, 1080p
    quality: varchar({ length: 50 }).notNull(),

    // Media resources
    video_url: varchar({ length: 500 }).notNull(),
    poster_url: varchar({ length: 500 }),
    reference_image_url: varchar({ length: 1000 }), // 引用图片URL列表

    // Generation parameters
    generation_params: text(), // 完整的生成参数副本 (JSON字符串)

    // User input and metadata
    original_prompt: text(), // 用户输入的原始提示词
    style: varchar({ length: 50 }), // 使用的风格
    gen_type: varchar({ length: 50 }).notNull().default("video"), // 生成类型，默认video，后续扩展子场景

    // Technical metadata
    codec: varchar({ length: 50 }),
    duration_seconds: integer(),
    ratio: varchar({ length: 20 }), // 1:1 / 9:16 / 16:9
    resolution: varchar({ length: 50 }), // 1280x720 / 1920x1080

    // Visibility & timestamps
    visibility_level: varchar({ length: 20 }).notNull().default("private"),

    // Content moderation status
    moderation_status: varchar({ length: 20 }).notNull().default("normal"), // normal, banned, featured

    // 展示状态
    status: varchar({ length: 20 }).notNull().default("archived"),

    // 社交统计字段
    like_count: integer().default(0).notNull(),
    favorite_count: integer().default(0).notNull(),
    comment_count: integer().default(0).notNull(),

    created_at: timestamp({ withTimezone: true }),
    updated_at: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("idx_generation_videos_generation_uuid").on(table.generation_uuid),
    index("idx_generation_videos_user_uuid").on(table.user_uuid),
    index("idx_generation_videos_quality").on(table.quality),
    index("idx_generation_videos_model_id").on(table.model_id),
    index("idx_generation_videos_like_count").on(table.like_count),
    index("idx_generation_videos_comment_count").on(table.comment_count),
    index("idx_generation_videos_moderation_status").on(table.moderation_status),
    uniqueIndex("uniq_generation_video_quality").on(
      table.generation_uuid,
      table.quality
    ),
  ]
);

// ===== OC Maker Tables =====

// OC worlds table - 世界观主表
export const ocworlds = pgTable(
  "oc_worlds",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: uuid().defaultRandom().notNull(),
    name: varchar({ length: 100 }).notNull(),
    slug: varchar({ length: 80 }).notNull(),
    genre: varchar({ length: 50 }), // 世界流派
    description: text(),
    visibility_level: varchar({ length: 20 }).notNull().default("public"), // public, private
    allow_join: boolean().notNull().default(true),
    cover_url: text(),

    // 核心设定字段（新增）
    tags: jsonb().notNull().default([]), // 视觉/主题标签列表
    species: jsonb().notNull().default([]), // 主要种族列表（数组）
    climate: varchar({ length: 100 }), // 气候/环境标识
    regions: jsonb().notNull().default([]), // 地形/地区列表（数组）
    tech_magic_system: varchar({ length: 100 }), // 科技/魔法体系标识
    theme_colors: jsonb(), // 代表颜色（主题化）

    // 复杂结构字段
    factions: jsonb().notNull().default([]), // 势力/组织列表（对象数组）
    history_timeline: jsonb().notNull().default([]), // 历史事件时间线（对象数组）

    // 扩展字段
    extra: jsonb(), // 用户自定义扩展

    // 配置文件（预置世界观使用）
    config_file_path: varchar({ length: 255 }),
    config: jsonb().notNull().default({}),

    // 社交统计字段
    like_count: integer().default(0).notNull(),
    favorite_count: integer().default(0).notNull(),
    comment_count: integer().default(0).notNull(),
    share_count: integer().default(0).notNull(),

    // 系统字段
    is_active: boolean().notNull().default(true),
    is_preset: boolean().notNull().default(false),
    creator_uuid: varchar({ length: 255 }),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uniq_oc_worlds_creator_slug").on(
      table.creator_uuid,
      table.slug
    ),
    uniqueIndex("uniq_oc_worlds_uuid").on(table.uuid),
    index("idx_oc_worlds_creator_uuid").on(table.creator_uuid),
    index("idx_oc_worlds_is_preset").on(table.is_preset),
    index("idx_oc_worlds_visibility_level").on(table.visibility_level),
    index("idx_oc_worlds_genre").on(table.genre),
    index("idx_oc_worlds_tags").on(table.tags),
    index("idx_oc_worlds_climate").on(table.climate),
    index("idx_oc_worlds_tech_magic").on(table.tech_magic_system),
  ]
);

// Characters table - 角色创建与管理主表
export const characters = pgTable(
  "characters",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    user_uuid: varchar({ length: 255 }).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),

    // 角色基础信息
    name: varchar({ length: 255 }).notNull(),
    brief_introduction: text(), // 角色简要介绍
    gender: varchar({ length: 20 }).notNull(), // male, female, other
    age: integer(),
    role: varchar({ length: 100 }), // 角色身份/职业/定位
    personality_tags: json(), // 性格标签数组

    // 外观设定
    species: varchar({ length: 100 }), // 种族/物种

    // Remix关系
    remixed_from_uuid: varchar({ length: 255 }), // Remix来源角色UUID

    // 主题化支持
    // theme system removed in FEAT-OC-REBUILD (use world_uuid + modules instead)

    // OC Rebuild: world + modules + tags + background
    world_uuid: uuid().references(() => ocworlds.uuid, {
      onDelete: "set null",
    }),
    modules: jsonb(),
    tags: jsonb(),
    background_url: text(),

    // 展示状态
    status: varchar({ length: 20 }).notNull().default("archived"),

    // Content moderation status
    moderation_status: varchar({ length: 20 }).notNull().default("normal"), // normal, banned, featured

    // 权限控制
    visibility_level: varchar({ length: 20 }).notNull().default("public"), // private, public
    allow_remix: boolean().default(true), // 是否允许他人基于此角色创建衍生版本

    // 资源链接
    avatar_generation_image_uuid: varchar({ length: 255 }), // 角色头像关联generation_images表UUID
    profile_generation_image_uuid: varchar({ length: 255 }), // 角色立绘关联generation_images表UUID
    card_style_template_id: integer(), // 卡片样式模板ID

    // 统计信息
    like_count: integer().default(0).notNull(),
    favorite_count: integer().default(0).notNull(),
    comment_count: integer().default(0).notNull(),
  },
  (table) => [
    index("idx_characters_user_uuid").on(table.user_uuid),
    index("idx_characters_visibility").on(table.visibility_level),
    index("idx_characters_created_at").on(table.created_at),
    index("idx_characters_remixed_from").on(table.remixed_from_uuid),
    index("idx_characters_world_uuid").on(table.world_uuid),
    index("idx_characters_user_visibility").on(
      table.user_uuid,
      table.visibility_level
    ),
    index("idx_characters_public_popular").on(
      table.visibility_level,
      table.like_count,
      table.created_at
    ),
    index("idx_characters_avatar_image").on(table.avatar_generation_image_uuid),
    index("idx_characters_profile_image").on(
      table.profile_generation_image_uuid
    ),
    index("idx_characters_comment_count").on(table.comment_count),
    index("idx_characters_moderation_status").on(table.moderation_status),
  ]
);

// Character Generations table - 角色相关的AI生成历史记录
export const characterGenerations = pgTable(
  "character_generations",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    character_uuid: varchar({ length: 255 }).notNull(), // 角色UUID
    created_at: timestamp({ withTimezone: true }).defaultNow(),

    // 生成类型和内容
    generation_type: varchar({ length: 50 }).notNull(), // image, chat, story
    generation_uuid: varchar({ length: 255 }), // 绑定具体生成任务的UUID
    parameters: json(), // 记录生成时使用的参数（模型、风格、图片等）
    visibility_level: varchar({ length: 20 }).notNull().default("private"), // public, private
  },
  (table) => [
    index("idx_character_generations_character_uuid").on(table.character_uuid),
    index("idx_character_generations_type").on(table.generation_type),
    index("idx_character_generations_created_at").on(table.created_at),
    index("idx_character_generations_generation_uuid").on(
      table.generation_uuid
    ),
    index("idx_character_generations_visibility_level").on(
      table.visibility_level
    ),
  ]
);

// Character Chats table - 角色聊天记录
export const characterChats = pgTable(
  "character_chats",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    character_uuid: varchar({ length: 255 }).notNull(),
    user_uuid: varchar({ length: 255 }).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow(),

    // 聊天内容
    message_type: varchar({ length: 20 }).notNull(), // user, character
    message_content: text().notNull(),

    // 新版聊天所需字段（为向后兼容，新增可空列）
    uuid: varchar({ length: 255 }), // 消息UUID
    session_id: varchar({ length: 255 }), // 会话ID
    message_index: integer(), // 会话内序号
    role: varchar({ length: 20 }), // user | assistant | system
    content: text(), // 与 message_content 等价的新字段
    metadata: json(), // tokens/model 等
    is_archived: boolean().default(false),
    archived_at: timestamp({ withTimezone: true }),
    archived_to_r2: boolean().default(false),
    archive_metadata: json(),
  },
  (table) => [
    index("idx_character_chats_character_uuid_user").on(
      table.character_uuid,
      table.user_uuid
    ),
    index("idx_character_chats_character_uuid").on(table.character_uuid),
    index("idx_character_chats_created_at").on(table.created_at),
    index("idx_character_chats_session").on(
      table.session_id,
      table.message_index
    ),
  ]
);

// Chat Sessions table - 会话元数据
export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    session_id: varchar({ length: 255 }).notNull().unique(),
    user_uuid: varchar({ length: 255 }).notNull(),
    character_uuid: varchar({ length: 255 }).notNull(),
    title: varchar({ length: 255 }),
    message_count: integer().notNull().default(0),
    last_message_at: timestamp({ withTimezone: true }),
    context_window_size: integer().notNull().default(20),
    total_tokens_used: integer().notNull().default(0),
    total_credits_used: integer().notNull().default(0),
    archived_message_count: integer().notNull().default(0),
    last_archived_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_chat_sessions_user_character").on(
      table.user_uuid,
      table.character_uuid
    ),
    index("idx_chat_sessions_updated").on(table.updated_at),
  ]
);

// Character Remixs table - 角色衍生关系管理
export const characterRemixs = pgTable(
  "character_remixs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    original_character_id: integer().notNull(),
    remixed_character_id: integer().notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow(),

    // 衍生信息
    remix_type: varchar({ length: 50 }).notNull(), // remix, etc
    changes_description: text(), // 修改说明
  },
  (table) => [
    index("idx_character_remixs_original").on(table.original_character_id),
    index("idx_character_remixs_remixed").on(table.remixed_character_id),
    index("idx_character_remixs_type").on(table.remix_type),
  ]
);

// User Interactions table - 用户与各种内容的交互记录
export const userInteractions = pgTable(
  "user_interactions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_uuid: varchar({ length: 255 }).notNull(),
    // 统一使用各类型资源的 uuid 字符串
    art_id: varchar({ length: 255 }).notNull(), // 通用资源UUID
    art_type: varchar({ length: 20 }).notNull(), // character, image, video, story等
    interaction_type: varchar({ length: 20 }).notNull(), // like, favorite, view, share, download等
    metadata: json(), // 存储特定交互的额外信息
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_user_interaction").on(
      table.user_uuid,
      table.art_id,
      table.art_type,
      table.interaction_type
    ),
    index("idx_user_interactions_user").on(table.user_uuid),
    index("idx_user_interactions_art").on(table.art_id, table.art_type),
    index("idx_user_interactions_type").on(table.interaction_type),
    index("idx_user_interactions_art_type").on(table.art_type),
    index("idx_user_interactions_user_art_type").on(
      table.user_uuid,
      table.art_type
    ),
  ]
);

// Comments table - 用户评论记录
export const comments = pgTable(
  "comments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    user_uuid: varchar({ length: 255 }).notNull(),

    // 目标资源信息
    art_id: varchar({ length: 255 }).notNull(), // 资源 UUID (image_uuid, video_uuid, character_uuid)
    art_type: varchar({ length: 20 }).notNull(), // character, image, video

    // 评论内容
    content: text().notNull(),

    // 嵌套支持 (二级评论)
    parent_uuid: varchar({ length: 255 }), // 父评论 UUID，如果为 null 则为一级评论
    reply_to_user_uuid: varchar({ length: 255 }), // 被回复者的 UUID (用于 UI 显示 "回复 @xxx")

    // 状态与统计
    like_count: integer().default(0).notNull(),
    is_deleted: boolean().default(false).notNull(),

    // 时间戳
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_comments_art").on(table.art_id, table.art_type),
    index("idx_comments_user").on(table.user_uuid),
    index("idx_comments_parent").on(table.parent_uuid),
    index("idx_comments_created_at").on(table.created_at),
  ]
);

// Operation Costs table - 手工录入的月度平台成本
export const operationCosts = pgTable(
  "operation_costs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    // 记账月份，格式 YYYY-MM
    month: varchar({ length: 7 }).notNull(),
    // 平台或供应商，例如 openai / replicate / r2 / cloudflare
    platform: varchar({ length: 50 }).notNull(),
    amount: integer().notNull().default(0),
    currency: varchar({ length: 10 }).notNull().default("USD"),
    note: text(),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    // 同一月份+平台仅允许一条记录，便于更新
    uniqueIndex("uniq_operation_costs_month_platform").on(
      table.month,
      table.platform
    ),
    index("idx_operation_costs_month").on(table.month),
    index("idx_operation_costs_platform").on(table.platform),
  ]
);

// Email Templates table - 邮件模板存储
export const emailTemplates = pgTable(
  "email_templates",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    name: varchar({ length: 255 }).notNull(), // 模板名称
    type: varchar({ length: 50 }).notNull(), // welcome, newsletter, marketing, notification, password_reset
    subject: varchar({ length: 500 }).notNull(), // 邮件主题
    html_content: text().notNull(), // HTML内容
    text_content: text(), // 纯文本内容（可选）
    variables: json(), // 支持的变量列表，如 {user_name, company_name}
    is_active: boolean().notNull().default(true),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_email_templates_type").on(table.type),
    index("idx_email_templates_active").on(table.is_active),
  ]
);

// Email Subscriptions table - 用户邮件订阅偏好
export const emailSubscriptions = pgTable(
  "email_subscriptions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_uuid: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    subscription_type: varchar({ length: 50 }).notNull(), // marketing, newsletter, notifications, updates
    status: varchar({ length: 20 }).notNull().default("active"), // active, unsubscribed
    unsubscribed_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_email_subscriptions_user_uuid").on(table.user_uuid),
    index("idx_email_subscriptions_email").on(table.email),
    index("idx_email_subscriptions_type").on(table.subscription_type),
    index("idx_email_subscriptions_status").on(table.status),
    uniqueIndex("uniq_email_subscription").on(
      table.user_uuid,
      table.email,
      table.subscription_type
    ),
  ]
);

// Email Logs table - 邮件发送历史记录
export const emailLogs = pgTable(
  "email_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    user_uuid: varchar({ length: 255 }),
    email: varchar({ length: 255 }).notNull(),
    template_uuid: varchar({ length: 255 }), // 关联邮件模板
    campaign_uuid: varchar({ length: 255 }), // 关联邮件活动（手动发送）
    subject: varchar({ length: 500 }).notNull(),
    html_content: text(),
    text_content: text(),
    resend_message_id: varchar({ length: 255 }), // Resend返回的消息ID
    status: varchar({ length: 20 }).notNull().default("pending"), // pending, sent, delivered, opened, clicked, bounced, complained, failed
    error_message: text(),
    metadata: json(), // 额外的业务数据
    sent_at: timestamp({ withTimezone: true }),
    delivered_at: timestamp({ withTimezone: true }),
    opened_at: timestamp({ withTimezone: true }),
    clicked_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_email_logs_user_uuid").on(table.user_uuid),
    index("idx_email_logs_email").on(table.email),
    index("idx_email_logs_template_uuid").on(table.template_uuid),
    index("idx_email_logs_campaign_uuid").on(table.campaign_uuid),
    index("idx_email_logs_status").on(table.status),
    index("idx_email_logs_sent_at").on(table.sent_at),
    index("idx_email_logs_created_at").on(table.created_at),
  ]
);

// Email Campaigns table - 邮件活动（用于手动发送）
export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    name: varchar({ length: 255 }).notNull(), // 活动名称
    type: varchar({ length: 50 }).notNull(), // notification, marketing, newsletter, product_update
    template_uuid: varchar({ length: 255 }), // 使用的模板UUID
    subject: varchar({ length: 500 }).notNull(),
    html_content: text(),
    text_content: text(),
    target_audience: varchar({ length: 100 }), // all_users, subscribers, specific_emails
    target_emails: json(), // 如果是特定邮件列表，存储邮件数组
    status: varchar({ length: 20 }).notNull().default("draft"), // draft, scheduled, sending, sent, paused, failed
    scheduled_at: timestamp({ withTimezone: true }),
    sent_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_email_campaigns_type").on(table.type),
    index("idx_email_campaigns_status").on(table.status),
    index("idx_email_campaigns_scheduled").on(table.scheduled_at),
  ]
);

// Email Campaign Recipients table - 邮件活动接收者记录
export const emailCampaignRecipients = pgTable(
  "email_campaign_recipients",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    campaign_uuid: varchar({ length: 255 }).notNull(),
    user_uuid: varchar({ length: 255 }),
    email: varchar({ length: 255 }).notNull(),
    status: varchar({ length: 20 }).notNull().default("pending"), // pending, sent, delivered, opened, clicked, bounced, complained, failed
    email_log_uuid: varchar({ length: 255 }), // 关联的邮件日志
    sent_at: timestamp({ withTimezone: true }),
    delivered_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_email_campaign_recipients_campaign").on(table.campaign_uuid),
    index("idx_email_campaign_recipients_email").on(table.email),
    index("idx_email_campaign_recipients_status").on(table.status),
    index("idx_email_campaign_recipients_log").on(table.email_log_uuid),
  ]
);

// Subscriptions table - 订阅状态表，用于本地持久化订阅信息
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_uuid: varchar({ length: 255 }).notNull(),
    subscription_id: varchar({ length: 255 }).notNull().unique(),
    plan_type: varchar({ length: 50 }).notNull(),
    interval: varchar({ length: 50 }).notNull(),
    status: varchar({ length: 50 }).notNull().default("active"),
    current_period_start: timestamp({ withTimezone: true }),
    current_period_end: timestamp({ withTimezone: true }),
    canceled_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
    // 月度积分数量
    credits: integer().notNull().default(0),
    // 订阅续费次数：1=首次订阅，2=第一次续费，3=第二次续费...
    sub_times: integer().notNull().default(1),
  },
  (table) => [
    index("idx_subscriptions_user_uuid").on(table.user_uuid),
    index("idx_subscriptions_status").on(table.status),
    index("idx_subscriptions_subscription_id").on(table.subscription_id),
    index("idx_subscriptions_sub_times").on(table.sub_times),
  ]
);

// Subscription Logs table - 订阅状态变更日志表，记录所有订阅状态变更历史
export const subscriptionLogs = pgTable(
  "subscription_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    subscription_id: varchar({ length: 255 }).notNull(),
    user_uuid: varchar({ length: 255 }).notNull(),
    from_status: varchar({ length: 50 }),
    to_status: varchar({ length: 50 }).notNull(),
    reason: varchar({ length: 255 }),
    metadata: json(),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    created_by: varchar({ length: 255 }).default("system"),
  },
  (table) => [
    index("idx_subscription_logs_subscription_id").on(table.subscription_id),
    index("idx_subscription_logs_user_uuid").on(table.user_uuid),
    index("idx_subscription_logs_created_at").on(table.created_at),
    index("idx_subscription_logs_status").on(table.to_status),
  ]
);

// User Incentives table - 用户激励记录表
export const userIncentives = pgTable(
  "user_incentives",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_uuid: varchar({ length: 255 }).notNull(),
    type: varchar({ length: 50 }).notNull(), // check_in, share_sns
    reward_amount: integer().notNull(),
    // UTC date string (YYYY-MM-DD) for idempotency per day, mapped to Postgres DATE
    reward_date: date().notNull(),
    streak_count: integer().default(0),
    metadata: jsonb(),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_user_incentives_user").on(table.user_uuid),
    index("idx_user_incentives_type_date").on(table.type, table.created_at),
    index("idx_user_incentives_user_type_date").on(
      table.user_uuid,
      table.type,
      table.created_at
    ),
    uniqueIndex("unique_user_incentive_daily").on(
      table.user_uuid,
      table.type,
      table.reward_date
    ),
  ]
);

// ===== Chat Quota System Tables =====

// Chat Quotas table - 聊天配额管理表
export const chatQuotas = pgTable(
  "chat_quotas",
  {
    user_uuid: varchar({ length: 255 }).primaryKey(),
    membership_level: varchar({ length: 50 }).notNull(),
    monthly_quota: integer().notNull(),
    monthly_used: integer().notNull().default(0),
    quota_reset_at: timestamp({ withTimezone: true }),
    total_used: integer().notNull().default(0),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_chat_quotas_membership").on(table.membership_level),
    index("idx_chat_quotas_reset_at").on(table.quota_reset_at),
  ]
);

// Chat Usage Logs table - 轻量级聊天使用日志
export const chatUsageLogs = pgTable(
  "chat_usage_logs",
  {
    uuid: varchar({ length: 255 }).primaryKey(),
    user_uuid: varchar({ length: 255 }).notNull(),
    session_id: varchar({ length: 255 }).notNull(),
    membership_level: varchar({ length: 50 }).notNull(),
    tokens_used: integer().default(0),
    ap_used: integer().default(1),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_chat_usage_logs_user_date").on(table.user_uuid, table.created_at),
    index("idx_chat_usage_logs_membership").on(table.membership_level),
  ]
);
