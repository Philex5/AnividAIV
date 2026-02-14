import {
  countworldsByCreator,
  createworld as createworldModel,
  countCharactersByworldUuid,
  deleteworld as deleteworldModel,
  findworldById,
  findworldBySlugAndCreator,
  findworldByUuid,
  listworlds as listworldsModel,
  type OCworld,
  type OCworldWithCount,
  updateworld as updateworldModel,
} from "@/models/oc-world";
import { findCharactersByWorldUuid } from "@/models/character";
import { findUserByUuid } from "@/models/user";
import { serverMemoryCache } from "@/lib/server-memory-cache";
import { worldInsertSchema, worldUpdateSchema } from "@/types/world";
import { getMembershipLevel, getUserWorldLimit } from "@/services/membership";
import { findUserInteractionsByArtIds } from "@/models/user-interaction";
import { getUserInteractionState } from "@/services/user-interaction";

function clearWorldListCaches(creatorUuid?: string): void {
  serverMemoryCache.clearByPrefix("worlds:list:");
  if (creatorUuid) {
    serverMemoryCache.clearByPrefix(`worlds:user:${creatorUuid}:`);
  }
}

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function assertUrlIfPresent(url?: string): void {
  if (!url) return;
  if (isImageUuid(url)) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid URL protocol");
    }
  } catch {
    throw Object.assign(new Error("Invalid URL"), { code: "INVALID_URL" });
  }
}

function isImageUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function getworlds(options: {
  page?: number;
  limit?: number;
  visibility_level?: "public" | "private";
  search?: string;
  creatorUuid?: string;
  viewerUuid?: string;
  includePreset?: boolean;
  joinableOnly?: boolean;
}): Promise<{
  worlds: OCworldWithCount[];
  total: number;
  page: number;
  limit: number;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const includePreset = options.includePreset !== false;

  const listPrefix = options.creatorUuid
    ? `worlds:user:${options.creatorUuid}:`
    : "worlds:list:";
  const key = `${listPrefix}${page}:${limit}:${options.visibility_level || ""}:${options.search || ""}:${options.creatorUuid || ""}:${options.viewerUuid || ""}:${includePreset ? "1" : "0"}:${options.joinableOnly ? "1" : "0"}`;
  const cached = serverMemoryCache.get<{
    worlds: OCworldWithCount[];
    total: number;
  }>(key);
  if (cached) {
    return { ...cached, page, limit };
  }

  const result = await listworldsModel({
    page,
    limit,
    visibility_level: options.visibility_level,
    search: options.search,
    creatorUuid: options.creatorUuid,
    viewerUuid: options.viewerUuid,
    includePreset,
    joinableOnly: options.joinableOnly,
  });

  // Fetch characters for each world
  if (result.worlds.length > 0) {
    const worldsWithCharacters = await Promise.all(
      result.worlds.map(async (world) => {
        const [characterCount, characters] = await Promise.all([
          countCharactersByworldUuid(world.uuid, { visibility_level: "public" }),
          findCharactersByWorldUuid(world.uuid, {
            visibility_level: "public",
            limit: 5,
          }),
        ]);
        return {
          ...world,
          character_count: characterCount,
          characters,
        };
      })
    );
    result.worlds = worldsWithCharacters as OCworldWithCount[];
  }

  if (options.viewerUuid && result.worlds.length > 0) {
    const worldUuids = result.worlds.map((world) => world.uuid);
    const interactions = await findUserInteractionsByArtIds(
      options.viewerUuid,
      worldUuids,
      "world"
    );
    const liked = new Set(
      interactions
        .filter((item) => item.interaction_type === "like")
        .map((item) => item.art_id)
    );
    const favorited = new Set(
      interactions
        .filter((item) => item.interaction_type === "favorite")
        .map((item) => item.art_id)
    );
    result.worlds = result.worlds.map((world) => ({
      ...world,
      liked: liked.has(world.uuid),
      favorited: favorited.has(world.uuid),
    }));
  }

  serverMemoryCache.set(key, result, 60 * 60);
  return { ...result, page, limit };
}

export async function getworldByIdentifier(
  identifier: number | string,
  viewerUuid?: string
): Promise<OCworldWithCount> {
  const key = `world:${String(identifier)}`;
  const cached = serverMemoryCache.get<OCworldWithCount>(key);
  if (cached && !viewerUuid) return cached;

  const world =
    typeof identifier === "number"
      ? await findworldById(identifier)
      : isUuidLike(identifier)
        ? await findworldByUuid(identifier)
        : Number.isFinite(Number(identifier))
          ? await findworldById(Number(identifier))
          : undefined;

  if (!world) {
    throw Object.assign(new Error("world not found"), { code: "NOT_FOUND" });
  }
  if (world.visibility_level === "private" && world.creator_uuid !== viewerUuid) {
    throw Object.assign(new Error("world not found"), { code: "NOT_FOUND" });
  }

  const characterCount = await countCharactersByworldUuid(world.uuid, {
    visibility_level: "public",
  });
  const characters = await findCharactersByWorldUuid(world.uuid, {
    visibility_level: "public",
    limit: 50,
  });
  const creator = world.creator_uuid ? await findUserByUuid(world.creator_uuid) : undefined;

  const result: OCworldWithCount & { 
    characters?: any[]; 
    creator?: { uuid: string; display_name: string | null; avatar_url: string | null } 
  } = {
    ...(world as OCworld),
    character_count: characterCount,
    characters,
    creator: creator ? {
      uuid: creator.uuid,
      display_name: creator.display_name,
      avatar_url: creator.avatar_url
    } : undefined
  };

  const cacheValue = { ...result };
  delete cacheValue.liked;
  delete cacheValue.favorited;
  serverMemoryCache.set(key, cacheValue, 60 * 60);

  if (viewerUuid) {
    try {
      const interactionState = await getUserInteractionState(
        viewerUuid,
        world.uuid,
        "world"
      );
      result.liked = interactionState.hasLiked;
      result.favorited = interactionState.hasFavorited;
    } catch (error) {
      console.error("Failed to load world interaction state:", error);
    }
  }
  return result;
}

export async function createworld(data: unknown, userUuid: string): Promise<OCworld> {
  const validated = worldInsertSchema.parse(data);
  assertUrlIfPresent(validated.cover_url);
  if (validated.config?.background_image) {
    assertUrlIfPresent(validated.config.background_image);
  }

  const membershipLevel = await getMembershipLevel(userUuid);
  if (membershipLevel === "free" && validated.visibility_level === "private") {
    throw Object.assign(
      new Error("Private visibility requires a subscription"),
      { code: "SUBSCRIPTION_REQUIRED" }
    );
  }

  const limit = await getUserWorldLimit(userUuid);
  if (Number.isFinite(limit)) {
    const currentCount = await countworldsByCreator(userUuid);
    if (currentCount >= limit) {
      throw Object.assign(new Error("World limit reached"), {
        code: "LIMIT_EXCEEDED",
      });
    }
  }

  const slug = validated.slug || toSlug(validated.name);
  if (!slug) throw Object.assign(new Error("Invalid world name"), { code: "INVALID_NAME" });

  const existing = await findworldBySlugAndCreator(slug, userUuid);
  if (existing) throw Object.assign(new Error("world slug already exists"), { code: "CONFLICT" });

  const created = await createworldModel({
    name: validated.name,
    slug,
    genre: validated.genre,
    tags: validated.tags,
    description: validated.description,
    visibility_level: validated.visibility_level,
    allow_join: validated.allow_join,
    cover_url: validated.cover_url,
    species: validated.species,
    climate: validated.climate,
    regions: validated.regions,
    tech_magic_system: validated.tech_magic_system,
    theme_colors: validated.theme_colors,
    factions: validated.factions,
    history_timeline: validated.history_timeline,
    extra: validated.extra,
    config_file_path: validated.config_file_path,
    config: validated.config || {},
    is_active: validated.is_active,
    is_preset: false,
    creator_uuid: userUuid,
  });

  clearWorldListCaches(userUuid);
  return created;
}

export async function updateworld(
  identifier: number | string,
  updates: unknown,
  userUuid: string
): Promise<OCworld> {
  const rawUpdates = updates as Record<string, unknown>;
  const hasVisibilityUpdate = Object.prototype.hasOwnProperty.call(
    rawUpdates,
    "visibility_level"
  );
  const validated = worldUpdateSchema.parse(updates);
  assertUrlIfPresent(validated.cover_url);
  if (validated.config?.background_image) {
    assertUrlIfPresent(validated.config.background_image);
  }

  const current = await getworldByIdentifier(identifier, userUuid);
  if (current.creator_uuid !== userUuid) {
    throw Object.assign(new Error("Only creator can modify this world"), { code: "FORBIDDEN" });
  }
  if (
    hasVisibilityUpdate &&
    validated.visibility_level === "private" &&
    current.visibility_level !== "private"
  ) {
    const membershipLevel = await getMembershipLevel(userUuid);
    if (membershipLevel === "free") {
      throw Object.assign(
        new Error("Private visibility requires a subscription"),
        { code: "SUBSCRIPTION_REQUIRED" }
      );
    }
  }

  const nextSlug =
    validated.slug || (validated.name ? toSlug(validated.name) : undefined);
  if (nextSlug && nextSlug !== current.slug) {
    const slugExists = await findworldBySlugAndCreator(nextSlug, userUuid);
    if (slugExists) {
      throw Object.assign(new Error("world slug already exists"), { code: "CONFLICT" });
    }
  }

  const updateData = {
    ...(validated.name !== undefined ? { name: validated.name } : {}),
    ...(validated.genre !== undefined ? { genre: validated.genre } : {}),
    ...(validated.tags !== undefined ? { tags: validated.tags } : {}),
    ...(validated.description !== undefined
      ? { description: validated.description }
      : {}),
    ...(hasVisibilityUpdate ? { visibility_level: validated.visibility_level } : {}),
    ...(validated.allow_join !== undefined ? { allow_join: validated.allow_join } : {}),
    ...(validated.cover_url !== undefined ? { cover_url: validated.cover_url } : {}),
    ...(validated.species !== undefined ? { species: validated.species } : {}),
    ...(validated.climate !== undefined ? { climate: validated.climate } : {}),
    ...(validated.regions !== undefined ? { regions: validated.regions } : {}),
    ...(validated.tech_magic_system !== undefined
      ? { tech_magic_system: validated.tech_magic_system }
      : {}),
    ...(validated.theme_colors !== undefined ? { theme_colors: validated.theme_colors } : {}),
    ...(validated.factions !== undefined ? { factions: validated.factions } : {}),
    ...(validated.history_timeline !== undefined
      ? { history_timeline: validated.history_timeline }
      : {}),
    ...(validated.extra !== undefined ? { extra: validated.extra } : {}),
    ...(validated.config_file_path !== undefined
      ? { config_file_path: validated.config_file_path }
      : {}),
    ...(validated.config !== undefined ? { config: validated.config } : {}),
    ...(validated.is_active !== undefined ? { is_active: validated.is_active } : {}),
    ...(nextSlug ? { slug: nextSlug } : {}),
  };

  const updated = await updateworldModel(current.id, updateData);
  if (!updated) throw Object.assign(new Error("world not found"), { code: "NOT_FOUND" });

  serverMemoryCache.del(`world:${String(identifier)}`);
  serverMemoryCache.del(`world:${String(current.uuid)}`);
  serverMemoryCache.del(`world:${String(current.id)}`);
  clearWorldListCaches(userUuid);
  return updated;
}

export async function deleteworld(
  identifier: number | string,
  userUuid: string
): Promise<boolean> {
  const current = await getworldByIdentifier(identifier, userUuid);
  if (current.creator_uuid !== userUuid) {
    throw Object.assign(new Error("Only creator can modify this world"), { code: "FORBIDDEN" });
  }

  const usedCount = await countCharactersByworldUuid(current.uuid);
  if (usedCount > 0) {
    throw Object.assign(
      new Error("world is in use by existing characters"),
      { code: "CONFLICT" }
    );
  }

  const ok = await deleteworldModel(current.id);
  if (!ok) throw Object.assign(new Error("world not found"), { code: "NOT_FOUND" });

  serverMemoryCache.del(`world:${String(identifier)}`);
  serverMemoryCache.del(`world:${String(current.uuid)}`);
  serverMemoryCache.del(`world:${String(current.id)}`);
  clearWorldListCaches(userUuid);
  return ok;
}
