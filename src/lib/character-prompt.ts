import ConfigManager from "@/lib/config-manager";
import type { CharacterModules } from "@/types/oc";

type PromptType = "profile" | "avatar" | "scene";

type PromptBuildOptions = {
  styleId?: string | null;
};

const PROMPT_TYPE_HINT: Record<PromptType, string> = {
  profile:
    "Full body cinematic anime illustration of the character. No text, no captions, no logos, no watermarks.",
  avatar: "Close-up portrait focusing on the character's face and shoulders.",
  scene:
    "Dynamic storytelling composition that shows the character inside their world.",
};

function sanitizePrompt(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
}

function buildCharacterDataSegment(
  modules: CharacterModules,
  rules: NonNullable<
    Awaited<ReturnType<typeof ConfigManager.getCharacterPromptTemplate>>["field_naming_rules"]
  >,
  type: PromptType,
): string {
  const appearance = modules.appearance ?? {};
  const personality = modules.personality ?? {};
  const background = modules.background ?? {};
  const art = modules.art ?? {};
  const skills = modules.skills ?? { stats: [], abilities: [] };

  const baseFields: Record<string, unknown> = {
    name: appearance.name,
    gender: appearance.gender,
    species: appearance.species,
    role: appearance.role,
    age: appearance.age,
    hair_color: appearance.hair_color,
    hair_style: appearance.hair_style,
    eye_color: appearance.eye_color,
    body_type: appearance.body_type,
    outfit_style: appearance.outfit_style,
    accessories: appearance.accessories,
    appearance_features: appearance.appearance_features,
    special_features: appearance.special_features,
    personality_tags: personality.personality_tags,
  };

  const sceneFields: Record<string, unknown> = {
    greeting: personality.greeting,
    quotes: personality.quotes,
    brief_introduction: background.brief_introduction,
    background_story: background.background_story,
    art_style: art.fullbody_style,
    skills: skills.abilities?.map((a) => a.name),
    stats: skills.stats?.map((s) => `${s.label}: ${s.value}/10`),
  };

  const fields =
    type === "scene"
      ? { ...baseFields, ...sceneFields }
      : baseFields;

  const parts: string[] = [];

  const pushField = (key: string, rawValue: unknown) => {
    if (rawValue === undefined || rawValue === null) return;
    let value: string | undefined;
    if (Array.isArray(rawValue)) {
      const arr = rawValue
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
      if (!arr.length) return;
      value = arr.join(", ");
    } else if (typeof rawValue === "number") {
      value = rawValue.toString();
    } else if (typeof rawValue === "string") {
      const trimmed = rawValue.trim();
      if (!trimmed) return;
      value = trimmed;
    } else {
      return;
    }

    if (!value) return;

    const suffix = rules.suffix_fields?.[key];
    const withSuffix = suffix ? `${value} ${suffix}` : value;

    if (rules.no_label_fields?.includes(key)) {
      parts.push(withSuffix);
      return;
    }

    const label =
      rules.labeled_fields?.[key] ||
      rules.list_fields?.[key] ||
      key.replace(/_/g, " ");

    parts.push(`${label}: ${withSuffix}`);
  };

  Object.entries(fields).forEach(([key, value]) => pushField(key, value));

  return parts.join(", ");
}

function buildExtraContext(
  modules: CharacterModules,
  styleName: string | undefined,
  type: PromptType,
): string {
  if (type !== "scene") {
    return "";
  }
  const items: string[] = [];
  const background = modules.background ?? {};
  const art = modules.art ?? {};

  if (background.brief_introduction) {
    items.push(background.brief_introduction.trim());
  }

  if (background.background_story) {
    const snippet = background.background_story.trim().slice(0, 300);
    items.push(snippet);
  }

  if (art.fullbody_style) {
    items.push(`Art style preference: ${styleName || art.fullbody_style}`);
  }

  if (modules.appearance?.special_features) {
    items.push(modules.appearance.special_features);
  }

  return items.join(". ");
}

export async function buildPromptFromModules(
  modules: CharacterModules,
  type: PromptType = "profile",
  options: PromptBuildOptions = {},
): Promise<string> {
  const template = await ConfigManager.getCharacterPromptTemplate();
  const rules = template.field_naming_rules;
  const characterData = buildCharacterDataSegment(modules, rules, type);
  const styleId =
    options.styleId ??
    (type === "scene" ? modules.art?.fullbody_style : undefined);
  const styleOptions = styleId
    ? await ConfigManager.getCharacterStyles()
    : [];
  const resolvedStyle = styleOptions.find(
    (style) =>
      style.uuid === styleId ||
      style.key === styleId ||
      style.name === styleId,
  );
  const resolvedStyleName = resolvedStyle?.name || styleId;
  const resolvedStylePrompt = resolvedStyle?.prompt_value?.trim() || "";
  if (styleId && !resolvedStylePrompt) {
    console.warn(`[CharacterPrompt] Style not found or missing prompt: ${styleId}`);
  }

  const characterSegment = template.templates.character_data_template.replace(
    "{character_data}",
    characterData || "Original character profile, describe visually.",
  );

  const stylePrompt = resolvedStylePrompt
    ? resolvedStylePrompt
    : styleId
      ? `Art style: ${resolvedStyleName}.`
      : "";
  const extraContext = buildExtraContext(modules, resolvedStyleName, type);
  const contextSegment = template.templates.theme_specifics_template.replace(
    "{theme_specifics}",
    extraContext || "Focus on conveying the character's personality.",
  );

  const sections: Record<string, string> = {
    character_data: characterSegment,
    style_prompt: stylePrompt,
    quality_enhancement: `${PROMPT_TYPE_HINT[type]} ${template.templates.quality_enhancement}`,
    theme_specifics: contextSegment,
  };

  const pieces = template.prompt_structure.integration_order
    .map((key) => sanitizePrompt(sections[key] || ""))
    .filter((value) => Boolean(value));

  const prompt = pieces.join(template.prompt_structure.separator || ", ");

  return sanitizePrompt(prompt);
}
