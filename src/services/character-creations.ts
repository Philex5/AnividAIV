import {
  findCharacterGenerationsByCharacterUuid,
  getCharacterGenerationsCount,
} from "@/models/character-generation";
import { getImagesByGenerationUuids } from "@/models/generation-image";
import { getVideosByGenerationUuids } from "@/models/generation-video";

export interface CharacterCreationItem {
  id: number;
  uuid: string;
  type: string;
  image_url?: string;
  thumbnail_desktop?: string;
  thumbnail_mobile?: string;
  thumbnail_detail?: string;
  gen_type?: string;
  style?: string;
  video_url?: string;
  poster_url?: string;
  duration_seconds?: number;
  created_at: Date;
}

interface GetCharacterCreationsOptions {
  characterUuid: string;
  isOwner: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

export async function getCharacterCreationsByType({
  characterUuid,
  isOwner,
  type,
  page = 1,
  limit = 20,
}: GetCharacterCreationsOptions) {
  const filters: {
    generation_type?: string;
    visibility_level?: string;
    page: number;
    limit: number;
  } = {
    page,
    limit,
    visibility_level: isOwner ? undefined : "public",
  };

  if (type && ["image", "video", "chat", "story"].includes(type)) {
    filters.generation_type = type;
  }

  const characterGenerations = await findCharacterGenerationsByCharacterUuid(
    characterUuid,
    filters,
  );

  const uuidsByType: Record<string, string[]> = {};
  characterGenerations.forEach((cg) => {
    const generationType = cg.generation_type || "image";
    const generationUuid = cg.generation_uuid;

    if (generationUuid) {
      if (!uuidsByType[generationType]) {
        uuidsByType[generationType] = [];
      }
      uuidsByType[generationType].push(generationUuid);
    }
  });

  const [images, videos] = await Promise.all([
    uuidsByType.image
      ? getImagesByGenerationUuids(uuidsByType.image)
      : Promise.resolve([]),
    uuidsByType.video
      ? getVideosByGenerationUuids(uuidsByType.video)
      : Promise.resolve([]),
  ]);

  const mediaByUuid: Record<string, CharacterCreationItem[]> = {};

  images.forEach((img) => {
    const generationUuid = img.generation_uuid || "";
    if (!generationUuid) return;

    if (!mediaByUuid[generationUuid]) {
      mediaByUuid[generationUuid] = [];
    }

    mediaByUuid[generationUuid].push({
      id: img.id,
      uuid: img.uuid,
      type: "image",
      image_url: img.image_url,
      thumbnail_desktop: img.thumbnail_desktop || undefined,
      thumbnail_mobile: img.thumbnail_mobile || undefined,
      thumbnail_detail: img.thumbnail_detail || undefined,
      gen_type: img.gen_type || undefined,
      style: img.style || undefined,
      created_at: img.created_at || new Date(),
    });
  });

  videos.forEach((video) => {
    const generationUuid = video.generation_uuid || "";
    if (!generationUuid) return;

    if (!mediaByUuid[generationUuid]) {
      mediaByUuid[generationUuid] = [];
    }

    mediaByUuid[generationUuid].push({
      id: video.id,
      uuid: video.uuid,
      type: "video",
      video_url: video.video_url,
      poster_url: video.poster_url || undefined,
      duration_seconds: video.duration_seconds || undefined,
      gen_type: video.gen_type || undefined,
      created_at: video.created_at || new Date(),
    });
  });

  const byType: Record<string, CharacterCreationItem[]> = {};
  characterGenerations.forEach((cg) => {
    const generationType = cg.generation_type || "image";
    const generationUuid = cg.generation_uuid || "";
    if (!generationUuid) return;

    const media = mediaByUuid[generationUuid] || [];
    if (!byType[generationType]) {
      byType[generationType] = [];
    }
    byType[generationType].push(...media);
  });

  const total = await getCharacterGenerationsCount(characterUuid, {
    generation_type: filters.generation_type,
    visibility_level: filters.visibility_level,
  });

  return {
    byType,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    filters: {
      type: filters.generation_type,
      visibility_level: filters.visibility_level,
    },
  };
}
