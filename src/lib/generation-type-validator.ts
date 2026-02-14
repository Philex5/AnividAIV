/**
 * Generation Type Validator
 * Provides validation utilities for generation types across different generators
 */

// Generation type constants for images
export const IMAGE_GEN_TYPES = {
  ANIME: "anime",
  ACTION_FIGURE: "action_figure",
  AVATAR: "avatar",
  CHARACTER: "character",
  STICKER: "sticker",
} as const;

// Generation type constants for videos
export const VIDEO_GEN_TYPES = {
  VIDEO: "video",
  ANIME_VIDEO: "anime_video",
} as const;

// All valid generation types
export type ImageGenType =
  (typeof IMAGE_GEN_TYPES)[keyof typeof IMAGE_GEN_TYPES];
export type VideoGenType =
  (typeof VIDEO_GEN_TYPES)[keyof typeof VIDEO_GEN_TYPES];
export type GenType = ImageGenType | VideoGenType;

// Generator URL mapping
export const GENERATOR_URLS = {
  [IMAGE_GEN_TYPES.ANIME]: "/ai-anime-generator",
  [IMAGE_GEN_TYPES.ACTION_FIGURE]: "/ai-action-figure-generator",
  [IMAGE_GEN_TYPES.AVATAR]: "/oc-maker",
  [IMAGE_GEN_TYPES.CHARACTER]: "/oc-maker",
  [VIDEO_GEN_TYPES.VIDEO]: "/ai-anime-video-generator",
  [VIDEO_GEN_TYPES.ANIME_VIDEO]: "/ai-anime-video-generator",
  [IMAGE_GEN_TYPES.STICKER]: "/ai-sticker-generator"
} as const;

/**
 * Validates if the generation type matches the expected type
 * @param actualType - The actual gen_type from API response
 * @param expectedType - The expected gen_type for current generator
 * @returns true if types match, false otherwise
 */
export function validateGenerationType(
  actualType: string | null | undefined,
  expectedType: GenType
): boolean {
  if (!actualType) {
    return false;
  }

  // Normalize the type (trim, lowercase, replace spaces/hyphens with underscores)
  const normalized = actualType
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return normalized === expectedType;
}

/**
 * Gets the correct generator URL for a given generation type
 * @param genType - The generation type
 * @returns The URL path for the corresponding generator
 */
export function getGeneratorUrl(genType: string): string {
  const normalized = genType
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return GENERATOR_URLS[normalized as GenType] || "/";
}

/**
 * Gets a human-readable name for a generation type
 * @param genType - The generation type
 * @returns Human-readable name
 */
export function getGeneratorName(genType: string): string {
  const normalized = genType
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const nameMap: Record<string, string> = {
    [IMAGE_GEN_TYPES.ANIME]: "AI Anime Generator",
    [IMAGE_GEN_TYPES.ACTION_FIGURE]: "AI Action Figure Generator",
    [IMAGE_GEN_TYPES.AVATAR]: "OC Maker",
    [IMAGE_GEN_TYPES.CHARACTER]: "OC Maker",
    [IMAGE_GEN_TYPES.STICKER]: "AI Sticker Generator",
    [VIDEO_GEN_TYPES.VIDEO]: "AI Anime Video Generator",
    [VIDEO_GEN_TYPES.ANIME_VIDEO]: "AI Anime Video Generator",
  };

  return nameMap[normalized] || "Unknown Generator";
}
