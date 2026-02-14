export const SKILL_TYPE_OPTIONS = [
  "Default",
  "Magic",
  "Elemental",
  "Physical",
  "Psychic",
  "Spatial",
  "Buff",
  "Summoning",
  "Shapeshifting",
  "Technological",
  "Potion",
  "Unique",
] as const;

export type SkillTypeOption = (typeof SKILL_TYPE_OPTIONS)[number];

export const normalizeSkillType = (
  value?: string | null,
): SkillTypeOption => {
  const trimmed = value?.trim() || "";
  const base = trimmed
    .replace(/^assets\/skills\//i, "")
    .replace(/\.webp$/i, "");
  if (!base) return "Default";
  const matched = SKILL_TYPE_OPTIONS.find(
    (option) => option.toLowerCase() === base.toLowerCase(),
  );
  return matched || "Default";
};

export const resolveSkillIconName = (
  icon?: string | null,
  type?: string | null,
): SkillTypeOption => {
  const iconName = normalizeSkillType(icon);
  const typeName = normalizeSkillType(type);
  if (icon && iconName !== "Default") return iconName;
  if (type && typeName !== "Default") return typeName;
  return iconName;
};
