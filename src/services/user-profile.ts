import { findUserByUuid, updateUserProfile } from "@/models/user";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { isImageUuid } from "@/lib/image-resolve";
import {
  getPublicCharactersByUser,
  getPublicCharacterCountByUser,
} from "@/services/character";
import { getworlds } from "@/services/world";
import { getPublicUserArtworks } from "@/services/artworks";
import {
  countPublicUserImages,
  countPublicUserVideos,
} from "@/models/artwork";

export type UserProfileStats = {
  public_characters: number;
  public_worlds: number;
  public_artworks: number;
};

export type PublicUserProfile = {
  uuid: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  gender: string | null;
  background_url: string | null;
  is_self: boolean;
  is_sub: boolean;
  sub_plan_type: string | null;
  sub_expired_at: Date | null;
  stats: UserProfileStats;
};

export async function getPublicProfile(
  userUuid: string,
  viewerUuid?: string
): Promise<PublicUserProfile> {
  const user = await findUserByUuid(userUuid);
  if (!user) {
    throw new Error("Profile not found");
  }

  const [publicCharacters, publicWorlds, publicImages, publicVideos] =
    await Promise.all([
      getPublicCharacterCountByUser(userUuid),
      getworlds({
        page: 1,
        limit: 1,
        visibility_level: "public",
        creatorUuid: userUuid,
        includePreset: false,
      }).then((result) => result.total),
      countPublicUserImages({
        userUuid,
      }),
      countPublicUserVideos({
        userUuid,
      }),
    ]);

  const stats = {
    public_characters: publicCharacters,
    public_worlds: publicWorlds,
    public_artworks: publicImages + publicVideos,
  };

  return {
    uuid: user.uuid,
    display_name: user.display_name?.trim() || "Anonymous",
    avatar_url: user.avatar_url || null,
    bio: user.bio || null,
    gender: user.gender || null,
    background_url: user.background_url || null,
    is_self: Boolean(viewerUuid && viewerUuid === user.uuid),
    is_sub: user.is_sub || false,
    sub_plan_type: user.sub_plan_type || null,
    sub_expired_at: user.sub_expired_at || null,
    stats,
  };
}

export async function updateProfile(
  userUuid: string,
  payload: {
    display_name?: string | null;
    avatar_url?: string | null;
    gender?: string | null;
    bio?: string | null;
    background_url?: string | null;
  }
) {
  if (payload.gender === null) {
    throw new Error("Invalid gender");
  }

  const validateOwnedImage = async (
    value: string | null | undefined,
    fieldLabel: string,
  ) => {
    if (!value || !value.trim()) return;
    const trimmed = value.trim();
    if (!isImageUuid(trimmed)) return;
    const image = await findGenerationImageByUuid(trimmed);
    if (!image || image.user_uuid !== userUuid) {
      throw new Error(`Invalid ${fieldLabel} image`);
    }
  };

  await validateOwnedImage(payload.avatar_url, "avatar");
  await validateOwnedImage(payload.background_url, "background");

  const normalized = {
    display_name:
      typeof payload.display_name === "string"
        ? payload.display_name.trim()
        : payload.display_name,
    avatar_url:
      typeof payload.avatar_url === "string"
        ? payload.avatar_url.trim()
        : payload.avatar_url,
    gender: payload.gender ?? undefined,
    bio:
      typeof payload.bio === "string" ? payload.bio.trim() : payload.bio,
    background_url:
      typeof payload.background_url === "string"
        ? payload.background_url.trim()
        : payload.background_url,
  };

  const updated = await updateUserProfile(userUuid, normalized);
  if (!updated) {
    throw new Error("Profile not found");
  }

  return {
    uuid: updated.uuid,
    display_name: updated.display_name?.trim() || "Anonymous",
    avatar_url: updated.avatar_url || null,
    bio: updated.bio || null,
    gender: updated.gender || null,
    background_url: updated.background_url || null,
  };
}

export async function listPublicCharacters(
  userUuid: string,
  options: { page?: number; limit?: number } = {}
) {
  return getPublicCharactersByUser(userUuid, options);
}

export async function listPublicWorlds(
  userUuid: string,
  options: { page?: number; limit?: number } = {}
) {
  return getworlds({
    page: options.page || 1,
    limit: options.limit || 20,
    visibility_level: "public",
    creatorUuid: userUuid,
    includePreset: false,
  });
}

export async function listPublicArtworks(
  userUuid: string,
  options: { page?: number; limit?: number; type?: "all" | "image" | "video" } = {}
) {
  return getPublicUserArtworks({
    userUuid,
    type: options.type || "all",
    page: options.page || 1,
    limit: options.limit || 20,
  });
}
