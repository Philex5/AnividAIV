/**
 * Artworks Service
 * Related: FEAT-my-artworks
 *
 * Provides unified query interface for user's generated images and videos
 */

import { or, ilike } from "drizzle-orm";
import { getGenTypeWhitelist } from "@/configs/gen-type-display";
import type {
  ArtworkListItem,
  ArtworksResponse,
  ArtworkType,
  MainTab,
  TypeTab,
} from "@/types/pages/my-artworks";
import { toImageUrl } from "@/lib/r2-utils";
import {
  queryUserImages,
  queryUserVideos,
  countUserImages,
  countUserVideos,
  queryPublicUserImages,
  queryPublicUserVideos,
  countPublicUserImages,
  countPublicUserVideos,
  queryUserFavoriteImages,
  queryUserFavoriteVideos,
  countUserFavoriteImages,
  countUserFavoriteVideos,
  getUserArtworkInteractions,
} from "@/models/artwork";
import { generationImages } from "@/db/schema";
import { batchLoadAuthors } from "@/models/community";

interface GetUserArtworksOptions {
  userUuid: string;
  type?: TypeTab;
  tab?: MainTab;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

/**
 * Get user's artworks (images and videos combined)
 * Supports filtering by type, favorites, and search
 */
export async function getUserArtworks(
  options: GetUserArtworksOptions
): Promise<ArtworksResponse> {
  const {
    userUuid,
    type = "all",
    tab = "mine",
    searchQuery = "",
    page = 1,
    limit = 20,
  } = options;

  const offset = (page - 1) * limit;

  // Build base filters
  const searchFilter = searchQuery
    ? or(
        ilike(generationImages.original_prompt, `%${searchQuery}%`),
        ilike(generationImages.final_prompt, `%${searchQuery}%`)
      )
    : undefined;

  const imageGenTypeWhitelist = getGenTypeWhitelist("myArtworks", "image");
  const videoGenTypeWhitelist = getGenTypeWhitelist("myArtworks", "video");
  const canQueryImages = imageGenTypeWhitelist.length > 0;
  const canQueryVideos = videoGenTypeWhitelist.length > 0;

  let images: ArtworkListItem[] = [];
  let videos: ArtworkListItem[] = [];
  let totalCount = 0;

  // Query images if type is 'all' or 'image'
  if ((type === "all" || type === "image") && canQueryImages) {
    // Choose query function based on tab
    const queryFunction =
      tab === "favorites" ? queryUserFavoriteImages : queryUserImages;

    // Use model layer to query images
    const imageResults = await queryFunction({
      userUuid,
      searchFilter,
      genTypeFilter: [...imageGenTypeWhitelist],
      limit,
      offset,
    });

    images = imageResults.map((img) => ({
      uuid: img.uuid,
      type: "image" as ArtworkType,
      thumbnail_url:
        toImageUrl(img.thumbnail_desktop) ||
        toImageUrl(img.thumbnail_mobile) ||
        toImageUrl(img.image_url),
      model_id: img.model_id || "",
      style: img.style || undefined,
      created_at: img.created_at?.toISOString() || "",
      gen_type: img.gen_type || null,
      title: img.original_prompt || undefined,
      // Social statistics
      like_count: img.like_count || 0,
      favorite_count: img.favorite_count || 0,
      visibility_level:
        (img.visibility_level as "public" | "private") || "private",
      // User UUID for fetching author info in favorites
      user_uuid: img.user_uuid,
    }));

    // Get total count for images
    if (type === "image") {
      const countFunction =
        tab === "favorites" ? countUserFavoriteImages : countUserImages;
      totalCount = await countFunction({
        userUuid,
        searchFilter,
        genTypeFilter: [...imageGenTypeWhitelist],
      });
    }
  }

  // Query videos if type is 'all' or 'video'
  if ((type === "all" || type === "video") && canQueryVideos) {
    // Choose query function based on tab
    const queryFunction =
      tab === "favorites" ? queryUserFavoriteVideos : queryUserVideos;

    // Use model layer to query videos
    const videoResults = await queryFunction({
      userUuid,
      searchQuery,
      genTypeFilter: [...videoGenTypeWhitelist],
      limit,
      offset,
    });

    videos = videoResults.map((video) => ({
      uuid: video.uuid,
      type: "video" as ArtworkType,
      thumbnail_url: toImageUrl(video.poster_url),
      video_url: toImageUrl(video.video_url),
      model_id: video.model_id || "",
      style: video.style || undefined,
      duration_seconds: video.duration_seconds || undefined,
      created_at: video.created_at?.toISOString() || "",
      gen_type: video.gen_type || null,
      title: video.original_prompt || undefined,
      // Social statistics
      like_count: video.like_count || 0,
      favorite_count: video.favorite_count || 0,
      visibility_level:
        (video.visibility_level as "public" | "private") || "private",
      // User UUID for fetching author info in favorites
      user_uuid: video.user_uuid,
    }));

    // Get total count for videos
    if (type === "video") {
      const countFunction =
        tab === "favorites" ? countUserFavoriteVideos : countUserVideos;
      totalCount = await countFunction({
        userUuid,
        searchQuery,
        genTypeFilter: [...videoGenTypeWhitelist],
      });
    }
  }

  // Combine and sort by created_at
  let artworks: ArtworkListItem[] = [];

  if (type === "all") {
    // Merge both arrays and sort by created_at
    artworks = [...images, ...videos].sort((a, b) => {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    // For 'all' type, we need to get combined count
    const imageCountFunction =
      tab === "favorites" ? countUserFavoriteImages : countUserImages;
    const videoCountFunction =
      tab === "favorites" ? countUserFavoriteVideos : countUserVideos;

    const imageCount = canQueryImages
      ? await imageCountFunction({
          userUuid,
          searchFilter,
          genTypeFilter: [...imageGenTypeWhitelist],
        })
      : 0;

    const videoCount = canQueryVideos
      ? await videoCountFunction({
          userUuid,
          searchQuery,
          genTypeFilter: [...videoGenTypeWhitelist],
        })
      : 0;

    totalCount = imageCount + videoCount;

    // Apply pagination to combined results
    artworks = artworks.slice(0, limit);
  } else if (type === "image") {
    artworks = images;
  } else {
    artworks = videos;
  }

  // For "favorites" tab, fetch author information
  if (tab === "favorites" && artworks.length > 0) {
    // Collect all unique author UUIDs
    const authorUuids = [
      ...new Set(artworks.map((a) => (a as any).user_uuid).filter(Boolean)),
    ];

    if (authorUuids.length > 0) {
      // Fetch author information in batch
      const authors = await batchLoadAuthors(authorUuids);
      const authorMap = new Map(authors.map((a) => [a.uuid, a]));

      // Add author information to artworks
      artworks = artworks.map((artwork) => {
        const authorUuid = (artwork as any).user_uuid;
        const author = authorMap.get(authorUuid);
        if (author) {
          const { uuid, ...authorWithoutUuid } = author;
          return {
            ...artwork,
            author: {
              id: author.uuid,
              ...authorWithoutUuid,
            },
          };
        }
        return artwork;
      });
    }
  }

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / limit);

  // For "mine" tab, get user interaction state
  if (tab === "mine" && artworks.length > 0) {
    // Get image interactions
    const imageUuids = artworks
      .filter((a) => a.type === "image")
      .map((a) => a.uuid);

    if (imageUuids.length > 0) {
      const imageInteractions = await getUserArtworkInteractions(
        userUuid,
        imageUuids,
        "image"
      );
      artworks = artworks.map((artwork) => {
        if (artwork.type === "image" && imageInteractions[artwork.uuid]) {
          return {
            ...artwork,
            liked: imageInteractions[artwork.uuid].liked,
            favorited: imageInteractions[artwork.uuid].favorited,
          };
        }
        return artwork;
      });
    }

    // Get video interactions
    const videoUuids = artworks
      .filter((a) => a.type === "video")
      .map((a) => a.uuid);

    if (videoUuids.length > 0) {
      const videoInteractions = await getUserArtworkInteractions(
        userUuid,
        videoUuids,
        "video"
      );
      artworks = artworks.map((artwork) => {
        if (artwork.type === "video" && videoInteractions[artwork.uuid]) {
          return {
            ...artwork,
            liked: videoInteractions[artwork.uuid].liked,
            favorited: videoInteractions[artwork.uuid].favorited,
          };
        }
        return artwork;
      });
    }
  }

  return {
    artworks,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function getPublicUserArtworks(
  options: GetUserArtworksOptions
): Promise<ArtworksResponse> {
  const {
    userUuid,
    type = "all",
    searchQuery = "",
    page = 1,
    limit = 20,
  } = options;

  const offset = (page - 1) * limit;

  const imageGenTypeWhitelist = getGenTypeWhitelist("myArtworks", "image");
  const videoGenTypeWhitelist = getGenTypeWhitelist("myArtworks", "video");
  const canQueryImages = imageGenTypeWhitelist.length > 0;
  const canQueryVideos = videoGenTypeWhitelist.length > 0;

  const searchFilter = searchQuery
    ? or(
        ilike(generationImages.original_prompt, `%${searchQuery}%`),
        ilike(generationImages.final_prompt, `%${searchQuery}%`)
      )
    : undefined;

  let images: ArtworkListItem[] = [];
  let videos: ArtworkListItem[] = [];
  let totalCount = 0;

  if ((type === "all" || type === "image") && canQueryImages) {
    const imageResults = await queryPublicUserImages({
      userUuid,
      searchFilter,
      genTypeFilter: [...imageGenTypeWhitelist],
      limit,
      offset,
    });

    images = imageResults.map((img) => ({
      uuid: img.uuid,
      type: "image" as ArtworkType,
      thumbnail_url:
        toImageUrl(img.thumbnail_desktop) ||
        toImageUrl(img.thumbnail_mobile) ||
        toImageUrl(img.image_url),
      model_id: img.model_id || "",
      style: img.style || undefined,
      created_at: img.created_at?.toISOString() || "",
      gen_type: img.gen_type || null,
      title: img.original_prompt || undefined,
      like_count: img.like_count || 0,
      favorite_count: img.favorite_count || 0,
      visibility_level:
        (img.visibility_level as "public" | "private") || "public",
      user_uuid: img.user_uuid,
    }));

    if (type === "image") {
      totalCount = await countPublicUserImages({
        userUuid,
        searchFilter,
        genTypeFilter: [...imageGenTypeWhitelist],
      });
    }
  }

  if ((type === "all" || type === "video") && canQueryVideos) {
    const videoResults = await queryPublicUserVideos({
      userUuid,
      searchQuery,
      genTypeFilter: [...videoGenTypeWhitelist],
      limit,
      offset,
    });

    videos = videoResults.map((video) => ({
      uuid: video.uuid,
      type: "video" as ArtworkType,
      thumbnail_url:
        toImageUrl(video.poster_url) || toImageUrl(video.video_url),
      video_url: toImageUrl(video.video_url) || undefined,
      model_id: video.model_id || "",
      style: video.style || undefined,
      duration_seconds: video.duration_seconds || undefined,
      created_at: video.created_at?.toISOString() || "",
      gen_type: video.gen_type || null,
      title: video.original_prompt || undefined,
      like_count: video.like_count || 0,
      favorite_count: video.favorite_count || 0,
      visibility_level:
        (video.visibility_level as "public" | "private") || "public",
      user_uuid: video.user_uuid,
    }));

    if (type === "video") {
      totalCount = await countPublicUserVideos({
        userUuid,
        searchQuery,
        genTypeFilter: [...videoGenTypeWhitelist],
      });
    }
  }

  let artworks: ArtworkListItem[] = [];

  if (type === "all") {
    artworks = [...images, ...videos].sort((a, b) => {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    const imageCount = canQueryImages
      ? await countPublicUserImages({
          userUuid,
          searchFilter,
          genTypeFilter: [...imageGenTypeWhitelist],
        })
      : 0;
    const videoCount = canQueryVideos
      ? await countPublicUserVideos({
          userUuid,
          searchQuery,
          genTypeFilter: [...videoGenTypeWhitelist],
        })
      : 0;

    totalCount = imageCount + videoCount;
    artworks = artworks.slice(0, limit);
  } else if (type === "image") {
    artworks = images;
  } else {
    artworks = videos;
  }

  const totalPages = Math.ceil(totalCount / limit);

  return {
    artworks,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
