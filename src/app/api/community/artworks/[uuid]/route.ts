import { respData, respErr } from "@/lib/resp";
import { queryCharacterDetailRaw } from "@/models/community";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { findGenerationVideoByUuid } from "@/models/generation-video";
import { findCharactersWithAvatarsByUuids } from "@/models/character";
import { findGenerationByUuid as findGenerationByUuidGen } from "@/models/generation";
import { loadAuthorByUuid } from "@/models/community";
import { toImageUrl } from "@/lib/r2-utils";
import { parseCharacterModules } from "@/types/oc";
import type { NextRequest } from "next/server";

type ArtType = "image" | "video" | "character";

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
    // ignore non-JSON strings and fallback to comma separated values
  }

  return trimmed
    .split(",")
    .map((item) => item.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);
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

async function buildImageDetail(imageUuid: string) {
  const image = await findGenerationImageByUuid(imageUuid);
  if (!image || image.visibility_level !== "public") {
    return null;
  }

  const [author, generation] = await Promise.all([
    loadAuthorBrief(image.user_uuid),
    image.generation_uuid
      ? findGenerationByUuidGen(image.generation_uuid)
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
    id: imageUuid,
    type: "image" as const,
    title: image.original_prompt || "",
    cover_url: coverUrl,
    media_urls: mediaUrls,
    author,
    stats: {
      likes: 0,
      views: 0,
      comments: 0,
    },
    tags,
    gen_type: image.gen_type,
    model_id: image.model_id || generation?.model_id || "",
    characters,
    meta: {
      style_preset: generation?.style_preset,
    },
    description:
      (generation?.metadata as any)?.description || image.final_prompt || "",
    prompt: image.original_prompt || "",
    original_prompt: image.original_prompt || undefined,
    created_at: createdAt,
  };
}

async function buildVideoDetail(videoUuid: string) {
  const video = await findGenerationVideoByUuid(videoUuid);
  if (!video || video.visibility_level !== "public") {
    return null;
  }

  const generation = video.generation_uuid
    ? await findGenerationByUuidGen(video.generation_uuid)
    : undefined;

  const [author, characters] = await Promise.all([
    loadAuthorBrief(video.user_uuid),
    loadCharacterMeta(parseCharacterUuids(generation?.character_uuids)),
  ]);

  const variantUrls = video.video_url ? formatMediaUrls([video.video_url]) : [];

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
    id: videoUuid,
    type: "video" as const,
    title: video.original_prompt || generation?.prompt || "",
    cover_url: coverUrl,
    media_urls: variantUrls,
    author,
    stats: {
      likes: 0,
      views: 0,
      comments: 0,
    },
    tags: [],
    gen_type: video.gen_type,
    model_id: generation?.model_id || "",
    characters,
    meta: {
      duration_seconds: video.duration_seconds,
      resolution: video.resolution,
      ratio: video.ratio,
    },
    description: (generation?.metadata as any)?.description || "",
    prompt: prompt,
    original_prompt: video.original_prompt || undefined,
    created_at: createdAt,
  };
}

async function buildCharacterDetail(characterUuid: string) {
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
    id: characterUuid,
    type: "oc" as const,
    title: row.name || "",
    cover_url: coverUrl,
    media_urls: mediaUrls,
    author,
    stats: {
      likes: Number(row.like_count) || 0,
      views: Number(row.view_count) || 0,
      comments: 0,
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const { searchParams } = new URL(req.url);

    // Support both 'type' and 'artworkType' parameters for backward compatibility
    // Use 'artworkType' if available, otherwise fall back to 'type'
    const typeParam = searchParams.get("artworkType") || searchParams.get("type");
    const type = typeParam as ArtType | null;

    if (!uuid) {
      return respErr("Artwork UUID is required", 400);
    }

    if (!type || !["image", "video", "character"].includes(type)) {
      return respErr(
        "Valid artwork type is required (image, video, or character)",
        400
      );
    }

    let detail = null;
    if (type === "image") {
      detail = await buildImageDetail(uuid);
    } else if (type === "video") {
      detail = await buildVideoDetail(uuid);
    } else if (type === "character") {
      detail = await buildCharacterDetail(uuid);
    }

    if (!detail) return respErr("Artwork not found", 404);
    return respData(detail);
  } catch (error) {
    console.log("Community detail failed:", error);
    return respErr("Failed to fetch artwork detail", 500);
  }
}
