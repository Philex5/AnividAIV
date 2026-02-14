import { z } from "zod";

// ===== 势力/组织 Schema =====
export const FactionSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  name_i18n_key: z.string().optional(),
  description: z.string().max(500).optional(),
  description_i18n_key: z.string().optional(),
  type: z.enum(["government", "military", "religion", "guild", "other"]),
  alignment: z
    .enum([
      "lawful_good",
      "neutral_good",
      "chaotic_good",
      "lawful_neutral",
      "true_neutral",
      "chaotic_neutral",
      "lawful_evil",
      "neutral_evil",
      "chaotic_evil",
    ])
    .optional(),
  icon_url: z
    .string()
    .url()
    .refine(isHttpUrl, "Invalid URL protocol")
    .optional(),
});

// ===== 历史事件 Schema =====
export const HistoryEventSchema = z.object({
  id: z.string(),
  title: z.string().max(200),
  title_i18n_key: z.string().optional(),
  description: z.string().max(1000).optional(),
  description_i18n_key: z.string().optional(),
  timestamp: z.string().max(50),
  era: z.enum(["ancient", "medieval", "modern", "future"]),
  importance: z.enum(["major", "minor"]),
  image_url: z
    .string()
    .url()
    .refine(isHttpUrl, "Invalid URL protocol")
    .optional(),
});

// ===== 主题颜色 Schema =====
export const ThemeColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  secondary: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  accent: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  background: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

// ===== 可见性 Schema =====
export const worldVisibilitySchema = z.enum(["public", "private"]);

// ===== 配置文件 Schema (向后兼容) =====
export const worldConfigSchema = z.object({
  theme_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  background_image: z
    .string()
    .refine(isImageReference, "Invalid image reference")
    .optional(),
  decoration_style: z.string().max(500).optional(),
  fonts: z
    .object({
      title: z.string().max(200).optional(),
      body: z.string().max(200).optional(),
    })
    .optional(),
  color_palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).optional(),
});

function normalizeCoverUrl<
  TInput extends { cover_url?: string; cover_image_url?: string },
>(input: TInput): TInput {
  const coverUrl = input.cover_url || input.cover_image_url;
  return { ...input, cover_url: coverUrl };
}

const imageUuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isImageUuid(value: string): boolean {
  return imageUuidRegex.test(value.trim());
}

function isImageReference(value: string): boolean {
  return isHttpUrl(value) || isImageUuid(value);
}

// ===== 完整世界观 Schema (base) =====
const worldBaseSchema = z.object({
  uuid: z.string().uuid().optional(),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only")
    .optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  genre: z.string().max(50).optional(),
  description: z
    .string()
    .max(1000, "Description must be 500 characters or less")
    .optional(),
  cover_url: z
    .string()
    .refine(isImageReference, "Invalid cover URL")
    .optional(),
  cover_image_url: z
    .string()
    .refine(isImageReference, "Invalid cover URL")
    .optional(),

  // 核心设定字段
  tags: z
    .array(z.string())
    .max(30, "Maximum 30 tags allowed")
    .optional()
    .default([]),
  species: z
    .array(z.string())
    .max(20, "Maximum 20 species allowed")
    .optional()
    .default([]),
  climate: z.string().max(100).optional(),
  regions: z
    .array(z.string())
    .max(20, "Maximum 20 regions allowed")
    .optional()
    .default([]),
  tech_magic_system: z.string().max(100).optional(),
  theme_colors: ThemeColorsSchema.optional(),

  // 复杂结构字段
  factions: z
    .array(FactionSchema)
    .max(50, "Maximum 50 factions allowed")
    .optional()
    .default([]),
  history_timeline: z
    .array(HistoryEventSchema)
    .max(100, "Maximum 100 events allowed")
    .optional()
    .default([]),

  // 扩展字段
  extra: z.record(z.any()).optional(),

  // 配置文件（预置世界观使用）
  config: worldConfigSchema.optional(),
  config_file_path: z.string().max(255).optional(),

  // 系统字段
  visibility_level: worldVisibilitySchema.default("public"),
  allow_join: z.boolean().default(true),
  is_active: z.boolean().default(true),
  is_preset: z.boolean().default(false),
  creator_uuid: z.string().optional(),
});

// ===== Insert Schema =====
export const worldInsertSchema = worldBaseSchema.transform((input) =>
  normalizeCoverUrl(input),
);

// ===== 更新 Schema (支持部分更新) =====
export const worldUpdateSchema = worldBaseSchema
  .partial()
  .transform((input) => normalizeCoverUrl(input));

// ===== TypeScript Types =====
export type Faction = z.infer<typeof FactionSchema>;
export type HistoryEvent = z.infer<typeof HistoryEventSchema>;
export type ThemeColors = z.infer<typeof ThemeColorsSchema>;
export type worldInsert = z.infer<typeof worldInsertSchema>;
export type worldUpdate = z.infer<typeof worldUpdateSchema>;
export type worldConfig = z.infer<typeof worldConfigSchema>;

// ===== 预置气候选项（用于UI下拉选择）=====
export const CLIMATE_OPTIONS = [
  "temperate_four_seasons",
  "tropical_rainforest",
  "arctic_tundra",
  "desert",
  "oceanic",
  "underground",
  "urban_tropical",
  "custom",
] as const;

// ===== 预置科技/魔法体系选项（用于UI下拉选择）=====
export const TECH_MAGIC_SYSTEM_OPTIONS = [
  "medieval_magic",
  "high_tech",
  "cyberpunk",
  "steampunk",
  "low_fantasy",
  "high_fantasy",
  "sci_fi",
  "post_apocalyptic",
] as const;
