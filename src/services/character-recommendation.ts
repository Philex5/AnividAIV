import {
  findCharacterByUuid,
  findPublicCharactersByAuthor,
  findPublicCharactersByworldForRecommendation,
  findPopularPublicCharacters,
  Character,
} from "@/models/character";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { toImageUrl } from "@/lib/r2-utils";
import { parseCharacterModules } from "@/types/oc";

export interface CharacterRecommendationItem extends Character {
  avatar_image_url?: string | null;
  profile_image_url?: string | null;
}

export interface CharacterRecommendationResponse {
  success: boolean;
  data?: CharacterRecommendationItem[];
  error?: string;
}

export interface CharacterRecommendationOptions {
  limit?: number;
  style?: string | null;
  species?: string | null;
}

async function attachImageUrls(
  characters: Character[]
): Promise<CharacterRecommendationItem[]> {
  return Promise.all(
    characters.map(async (character) => {
      let avatarUrl: string | null = null;
      let profileUrl: string | null = null;

      if (character.avatar_generation_image_uuid) {
        try {
          const avatarImage = await findGenerationImageByUuid(
            character.avatar_generation_image_uuid
          );
          if (avatarImage?.image_url) {
            avatarUrl = toImageUrl(
              avatarImage.thumbnail_desktop ||
                avatarImage.thumbnail_mobile ||
                avatarImage.image_url
            );
          }
        } catch (error) {
          console.error("Failed to load avatar image for recommendation:", error);
        }
      }

      if (character.profile_generation_image_uuid) {
        try {
          const profileImage = await findGenerationImageByUuid(
            character.profile_generation_image_uuid
          );
          if (profileImage?.image_url) {
            profileUrl = toImageUrl(
              profileImage.thumbnail_detail ||
                profileImage.thumbnail_desktop ||
                profileImage.thumbnail_mobile ||
                profileImage.image_url
            );
          }
        } catch (error) {
          console.error("Failed to load profile image for recommendation:", error);
        }
      }

      if (!profileUrl) {
        profileUrl = avatarUrl;
      }

      return {
        ...character,
        avatar_image_url: avatarUrl,
        profile_image_url: profileUrl,
      };
    })
  );
}

/**
 * Get recommended characters based on current character with 3-tier priority:
 * 1. Same author's other characters (highest priority)
 * 2. Characters with same world (medium priority)
 * 3. Popular characters (fallback)
 *
 * @param characterUuid - Current character UUID
 * @param options - Recommendation options
 */
export async function getCharacterRecommendations(
  characterUuid: string,
  options: CharacterRecommendationOptions = {}
): Promise<CharacterRecommendationResponse> {
  try {
    const { limit = 5, style, species } = options;

    // Get current character info
    let currentCharacter: Character | undefined;
    try {
      currentCharacter = await findCharacterByUuid(characterUuid);
    } catch (error) {
      console.warn("Could not fetch current character:", error);
      currentCharacter = undefined;
    }

    const results: Character[] = [];
    const excludedUuids: string[] = [characterUuid];
    const existingIds = new Set<number>();

    // Priority 1: Same author's other characters (only public)
    if (currentCharacter?.user_uuid) {
      const sameAuthorChars = await findPublicCharactersByAuthor(
        currentCharacter.user_uuid,
        excludedUuids,
        Math.min(limit, 5) // Do not exceed overall limit
      );

      for (const char of sameAuthorChars) {
        if (!existingIds.has(char.id)) {
          results.push(char);
          existingIds.add(char.id);
          excludedUuids.push(char.uuid);
        }
      }
    }

    // Priority 2: Same world characters (excluding same author, only public)
    if (
      results.length < limit &&
      currentCharacter?.world_uuid !== null &&
      currentCharacter?.world_uuid !== undefined
    ) {
      const sameThemeChars =
        await findPublicCharactersByworldForRecommendation(
        currentCharacter.world_uuid,
        excludedUuids,
        currentCharacter.user_uuid,
        limit - results.length
      );

      for (const char of sameThemeChars) {
        if (!existingIds.has(char.id)) {
          results.push(char);
          existingIds.add(char.id);
          excludedUuids.push(char.uuid);
        }
      }
    }

    // Priority 3: Popular characters as fallback (only public)
    if (results.length < limit) {
      const popularChars = await findPopularPublicCharacters(
        excludedUuids,
        Math.max(limit * 2, 20) // Get more for filtering and randomization
      );

      // Apply optional filters (style/species)
      let filteredPopular = popularChars;
      if (style) {
        filteredPopular = filteredPopular.filter((char) => {
          const modules = parseCharacterModules(char.modules);
          return modules.art?.fullbody_style === style;
        });
      }
      if (species) {
        filteredPopular = filteredPopular.filter(char => char.species === species);
      }

      // Shuffle popular characters for diversity
      const shuffled = [...filteredPopular];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      for (const char of shuffled) {
        if (results.length >= limit) break;
        if (!existingIds.has(char.id)) {
          results.push(char);
          existingIds.add(char.id);
        }
      }
    }

    // Keep same-author characters at front, shuffle others for diversity
    const sameAuthorCount = currentCharacter?.user_uuid
      ? results.filter(char => char.user_uuid === currentCharacter.user_uuid).length
      : 0;

    const sameAuthorChars = results.slice(0, sameAuthorCount);
    const otherChars = results.slice(sameAuthorCount);

    // Shuffle other characters
    for (let i = otherChars.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherChars[i], otherChars[j]] = [otherChars[j], otherChars[i]];
    }

    const finalResults = [...sameAuthorChars, ...otherChars].slice(0, limit);
    const resultsWithImages = await attachImageUrls(finalResults);

    return { success: true, data: resultsWithImages };
  } catch (error) {
    console.error("Failed to get character recommendations:", error);
    return {
      success: false,
      error: "Failed to retrieve character recommendations",
    };
  }
}
