import { toImageUrl } from "@/lib/r2-utils";
import { findCharactersWithAvatarsByUuids } from "@/models/character";
import { findGenerationByUuid } from "@/models/generation";
import { findGenerationImageByUuid } from "@/models/generation-image";
import {
  findGenerationVideoByUuid,
  getGenerationVideosByGenerationUuid,
} from "@/models/generation-video";
import type { ArtworkDetail } from "@/types/pages/community";
import { configData } from "@/lib/configs";
import {
  filterAllowedGenTypes,
  normalizeGenTypes,
} from "@/configs/gen-type-display";
import {
  queryCommunityListRaw,
  batchLoadAuthors,
  loadAuthorByUuid,
  queryImageDetailRaw,
  queryVideoDetailRaw,
  queryVideoVariantsByGenerationUuid,
  queryCharacterDetailRaw,
  type CommunityListQueryParams,
} from "@/models/community";
import { getUserFlagsFor } from "@/models/community";
import { getBatchStats, getSingleStats } from "@/models/social-stats";
import { getUserInfo } from "@/services/user";
import { parseCharacterModules } from "@/types/oc";

export type CommunityType = "all" | "oc" | "image" | "video";
export type CommunitySort = "trending" | "newest" | "top";

export interface CommunityListParams {
  type?: CommunityType;
  sort?: CommunitySort;
  q?: string | null;
  gen_types?: string[];
  cursor?: string | null; // base64url JSON
  limit?: number;
}

export interface CommunityItem {
  id: string; // artwork uuid
  type: "oc" | "image" | "video";
  title: string;
  cover_url: string;
  media_urls?: string[];
  author: { id: string; name: string; avatar: string };
  stats: { likes: number; views: number; comments: number; favorites: number };
  tags?: string[];
  meta?: Record<string, any>;
  gen_type?: string;
  created_at: string;
}

// Helper function to get source type and UUID from artwork
function getSourceInfo(sourceType: string, sourceUuid: string) {
  return { sourceType, sourceUuid };
}

function parseCursor(cursor?: string | null): { createdAtMs: number } | null {
  if (!cursor) return null;
  try {
    const obj = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof obj?.createdAt === "number") {
      return { createdAtMs: obj.createdAt };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Interleave items by gen_type to avoid clustering of same type content
 * Uses round-robin distribution across different gen_types
 */
function interleaveByGenType<T extends { gen_type?: string; type?: string }>(
  items: T[]
): T[] {
  if (items.length <= 1) return items;

  // Group items by gen_type (use type as fallback for items without gen_type)
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = item.gen_type || item.type || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  // Get all group keys sorted by group size (larger groups first for better distribution)
  const keys = Object.keys(groups).sort(
    (a, b) => groups[b].length - groups[a].length
  );

  if (keys.length <= 1) return items;

  // Round-robin interleave
  const result: T[] = [];
  const maxLen = Math.max(...keys.map((k) => groups[k].length));

  for (let i = 0; i < maxLen; i++) {
    for (const key of keys) {
      if (groups[key][i]) {
        result.push(groups[key][i]);
      }
    }
  }

  return result;
}

function formatTimestamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
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
    // 非 JSON 字符串，继续执行逗号分割逻辑
  }

  return trimmed
    .split(",")
    .map((item) => item.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);
}

async function loadCharacterMeta(uuids: string[]) {
  if (!uuids.length) return [];
  const records = await findCharactersWithAvatarsByUuids(uuids);
  const recordMap = new Map(records.map((item) => [item.uuid, item]));
  return uuids
    .map((uuid) => recordMap.get(uuid))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => {
      const avatarSource =
        item.thumbnail_detail ||
        item.thumbnail_desktop ||
        item.thumbnail_mobile ||
        item.image_url ||
        "";
      return {
        uuid: item.uuid,
        name: item.name ?? "",
        avatar_url: avatarSource ? toImageUrl(avatarSource) : "",
      };
    });
}

function formatMediaUrls(urls: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of urls) {
    if (!raw) continue;
    const normalized = toImageUrl(raw);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function firstMediaUrl(urls: Array<string | null | undefined>) {
  const [first] = formatMediaUrls(urls);
  return first || "";
}

async function loadAuthorBrief(userUuid?: string | null) {
  const author = await loadAuthorByUuid(userUuid);
  return {
    id: author.uuid,
    name: author.name,
    avatar: author.avatar,
    membership_level: author.membership_level || undefined,
    membership_display_name: author.membership_display_name || undefined,
  };
}

export async function getCommunityList(params: CommunityListParams) {
  const type = params.type || "all";
  const sort = params.sort || "trending"; // mvp == newest
  const limit = Math.min(Math.max(params.limit || 24, 12), 60);
  const cursor = parseCursor(params.cursor);
  const q = (params.q || "").trim();
  const genTypes = normalizeGenTypes(params.gen_types);

  // Build per-branch filters (MVP: type + cursor + q 简化，tags 暂不实现)
  const cursorCondImage = cursor
    ? ` AND gi.created_at < to_timestamp(${Math.floor(cursor.createdAtMs)}/1000.0)`
    : "";
  const cursorCondVideo = cursor
    ? ` AND gv.created_at < to_timestamp(${Math.floor(cursor.createdAtMs)}/1000.0)`
    : "";
  const cursorCondChar = cursor
    ? ` AND c.created_at < to_timestamp(${Math.floor(cursor.createdAtMs)}/1000.0)`
    : "";

  const escapedQ = q.replace(/'/g, "''");
  const qCondImage = q
    ? ` AND (coalesce(original_prompt,'') ILIKE '%${escapedQ}%' )`
    : "";
  const qCondVideo = ""; // MVP: 暂不检索
  const qCondChar = q ? ` AND (name ILIKE '%${escapedQ}%' )` : "";

  const genTypeCondImage = buildGenTypeCond(type, genTypes, "image", "gi.gen_type");
  const genTypeCondVideo = buildGenTypeCond(type, genTypes, "video", "gv.gen_type");
  const genTypeCondChar = buildGenTypeCond(type, genTypes, "oc", "img.gen_type");

  // Use model layer to query raw data
  const rows = await queryCommunityListRaw({
    type,
    limit,
    cursorCondImage,
    cursorCondVideo,
    cursorCondChar,
    qCondImage,
    qCondVideo,
    qCondChar,
    genTypeCondImage,
    genTypeCondVideo,
    genTypeCondChar,
  });

  // Enrich authors using model layer
  const authorUuids = Array.from(
    new Set(rows.map((r) => r.author_uuid).filter(Boolean))
  );
  const authors = await batchLoadAuthors(authorUuids);
  const authorMap = new Map(authors.map((a) => [a.uuid, a]));

  // Prepare interaction enrichment
  const currentUser = await getUserInfo().catch(() => null as any);
  const userUuid = currentUser?.uuid as string | undefined;

  const imageUuids: string[] = [];
  const videoUuids: string[] = [];
  const characterUuids: string[] = [];
  rows.forEach((r) => {
    if (r.source_type === "generation_image") imageUuids.push(r.source_uuid);
    else if (r.source_type === "generation_video") videoUuids.push(r.source_uuid);
    else if (r.source_type === "character") characterUuids.push(r.source_uuid);
  });

  // Get stats from redundant fields (optimized)
  const [imageStats, videoStats, characterStats] = await Promise.all([
    getBatchStats("image", imageUuids),
    getBatchStats("video", videoUuids),
    getBatchStats("character", characterUuids),
  ]);

  // Get user interaction flags
  const [userImageFlags, userVideoFlags, userCharacterFlags] = await Promise.all([
    userUuid ? getUserFlagsFor(userUuid, "image", imageUuids) : Promise.resolve({ liked: new Set(), favorited: new Set() }),
    userUuid ? getUserFlagsFor(userUuid, "video", videoUuids) : Promise.resolve({ liked: new Set(), favorited: new Set() }),
    userUuid ? getUserFlagsFor(userUuid, "character", characterUuids) : Promise.resolve({ liked: new Set(), favorited: new Set() }),
  ]);

  const items: CommunityItem[] = rows.map((r) => {
    const a = authorMap.get(r.author_uuid);
    const id = r.source_uuid; // 直接使用uuid
    let likes = 0;
    let favorites = 0;
    let comments = 0;
    let liked: boolean | undefined = undefined;
    let favorited: boolean | undefined = undefined;

    if (r.source_type === "generation_image") {
      const stats = imageStats.get(r.source_uuid);
      likes = stats?.like_count || 0;
      favorites = stats?.favorite_count || 0;
      comments = stats?.comment_count || 0;
      liked = userImageFlags.liked.has(r.source_uuid);
      favorited = userImageFlags.favorited.has(r.source_uuid);
    } else if (r.source_type === "generation_video") {
      const stats = videoStats.get(r.source_uuid);
      likes = stats?.like_count || 0;
      favorites = stats?.favorite_count || 0;
      comments = stats?.comment_count || 0;
      liked = userVideoFlags.liked.has(r.source_uuid);
      favorited = userVideoFlags.favorited.has(r.source_uuid);
    } else if (r.source_type === "character") {
      const stats = characterStats.get(r.source_uuid);
      likes = stats?.like_count || 0;
      favorites = stats?.favorite_count || 0;
      comments = stats?.comment_count || 0;
      liked = userCharacterFlags.liked.has(r.source_uuid);
      favorited = userCharacterFlags.favorited.has(r.source_uuid);
    }

    return {
      id,
      type: r.type as any,
      title: r.title || "",
      cover_url: r.cover_url || "",
      media_urls: Array.isArray(r.media_urls) ? r.media_urls : undefined,
      author: {
        id: r.author_uuid,
        name: a?.name || "",
        avatar: a?.avatar || "",
        membership_level: a?.membership_level || undefined,
        membership_display_name: a?.membership_display_name || undefined,
      },
      stats: { likes, views: 0, comments, favorites },
      ...(r.gen_type ? { gen_type: r.gen_type } : {}),
      meta: r.extra || undefined,
      created_at: (r as any).created_at?.toISOString?.() || (r as any).created_at,
      ...(liked !== undefined ? { liked } : {}),
      ...(favorited !== undefined ? { favorited } : {}),
    } as any;
  });

  // Calculate nextCursor before interleaving (based on original time order)
  const nextCursor =
    items.length === limit
      ? Buffer.from(
          JSON.stringify({
            createdAt: Date.parse(items[items.length - 1].created_at),
          })
        ).toString("base64url")
      : null;

  // Apply interleaving by gen_type for all filter types to avoid clustering
  const interleavedItems = interleaveByGenType(items);

  return { items: interleavedItems, nextCursor };
}

function buildGenTypeCond(
  pageType: CommunityType,
  genTypes: string[],
  targetType: "image" | "video" | "oc",
  columnName: string
) {
  if (pageType !== "all" && pageType !== targetType) return "";

  const filtered = filterAllowedGenTypes("community", targetType, genTypes);
  if (!filtered.length) return " AND 1=0";

  const inClause = filtered.map((value) => `'${value}'`).join(",");
  return ` AND ${columnName} IN (${inClause})`;
}

export async function getCommunityDetail(
  id: string,
  type: "image" | "video" | "character"
): Promise<ArtworkDetail | null> {
  // 直接使用uuid，不需要解码
  const sourceUuid = id;

  let detail: ArtworkDetail | null = null;
  if (type === "image") {
    detail = await buildImageDetail(id, sourceUuid);
  } else if (type === "video") {
    detail = await buildVideoDetail(id, sourceUuid);
  } else if (type === "character") {
    detail = await buildCharacterDetail(id, sourceUuid);
  }

  if (!detail) return null;

  try {
    const currentUser = await getUserInfo();
    const userUuid = currentUser?.uuid as string | undefined;
    if (detail.type === "character") {
      if (userUuid) {
        const flags = await getUserFlagsFor(userUuid, "character", [sourceUuid]);
        detail = {
          ...detail,
          liked: flags.liked.has(sourceUuid),
          favorited: flags.favorited.has(sourceUuid),
        };
      }
      return detail;
    }

    if (detail.type === "image") {
      const stats = await getSingleStats("image", sourceUuid);
      const likes = stats?.like_count || 0;
      const favorites = stats?.favorite_count || 0;
      const comments = stats?.comment_count || 0;
      let liked = detail.liked;
      let favorited = detail.favorited;
      if (userUuid) {
        const flags = await getUserFlagsFor(userUuid, "image", [sourceUuid]);
        liked = flags.liked.has(sourceUuid);
        favorited = flags.favorited.has(sourceUuid);
      }
      detail = {
        ...detail,
        stats: { ...detail.stats, likes, favorites, comments },
        liked,
        favorited,
      };
      return detail;
    }

    if (detail.type === "video") {
      const stats = await getSingleStats("video", sourceUuid);
      const likes = stats?.like_count || 0;
      const favorites = stats?.favorite_count || 0;
      const comments = stats?.comment_count || 0;
      let liked = detail.liked;
      let favorited = detail.favorited;
      if (userUuid) {
        const flags = await getUserFlagsFor(userUuid, "video", [sourceUuid]);
        liked = flags.liked.has(sourceUuid);
        favorited = flags.favorited.has(sourceUuid);
      }
      detail = {
        ...detail,
        stats: { ...detail.stats, likes, favorites, comments },
        liked,
        favorited,
      };
      return detail;
    }

    if (detail.type === "oc") {
      const stats = await getSingleStats("character", sourceUuid);
      const likes = stats?.like_count || 0;
      const favorites = stats?.favorite_count || 0;
      const comments = stats?.comment_count || 0;
      let liked = detail.liked;
      let favorited = detail.favorited;
      if (userUuid) {
        const flags = await getUserFlagsFor(userUuid, "character", [sourceUuid]);
        liked = flags.liked.has(sourceUuid);
        favorited = flags.favorited.has(sourceUuid);
      }
      detail = {
        ...detail,
        stats: { ...detail.stats, likes, favorites, comments },
        liked,
        favorited,
      };
      return detail;
    }
  } catch (err) {
    // Non-blocking enrichment failure
    return detail;
  }

  return detail;
}

async function buildImageDetail(
  detailId: string,
  imageUuid: string
): Promise<ArtworkDetail | null> {
  const image = await findGenerationImageByUuid(imageUuid);
  if (!image || image.visibility_level !== "public") {
    return null;
  }

  const [author, generation] = await Promise.all([
    loadAuthorBrief(image.user_uuid),
    image.generation_uuid
      ? findGenerationByUuid(image.generation_uuid)
      : Promise.resolve(undefined),
  ]);

  const characters = await loadCharacterMeta(
    parseCharacterUuids(generation?.character_uuids)
  );

  const coverUrl = firstMediaUrl([
    image.thumbnail_detail,
    image.thumbnail_desktop,
    image.thumbnail_mobile,
    image.image_url,
  ]);

  const mediaUrls = formatMediaUrls([
    image.image_url,
    image.thumbnail_detail,
    image.thumbnail_desktop,
    image.thumbnail_mobile,
  ]);

  const prompt = image.original_prompt || "";

  const createdAt =
    formatTimestamp(image.created_at) ||
    formatTimestamp(generation?.created_at) ||
    "";

  const tags = Array.isArray((generation?.metadata as any)?.tags)
    ? ((generation?.metadata as any)?.tags as string[]).filter(
        (tag) => typeof tag === "string" && tag.trim().length > 0
      )
    : [];

  return {
    id: detailId,
    type: "image",
    title: image.original_prompt || "",
    cover_url: coverUrl,
    media_urls: mediaUrls,
    author,
    stats: {
      likes: 0,
      views: 0,
      comments: 0,
      favorites: 0,
    },
    tags,
    model_id: image.model_id || generation?.model_id || "",
    model_name: (() => {
      const modelId = image.model_id || generation?.model_id || "";
      const model = configData.models.find((m) => m.model_id === modelId);
      return model?.name || modelId;
    })(),
    characters,
    meta: {
      style_preset: generation?.style_preset,
    },
    description:
      (generation?.metadata as any)?.description || image.final_prompt || "",
    prompt: prompt,
    original_prompt: image.original_prompt || undefined,
    final_prompt: image.final_prompt || undefined,
    gen_type: image.gen_type || undefined,
    created_at: createdAt,
  };
}

async function buildVideoDetail(
  detailId: string,
  videoUuid: string
): Promise<ArtworkDetail | null> {
  const video = await findGenerationVideoByUuid(videoUuid);
  if (!video || video.visibility_level !== "public") {
    return null;
  }

  const generation = video.generation_uuid
    ? await findGenerationByUuid(video.generation_uuid)
    : undefined;

  const [author, variants, characters] = await Promise.all([
    loadAuthorBrief(video.user_uuid),
    video.generation_uuid
      ? queryVideoVariantsByGenerationUuid(video.generation_uuid)
      : Promise.resolve([]),
    loadCharacterMeta(parseCharacterUuids(generation?.character_uuids)),
  ]);

  const variantUrls = variants.length
    ? formatMediaUrls(
        variants
          .filter((variant) => variant.visibility_level === "public")
          .map((variant) => variant.video_url)
      )
    : [];

  if (!variantUrls.length && video.video_url) {
    variantUrls.push(...formatMediaUrls([video.video_url]));
  }

  const coverUrl = firstMediaUrl([video.poster_url]);

  // 优先使用 original_prompt，其次从 generation_params 或 generation.prompt 获取
  let prompt = video.original_prompt || generation?.prompt || "";
  if (!prompt && video.generation_params) {
    try {
      const parsed = JSON.parse(video.generation_params);
      prompt = parsed?.original_prompt || parsed?.prompt || parsed?.final_prompt || prompt;
    } catch (error) {
      console.log("Failed to parse video generation_params:", error);
    }
  }

  const createdAt =
    formatTimestamp(video.created_at) ||
    formatTimestamp(generation?.created_at) ||
    "";

  return {
    id: detailId,
    type: "video",
    title: video.original_prompt || generation?.prompt || "",
    cover_url: coverUrl,
    media_urls: variantUrls,
    author,
    stats: {
      likes: 0,
      views: 0,
      comments: 0,
      favorites: 0,
    },
    tags: [],
    model_id: generation?.model_id || "",
    model_name: (() => {
      const modelId = generation?.model_id || "";
      const model = configData.models.find((m) => m.model_id === modelId);
      return model?.name || modelId;
    })(),
    characters,
    meta: {
      duration_seconds: video.duration_seconds,
      resolution: video.resolution,
      ratio: video.ratio,
    },
    description: (generation?.metadata as any)?.description || "",
    prompt: prompt,
    original_prompt: video.original_prompt || undefined,
    gen_type: video.gen_type || undefined,
    created_at: createdAt,
  };
}

async function buildCharacterDetail(
  detailId: string,
  characterUuid: string
): Promise<ArtworkDetail | null> {
  const row = await queryCharacterDetailRaw(characterUuid);
  if (!row) return null;

  const authorBrief = await loadAuthorBrief(row.user_uuid);
  const author = {
    id: authorBrief.id || row.user_uuid,
    name: authorBrief.name || row.author_name || "",
    avatar: authorBrief.avatar || row.author_avatar || "",
    membership_level: authorBrief.membership_level || undefined,
    membership_display_name: authorBrief.membership_display_name || undefined,
  };

  const coverUrl = firstMediaUrl([
    row.profile_thumbnail_detail,
    row.profile_thumbnail_desktop,
    row.profile_thumbnail_mobile,
    row.profile_image_url,
    row.avatar_thumbnail_detail,
    row.avatar_thumbnail_desktop,
    row.avatar_thumbnail_mobile,
    row.avatar_image_url,
  ]);

  const mediaUrls = formatMediaUrls([
    row.profile_image_url,
    row.profile_thumbnail_detail,
    row.profile_thumbnail_desktop,
    row.profile_thumbnail_mobile,
    row.avatar_image_url,
    row.avatar_thumbnail_detail,
    row.avatar_thumbnail_desktop,
    row.avatar_thumbnail_mobile,
  ]);

  const personalityRaw = row.personality_tags;
  let tags: string[] = [];
  if (Array.isArray(personalityRaw)) {
    tags = personalityRaw.filter(
      (tag: unknown): tag is string =>
        typeof tag === "string" && tag.trim().length > 0
    );
  } else if (typeof personalityRaw === "string" && personalityRaw.trim()) {
    try {
      const parsed = JSON.parse(personalityRaw);
      if (Array.isArray(parsed)) {
        tags = parsed.filter(
          (tag: unknown): tag is string =>
            typeof tag === "string" && tag.trim().length > 0
        );
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const createdAt = formatTimestamp(row.created_at) || "";
  const modules = parseCharacterModules(row.modules);

  return {
    id: detailId,
    type: "oc",
    title: row.name || "",
    cover_url: coverUrl,
    media_urls: mediaUrls,
    author,
    stats: {
      likes: Number(row.like_count) || 0,
      views: Number(row.view_count) || 0,
      comments: Number(row.comment_count) || 0,
      favorites: Number(row.favorite_count) || 0,
    },
    tags,
    meta: {
      race_code: row.species,
      gender: row.gender,
      age: row.age,
      allow_remix: row.allow_remix,
    },
    description: row.brief_introduction || "",
    prompt:
      modules.background?.background_story ||
      row.brief_introduction ||
      "",
    created_at: createdAt,
  };
}
