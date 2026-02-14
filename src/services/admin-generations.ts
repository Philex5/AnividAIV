import { and, eq, gte, ilike, desc, lte, sql, inArray, or, ne, isNull } from "drizzle-orm";

import { db } from "@/db";
import { generations, generationImages, generationVideos } from "@/db/schema";
import { findGenerationImageByUuid, getImagesByGenerationUuids } from "@/models/generation-image";
import { findGenerationVideoByUuid, getVideosByGenerationUuids } from "@/models/generation-video";
import { findCharactersWithAvatarsByUuids } from "@/models/character";
import { toImageUrl } from "@/lib/r2-utils";
import { batchLoadAuthors } from "@/models/community";
import {
  getGenTypeWhitelist,
  normalizeGenType,
  normalizeGenTypes,
} from "@/configs/gen-type-display";

export interface GenerationListItem {
  uuid: string;
  type: string;
  status: string;
  prompt: string;
  created_at: string;
  updated_at: string;
  user_uuid: string;
  user_name?: string | null;
  user_avatar?: string | null;
  error_code?: string;
  error_message?: string;
  model_id: string;
  sub_type?: string;
  gen_type?: string | null;
  progress?: number;
  credits_cost?: number;
  generation_time?: number;
  reference_image_url?: string;
  metadata?: any;
  character_uuids?: string | null;
  preview_image_uuid?: string | null;
  preview_image_url?: string | null;
  preview_video_uuid?: string | null;
  preview_video_poster_url?: string | null;
  character_uuid?: string | null;
  character_name?: string | null;
  character_avatar_url?: string | null;
  moderation_status?: string;
  visibility_level?: "public" | "private";
  // The actual artwork UUID for status update (image/video uuid, not generation uuid)
  artwork_uuid?: string | null;
  // The actual gen_type from image/video table
  actual_gen_type?: string | null;
}

function resolveAdminGenTypeConstraints(type?: string, requestedGenType?: string) {
  const imageWhitelist = normalizeGenTypes(getGenTypeWhitelist("admin", "image"));
  const videoWhitelist = normalizeGenTypes(getGenTypeWhitelist("admin", "video"));
  const characterWhitelist = normalizeGenTypes(getGenTypeWhitelist("admin", "character"));

  const imageAllowedBase =
    type === "character"
      ? characterWhitelist
      : type === "image"
        ? imageWhitelist
        : normalizeGenTypes([...imageWhitelist, ...characterWhitelist]);

  const videoAllowedBase =
    type === "video" || type === "all" || !type ? videoWhitelist : [];

  const normalizedRequested = normalizeGenType(requestedGenType);
  if (!normalizedRequested || normalizedRequested === "all") {
    return {
      imageAllowedGenTypes: imageAllowedBase,
      videoAllowedGenTypes: videoAllowedBase,
    };
  }

  return {
    imageAllowedGenTypes: imageAllowedBase.includes(normalizedRequested)
      ? [normalizedRequested]
      : [],
    videoAllowedGenTypes: videoAllowedBase.includes(normalizedRequested)
      ? [normalizedRequested]
      : [],
  };
}

function parseCharacterUuids(raw?: string | null): string[] {
  if (!raw) return [];
  const trimmed = String(raw).trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }
  } catch {
    // ignore invalid JSON and fallback to comma-separated values
  }

  return trimmed
    .split(",")
    .map((item) => item.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);
}

export async function listAllGenerationsWithPagination(options?: {
  page?: number;
  limit?: number;
  type?: string;
  genType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  artworkUuid?: string;
  moderationStatus?: string;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const offset = (page - 1) * limit;

  const { imageAllowedGenTypes, videoAllowedGenTypes } =
    resolveAdminGenTypeConstraints(options?.type, options?.genType);

  if (options?.type === "video" && videoAllowedGenTypes.length === 0) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  if (
    (options?.type === "image" || options?.type === "character") &&
    imageAllowedGenTypes.length === 0
  ) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  if ((!options?.type || options.type === "all") && imageAllowedGenTypes.length === 0 && videoAllowedGenTypes.length === 0) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  let artworkGenerationUuids: string[] | null = null;
  if (options?.artworkUuid) {
    const [image, video] = await Promise.all([
      findGenerationImageByUuid(options.artworkUuid),
      findGenerationVideoByUuid(options.artworkUuid),
    ]);
    const matched = new Set<string>();
    if (image?.generation_uuid) matched.add(image.generation_uuid);
    if (video?.generation_uuid) matched.add(video.generation_uuid);

    if (matched.size === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    artworkGenerationUuids = Array.from(matched);
  }

  const database = db();

  let query = database
    .select({
      uuid: generations.uuid,
      type: generations.type,
      status: generations.status,
      prompt: generations.prompt,
      created_at: generations.created_at,
      updated_at: generations.updated_at,
      user_uuid: generations.user_uuid,
      error_code: generations.error_code,
      error_message: generations.error_message,
      model_id: generations.model_id,
      sub_type: generations.sub_type,
      progress: generations.progress,
      credits_cost: generations.credits_cost,
      generation_time: generations.generation_time,
      reference_image_url: generations.reference_image_url,
      metadata: generations.metadata,
      character_uuids: generations.character_uuids,
    })
    .from(generations);

  // Apply filters
  const conditions = [];

  if (options?.type && options.type !== "all") {
    if (options.type === "character") {
      conditions.push(or(eq(generations.type, "character"), eq(generations.sub_type, "character")));
    } else if (options.type === "image") {
      conditions.push(
        and(
          ne(generations.type, "video"),
          ne(generations.type, "character"),
          or(isNull(generations.sub_type), ne(generations.sub_type, "character"))
        )
      );
    } else {
      conditions.push(eq(generations.type, options.type));
    }
  }

  if (options?.userId) {
    conditions.push(eq(generations.user_uuid, options.userId));
  }

  if (options?.startDate) {
    conditions.push(gte(generations.created_at, new Date(options.startDate)));
  }

  if (options?.endDate) {
    conditions.push(lte(generations.created_at, new Date(options.endDate)));
  }

  if (options?.search) {
    // Search in prompt only
    const searchPattern = `%${options.search}%`;
    conditions.push(
      ilike(generations.prompt, searchPattern)
    );
  }

  if (artworkGenerationUuids?.length) {
    conditions.push(inArray(generations.uuid, artworkGenerationUuids));
  }

  const hasModerationFilter = Boolean(
    options?.moderationStatus && options.moderationStatus !== "all"
  );

  {
    const imageExistsCondition = sql<boolean>`exists (
      select 1
      from ${generationImages}
      where ${generationImages.generation_uuid} = ${generations.uuid}
        ${hasModerationFilter
          ? sql`and ${generationImages.moderation_status} = ${options?.moderationStatus}`
          : sql``}
        ${imageAllowedGenTypes.length > 0
          ? sql`and ${inArray(generationImages.gen_type, imageAllowedGenTypes)}`
          : sql`and 1 = 0`}
    )`;

    const videoExistsCondition = sql<boolean>`exists (
      select 1
      from ${generationVideos}
      where ${generationVideos.generation_uuid} = ${generations.uuid}
        ${hasModerationFilter
          ? sql`and ${generationVideos.moderation_status} = ${options?.moderationStatus}`
          : sql``}
        ${videoAllowedGenTypes.length > 0
          ? sql`and ${inArray(generationVideos.gen_type, videoAllowedGenTypes)}`
          : sql`and 1 = 0`}
    )`;

    if (options?.type === "video") {
      conditions.push(videoExistsCondition);
    } else if (options?.type === "image" || options?.type === "character") {
      conditions.push(imageExistsCondition);
    } else {
      conditions.push(or(imageExistsCondition, videoExistsCondition));
    }
  }

  // 构建完整查询
  const finalQuery = conditions.length > 0
    ? query.where(and(...conditions))
    : query;

  // Get total count for pagination
  const countQuery = database
    .select({ count: sql<number>`count(*)` })
    .from(generations);

  let countConditions = [];
  if (options?.type && options.type !== "all") {
    if (options.type === "character") {
      countConditions.push(or(eq(generations.type, "character"), eq(generations.sub_type, "character")));
    } else if (options.type === "image") {
      countConditions.push(
        and(
          ne(generations.type, "video"),
          ne(generations.type, "character"),
          or(isNull(generations.sub_type), ne(generations.sub_type, "character"))
        )
      );
    } else {
      countConditions.push(eq(generations.type, options.type));
    }
  }
  if (options?.userId) {
    countConditions.push(eq(generations.user_uuid, options.userId));
  }
  if (options?.startDate) {
    countConditions.push(gte(generations.created_at, new Date(options.startDate)));
  }
  if (options?.endDate) {
    countConditions.push(lte(generations.created_at, new Date(options.endDate)));
  }
  if (options?.search) {
    const searchPattern = `%${options.search}%`;
    countConditions.push(
      ilike(generations.prompt, searchPattern)
    );
  }
  if (artworkGenerationUuids?.length) {
    countConditions.push(inArray(generations.uuid, artworkGenerationUuids));
  }

  {
    const countImageExistsCondition = sql<boolean>`exists (
      select 1
      from ${generationImages}
      where ${generationImages.generation_uuid} = ${generations.uuid}
        ${hasModerationFilter
          ? sql`and ${generationImages.moderation_status} = ${options?.moderationStatus}`
          : sql``}
        ${imageAllowedGenTypes.length > 0
          ? sql`and ${inArray(generationImages.gen_type, imageAllowedGenTypes)}`
          : sql`and 1 = 0`}
    )`;

    const countVideoExistsCondition = sql<boolean>`exists (
      select 1
      from ${generationVideos}
      where ${generationVideos.generation_uuid} = ${generations.uuid}
        ${hasModerationFilter
          ? sql`and ${generationVideos.moderation_status} = ${options?.moderationStatus}`
          : sql``}
        ${videoAllowedGenTypes.length > 0
          ? sql`and ${inArray(generationVideos.gen_type, videoAllowedGenTypes)}`
          : sql`and 1 = 0`}
    )`;

    if (options?.type === "video") {
      countConditions.push(countVideoExistsCondition);
    } else if (options?.type === "image" || options?.type === "character") {
      countConditions.push(countImageExistsCondition);
    } else {
      countConditions.push(or(countImageExistsCondition, countVideoExistsCondition));
    }
  }

  const totalResult = countConditions.length > 0
    ? await countQuery.where(and(...countConditions))
    : await countQuery;

  const total = totalResult[0]?.count || 0;

  // Add ordering and pagination
  const data = await finalQuery
    .orderBy(desc(generations.created_at))
    .limit(limit)
    .offset(offset);

  const generationUuids = data.map((item) => item.uuid);
  const characterUuids = new Set<string>();
  data.forEach((item) => {
    parseCharacterUuids(item.character_uuids).forEach((uuid) => {
      characterUuids.add(uuid);
    });
  });

  const userUuids = Array.from(new Set(data.map((item) => item.user_uuid).filter(Boolean)));

  const [images, videos, characters, authors] = await Promise.all([
    getImagesByGenerationUuids(generationUuids),
    getVideosByGenerationUuids(generationUuids),
    characterUuids.size
      ? findCharactersWithAvatarsByUuids(Array.from(characterUuids))
      : Promise.resolve([]),
    userUuids.length ? batchLoadAuthors(userUuids) : Promise.resolve([]),
  ]);

  const authorMap = new Map(authors.map((a) => [a.uuid, a]));

  const imageMap = new Map<string, {
    uuid: string;
    url: string;
    moderation_status?: string;
    gen_type?: string;
    visibility_level?: string;
  }>();
  images.forEach((image) => {
    if (imageMap.has(image.generation_uuid)) {
      return;
    }
    const previewUrl =
      image.thumbnail_detail ||
      image.thumbnail_desktop ||
      image.thumbnail_mobile ||
      image.image_url ||
      "";
    imageMap.set(image.generation_uuid, {
      uuid: image.uuid,
      url: toImageUrl(previewUrl),
      moderation_status: image.moderation_status || "normal",
      gen_type: image.gen_type || undefined,
      visibility_level: image.visibility_level || "private",
    });
  });

  const videoMap = new Map<string, {
    uuid: string;
    posterUrl: string;
    moderation_status?: string;
    gen_type?: string;
    visibility_level?: string;
  }>();
  videos.forEach((video) => {
    if (videoMap.has(video.generation_uuid)) {
      return;
    }
    videoMap.set(video.generation_uuid, {
      uuid: video.uuid,
      posterUrl: toImageUrl(video.poster_url || ""),
      moderation_status: video.moderation_status || "normal",
      gen_type: video.gen_type || undefined,
      visibility_level: video.visibility_level || "private",
    });
  });

  const characterMap = new Map<
    string,
    {
      uuid: string;
      name: string | null;
      avatar_url: string | null;
      visibility_level: string | null;
    }
  >();
  characters.forEach((character) => {
    const avatarSource =
      character.thumbnail_detail ||
      character.thumbnail_desktop ||
      character.thumbnail_mobile ||
      character.image_url ||
      "";
    characterMap.set(character.uuid, {
      uuid: character.uuid,
      name: character.name,
      avatar_url: avatarSource ? toImageUrl(avatarSource) : null,
      visibility_level: character.visibility_level,
    });
  });

  const enrichedData: GenerationListItem[] = data.map((item) => {
    const imagePreview = imageMap.get(item.uuid);
    const videoPreview = videoMap.get(item.uuid);
    const parsedCharacterUuids = parseCharacterUuids(item.character_uuids);
    const primaryCharacterUuid = parsedCharacterUuids[0] || null;
    const characterInfo = primaryCharacterUuid
      ? characterMap.get(primaryCharacterUuid)
      : undefined;
    const derivedGenType = item.sub_type || item.type || null;

    // Get actual gen_type from image/video table (not from generations.sub_type)
    const actualGenType = videoPreview?.gen_type || imagePreview?.gen_type || derivedGenType;

    // Get moderation_status from resource (image/video/character)
    // For character type, we'll need to fetch it separately - default to normal for now
    let moderationStatus = "normal";
    if (videoPreview?.moderation_status) {
      moderationStatus = videoPreview.moderation_status;
    } else if (imagePreview?.moderation_status) {
      moderationStatus = imagePreview.moderation_status;
    }

    const isCharacter = item.type === "character" || item.sub_type === "character";
    let visibilityLevel: "public" | "private" = "private";
    if (isCharacter && characterInfo?.visibility_level) {
      visibilityLevel = characterInfo.visibility_level === "public" ? "public" : "private";
    } else if (videoPreview?.visibility_level) {
      visibilityLevel = videoPreview.visibility_level === "public" ? "public" : "private";
    } else if (imagePreview?.visibility_level) {
      visibilityLevel = imagePreview.visibility_level === "public" ? "public" : "private";
    }

    // Determine artwork_uuid for status update API
    // For OC/character: use character_uuid
    // For video: use preview_video_uuid (video uuid)
    // For image: use preview_image_uuid (image uuid)
    let artworkUuid: string | null = null;
    if (item.type === "video" && videoPreview?.uuid) {
      artworkUuid = videoPreview.uuid;
    } else if (imagePreview?.uuid) {
      artworkUuid = imagePreview.uuid;
    }

    const authorInfo = authorMap.get(item.user_uuid);

    return {
      ...item,
      created_at: item.created_at ? item.created_at.toISOString() : "",
      updated_at: item.updated_at ? item.updated_at.toISOString() : "",
      error_code: item.error_code ?? undefined,
      error_message: item.error_message ?? undefined,
      sub_type: item.sub_type ?? undefined,
      gen_type: derivedGenType,
      actual_gen_type: actualGenType,
      progress: item.progress ?? undefined,
      credits_cost: item.credits_cost ?? undefined,
      generation_time: item.generation_time ?? undefined,
      reference_image_url: item.reference_image_url ?? undefined,
      preview_image_uuid: imagePreview?.uuid ?? null,
      preview_image_url: imagePreview?.url ?? null,
      preview_video_uuid: videoPreview?.uuid ?? null,
      preview_video_poster_url: videoPreview?.posterUrl ?? null,
      character_uuid: primaryCharacterUuid,
      character_name: characterInfo?.name ?? null,
      character_avatar_url: characterInfo?.avatar_url ?? null,
      moderation_status: moderationStatus,
      visibility_level: visibilityLevel,
      user_name: authorInfo?.name ?? null,
      user_avatar: authorInfo?.avatar ?? null,
      artwork_uuid: artworkUuid,
    };
  });

  return {
    data: enrichedData,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
