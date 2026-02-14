/**
 * Artwork Type Utilities
 *
 * Provides unified type definitions and conversion functions for artwork types
 * to resolve inconsistencies between "oc" (display) and "character" (API) naming.
 */

/**
 * Display types - Used throughout the application for consistent internal representation
 */
export const ArtworkDisplayType = {
  Image: 'image',
  Video: 'video',
  Oc: 'oc',  // Internal unified representation for character/OC content
} as const;

export type ArtworkDisplayType = typeof ArtworkDisplayType[keyof typeof ArtworkDisplayType];

/**
 * API types - Used when communicating with backend API
 * Note: "character" is used for OC content at the API level
 */
export const ArtworkApiType = {
  Image: 'image',
  Video: 'video',
  Character: 'character',  // API representation for OC/character content
} as const;

export type ArtworkApiType = typeof ArtworkApiType[keyof typeof ArtworkApiType];

/**
 * Convert display type (oc) to API type (character)
 * Used when sending data to the backend
 */
export function displayTypeToApiType(
  type: ArtworkDisplayType
): ArtworkApiType {
  const map: Record<ArtworkDisplayType, ArtworkApiType> = {
    [ArtworkDisplayType.Image]: ArtworkApiType.Image,
    [ArtworkDisplayType.Video]: ArtworkApiType.Video,
    [ArtworkDisplayType.Oc]: ArtworkApiType.Character,  // Convert "oc" to "character" for API
  };
  return map[type];
}

/**
 * Convert API type (character) to display type (oc)
 * Used when receiving data from the backend
 */
export function apiTypeToDisplayType(
  type: ArtworkApiType
): ArtworkDisplayType {
  const map: Record<ArtworkApiType, ArtworkDisplayType> = {
    [ArtworkApiType.Image]: ArtworkDisplayType.Image,
    [ArtworkApiType.Video]: ArtworkDisplayType.Video,
    [ArtworkApiType.Character]: ArtworkDisplayType.Oc,  // Convert "character" back to "oc"
  };
  return map[type];
}

/**
 * Convert display type to API query parameter string
 * Used for URL parameters
 */
export function displayTypeToApiParam(type: ArtworkDisplayType): string {
  return displayTypeToApiType(type);
}

/**
 * Normalize any artwork type value to a valid display type
 * Used for input validation and type coercion
 */
export function normalizeToDisplayType(
  type: string | null | undefined
): ArtworkDisplayType {
  if (!type) return ArtworkDisplayType.Image;

  const normalized = type.toLowerCase().trim();

  // Handle API-level "character" type
  if (normalized === 'character') {
    return ArtworkDisplayType.Oc;
  }

  // Handle display-level "oc" type
  if (normalized === 'oc') {
    return ArtworkDisplayType.Oc;
  }

  // Handle standard types
  if (normalized === 'image') {
    return ArtworkDisplayType.Image;
  }

  if (normalized === 'video') {
    return ArtworkDisplayType.Video;
  }

  // Default fallback
  return ArtworkDisplayType.Image;
}

/**
 * Type guard to check if a value is a valid display type
 */
export function isDisplayType(value: unknown): value is ArtworkDisplayType {
  return Object.values(ArtworkDisplayType).includes(value as ArtworkDisplayType);
}

/**
 * Type guard to check if a value is a valid API type
 */
export function isApiType(value: unknown): value is ArtworkApiType {
  return Object.values(ArtworkApiType).includes(value as ArtworkApiType);
}
