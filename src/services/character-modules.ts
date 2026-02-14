import { z } from "zod";
import {
  findCharacterByUuid,
  updateCharacter as updateCharacterModel,
  type NewCharacter,
} from "@/models/character";
import {
  CharacterModulesSchema,
  getDefaultCharacterModules,
  type CharacterModules,
} from "@/types/oc";


export class ModuleValidationError extends Error {
  constructor(
    message: string,
    public details: z.ZodIssue[]
  ) {
    super(message);
    this.name = "ModuleValidationError";
  }
}

function cloneModules(modules: CharacterModules): CharacterModules {
  return JSON.parse(JSON.stringify(modules)) as CharacterModules;
}

function normalizeStringArray(value?: unknown): string[] | undefined {
  if (!value) return undefined;
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

function mergeObjects<T extends Record<string, any>>(
  base: T,
  patch: Partial<T>
): T {
  const result: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (value === undefined) continue;
    if (value === null) {
      delete result[key];
      continue;
    }
    if (Array.isArray(value)) {
      result[key] = value;
      continue;
    }
    if (typeof value === "object") {
      const current = result[key];
      result[key] = mergeObjects(
        typeof current === "object" && current !== null && !Array.isArray(current)
          ? current
          : {},
        value as Record<string, unknown>
      );
      continue;
    }
    result[key] = value;
  }
  return result as T;
}

function applyModuleUpdates(
  current: CharacterModules,
  updates: Partial<CharacterModules>
): CharacterModules {
  const next = cloneModules(current);
  for (const [moduleKey, moduleValue] of Object.entries(updates)) {
    if (moduleValue === undefined) continue;
    if (moduleValue === null) {
      delete (next as Record<string, unknown>)[moduleKey];
      continue;
    }
    const existingModule =
      (next as Record<string, any>)[moduleKey] || Object.create(null);
    (next as Record<string, any>)[moduleKey] = mergeObjects(
      existingModule,
      moduleValue
    );
  }
  return next;
}


export async function getCharacterModules(
  characterUuid: string
): Promise<CharacterModules> {
  const character = await findCharacterByUuid(characterUuid);
  if (!character) {
    throw new Error("Character not found");
  }

  if (!character.modules) {
    return getDefaultCharacterModules();
  }

  const parsed = CharacterModulesSchema.safeParse(character.modules);
  if (!parsed.success) {
    console.error("Failed to parse modules JSONB:", parsed.error);
    return getDefaultCharacterModules();
  }
  return parsed.data;
}

export { buildPromptFromModules } from "@/lib/character-prompt";

export async function updateCharacterModules(
  characterUuid: string,
  updates: Partial<CharacterModules>
): Promise<CharacterModules> {
  const current = await getCharacterModules(characterUuid);
  if (!updates || Object.keys(updates).length === 0) {
    return current;
  }

  const merged = applyModuleUpdates(current, updates);
  const parsed = CharacterModulesSchema.safeParse(merged);
  if (!parsed.success) {
    throw new ModuleValidationError(
      "Invalid module structure",
      parsed.error.issues
    );
  }

  const updateData: Partial<NewCharacter> = { modules: parsed.data };
  const appearanceUpdates =
    (updates.appearance as Record<string, unknown> | undefined) ?? null;
  const personalityUpdates =
    (updates.personality as Record<string, unknown> | undefined) ?? null;
  const backgroundUpdates =
    (updates.background as Record<string, unknown> | undefined) ?? null;

  if (appearanceUpdates) {
    const appearance = parsed.data.appearance ?? {};
    if (Object.prototype.hasOwnProperty.call(appearanceUpdates, "name")) {
      if (appearance.name) updateData.name = appearance.name;
    }
    if (Object.prototype.hasOwnProperty.call(appearanceUpdates, "gender")) {
      if (appearance.gender) updateData.gender = appearance.gender;
    }
    if (Object.prototype.hasOwnProperty.call(appearanceUpdates, "age")) {
      updateData.age = appearance.age ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(appearanceUpdates, "species")) {
      updateData.species = appearance.species ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(appearanceUpdates, "role")) {
      updateData.role = appearance.role ?? null;
    }
  }

  if (personalityUpdates) {
    if (Object.prototype.hasOwnProperty.call(personalityUpdates, "personality_tags")) {
      updateData.personality_tags =
        parsed.data.personality?.personality_tags ?? [];
    }
  }

  if (backgroundUpdates) {
    if (Object.prototype.hasOwnProperty.call(backgroundUpdates, "brief_introduction")) {
      updateData.brief_introduction =
        parsed.data.background?.brief_introduction ?? null;
    }
  }

  await updateCharacterModel(characterUuid, updateData);
  return parsed.data;
}

export function validateModules(modules: unknown): modules is CharacterModules {
  return CharacterModulesSchema.safeParse(modules).success;
}

export function assertValidModules(modules: unknown): CharacterModules {
  const parsed = CharacterModulesSchema.safeParse(modules);
  if (!parsed.success) {
    throw new ModuleValidationError(
      "Invalid module structure",
      parsed.error.issues
    );
  }
  return parsed.data;
}

type LegacyCharacterFields = {
  name?: string | null;
  gender?: string | null;
  age?: number | null;
  species?: string | null;
  role?: string | null;
  body_type?: string | null;
  hair_color?: string | null;
  hair_style?: string | null;
  eye_color?: string | null;
  outfit_style?: string | null;
  appearance_features?: unknown;
  accessories?: unknown;
  personality_tags?: unknown;
  extended_attributes?: unknown;
  brief_introduction?: string | null;
  background_story?: string | null;
  background_segments?: unknown;
  art_style?: string | null;
  special_features?: string | null;
};

export function buildModulesFromLegacyFields(
  legacy: LegacyCharacterFields,
  base?: CharacterModules
): CharacterModules {
  const modules = cloneModules(base || getDefaultCharacterModules());
  modules.appearance = modules.appearance || {};
  modules.personality = modules.personality || { personality_tags: [] };
  modules.background = modules.background || {};
  modules.art = modules.art || {};

  const normalizeGender = (
    value: unknown
  ): "male" | "female" | "other" | undefined => {
    if (typeof value !== "string") return undefined;
    const lowered = value.trim().toLowerCase();
    if (lowered === "male") return "male";
    if (lowered === "female") return "female";
    if (lowered === "other") return "other";
    if (lowered === "man" || lowered === "boy") return "male";
    if (lowered === "woman" || lowered === "girl") return "female";
    return "other";
  };

  if (legacy.name) modules.appearance.name = legacy.name;
  if (legacy.gender) modules.appearance.gender = normalizeGender(legacy.gender);
  if (legacy.age !== undefined && legacy.age !== null)
    modules.appearance.age = legacy.age;
  if (legacy.species) modules.appearance.species = legacy.species;
  if (legacy.role) modules.appearance.role = legacy.role;
  if (legacy.body_type) modules.appearance.body_type = legacy.body_type;
  if (legacy.hair_color) modules.appearance.hair_color = legacy.hair_color;
  if (legacy.hair_style) modules.appearance.hair_style = legacy.hair_style;
  if (legacy.eye_color) modules.appearance.eye_color = legacy.eye_color;
  if (legacy.outfit_style)
    modules.appearance.outfit_style = legacy.outfit_style;

  const accessories = normalizeStringArray(legacy.accessories);
  if (accessories) modules.appearance.accessories = accessories;

  const appearanceFeatures = normalizeStringArray(
    legacy.appearance_features
  );
  if (appearanceFeatures)
    modules.appearance.appearance_features = appearanceFeatures;

  if (legacy.special_features) {
    modules.appearance.special_features = legacy.special_features;
  }

  const tags = normalizeStringArray(legacy.personality_tags);
  if (tags && tags.length) {
    modules.personality.personality_tags = tags;
  }

  if (
    legacy.extended_attributes &&
    typeof legacy.extended_attributes === "object" &&
    !Array.isArray(legacy.extended_attributes)
  ) {
    modules.personality.extended_attributes =
      legacy.extended_attributes as Record<string, unknown>;
  }

  if (legacy.brief_introduction) {
    modules.background.brief_introduction = legacy.brief_introduction;
  }
  if (legacy.background_story) {
    modules.background.background_story = legacy.background_story;
  }
  if (Array.isArray(legacy.background_segments)) {
    modules.background.background_segments = legacy.background_segments as
      | typeof modules.background.background_segments
      | undefined;
  }

  if (legacy.art_style) {
    modules.art.fullbody_style = legacy.art_style;
  }

  const parsed = CharacterModulesSchema.safeParse(modules);
  if (!parsed.success) {
    throw new ModuleValidationError(
      "Failed to build modules from legacy data",
      parsed.error.issues
    );
  }
  return parsed.data;
}
