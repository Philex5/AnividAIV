import { z } from "zod";

export const GenderSchema = z.enum(["male", "female", "other"]);

const GalleryImageTypeSchema = z.enum([
  "generation",
  "design_sheet",
  "user_upload",
]);

const GalleryImageItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  type: GalleryImageTypeSchema,
  label: z.string().optional(),
  meta: z.record(z.string()).optional(),
});

export const CharacterModulesSchema = z.object({
  appearance: z
    .object({
      name: z.string().min(1).max(255).optional(),
      gender: GenderSchema.optional(),
      age: z.number().int().min(1).max(999999).optional().nullable(),
      species: z.string().min(1).max(100).optional(),
      role: z.string().max(100).optional(),
      body_type: z.string().optional(),
      hair_color: z.string().optional(),
      hair_style: z.string().optional(),
      eye_color: z.string().optional(),
      outfit_style: z.string().optional(),
      accessories: z.array(z.string()).optional(),
      appearance_features: z.array(z.string()).optional(),
      special_features: z.string().optional(),
      theme_color: z.string().optional(),
    })
    .optional()
    .default({}),
  personality: z
    .object({
      personality_tags: z.array(z.string()).optional().default([]),
      greeting: z.array(z.string()).optional(),
      quotes: z.array(z.string()).optional(),
      extended_attributes: z.record(z.any()).optional(),
    })
    .optional()
    .default({}),
  background: z
    .object({
      brief_introduction: z.string().optional(),
      background_story: z.string().optional(),
      background_segments: z
        .array(
          z.object({
            id: z.string().optional(),
            title: z.string().optional().default(""),
            content: z.string().optional().default(""),
            image_url: z.string().optional(),
            image_uuid: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional()
    .default({}),
  art: z
    .object({
      fullbody_style: z.string().optional(),
      avatar_style: z.string().optional(),
      gallery: z
        .preprocess(normalizeGalleryInput, z.array(GalleryImageItemSchema))
        .optional(),
    })
    .optional()
    .default({}),
  skills: z
    .object({
      stats: z
        .array(
          z.object({
            label: z.string().min(1),
            value: z.number().min(0).max(10),
          }),
        )
        .optional()
        .default([]),
      abilities: z
        .array(
          z.object({
            id: z.string(),
            name: z.string().min(1),
            type: z.string().optional(),
            icon: z.string().optional(),
            level: z.number().min(1).max(5).optional(),
            description: z.string().optional(),
          }),
        )
        .optional()
        .default([]),
    })
    .optional()
    .default({}),
});

export type CharacterModules = z.infer<typeof CharacterModulesSchema>;

export const CreateCharacterSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  gender: GenderSchema,
  age: z.number().int().min(1).max(9999999).optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  personality_tags: z.array(z.string().max(50)).max(20).optional().nullable(),

  brief_introduction: z.string().max(1000).optional().nullable(),
  species: z.string().max(100).optional().nullable(),

  // Modular storage (OC Rebuild)
  modules: CharacterModulesSchema.optional(),

  // Image references
  profile_generation_image_uuid: z.string().max(255).optional().nullable(),
  avatar_generation_image_uuid: z.string().max(255).optional().nullable(),

  // Remix relationship
  remixed_from_uuid: z.string().max(255).optional().nullable(),

  // Permissions
  visibility_level: z.enum(["public", "private"]).optional(),
  allow_remix: z.boolean().optional().default(true),

  // OC Rebuild specific
  world_uuid: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(20)).max(20).optional().nullable(),
  background_url: z.string().max(500).optional().nullable(),
});

export type CreateCharacterSchemaType = z.infer<typeof CreateCharacterSchema>;

export function getDefaultCharacterModules(): CharacterModules {
  return {
    appearance: {},
    personality: { personality_tags: [] },
    background: {},
    art: {},
    skills: { stats: [], abilities: [] },
  };
}

export function parseCharacterModules(input: unknown): CharacterModules {
  let normalizedInput = input;
  if (typeof normalizedInput === "string") {
    try {
      normalizedInput = JSON.parse(normalizedInput) as unknown;
    } catch {
      normalizedInput = input;
    }
  }
  normalizedInput = normalizeCharacterModulesInput(normalizedInput);
  const parsed = CharacterModulesSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return getDefaultCharacterModules();
  }
  return parsed.data;
}

function normalizeCharacterModulesInput(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const modules = { ...(input as Record<string, unknown>) };
  const appearance = isRecord(modules.appearance)
    ? { ...modules.appearance }
    : null;
  const art = isRecord(modules.art) ? { ...modules.art } : null;
  const personality = isRecord(modules.personality)
    ? { ...modules.personality }
    : null;

  if (appearance) {
    const accessories = normalizeStringArray(appearance.accessories);
    if (accessories) appearance.accessories = accessories;
    else if (appearance.accessories !== undefined)
      delete appearance.accessories;

    const features = normalizeStringArray(appearance.appearance_features);
    if (features) appearance.appearance_features = features;
    else if (appearance.appearance_features !== undefined)
      delete appearance.appearance_features;
  }

  if (personality) {
    const tags = normalizeStringArray(personality.personality_tags);
    if (tags) personality.personality_tags = tags;
    else if (personality.personality_tags !== undefined)
      delete personality.personality_tags;

    const greeting = normalizeStringArray(personality.greeting);
    if (greeting) personality.greeting = greeting;
    else if (personality.greeting !== undefined) delete personality.greeting;

    const quotes = normalizeStringArray(personality.quotes);
    if (quotes) personality.quotes = quotes;
    else if (personality.quotes !== undefined) delete personality.quotes;
  }

  if (art) {
    const gallery = normalizeGallery(art.gallery);
    if (gallery) art.gallery = gallery;
    else if (art.gallery !== undefined) delete art.gallery;
  }

  if (appearance) modules.appearance = appearance;
  if (art) modules.art = art;
  if (personality) modules.personality = personality;

  return modules;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }
  if (typeof value === "string") {
    const normalized = value
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }
  return undefined;
}

type GalleryImageItem = z.infer<typeof GalleryImageItemSchema>;

function normalizeGalleryInput(value: unknown): unknown {
  const normalized = normalizeGallery(value);
  return normalized ?? value;
}

function normalizeGallery(value: unknown): GalleryImageItem[] | undefined {
  if (Array.isArray(value)) {
    const items = value
      .map((entry, index) => normalizeGalleryEntry(entry, `gallery-${index}`))
      .filter((item): item is GalleryImageItem => !!item);
    return items.length ? items : undefined;
  }
  if (isRecord(value)) {
    const items = Object.entries(value)
      .map(([key, entry]) => normalizeGalleryEntry(entry, key))
      .filter((item): item is GalleryImageItem => !!item);
    return items.length ? items : undefined;
  }
  return undefined;
}

function normalizeGalleryEntry(
  entry: unknown,
  fallbackId: string,
): GalleryImageItem | null {
  if (typeof entry === "string") {
    return {
      id: fallbackId,
      url: entry,
      type: "generation",
    };
  }
  if (Array.isArray(entry) && entry.length >= 2) {
    return normalizeGalleryEntry(entry[1], String(entry[0]));
  }
  if (!isRecord(entry)) return null;

  const rawId =
    typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : null;
  const url =
    typeof entry.url === "string"
      ? entry.url
      : typeof entry.image_url === "string"
        ? entry.image_url
        : typeof entry.value === "string"
          ? entry.value
          : null;
  if (!url) return null;

  const rawType = typeof entry.type === "string" ? entry.type : "";
  const type = (
    ["generation", "design_sheet", "user_upload"] as const
  ).includes(rawType as GalleryImageItem["type"])
    ? (rawType as GalleryImageItem["type"])
    : rawType === "portrait" || rawType === "artwork"
      ? "generation"
      : rawType === "upload"
        ? "user_upload"
        : "generation";
  const label = typeof entry.label === "string" ? entry.label : undefined;
  const meta = isRecord(entry.meta)
    ? Object.entries(entry.meta).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          if (typeof value === "string") acc[key] = value;
          return acc;
        },
        {},
      )
    : undefined;

  return {
    id: rawId || fallbackId,
    url,
    type,
    label,
    meta: meta && Object.keys(meta).length ? meta : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
