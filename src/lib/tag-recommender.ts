import presets from "@/configs/tags/preset-tags.json";
import type { TagPresetConfig, TagPresetItem } from "@/types/tag";
import { normalizeTagKey } from "@/lib/tag-normalizer";

const presetConfig = presets as TagPresetConfig;

const relatedTagMap: Record<string, string[]> = {
  cyberpunk: ["neon", "hacker", "glitch", "mecha"],
  fantasy: ["magic", "enchanted", "mythic", "guardian"],
  sci_fi: ["space", "pilot", "biotech", "hologram"],
  warrior: ["guardian", "armored", "heroic"],
  mage: ["enchanted", "strategist", "mysterious"],
  tsundere: ["playful", "idol", "melancholic"],
};

function flattenPresetItems(): TagPresetItem[] {
  const categoryItems =
    presetConfig.categories?.flatMap<TagPresetItem>((category) =>
      category.tags.map((tag) => ({
        tag,
        label: tag,
        category: category.id,
      }))
    ) || [];

  const popularItems = presetConfig.popular || [];

  const mergedMap = new Map<string, TagPresetItem>();
  [...categoryItems, ...popularItems].forEach((item) => {
    mergedMap.set(item.tag, {
      ...item,
      label: item.label || item.tag,
    });
  });

  return Array.from(mergedMap.values());
}

const PRESET_ITEMS = flattenPresetItems();

export function getRecommendedTags(
  currentTags: string[],
  limit: number = 5
): string[] {
  if (!currentTags?.length) {
    return PRESET_ITEMS.slice(0, limit).map((item) => item.tag);
  }

  const currentTagKeys = new Set(
    currentTags.map((tag) => normalizeTagKey(tag)).filter(Boolean)
  );
  const recommendations = new Set<string>();

  currentTags.forEach((tag) => {
    const normalized = normalizeTagKey(tag);
    const related = relatedTagMap[normalized];
    if (related) {
      related.forEach((item) => recommendations.add(item));
    }

    PRESET_ITEMS.forEach((item) => {
      if (
        item.category &&
        normalized.includes(item.category.slice(0, 3)) &&
        item.tag !== normalized
      ) {
        recommendations.add(item.tag);
      }
    });
  });

  const filtered = Array.from(recommendations).filter(
    (tag) => !currentTagKeys.has(normalizeTagKey(tag))
  );

  return filtered.slice(0, limit);
}
