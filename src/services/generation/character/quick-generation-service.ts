import { z } from "zod";
import { generateTextWithFallback } from "@/services/llm/llm-service";
import ConfigManager from "@/lib/config-manager";
import { getUuid } from "@/lib/hash";
import {
  createCharacter,
  type Character,
  type NewCharacter,
} from "@/models/character";
import { generationServiceFactory } from "@/services/generation";
import type { CharacterGenerationRequest } from "@/services/generation";
import { CreditsTransType } from "@/services/credit";
import characterColors from "@/configs/colors/character-colors.json";
import { buildModulesFromLegacyFields } from "@/services/character-modules";
import type { CharacterModules } from "@/types/oc";
import {
  getMembershipLevel,
  getUserOcLimit,
  MembershipUserNotFoundError,
} from "@/services/membership";
import { getUserCharacterCount } from "@/models/character";
import { OC_QUICK_GENERATION_CREDITS } from "@/configs/generation/credits";
import {
  normalizeSkillType,
  resolveSkillIconName,
} from "@/lib/skills";

const GenderSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .transform((value) => {
    if (value === "male" || value === "female" || value === "other") {
      return value;
    }
    if (value === "woman" || value === "girl") return "female";
    if (value === "man" || value === "boy") return "male";
    return "other";
  });

function coerceOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const num = Number(trimmed);
    if (Number.isFinite(num)) return Math.trunc(num);
  }
  return undefined;
}

function coerceStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
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

const QuickAppearanceSchema = z.object({
  name: z.string().min(1).max(255),
  gender: GenderSchema,
  age: z
    .any()
    .optional()
    .transform((value) => coerceOptionalInt(value))
    .refine(
      (value) =>
        value === undefined ||
        value === null ||
        (Number.isInteger(value) && value >= 1 && value <= 999),
      "Age must be an integer between 1 and 999"
    ),
  role: z.string().max(100).optional().default(""),
  species: z.string().max(100).optional().default("human"),
  hair_color: z.string().max(50).optional().default(""),
  hair_style: z.string().max(100).optional().default(""),
  eye_color: z.string().max(50).optional().default(""),
  body_type: z.string().max(50).optional().default(""),
  outfit_style: z.string().max(2000).optional().default(""),
  accessories: z
    .any()
    .optional()
    .transform((value) => coerceStringArray(value) ?? [])
    .pipe(z.array(z.string().max(100)).optional().default([])),
  appearance_features: z
    .any()
    .optional()
    .transform((value) => coerceStringArray(value) ?? [])
    .pipe(z.array(z.string().max(200)).optional().default([])),
  reasoning: z
    .object({
      extracted_features: z
        .any()
        .optional()
        .transform((value) => coerceStringArray(value) ?? [])
        .pipe(z.array(z.string()).optional().default([])),
      suggestions: z
        .any()
        .optional()
        .transform((value) => coerceStringArray(value) ?? [])
        .pipe(z.array(z.string()).optional().default([])),
    })
    .optional()
    .default({ extracted_features: [], suggestions: [] }),
});

const QuickBackgroundSchema = z.object({
  brief_introduction: z.string().min(1).max(1000),
  background_story: z.string().min(1).max(8000),
  background_segments: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(2000),
      })
    )
    .optional()
    .default([]),
});

const QuickPersonalitySkillsSchema = z.object({
  personality_tags: z
    .any()
    .optional()
    .transform((value) => coerceStringArray(value) ?? [])
    .pipe(z.array(z.string().max(50)).optional().default([])),
  extended_attributes: z
    .record(z.any())
    .optional()
    .default({}),
  greeting: z
    .any()
    .optional()
    .transform((value) => coerceStringArray(value) ?? [])
    .pipe(z.array(z.string().max(200)).optional().default([])),
  quotes: z
    .any()
    .optional()
    .transform((value) => coerceStringArray(value) ?? [])
    .pipe(z.array(z.string().max(200)).optional().default([])),
  skills: z
    .object({
      stats: z
        .array(
          z.object({
            label: z.string().min(1).max(50),
            value: z.number().int().min(1).max(10),
          })
        )
        .optional()
        .default([]),
      abilities: z
        .array(
          z.object({
            name: z.string().min(1).max(100),
            type: z.string().max(50).optional(),
            icon: z.string().max(200).optional(),
            level: z
              .any()
              .optional()
              .transform((value) => {
                if (value === null || value === undefined) return undefined;
                const parsed = Number(value);
                if (!Number.isFinite(parsed)) return undefined;
                const rounded = Math.round(parsed);
                return Math.min(5, Math.max(1, rounded));
              })
              .pipe(z.number().int().min(1).max(5).optional()),
            description: z.string().max(1000).optional(),
          })
        )
        .optional()
        .default([]),
    })
    .optional()
    .default({ stats: [], abilities: [] }),
});

export interface QuickGenerationResult {
  character: Character;
  generation_task:
    | {
        uuid: string;
        status: "pending" | "processing" | "completed";
      }
    | null;
  ai_reasoning: {
    extracted_features: string[];
    suggestions: string[];
  } | null;
}

export class OcLimitReachedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcLimitReachedError";
  }
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function normalizeHexColor(color: string): string {
  const trimmed = color.trim();
  if (!trimmed) return "";
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return prefixed.toLowerCase();
}

function isHexColor(color: string): boolean {
  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(normalizeHexColor(color));
}

function normalizeColor(color: string, type: "hair" | "eye"): string {
  if (!color) return "";
  const cleaned = color.trim();
  if (!cleaned) return "";
  if (isHexColor(cleaned)) return normalizeHexColor(cleaned);

  const palette =
    type === "hair" ? characterColors.hair_colors : characterColors.eye_colors;
  const cleanedLower = cleaned.toLowerCase();
  const match = palette.find(
    (item: { key: string; code: string }) =>
      item.key.toLowerCase() === cleanedLower ||
      normalizeHexColor(item.code) === normalizeHexColor(cleaned)
  );
  return match ? normalizeHexColor(match.code) : cleaned;
}

function fillPromptTemplate(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function ensureBackgroundSegments(
  segments: z.infer<typeof QuickBackgroundSchema>["background_segments"]
): CharacterModules["background"]["background_segments"] {
  if (!segments || !segments.length) return [];
  return segments.map((segment) => ({
    id: getUuid(),
    title: segment.title,
    content: segment.content,
  }));
}

function normalizePersonalityTags(tags: string[]): string[] {
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function ensureValidPersonalityTags(tags: string[]): string[] {
  const normalized = normalizePersonalityTags(tags);
  if (normalized.length < 3 || normalized.length > 8) return [];
  return normalized;
}

function ensureValidStats(
  stats: z.infer<typeof QuickPersonalitySkillsSchema>["skills"]["stats"]
): CharacterModules["skills"]["stats"] {
  const requiredLabels = ["STR", "INT", "AGI", "VIT", "DEX", "LUK"] as const;
  const normalized = (stats ?? []).map((item) => ({
    label: item.label.trim().toUpperCase(),
    value: item.value,
  }));
  const map = new Map(normalized.map((item) => [item.label, item.value]));
  const missing = requiredLabels.filter((label) => !map.has(label));
  if (missing.length) return [];
  return requiredLabels.map((label) => ({
    label,
    value: map.get(label) ?? 1,
  }));
}

function ensureValidAbilities(
  abilities: z.infer<typeof QuickPersonalitySkillsSchema>["skills"]["abilities"]
): CharacterModules["skills"]["abilities"] {
  const normalized = (abilities ?? [])
    .filter((ability) => ability.name && ability.name.trim())
    .map((ability) => ({
      id: getUuid(),
      name: ability.name.trim(),
      type: normalizeSkillType(ability.type ?? ability.icon),
      icon: resolveSkillIconName(ability.icon, ability.type),
      level: ability.level,
      description: ability.description?.trim() || undefined,
    }));
  if (normalized.length < 3 || normalized.length > 5) return [];
  return normalized;
}

export class QuickGenerationService {
  static async generateFromDescription(params: {
    description: string;
    user_uuid: string;
    auto_generate_image?: boolean;
    art_style?: string;
  }): Promise<QuickGenerationResult> {
    let membershipLevel: Awaited<ReturnType<typeof getMembershipLevel>>;
    let limit: Awaited<ReturnType<typeof getUserOcLimit>>;
    try {
      membershipLevel = await getMembershipLevel(params.user_uuid);
      limit = await getUserOcLimit(params.user_uuid);
    } catch (error) {
      if (error instanceof MembershipUserNotFoundError) {
        throw new Error("User membership info not found");
      }
      throw error;
    }

    const currentCount = await getUserCharacterCount(params.user_uuid);
    if (limit !== Infinity && currentCount >= limit) {
      throw new OcLimitReachedError(
        `OC limit reached (${currentCount}/${limit}). Upgrade to create more characters.`
      );
    }

    const appearanceData = await this.parseAppearance(params.description);
    const normalizedAppearance = this.validateAndEnrichAppearance(appearanceData);
    let backgroundData: z.infer<typeof QuickBackgroundSchema>;
    try {
      backgroundData = await this.parseBackground(
        params.description,
        normalizedAppearance
      );
    } catch {
      backgroundData = {
        brief_introduction: "",
        background_story: "",
        background_segments: [],
      };
    }

    if (
      backgroundData.brief_introduction
        .toLowerCase()
        .startsWith(normalizedAppearance.name.toLowerCase())
    ) {
      backgroundData = {
        brief_introduction: "",
        background_story: "",
        background_segments: [],
      };
    }

    let personalitySkillsData: z.infer<typeof QuickPersonalitySkillsSchema>;
    try {
      personalitySkillsData = await this.parsePersonalitySkills(
        params.description,
        normalizedAppearance,
        backgroundData
      );
    } catch {
      personalitySkillsData = {
        personality_tags: [],
        extended_attributes: {},
        greeting: [],
        quotes: [],
        skills: {
          stats: [],
          abilities: [],
        },
      };
    }

    const personalityTags = ensureValidPersonalityTags(
      personalitySkillsData.personality_tags || []
    );
    const stats = ensureValidStats(personalitySkillsData.skills?.stats || []);
    const abilities = ensureValidAbilities(
      personalitySkillsData.skills?.abilities || []
    );
    const backgroundSegments = ensureBackgroundSegments(
      backgroundData.background_segments
    );

    const modules = buildModulesFromLegacyFields({
      name: normalizedAppearance.name,
      gender: normalizedAppearance.gender,
      age: normalizedAppearance.age ?? undefined,
      role: normalizedAppearance.role,
      species: normalizedAppearance.species,
      body_type: normalizedAppearance.body_type,
      hair_color: normalizedAppearance.hair_color,
      hair_style: normalizedAppearance.hair_style,
      eye_color: normalizedAppearance.eye_color,
      outfit_style: normalizedAppearance.outfit_style,
      accessories: normalizedAppearance.accessories,
      appearance_features: normalizedAppearance.appearance_features,
      personality_tags: personalityTags,
      brief_introduction: backgroundData.brief_introduction,
      background_story: backgroundData.background_story,
      background_segments: backgroundSegments,
      art_style: params.art_style,
    });

    modules.personality = {
      ...(modules.personality ?? {}),
      personality_tags: personalityTags,
      extended_attributes: personalitySkillsData.extended_attributes || {},
      greeting: personalitySkillsData.greeting || [],
      quotes: personalitySkillsData.quotes || [],
    };
    modules.skills = {
      stats,
      abilities,
    };

    const newCharacter: NewCharacter = {
      uuid: getUuid(),
      user_uuid: params.user_uuid,
      name: normalizedAppearance.name,
      gender: normalizedAppearance.gender,
      age: normalizedAppearance.age ?? null,
      role: normalizedAppearance.role,
      personality_tags: personalityTags,
      species: normalizedAppearance.species,
      brief_introduction: backgroundData.brief_introduction,
      modules,
      tags: [],
      world_uuid: null,
      background_url: null,
      visibility_level: membershipLevel === "free" ? "public" : "private",
      allow_remix: true,
    };

    const character = await createCharacter(newCharacter);

    let generationTask: QuickGenerationResult["generation_task"] = null;
    if (params.auto_generate_image !== false) {
      const characterRequest: CharacterGenerationRequest = {
        user_uuid: params.user_uuid,
        model_id: "google/nano-banana",
        aspect_ratio: "2:3",
        counts: 1,
        character_data: character,
        art_style: params.art_style || modules.art?.fullbody_style || undefined,
        gen_type: "character",
        character_uuids: [character.uuid],
        metadata: {
          source: "oc_quick_generate",
          character_uuid: character.uuid,
          auto_attach_profile: true,
          auto_generate_avatar: true, // 自动生成头像
          credits_override: OC_QUICK_GENERATION_CREDITS,
          credits_trans_type: CreditsTransType.generation("character"),
        },
      };

      const result = await generationServiceFactory.createGeneration(
        "character",
        characterRequest
      );

      generationTask = {
        uuid: result.generation_uuid,
        status: "processing",
      };
    }

    return {
      character,
      generation_task: generationTask,
      ai_reasoning: normalizedAppearance.reasoning || null,
    };
  }

  private static async parseAppearance(
    description: string
  ): Promise<z.infer<typeof QuickAppearanceSchema>> {
    const promptConfig =
      await ConfigManager.getOcQuickGenerationBasePrompt();

    const userPrompt = fillPromptTemplate(promptConfig.user_prompt_template, {
      user_description: description,
    });

    return this.callPrompt<z.infer<typeof QuickAppearanceSchema>>({
      promptConfig,
      userPrompt,
      schema: QuickAppearanceSchema,
      scenario: "oc_quick_generation_base",
    });
  }

  private static async parseBackground(
    description: string,
    appearance: z.infer<typeof QuickAppearanceSchema>
  ): Promise<z.infer<typeof QuickBackgroundSchema>> {
    const promptConfig =
      await ConfigManager.getOcQuickGenerationBackgroundPrompt();

    const userPrompt = fillPromptTemplate(promptConfig.user_prompt_template, {
      user_description: description,
      appearance_json: JSON.stringify(appearance),
    });

    return this.callPrompt<z.infer<typeof QuickBackgroundSchema>>({
      promptConfig,
      userPrompt,
      schema: QuickBackgroundSchema,
      scenario: "oc_quick_generation_background",
    });
  }

  private static async parsePersonalitySkills(
    description: string,
    appearance: z.infer<typeof QuickAppearanceSchema>,
    background: z.infer<typeof QuickBackgroundSchema>
  ): Promise<z.infer<typeof QuickPersonalitySkillsSchema>> {
    const promptConfig =
      await ConfigManager.getOcQuickGenerationPersonalitySkillsPrompt();

    const userPrompt = fillPromptTemplate(promptConfig.user_prompt_template, {
      user_description: description,
      appearance_json: JSON.stringify(appearance),
      background_json: JSON.stringify(background),
    });

    return this.callPrompt<z.infer<typeof QuickPersonalitySkillsSchema>>({
      promptConfig,
      userPrompt,
      schema: QuickPersonalitySkillsSchema,
      scenario: "oc_quick_generation_personality_skills",
    });
  }

  private static async callPrompt<T>(params: {
    promptConfig: Awaited<
      ReturnType<typeof ConfigManager.getOcQuickGenerationBasePrompt>
    >;
    userPrompt: string;
    schema: z.ZodType<T, z.ZodTypeDef, unknown>;
    scenario: string;
  }): Promise<T> {
    const { text } = await generateTextWithFallback({
      model: params.promptConfig.model,
      system: params.promptConfig.system_prompt,
      prompt: params.userPrompt,
      temperature: params.promptConfig.temperature,
      maxTokens: params.promptConfig.max_tokens,
      provider: "xiaojing",
      scenario: params.scenario,
    });

    const raw = text.trim();
    const jsonText = extractFirstJsonObject(raw) || raw;
    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(jsonText);
    } catch (error) {
      const extracted = extractFirstJsonObject(raw);
      if (!extracted) {
        throw new Error("Failed to parse JSON from LLM response");
      }
      parsedUnknown = JSON.parse(extracted);
    }

    return params.schema.parse(parsedUnknown);
  }

  private static validateAndEnrichAppearance(
    parsed: z.infer<typeof QuickAppearanceSchema>
  ): z.infer<typeof QuickAppearanceSchema> {
    if (!parsed.name || !parsed.gender) {
      throw new Error("Missing required fields from AI generation");
    }

    return {
      ...parsed,
      accessories: (parsed.accessories || []).slice(0, 8),
      appearance_features: (parsed.appearance_features || []).slice(0, 8),
      hair_color: normalizeColor(parsed.hair_color || "", "hair"),
      eye_color: normalizeColor(parsed.eye_color || "", "eye"),
    };
  }
}
