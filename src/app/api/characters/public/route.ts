import { respData, respErr } from "@/lib/resp";
import {
  findPublicCharacters,
  findPublicCharactersByUuids,
  type Character,
} from "@/models/character";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { characters, generationImages } from "@/db/schema";
import { db } from "@/db";
import { getUserUuid } from "@/services/user";
import { findUserInteractionsByArtIds } from "@/models/user-interaction";

interface ListOptions {
  page?: number;
  limit?: number;
  sort?: "latest" | "trending" | "top";
  style?: string;
  species?: string;
  gender?: "male" | "female" | "other";
  role?: string;
  world?: string;
}

interface CharacterListResponse {
  items: CharacterPreview[];
  total: number;
  page: number;
  limit: number;
}

interface CharacterPreview {
  uuid: string;
  name: string;
  gender: string | null;
  species: string | null;
  role: string | null;
  brief_introduction: string | null;
  tags: string[] | null;
  like_count: number;
  favorite_count: number;
  comment_count: number;
  world_uuid: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  user_uuid: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
  liked?: boolean;
  favorited?: boolean;
  created_at: Date | null;
  updated_at: Date | null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Math.min(Number(url.searchParams.get("limit")) || 24, 100);
    const sort = (url.searchParams.get("sort") || "latest") as ListOptions["sort"];
    const style = url.searchParams.get("style") || undefined;
    const species = url.searchParams.get("species") || undefined;
    const gender = url.searchParams.get("gender") as ListOptions["gender"] | undefined;
    const role = url.searchParams.get("role") || undefined;
    const world = url.searchParams.get("world") || undefined;

    const viewerUuid = await getUserUuid();

    // Build query conditions
    const conditions = [eq(characters.visibility_level, "public")];

    if (style) {
      conditions.push(
        sql`${characters.modules}->'art'->>'fullbody_style' = ${style}`
      );
    }

    if (species) {
      conditions.push(eq(characters.species, species));
    }

    if (gender) {
      conditions.push(eq(characters.gender, gender));
    }

    if (role) {
      conditions.push(eq(characters.role, role));
    }

    if (world) {
      conditions.push(eq(characters.world_uuid, world));
    }

    const whereClause =
      conditions.length > 1 ? and(...conditions) : conditions[0];

    // Build order by clause based on sort
    let orderBy;
    switch (sort) {
      case "trending":
        orderBy = desc(characters.like_count);
        break;
      case "top":
        orderBy = desc(characters.like_count);
        break;
      case "latest":
      default:
        orderBy = desc(characters.created_at);
        break;
    }

    // Count total
    const totalResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(characters)
      .where(whereClause);
    const total = totalResult[0]?.count || 0;

    // Fetch characters with pagination
    const offset = (page - 1) * limit;

    // First, fetch characters with avatar image info
    const characterData = await db()
      .select({
        uuid: characters.uuid,
        name: characters.name,
        gender: characters.gender,
        species: characters.species,
        role: characters.role,
        brief_introduction: characters.brief_introduction,
        tags: characters.tags,
        like_count: characters.like_count,
        favorite_count: characters.favorite_count,
        comment_count: characters.comment_count,
        world_uuid: characters.world_uuid,
        avatar_generation_image_uuid: characters.avatar_generation_image_uuid,
        profile_generation_image_uuid: characters.profile_generation_image_uuid,
        user_uuid: characters.user_uuid,
        created_at: characters.created_at,
        updated_at: characters.updated_at,
        avatar_image_url: generationImages.image_url,
        avatar_thumbnail_mobile: generationImages.thumbnail_mobile,
      })
      .from(characters)
      .leftJoin(
        generationImages,
        eq(generationImages.uuid, characters.avatar_generation_image_uuid)
      )
      .where(whereClause)
      .orderBy(orderBy, desc(characters.created_at))
      .limit(limit)
      .offset(offset);

    // Collect profile image uuids to fetch in a second query
    const profileImageUuids = characterData
      .map((c) => c.profile_generation_image_uuid)
      .filter((uuid): uuid is string => uuid !== null);

    // Fetch profile images
    let profileImagesMap: Map<string, { image_url: string | null; thumbnail_mobile: string | null }> = new Map();
    if (profileImageUuids.length > 0) {
      const profileImages = await db()
        .select({
          uuid: generationImages.uuid,
          image_url: generationImages.image_url,
          thumbnail_mobile: generationImages.thumbnail_mobile,
        })
        .from(generationImages)
        .where(inArray(generationImages.uuid, profileImageUuids));

      profileImagesMap = new Map(
        profileImages.map((img) => [
          img.uuid,
          { image_url: img.image_url, thumbnail_mobile: img.thumbnail_mobile },
        ])
      );
    }

    // Get creator info for all characters
    const creatorUuids = characterData
      .map((c) => c.user_uuid)
      .filter((uuid): uuid is string => uuid !== null);

    let creatorsMap: Map<string, { display_name: string | null; avatar_url: string | null }> = new Map();

    if (creatorUuids.length > 0) {
      // Fetch creators one by one
      const { findUserByUuid } = await import("@/models/user");
      for (const uuid of creatorUuids) {
        try {
          const creator = await findUserByUuid(uuid);
          if (creator) {
            creatorsMap.set(uuid, { display_name: creator.display_name, avatar_url: creator.avatar_url });
          }
        } catch (e) {
          console.error(`Failed to load creator ${uuid}:`, e);
        }
      }
    }

    // Get user interactions if logged in
    let likedSet = new Set<string>();
    let favoritedSet = new Set<string>();

    if (viewerUuid && characterData.length > 0) {
      const characterUuids = characterData.map((c) => c.uuid);
      const interactions = await findUserInteractionsByArtIds(
        viewerUuid,
        characterUuids,
        "character"
      );

      likedSet = new Set(
        interactions
          .filter((i) => i.interaction_type === "like")
          .map((i) => i.art_id)
      );
      favoritedSet = new Set(
        interactions
          .filter((i) => i.interaction_type === "favorite")
          .map((i) => i.art_id)
      );
    }

    // Transform data
    const items: CharacterPreview[] = characterData.map((c) => {
      const creator = creatorsMap.get(c.user_uuid || "");
      const avatarUrl = c.avatar_thumbnail_mobile || c.avatar_image_url;

      // Get profile image from the map
      const profileImageData = c.profile_generation_image_uuid
        ? profileImagesMap.get(c.profile_generation_image_uuid)
        : null;
      const profileUrl = profileImageData?.thumbnail_mobile || profileImageData?.image_url || "";

      return {
        uuid: c.uuid,
        name: c.name,
        gender: c.gender,
        species: c.species,
        role: c.role,
        brief_introduction: c.brief_introduction,
        tags: normalizeStringArray(c.tags),
        like_count: c.like_count || 0,
        favorite_count: c.favorite_count || 0,
        comment_count: c.comment_count || 0,
        world_uuid: typeof c.world_uuid === "string" ? c.world_uuid : null,
        avatar_url: avatarUrl,
        profile_url: profileUrl,
        user_uuid: c.user_uuid,
        creator_name: creator?.display_name || null,
        creator_avatar: creator?.avatar_url || null,
        liked: likedSet.has(c.uuid),
        favorited: favoritedSet.has(c.uuid),
        created_at: c.created_at,
        updated_at: c.updated_at,
      };
    });

    const response: CharacterListResponse = {
      items,
      total,
      page,
      limit,
    };

    return respData(response);
  } catch (error: any) {
    console.error("Failed to get public characters:", error);
    return respErr(error?.message || "Failed to get characters", 500);
  }
}

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const result = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return result.length ? result : null;
}
