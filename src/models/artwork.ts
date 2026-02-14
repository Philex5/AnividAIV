/**
 * Artwork Model Layer
 * Handles all database operations for user artworks (images and videos)
 */

import { db } from "@/db";
import {
  generationImages,
  generationVideos,
  userInteractions,
  characters,
  characterGenerations,
} from "@/db/schema";
import { and, eq, desc, or, ilike, sql, count, inArray } from "drizzle-orm";
import { findCharacterGenerationsByGenerationUuid } from "@/models/character-generation";

export interface QueryUserImagesParams {
  userUuid: string;
  searchFilter?: any;
  typeExcludeFilter?: any;
  genTypeFilter?: string[];
  limit: number;
  offset: number;
}

export interface QueryUserVideosParams {
  userUuid: string;
  searchQuery?: string;
  genTypeFilter?: string[];
  limit: number;
  offset: number;
}

export interface CountArtworksParams {
  userUuid: string;
  searchFilter?: any;
  typeExcludeFilter?: any;
  searchQuery?: string;
  genTypeFilter?: string[];
}

/**
 * Query user images with filters
 */
export async function queryUserImages(params: QueryUserImagesParams) {
  const { userUuid, searchFilter, typeExcludeFilter, genTypeFilter, limit, offset } = params;

  const imageFilters: any[] = [eq(generationImages.user_uuid, userUuid)];
  if (typeExcludeFilter) {
    imageFilters.push(typeExcludeFilter);
  }
  if (genTypeFilter?.length) {
    imageFilters.push(inArray(generationImages.gen_type, genTypeFilter));
  }
  if (searchFilter) {
    imageFilters.push(searchFilter);
  }

  const imageResults = await db()
    .select({
      uuid: generationImages.uuid,
      user_uuid: generationImages.user_uuid,
      gen_type: generationImages.gen_type,
      thumbnail_desktop: generationImages.thumbnail_desktop,
      thumbnail_mobile: generationImages.thumbnail_mobile,
      image_url: generationImages.image_url,
      model_id: generationImages.model_id,
      style: generationImages.style,
      created_at: generationImages.created_at,
      original_prompt: generationImages.original_prompt,
      // Social statistics
      like_count: generationImages.like_count,
      favorite_count: generationImages.favorite_count,
      visibility_level: generationImages.visibility_level,
    })
    .from(generationImages)
    .where(and(...imageFilters))
    .orderBy(desc(generationImages.created_at))
    .limit(limit)
    .offset(offset);

  return imageResults;
}

export async function queryPublicUserImages(params: QueryUserImagesParams) {
  const { userUuid, searchFilter, typeExcludeFilter, genTypeFilter, limit, offset } = params;

  const imageFilters: any[] = [
    eq(generationImages.user_uuid, userUuid),
    eq(generationImages.visibility_level, "public"),
  ];
  if (typeExcludeFilter) {
    imageFilters.push(typeExcludeFilter);
  }
  if (genTypeFilter?.length) {
    imageFilters.push(inArray(generationImages.gen_type, genTypeFilter));
  }
  if (searchFilter) {
    imageFilters.push(searchFilter);
  }

  const imageResults = await db()
    .select({
      uuid: generationImages.uuid,
      user_uuid: generationImages.user_uuid,
      gen_type: generationImages.gen_type,
      thumbnail_desktop: generationImages.thumbnail_desktop,
      thumbnail_mobile: generationImages.thumbnail_mobile,
      image_url: generationImages.image_url,
      model_id: generationImages.model_id,
      style: generationImages.style,
      created_at: generationImages.created_at,
      original_prompt: generationImages.original_prompt,
      like_count: generationImages.like_count,
      favorite_count: generationImages.favorite_count,
      visibility_level: generationImages.visibility_level,
    })
    .from(generationImages)
    .where(and(...imageFilters))
    .orderBy(desc(generationImages.created_at))
    .limit(limit)
    .offset(offset);

  return imageResults;
}

/**
 * Query user videos with filters
 */
export async function queryUserVideos(params: QueryUserVideosParams) {
  const { userUuid, searchQuery, genTypeFilter, limit, offset } = params;

  const videoFilters: any[] = [eq(generationVideos.user_uuid, userUuid)];

  if (searchQuery) {
    videoFilters.push(
      or(ilike(generationVideos.original_prompt, `%${searchQuery}%`))
    );
  }
  if (genTypeFilter?.length) {
    videoFilters.push(inArray(generationVideos.gen_type, genTypeFilter));
  }

  const videoResults = await db()
    .select({
      uuid: generationVideos.uuid,
      user_uuid: generationVideos.user_uuid,
      gen_type: generationVideos.gen_type,
      poster_url: generationVideos.poster_url,
      video_url: generationVideos.video_url,
      model_id: generationVideos.model_id,
      style: generationVideos.style,
      duration_seconds: generationVideos.duration_seconds,
      created_at: generationVideos.created_at,
      original_prompt: generationVideos.original_prompt,
      // Social statistics
      like_count: generationVideos.like_count,
      favorite_count: generationVideos.favorite_count,
      visibility_level: generationVideos.visibility_level,
    })
    .from(generationVideos)
    .where(and(...videoFilters))
    .orderBy(desc(generationVideos.created_at))
    .limit(limit)
    .offset(offset);

  return videoResults;
}

export async function queryPublicUserVideos(params: QueryUserVideosParams) {
  const { userUuid, searchQuery, genTypeFilter, limit, offset } = params;

  const videoFilters: any[] = [
    eq(generationVideos.user_uuid, userUuid),
    eq(generationVideos.visibility_level, "public"),
  ];

  if (searchQuery) {
    videoFilters.push(
      or(ilike(generationVideos.original_prompt, `%${searchQuery}%`))
    );
  }
  if (genTypeFilter?.length) {
    videoFilters.push(inArray(generationVideos.gen_type, genTypeFilter));
  }

  const videoResults = await db()
    .select({
      uuid: generationVideos.uuid,
      user_uuid: generationVideos.user_uuid,
      gen_type: generationVideos.gen_type,
      poster_url: generationVideos.poster_url,
      video_url: generationVideos.video_url,
      model_id: generationVideos.model_id,
      style: generationVideos.style,
      duration_seconds: generationVideos.duration_seconds,
      created_at: generationVideos.created_at,
      original_prompt: generationVideos.original_prompt,
      like_count: generationVideos.like_count,
      favorite_count: generationVideos.favorite_count,
      visibility_level: generationVideos.visibility_level,
    })
    .from(generationVideos)
    .where(and(...videoFilters))
    .orderBy(desc(generationVideos.created_at))
    .limit(limit)
    .offset(offset);

  return videoResults;
}

/**
 * Count user images
 */
export async function countUserImages(params: CountArtworksParams) {
  const { userUuid, searchFilter, typeExcludeFilter, genTypeFilter } = params;

  const imageCountFilters: any[] = [eq(generationImages.user_uuid, userUuid)];
  if (typeExcludeFilter) {
    imageCountFilters.push(typeExcludeFilter);
  }
  if (genTypeFilter?.length) {
    imageCountFilters.push(inArray(generationImages.gen_type, genTypeFilter));
  }
  if (searchFilter) {
    imageCountFilters.push(searchFilter);
  }

  const [countResult] = await db()
    .select({ count: count() })
    .from(generationImages)
    .where(and(...imageCountFilters));

  return countResult?.count || 0;
}

export async function countPublicUserImages(params: CountArtworksParams) {
  const { userUuid, searchFilter, typeExcludeFilter, genTypeFilter } = params;

  const imageCountFilters: any[] = [
    eq(generationImages.user_uuid, userUuid),
    eq(generationImages.visibility_level, "public"),
  ];
  if (typeExcludeFilter) {
    imageCountFilters.push(typeExcludeFilter);
  }
  if (genTypeFilter?.length) {
    imageCountFilters.push(inArray(generationImages.gen_type, genTypeFilter));
  }
  if (searchFilter) {
    imageCountFilters.push(searchFilter);
  }

  const [countResult] = await db()
    .select({ count: count() })
    .from(generationImages)
    .where(and(...imageCountFilters));

  return countResult?.count || 0;
}

/**
 * Count user videos
 */
export async function countUserVideos(params: CountArtworksParams) {
  const { userUuid, searchQuery, genTypeFilter } = params;

  const videoCountFilters: any[] = [eq(generationVideos.user_uuid, userUuid)];

  if (searchQuery) {
    videoCountFilters.push(
      or(ilike(generationVideos.original_prompt, `%${searchQuery}%`))
    );
  }
  if (genTypeFilter?.length) {
    videoCountFilters.push(inArray(generationVideos.gen_type, genTypeFilter));
  }

  const [countResult] = await db()
    .select({ count: count() })
    .from(generationVideos)
    .where(and(...videoCountFilters));

  return countResult?.count || 0;
}

export async function countPublicUserVideos(params: CountArtworksParams) {
  const { userUuid, searchQuery, genTypeFilter } = params;

  const videoCountFilters: any[] = [
    eq(generationVideos.user_uuid, userUuid),
    eq(generationVideos.visibility_level, "public"),
  ];

  if (searchQuery) {
    videoCountFilters.push(
      or(ilike(generationVideos.original_prompt, `%${searchQuery}%`))
    );
  }
  if (genTypeFilter?.length) {
    videoCountFilters.push(inArray(generationVideos.gen_type, genTypeFilter));
  }

  const [countResult] = await db()
    .select({ count: count() })
    .from(generationVideos)
    .where(and(...videoCountFilters));

  return countResult?.count || 0;
}

/**
 * Query user favorite images
 */
export async function queryUserFavoriteImages(params: QueryUserImagesParams) {
  const { userUuid, searchFilter, typeExcludeFilter, genTypeFilter, limit, offset } = params;

  const imageFilters: any[] = [
    eq(userInteractions.user_uuid, userUuid),
    eq(userInteractions.interaction_type, "favorite"),
    eq(userInteractions.art_type, "image"),
  ];

  if (typeExcludeFilter) {
    imageFilters.push(typeExcludeFilter);
  }
  if (genTypeFilter?.length) {
    imageFilters.push(inArray(generationImages.gen_type, genTypeFilter));
  }
  if (searchFilter) {
    imageFilters.push(searchFilter);
  }

  const imageResults = await db()
    .select({
      uuid: generationImages.uuid,
      user_uuid: generationImages.user_uuid,
      gen_type: generationImages.gen_type,
      thumbnail_desktop: generationImages.thumbnail_desktop,
      thumbnail_mobile: generationImages.thumbnail_mobile,
      image_url: generationImages.image_url,
      model_id: generationImages.model_id,
      style: generationImages.style,
      created_at: generationImages.created_at,
      original_prompt: generationImages.original_prompt,
      // Social statistics
      like_count: generationImages.like_count,
      favorite_count: generationImages.favorite_count,
      visibility_level: generationImages.visibility_level,
    })
    .from(userInteractions)
    .innerJoin(
      generationImages,
      eq(userInteractions.art_id, generationImages.uuid)
    )
    .where(and(...imageFilters))
    .orderBy(desc(userInteractions.created_at))
    .limit(limit)
    .offset(offset);

  return imageResults;
}

/**
 * Query user favorite videos
 */
export async function queryUserFavoriteVideos(params: QueryUserVideosParams) {
  const { userUuid, searchQuery, genTypeFilter, limit, offset } = params;

  const videoFilters: any[] = [
    eq(userInteractions.user_uuid, userUuid),
    eq(userInteractions.interaction_type, "favorite"),
    eq(userInteractions.art_type, "video"),
  ];

  if (searchQuery) {
    videoFilters.push(
      or(ilike(generationVideos.original_prompt, `%${searchQuery}%`))
    );
  }
  if (genTypeFilter?.length) {
    videoFilters.push(inArray(generationVideos.gen_type, genTypeFilter));
  }

  const videoResults = await db()
    .select({
      uuid: generationVideos.uuid,
      user_uuid: generationVideos.user_uuid,
      gen_type: generationVideos.gen_type,
      poster_url: generationVideos.poster_url,
      video_url: generationVideos.video_url,
      model_id: generationVideos.model_id,
      style: generationVideos.style,
      duration_seconds: generationVideos.duration_seconds,
      created_at: generationVideos.created_at,
      original_prompt: generationVideos.original_prompt,
      // Social statistics
      like_count: generationVideos.like_count,
      favorite_count: generationVideos.favorite_count,
      visibility_level: generationVideos.visibility_level,
    })
    .from(userInteractions)
    .innerJoin(
      generationVideos,
      eq(userInteractions.art_id, generationVideos.uuid)
    )
    .where(and(...videoFilters))
    .orderBy(desc(userInteractions.created_at))
    .limit(limit)
    .offset(offset);

  return videoResults;
}

/**
 * Count user favorite images
 */
export async function countUserFavoriteImages(params: CountArtworksParams) {
  const { userUuid, searchFilter, typeExcludeFilter } = params;

  const imageCountFilters: any[] = [
    eq(userInteractions.user_uuid, userUuid),
    eq(userInteractions.interaction_type, "favorite"),
    eq(userInteractions.art_type, "image"),
  ];

  if (typeExcludeFilter) {
    imageCountFilters.push(typeExcludeFilter);
  }
  if (searchFilter) {
    imageCountFilters.push(searchFilter);
  }

  const [countResult] = await db()
    .select({ count: count() })
    .from(userInteractions)
    .innerJoin(
      generationImages,
      eq(userInteractions.art_id, generationImages.uuid)
    )
    .where(and(...imageCountFilters));

  return countResult?.count || 0;
}

/**
 * Count user favorite videos
 */
export async function countUserFavoriteVideos(params: CountArtworksParams) {
  const { userUuid, searchQuery } = params;

  const videoCountFilters: any[] = [
    eq(userInteractions.user_uuid, userUuid),
    eq(userInteractions.interaction_type, "favorite"),
    eq(userInteractions.art_type, "video"),
  ];

  if (searchQuery) {
    videoCountFilters.push(
      or(ilike(generationVideos.original_prompt, `%${searchQuery}%`))
    );
  }

  const [countResult] = await db()
    .select({ count: count() })
    .from(userInteractions)
    .innerJoin(
      generationVideos,
      eq(userInteractions.art_id, generationVideos.uuid)
    )
    .where(and(...videoCountFilters));

  return countResult?.count || 0;
}

/**
 * Get user interaction state for a batch of artworks
 * Returns a map of artwork UUID to interaction state
 */
export async function getUserArtworkInteractions(
  userUuid: string,
  artUuids: string[],
  artType: "image" | "video"
): Promise<Record<string, { liked: boolean; favorited: boolean }>> {
  if (artUuids.length === 0) {
    return {};
  }

  const interactions = await db()
    .select({
      art_id: userInteractions.art_id,
      interaction_type: userInteractions.interaction_type,
    })
    .from(userInteractions)
    .where(
      and(
        eq(userInteractions.user_uuid, userUuid),
        eq(userInteractions.art_type, artType),
        inArray(userInteractions.art_id, artUuids),
        or(
          eq(userInteractions.interaction_type, "like"),
          eq(userInteractions.interaction_type, "favorite")
        )
      )
    );

  // Group by art_id
  const interactionMap: Record<string, { liked: boolean; favorited: boolean }> =
    {};
  artUuids.forEach((uuid) => {
    interactionMap[uuid] = { liked: false, favorited: false };
  });

  interactions.forEach((interaction) => {
    const state = interactionMap[interaction.art_id];
    if (state) {
      if (interaction.interaction_type === "like") {
        state.liked = true;
      } else if (interaction.interaction_type === "favorite") {
        state.favorited = true;
      }
    }
  });

  return interactionMap;
}

/**
 * Find image by UUID
 */
export async function findImageByUuid(uuid: string) {
  const [result] = await db()
    .select()
    .from(generationImages)
    .where(eq(generationImages.uuid, uuid))
    .limit(1);
  return result;
}

/**
 * Find video by UUID
 */
export async function findVideoByUuid(uuid: string) {
  const [result] = await db()
    .select()
    .from(generationVideos)
    .where(eq(generationVideos.uuid, uuid))
    .limit(1);
  return result;
}

/**
 * Update artwork visibility
 */
export async function updateArtworkVisibility(
  uuid: string,
  artType: "image" | "video" | "character",
  visibilityLevel: "public" | "private"
): Promise<void> {
  if (artType === "image") {
    // Update the image visibility
    await db()
      .update(generationImages)
      .set({ visibility_level: visibilityLevel })
      .where(eq(generationImages.uuid, uuid));

    // Get the generation_uuid from the image record to sync character_generations
    const [imageRecord] = await db()
      .select({ generation_uuid: generationImages.generation_uuid })
      .from(generationImages)
      .where(eq(generationImages.uuid, uuid))
      .limit(1);

    // Sync visibility to character_generations if this image is linked to a character
    // Use generation_uuid instead of image uuid
    if (imageRecord?.generation_uuid) {
      await syncCharacterGenerationsVisibility(imageRecord.generation_uuid, visibilityLevel);
    }
  } else if (artType === "video") {
    // Update the video visibility
    await db()
      .update(generationVideos)
      .set({ visibility_level: visibilityLevel })
      .where(eq(generationVideos.uuid, uuid));

    // Get the generation_uuid from the video record to sync character_generations
    const [videoRecord] = await db()
      .select({ generation_uuid: generationVideos.generation_uuid })
      .from(generationVideos)
      .where(eq(generationVideos.uuid, uuid))
      .limit(1);

    // Sync visibility to character_generations if this video is linked to a character
    // Use generation_uuid instead of video uuid
    if (videoRecord?.generation_uuid) {
      await syncCharacterGenerationsVisibility(videoRecord.generation_uuid, visibilityLevel);
    }
  } else if (artType === "character") {
    await db()
      .update(characters)
      .set({ visibility_level: visibilityLevel })
      .where(eq(characters.uuid, uuid));

    // Note: Character visibility and character_generations visibility are managed separately
    // No sync needed for character visibility changes
  }
}

/**
 * Get artwork visibility level
 */
export async function getArtworkVisibility(
  uuid: string,
  artType: "image" | "video" | "character"
): Promise<"public" | "private"> {
  if (artType === "image") {
    const [result] = await db()
      .select({ visibility_level: generationImages.visibility_level })
      .from(generationImages)
      .where(eq(generationImages.uuid, uuid))
      .limit(1);
    return (result?.visibility_level as "public" | "private") || "private";
  } else if (artType === "video") {
    const [result] = await db()
      .select({ visibility_level: generationVideos.visibility_level })
      .from(generationVideos)
      .where(eq(generationVideos.uuid, uuid))
      .limit(1);
    return (result?.visibility_level as "public" | "private") || "private";
  } else {
    const [result] = await db()
      .select({ visibility_level: characters.visibility_level })
      .from(characters)
      .where(eq(characters.uuid, uuid))
      .limit(1);
    return (result?.visibility_level as "public" | "private") || "private";
  }
}

/**
 * Find character by UUID with ownership verification
 */
export async function findCharacterByUuidWithOwnership(
  uuid: string,
  userUuid: string
): Promise<typeof characters.$inferSelect | null> {
  const [result] = await db()
    .select()
    .from(characters)
    .where(eq(characters.uuid, uuid))
    .limit(1);

  if (!result) {
    return null;
  }

  if (result.user_uuid !== userUuid) {
    return null;
  }

  return result;
}

/**
 * Update character_generations visibility when related artwork visibility changes
 */
export async function syncCharacterGenerationsVisibility(
  generationUuid: string,
  visibilityLevel: "public" | "private"
): Promise<void> {
  try {
    // Find all character_generations records linked to this generation
    const characterGenerationsRecords = await findCharacterGenerationsByGenerationUuid(
      generationUuid
    );

    // Update visibility for each related character_generations record
    for (const record of characterGenerationsRecords) {
      await db()
        .update(characterGenerations)
        .set({ visibility_level: visibilityLevel })
        .where(eq(characterGenerations.id, record.id));
    }
  } catch (error) {
    console.error(
      "Failed to sync character_generations visibility:",
      error
    );
    // Don't throw error - we don't want to fail the main visibility update
  }
}

/**
 * Batch update character_generations visibility for all generations of a character
 */
export async function syncCharacterAllGenerationsVisibility(
  characterUuid: string,
  visibilityLevel: "public" | "private"
): Promise<void> {
  try {
    await db()
      .update(characterGenerations)
      .set({ visibility_level: visibilityLevel })
      .where(eq(characterGenerations.character_uuid, characterUuid));
  } catch (error) {
    console.error(
      "Failed to sync character all generations visibility:",
      error
    );
    // Don't throw error - we don't want to fail the main visibility update
  }
}
