export type GenTypeScene =
  | "community"
  | "myArtworks"
  | "characterDetail"
  | "admin";

export const GEN_TYPE_DISPLAY: Record<
  GenTypeScene,
  Record<string, readonly string[]>
> = {
  community: {
    image: ["sticker", "action_figure", "anime"],
    video: ["anime_video"],
    oc: ["full_body"],
  },
  myArtworks: {
    image: ["sticker", "action_figure", "anime"],
    video: ["anime_video"],
  },
  characterDetail: {
    image: ["sticker", "action_figure", "anime"],
    video: ["anime_video"],
  },
  admin: {
    image: ["sticker", "action_figure", "anime"],
    video: ["anime_video"],
    character: ["full_body", "design_sheet"],
  },
};

export function normalizeGenType(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalized || null;
}

export function normalizeGenTypes(values?: readonly string[]): string[] {
  if (!values?.length) return [];
  return Array.from(
    new Set(
      values
        .map((value) => normalizeGenType(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export function getGenTypeWhitelist(scene: GenTypeScene, category: string) {
  return GEN_TYPE_DISPLAY[scene]?.[category] ?? [];
}

export function filterAllowedGenTypes(
  scene: GenTypeScene,
  category: string,
  values?: readonly string[],
) {
  const whitelist = getGenTypeWhitelist(scene, category);
  if (!whitelist.length) return [];
  const normalized = normalizeGenTypes(values);
  if (!normalized.length) return [...whitelist];
  return normalized.filter((value) => whitelist.includes(value));
}
