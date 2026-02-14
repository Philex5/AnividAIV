import {
  Character,
  NewCharacter,
  createCharacter as createCharacterModel,
  findCharacterByUuid,
  findCharactersByUserUuid,
  findPublicCharactersByUserUuid,
  findPublicCharacters,
  findPublicCharactersByUuids,
  updateCharacter as updateCharacterModel,
  deleteCharacter as deleteCharacterModel,
  getUserCharacterCount,
  getUserPublicCharacterCount,
  findUserCharactersWithAvatars,
  findFavoritedCharactersByUserUuid,
} from "@/models/character";
import { findGenerationImagesByUuids } from "@/models/generation-image";
import { findworldByUuid } from "@/models/oc-world";

import { getUserInfo, getUserUuid } from "./user";
import { getUuid } from "@/lib/hash";
import { toImageUrl } from "@/lib/r2-utils";
import { getDefaultCharacterModules, type CharacterModules } from "@/types/oc";
import { normalizeTagList } from "@/lib/tag-normalizer";
import { getMembershipLevel } from "./membership";

export interface CreateCharacterData {
  name: string;
  gender: string;
  age?: number | null;
  personality_tags?: any;

  brief_introduction?: string | null;
  species?: string | null;
  modules?: CharacterModules;

  // 生成图片关联
  profile_generation_image_uuid?: string | null;
  avatar_generation_image_uuid?: string | null;

  // Remix 关系
  remixed_from_uuid?: string | null;

  // 权限控制
  visibility_level?: string;
  allow_remix?: boolean;

  // OC Rebuild fields
  world_uuid?: string | null;
  tags?: string[] | null;
  background_url?: string | null;
}

export interface CharacterListOptions {
  page?: number;
  limit?: number;
  visibility_level?: string;
  tags?: string[];
}

export interface CharacterWithImages extends Character {
  avatar_url?: string;
  profile_image_url?: string;
  favorited?: boolean;
}

// 创建角色
export async function createCharacter(
  data: CreateCharacterData
): Promise<Character> {
  let user = await getUserInfo();

  if (!user) {
    throw new Error("User not authenticated");
  }

  if (data.world_uuid) {
    const world = await findworldByUuid(data.world_uuid);
    if (!world) {
      throw new Error("World not found");
    }
    if (!world.allow_join && world.creator_uuid !== user.uuid) {
      throw new Error("World does not allow joins");
    }
  }

  // Get user membership level to determine default visibility
  const membershipLevel = await getMembershipLevel(user.uuid);
  const defaultVisibility = membershipLevel === "free" ? "public" : "private";

  let normalizedTags: string[] = [];
  if (data.tags !== undefined && data.tags !== null) {
    normalizedTags = normalizeTagList(data.tags);
  }

  const characterData: NewCharacter = {
    uuid: getUuid(),
    user_uuid: user.uuid,
    name: data.name,
    gender: data.gender,
    age: data.age,
    personality_tags: data.personality_tags,

    brief_introduction: data.brief_introduction,
    species: data.species,
    modules: data.modules ?? getDefaultCharacterModules(),

    // 生成图片关联
    profile_generation_image_uuid: data.profile_generation_image_uuid,
    avatar_generation_image_uuid: data.avatar_generation_image_uuid,

    // Remix 关系
    remixed_from_uuid: data.remixed_from_uuid,

    // 权限控制
    visibility_level: data.visibility_level || defaultVisibility,
    allow_remix: data.allow_remix !== false,

    // OC Rebuild fields
    world_uuid: data.world_uuid ?? null,
    tags: normalizedTags,
    background_url: data.background_url ?? null,
  };

  const character = await createCharacterModel(characterData);

  return character;
}

// 获取角色详情
export async function getCharacterByUuid(
  uuid: string
): Promise<Character | undefined> {
  const character = await findCharacterByUuid(uuid);

  return character;
}

// 获取用户的角色列表
export async function getUserCharacters(
  userId: string,
  options: CharacterListOptions = {}
): Promise<CharacterWithImages[]> {
  const { page = 1, limit = 20, tags } = options;
  const characters = await findCharactersByUserUuid(userId, page, limit, tags);

  return resolveCharacterImages(characters);
}

// 获取公开角色列表
export async function getPublicCharactersList(
  options: CharacterListOptions = {}
): Promise<CharacterWithImages[]> {
  const { page = 1, limit = 20 } = options;
  const characters = await findPublicCharacters(page, limit);

  // 解析图像 URL
  return resolveCharacterImages(characters);
}

export async function getPublicCharactersByUuids(
  uuids: string[]
): Promise<CharacterWithImages[]> {
  const uniqueUuids = Array.from(
    new Set(uuids.map((uuid) => uuid.trim()).filter(Boolean))
  );
  if (!uniqueUuids.length) return [];

  const characters = await findPublicCharactersByUuids(uniqueUuids);
  const resolved = await resolveCharacterImages(characters);
  const orderMap = new Map(uniqueUuids.map((uuid, index) => [uuid, index]));

  return resolved.sort(
    (a, b) => (orderMap.get(a.uuid) ?? 0) - (orderMap.get(b.uuid) ?? 0)
  );
}

export async function getPublicCharactersByUser(
  userUuid: string,
  options: CharacterListOptions = {}
): Promise<CharacterWithImages[]> {
  const { page = 1, limit = 20 } = options;
  const characters = await findPublicCharactersByUserUuid(userUuid, page, limit);

  return resolveCharacterImages(characters);
}

export async function getPublicCharacterCountByUser(
  userUuid: string
): Promise<number> {
  return getUserPublicCharacterCount(userUuid);
}

export async function getFavoritedCharacters(
  userId: string,
  options: CharacterListOptions = {}
): Promise<CharacterWithImages[]> {
  const { page = 1, limit = 20, tags } = options;
  const characters = await findFavoritedCharactersByUserUuid(
    userId,
    page,
    limit,
    tags
  );

  const charactersWithImages = await resolveCharacterImages(characters);

  return charactersWithImages.map((character) => ({
    ...character,
    favorited: true,
  }));
}

// 更新角色
export async function updateCharacter(
  uuid: string,
  data: Partial<CreateCharacterData>
): Promise<Character | undefined> {
  let user = await getUserInfo();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const existingCharacter = await findCharacterByUuid(uuid);
  if (!existingCharacter || existingCharacter.user_uuid !== user.uuid) {
    throw new Error("Character not found or access denied");
  }

  if (Object.prototype.hasOwnProperty.call(data, "world_uuid")) {
    if (data.world_uuid) {
      const world = await findworldByUuid(data.world_uuid);
      if (!world) {
        throw new Error("World not found");
      }
      if (!world.allow_join && world.creator_uuid !== user.uuid) {
        throw new Error("World does not allow joins");
      }
    }
  }

  const updateData: Partial<NewCharacter> = {
    name: data.name,
    gender: data.gender,
    age: data.age,
    personality_tags: data.personality_tags,

    brief_introduction: data.brief_introduction,
    species: data.species,
    modules: data.modules,

    // 生成图片关联
    profile_generation_image_uuid: data.profile_generation_image_uuid,
    avatar_generation_image_uuid: data.avatar_generation_image_uuid,

    // Remix 关系
    remixed_from_uuid: data.remixed_from_uuid,

    // 权限控制
    visibility_level: data.visibility_level,
    allow_remix: data.allow_remix,

    // OC Rebuild fields
    world_uuid: data.world_uuid,
    tags: data.tags,
    background_url: data.background_url,
  };

  return updateCharacterModel(uuid, updateData);
}

async function resolveCharacterImages(
  characters: Character[]
): Promise<CharacterWithImages[]> {
  const imageUuids = Array.from(
    new Set(
      characters
        .flatMap((character) => [
          character.avatar_generation_image_uuid,
          character.profile_generation_image_uuid,
        ])
        .filter((uuid): uuid is string => Boolean(uuid))
    )
  );

  const images = await findGenerationImagesByUuids(imageUuids);
  const imageMap = new Map(images.map((image) => [image.uuid, image]));

  return characters.map((character) => {
    const avatarImage = character.avatar_generation_image_uuid
      ? imageMap.get(character.avatar_generation_image_uuid)
      : undefined;
    const profileImage = character.profile_generation_image_uuid
      ? imageMap.get(character.profile_generation_image_uuid)
      : undefined;

    return {
      ...character,
      avatar_url: avatarImage?.image_url
        ? toImageUrl(avatarImage.image_url)
        : undefined,
      profile_image_url: profileImage?.image_url
        ? toImageUrl(profileImage.image_url)
        : undefined,
    };
  });
}

// 删除角色
export async function deleteCharacter(uuid: string): Promise<boolean> {
  const user = await getUserInfo();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const existingCharacter = await findCharacterByUuid(uuid);
  if (!existingCharacter || existingCharacter.user_uuid !== user.uuid) {
    throw new Error("Character not found or access denied");
  }
  if (!existingCharacter) {
    throw new Error("Character not found");
  }

  return deleteCharacterModel(uuid);
}

// 验证角色所有权
export async function validateCharacterOwnership(
  uuid: string
): Promise<boolean> {
  const user = await getUserInfo();
  if (!user) {
    return false;
  }

  const character = await findCharacterByUuid(uuid);
  return character?.user_uuid === user.uuid;
}

// 获取用户角色头像列表
export interface CharacterAvatar {
  uuid: string;
  name: string;
  avatarUrl: string | null;
  hasAvatar: boolean;
}

export async function getUserCharacterAvatars(
  userId?: string,
  options: {
    page?: number;
    limit?: number;
    deviceType?: string;
  } = {}
): Promise<CharacterAvatar[]> {
  const { page = 1, limit = 20, deviceType = "desktop" } = options;

  // Get user UUID - use provided userId or current user
  const userUuid = userId || (await getUserUuid());

  if (!userUuid) {
    throw new Error("User not authenticated");
  }

  // Get characters with avatar data from model layer
  const charactersWithAvatars = await findUserCharactersWithAvatars(
    userUuid,
    page,
    limit
  );

  // Format the response with appropriate image URLs
  const result: CharacterAvatar[] = charactersWithAvatars.map((char) => {
    let avatarUrl: string | null = null;

    // Select appropriate image URL based on device type
    if (char.image_url) {
      let selectedUrl: string;
      switch (deviceType) {
        case "mobile":
          selectedUrl =
            char.thumbnail_mobile || char.thumbnail_desktop || char.image_url;
          break;
        case "desktop":
          selectedUrl =
            char.thumbnail_desktop || char.thumbnail_detail || char.image_url;
          break;
        case "detail":
          selectedUrl = char.thumbnail_detail || char.image_url;
          break;
        case "original":
          selectedUrl = char.image_url;
          break;
        default:
          selectedUrl = char.thumbnail_desktop || char.image_url;
      }

      avatarUrl = toImageUrl(selectedUrl);
    }

    return {
      uuid: char.uuid,
      name: char.name,
      avatarUrl,
      hasAvatar: !!char.avatar_generation_image_uuid,
    };
  });

  return result;
}
