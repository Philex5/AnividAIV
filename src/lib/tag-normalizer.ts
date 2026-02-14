import presetConfig from "@/configs/tags/preset-tags.json";
import type { TagPresetConfig } from "@/types/tag";

const tagPresetConfig = presetConfig as TagPresetConfig;

export const MAX_TAGS_PER_CHARACTER = 20;
export const MAX_TAG_LENGTH = 20;
export const MIN_TAG_LENGTH = 1;

const SENSITIVE_WORDS = [
  "nsfw",
  "offensive",
  "hate",
  "abuse",
  "terror",
  "spam",
];

export class TagValidationError extends Error {
  details?: string;

  constructor(message: string, details?: string) {
    super(message);
    this.name = "TagValidationError";
    this.details = details;
  }
}

const presetTagValues = Array.from(
  new Set(
    [
      ...(tagPresetConfig.popular || []).flatMap((item) => [
        item.tag,
        ...(item.aliases || []),
      ]),
      ...(tagPresetConfig.categories || []).flatMap((category) => category.tags),
    ]
      .filter(Boolean)
      .map((tag) => tag.toLowerCase())
  )
);

function sanitizeRawTag(tag: string): string {
  let normalized = tag.trim().toLowerCase();
  normalized = normalized.replace(/\s+/g, "_").replace(/-+/g, "_");
  normalized = normalized.replace(/[^a-z0-9_]/g, "");
  normalized = normalized.replace(/_+/g, "_");
  normalized = normalized.replace(/^_+|_+$/g, "");
  return normalized;
}

export function normalizeTagKey(tag: string): string {
  if (typeof tag !== "string") return "";
  return sanitizeRawTag(tag);
}

export function normalizeTag(tag: string): string {
  if (typeof tag !== "string") {
    throw new TagValidationError("Tag must be a string");
  }

  const display = tag.trim();

  if (!display || display.length < MIN_TAG_LENGTH) {
    throw new TagValidationError("Tag is required");
  }

  if (display.length > MAX_TAG_LENGTH) {
    throw new TagValidationError(
      `Tag is too long (max ${MAX_TAG_LENGTH} characters)`
    );
  }

  if (!/^[A-Za-z0-9 _-]+$/.test(display)) {
    throw new TagValidationError("Tag contains invalid characters");
  }

  if (isSensitiveWord(display)) {
    throw new TagValidationError("Tag contains disallowed content");
  }

  return display;
}

export function normalizeTagList(
  value: unknown,
  options: { maxTags?: number } = {}
): string[] {
  const maxTags = options.maxTags ?? MAX_TAGS_PER_CHARACTER;

  if (!Array.isArray(value)) {
    throw new TagValidationError("Tags must be an array");
  }

  if (value.length > maxTags) {
    throw new TagValidationError(`Maximum ${maxTags} tags are allowed`);
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const tag of value) {
    const normalizedTag = normalizeTag(tag);
    const key = normalizeTagKey(normalizedTag);
    if (key && !seen.has(key)) {
      normalized.push(normalizedTag);
      seen.add(key);
    }
  }

  return normalized;
}

export function isSensitiveWord(tag: string): boolean {
  const lowered = normalizeTagKey(tag);
  return SENSITIVE_WORDS.some((word) => lowered.includes(word));
}

export function findSimilarTags(
  input: string,
  limit: number = 5
): string[] {
  const normalized = sanitizeRawTag(input);
  if (!normalized) return [];

  const entries = presetTagValues
    .map((tag) => ({
      tag,
      distance: levenshteinDistance(normalized, tag),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((item) => item.tag);

  return entries;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  const aLength = a.length;
  const bLength = b.length;

  for (let i = 0; i <= bLength; i += 1) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLength; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLength; i += 1) {
    for (let j = 1; j <= aLength; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] =
          Math.min(
            matrix[i - 1][j - 1],
            Math.min(matrix[i][j - 1], matrix[i - 1][j])
          ) + 1;
      }
    }
  }

  return matrix[bLength][aLength];
}
