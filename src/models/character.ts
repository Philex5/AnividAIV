import { characters, generationImages, userInteractions } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, and, inArray, sql, or, ne } from "drizzle-orm";

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;

export async function createCharacter(
  data: NewCharacter
): Promise<Character> {
  const [character] = await db().insert(characters).values(data).returning();
  return character;
}

export async function findCharacterById(
  id: number
): Promise<Character | undefined> {
  const [character] = await db()
    .select()
    .from(characters)
    .where(eq(characters.id, id))
    .limit(1);

  return character;
}

export async function findCharacterByUuid(
  uuid: string
): Promise<Character | undefined> {
  const [character] = await db()
    .select()
    .from(characters)
    .where(eq(characters.uuid, uuid))
    .limit(1);

  return character;
}

export async function findCharactersByWorldUuid(
  worldUuid: string,
  options: {
    visibility_level?: "public" | "private";
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  uuid: string;
  name: string;
  avatar_generation_image_uuid: string | null;
  image_url: string | null;
  thumbnail_mobile: string | null;
  thumbnail_desktop: string | null;
  thumbnail_detail: string | null;
}[]> {
  const { visibility_level = "public", limit = 100, offset = 0 } = options;

  const conditions = [eq(characters.world_uuid, worldUuid)];
  if (visibility_level) {
    conditions.push(eq(characters.visibility_level, visibility_level));
  }

  const data = await db()
    .select({
      uuid: characters.uuid,
      name: characters.name,
      avatar_generation_image_uuid: characters.avatar_generation_image_uuid,
      image_url: generationImages.image_url,
      thumbnail_mobile: generationImages.thumbnail_mobile,
      thumbnail_desktop: generationImages.thumbnail_desktop,
      thumbnail_detail: generationImages.thumbnail_detail,
    })
    .from(characters)
    .leftJoin(
      generationImages,
      eq(generationImages.uuid, characters.avatar_generation_image_uuid)
    )
    .where(and(...conditions))
    .orderBy(desc(characters.created_at))
    .limit(limit)
    .offset(offset);

  return data;
}

export async function findCharactersByUserUuid(
  userUuid: string,
  page: number = 1,
  limit: number = 20,
  tags?: string[]
): Promise<Character[]> {
  const offset = (page - 1) * limit;

  const filters = [eq(characters.user_uuid, userUuid)];

  if (tags && tags.length > 0) {
    const tagsJson = JSON.stringify(tags);
    filters.push(sql`${characters.tags} @> ${tagsJson}::jsonb`);
  }

  const data = await db()
    .select()
    .from(characters)
    .where(and(...filters))
    .orderBy(desc(characters.updated_at))
    .limit(limit)
    .offset(offset);

  return data;
}

export async function findPublicCharactersByUserUuid(
  userUuid: string,
  page: number = 1,
  limit: number = 20
): Promise<Character[]> {
  const offset = (page - 1) * limit;

  const data = await db()
    .select()
    .from(characters)
    .where(
      and(
        eq(characters.user_uuid, userUuid),
        eq(characters.visibility_level, "public")
      )
    )
    .orderBy(desc(characters.updated_at))
    .limit(limit)
    .offset(offset);

  return data;
}

export async function findFavoritedCharactersByUserUuid(
  userUuid: string,
  page: number = 1,
  limit: number = 20,
  tags?: string[]
): Promise<Character[]> {
  const offset = (page - 1) * limit;

  const filters = [
    eq(userInteractions.user_uuid, userUuid),
    eq(userInteractions.art_type, "character"),
    eq(userInteractions.interaction_type, "favorite"),
  ];

  if (tags && tags.length > 0) {
    const tagsJson = JSON.stringify(tags);
    filters.push(sql`${characters.tags} @> ${tagsJson}::jsonb`);
  }

  const data = await db()
    .select({
      character: characters,
    })
    .from(userInteractions)
    .innerJoin(characters, eq(userInteractions.art_id, characters.uuid))
    .where(and(...filters))
    .orderBy(desc(userInteractions.updated_at), desc(characters.updated_at))
    .limit(limit)
    .offset(offset);

  return data.map((item) => item.character);
}

// theme system removed in FEAT-OC-REBUILD (use world_uuid + modules instead)

export async function findPublicCharacters(
  page: number = 1,
  limit: number = 20
): Promise<Character[]> {
  const offset = (page - 1) * limit;

  const data = await db()
    .select()
    .from(characters)
    .where(eq(characters.visibility_level, "public"))
    .orderBy(desc(characters.like_count), desc(characters.created_at))
    .limit(limit)
    .offset(offset);

  return data;
}

export async function findPublicCharactersByUuids(
  uuids: string[]
): Promise<Character[]> {
  if (!uuids.length) return [];

  const data = await db()
    .select()
    .from(characters)
    .where(
      and(
        eq(characters.visibility_level, "public"),
        inArray(characters.uuid, uuids)
      )
    );

  return data;
}

export async function updateCharacter(
  uuid: string,
  data: Partial<NewCharacter>
): Promise<Character | undefined> {
  const [character] = await db()
    .update(characters)
    .set({ ...data, updated_at: new Date() })
    .where(eq(characters.uuid, uuid))
    .returning();

  return character;
}

export async function deleteCharacter(uuid: string): Promise<boolean> {
  const result = await db()
    .delete(characters)
    .where(eq(characters.uuid, uuid));

  // Drizzle ORM 的 delete 返回的是被删除的行数组
  return result.length > 0;
}

/**
 * @deprecated Use incrementStat('character', uuid, 'like_count') from social-stats.ts instead
 */
export async function incrementLikeCount(characterUuid: string): Promise<void> {
  await db()
    .update(characters)
    .set({
      like_count: sql`${characters.like_count} + 1`,
      updated_at: new Date(),
    })
    .where(eq(characters.uuid, characterUuid));
}

/**
 * @deprecated Use decrementStat('character', uuid, 'like_count') from social-stats.ts instead
 */
export async function decrementLikeCount(
  characterUuid: string
): Promise<void> {
  await db()
    .update(characters)
    .set({
      like_count: sql`GREATEST(0, ${characters.like_count} - 1)`,
      updated_at: new Date(),
    })
    .where(eq(characters.uuid, characterUuid));
}

/**
 * @deprecated Use incrementStat('character', uuid, 'favorite_count') from social-stats.ts instead
 */
export async function incrementFavoriteCount(
  characterUuid: string
): Promise<void> {
  await db()
    .update(characters)
    .set({
      favorite_count: sql`${characters.favorite_count} + 1`,
      updated_at: new Date(),
    })
    .where(eq(characters.uuid, characterUuid));
}

/**
 * @deprecated Use decrementStat('character', uuid, 'favorite_count') from social-stats.ts instead
 */
export async function decrementFavoriteCount(
  characterUuid: string
): Promise<void> {
  await db()
    .update(characters)
    .set({
      favorite_count: sql`GREATEST(0, ${characters.favorite_count} - 1)`,
      updated_at: new Date(),
    })
    .where(eq(characters.uuid, characterUuid));
}

export async function getCharactersByIds(
  ids: number[]
): Promise<Character[]> {
  const data = await db()
    .select()
    .from(characters)
    .where(inArray(characters.id, ids));

  return data;
}

export async function getUserCharacterCount(userUuid: string): Promise<number> {
  const total = await db()
    .$count(characters, eq(characters.user_uuid, userUuid));

  return total;
}

export async function getUserPublicCharacterCount(
  userUuid: string
): Promise<number> {
  const total = await db()
    .$count(
      characters,
      and(
        eq(characters.user_uuid, userUuid),
        eq(characters.visibility_level, "public")
      )
    );

  return total;
}

// theme system removed in FEAT-OC-REBUILD (use world_uuid + modules instead)

// 获取推荐角色（基于多维度）
export async function getRecommendedCharacters(
  characterId: number,
  currentCharacter: Character,
  limit: number = 10
): Promise<Character[]> {
  const conditions = [
    ne(characters.id, characterId), // 排除当前角色
    eq(characters.visibility_level, "public"), // 仅公开角色
  ];

  // 优先级1: 相同作者
  const sameAuthorChars = await db()
    .select()
    .from(characters)
    .where(
      and(
        ...conditions,
        eq(characters.user_uuid, currentCharacter.user_uuid)
      )
    )
    .orderBy(desc(characters.like_count), desc(characters.created_at))
    .limit(5);

  const results = [...sameAuthorChars];
  const existingIds = new Set(results.map(c => c.id));

  // 如果不足，添加相同世界观的角色
  if (
    results.length < limit &&
    currentCharacter.world_uuid !== null &&
    currentCharacter.world_uuid !== undefined
  ) {
    const sameThemeChars = await db()
      .select()
      .from(characters)
      .where(
        and(
          ...conditions,
          eq(characters.world_uuid, currentCharacter.world_uuid),
          ne(characters.user_uuid, currentCharacter.user_uuid) // 排除已经选过的同作者角色
        )
      )
      .orderBy(desc(characters.like_count), desc(characters.created_at))
      .limit(limit - results.length);

    for (const char of sameThemeChars) {
      if (!existingIds.has(char.id)) {
        results.push(char);
        existingIds.add(char.id);
      }
    }
  }

  // 如果仍然不足，添加随机热门角色
  if (results.length < limit) {
    const popularChars = await db()
      .select()
      .from(characters)
      .where(and(...conditions))
      .orderBy(desc(characters.like_count), desc(characters.created_at))
      .limit(limit * 2); // 获取更多以便筛选

    for (const char of popularChars) {
      if (results.length >= limit) break;
      if (!existingIds.has(char.id)) {
        results.push(char);
        existingIds.add(char.id);
      }
    }
  }

  // 随机打乱顺序（保持同作者的在前）
  const sameAuthorCount = sameAuthorChars.length;
  const others = results.slice(sameAuthorCount);
  const shuffled = others.sort(() => Math.random() - 0.5);

  return [...results.slice(0, sameAuthorCount), ...shuffled].slice(0, limit);
}

export interface PublicCharacterRecommendationOptions {
  limit?: number;
  sampleSize?: number;
  excludeUuid?: string;
  artStyle?: string;
  species?: string;
}

export async function findPublicCharactersForRecommendations(
  options: PublicCharacterRecommendationOptions = {}
): Promise<Character[]> {
  const {
    limit = 5,
    sampleSize,
    excludeUuid,
    artStyle,
    species,
  } = options;

  const effectiveSampleSize = Math.max(sampleSize ?? limit * 4, limit);

  const filters = [eq(characters.visibility_level, "public")];

  if (excludeUuid) {
    filters.push(ne(characters.uuid, excludeUuid));
  }

  if (artStyle) {
    filters.push(
      sql`${characters.modules}->'art'->>'fullbody_style' = ${artStyle}`
    );
  }

  if (species) {
    filters.push(eq(characters.species, species));
  }

  const whereClause =
    filters.length > 1 ? and(...filters) : filters[0];

  const data = await db()
    .select()
    .from(characters)
    .where(whereClause)
    .orderBy(desc(characters.created_at))
    .limit(Math.max(effectiveSampleSize, limit));

  return data;
}

// 获取用户角色及其头像信息
export async function findUserCharactersWithAvatars(
  userUuid: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  uuid: string;
  name: string;
  avatar_generation_image_uuid: string | null;
  image_url: string | null;
  thumbnail_mobile: string | null;
  thumbnail_desktop: string | null;
  thumbnail_detail: string | null;
}[]> {
  const offset = (page - 1) * limit;

  const data = await db()
    .select({
      uuid: characters.uuid,
      name: characters.name,
      avatar_generation_image_uuid: characters.avatar_generation_image_uuid,
      image_url: generationImages.image_url,
      thumbnail_mobile: generationImages.thumbnail_mobile,
      thumbnail_desktop: generationImages.thumbnail_desktop,
      thumbnail_detail: generationImages.thumbnail_detail,
    })
    .from(characters)
    .leftJoin(
      generationImages,
      eq(generationImages.uuid, characters.avatar_generation_image_uuid)
    )
    .where(eq(characters.user_uuid, userUuid))
    .orderBy(desc(characters.updated_at))
    .limit(limit)
    .offset(offset);

  return data;
}

// 根据UUID列表获取角色及头像信息
export async function findCharactersWithAvatarsByUuids(
  uuids: string[]
): Promise<
  {
    uuid: string;
    name: string;
    avatar_generation_image_uuid: string | null;
    image_url: string | null;
    thumbnail_mobile: string | null;
    thumbnail_desktop: string | null;
    thumbnail_detail: string | null;
    visibility_level: string | null;
    user_uuid: string | null;
  }[]
> {
  if (!uuids || uuids.length === 0) {
    return [];
  }

  const data = await db()
    .select({
      uuid: characters.uuid,
      name: characters.name,
      avatar_generation_image_uuid: characters.avatar_generation_image_uuid,
      image_url: generationImages.image_url,
      thumbnail_mobile: generationImages.thumbnail_mobile,
      thumbnail_desktop: generationImages.thumbnail_desktop,
      thumbnail_detail: generationImages.thumbnail_detail,
      visibility_level: characters.visibility_level,
      user_uuid: characters.user_uuid,
    })
    .from(characters)
    .leftJoin(
      generationImages,
      eq(generationImages.uuid, characters.avatar_generation_image_uuid)
    )
    .where(inArray(characters.uuid, uuids));

  return data;
}

// 推荐系统专用查询函数 - 基于UUID

/**
 * 查询同一作者的其他公开角色（用于推荐）
 * @param authorUuid - 作者UUID
 * @param excludeUuids - 要排除的角色UUID列表
 * @param limit - 返回数量限制
 * @returns 按点赞数和创建时间排序的公开角色列表
 */
export async function findPublicCharactersByAuthor(
  authorUuid: string,
  excludeUuids: string[] = [],
  limit: number = 5
): Promise<Character[]> {
  const conditions = [
    eq(characters.user_uuid, authorUuid),
    eq(characters.visibility_level, "public"),
  ];

  if (excludeUuids.length > 0) {
    // Use sql template with proper array formatting
    const placeholders = excludeUuids.map((uuid) => sql`${uuid}`);
    conditions.push(sql`${characters.uuid} NOT IN (${sql.join(placeholders, sql`, `)})`);
  }

  const data = await db()
    .select()
    .from(characters)
    .where(and(...conditions))
    .orderBy(desc(characters.like_count), desc(characters.created_at))
    .limit(limit);

  return data;
}

/**
 * 查询同主题的其他公开角色（用于推荐）
 * @param worldId - 世界观UUID
 * @param excludeUuids - 要排除的角色UUID列表
 * @param excludeAuthorUuid - 要排除的作者UUID（避免重复推荐同作者）
 * @param limit - 返回数量限制
 * @returns 按点赞数和创建时间排序的公开角色列表
 */
export async function findPublicCharactersByworldForRecommendation(
  worldId: string,
  excludeUuids: string[] = [],
  excludeAuthorUuid?: string,
  limit: number = 5
): Promise<Character[]> {
  const conditions = [
    eq(characters.world_uuid, worldId),
    eq(characters.visibility_level, "public"),
  ];

  if (excludeUuids.length > 0) {
    // Use sql template with proper array formatting
    const placeholders = excludeUuids.map((uuid) => sql`${uuid}`);
    conditions.push(sql`${characters.uuid} NOT IN (${sql.join(placeholders, sql`, `)})`);
  }

  if (excludeAuthorUuid) {
    conditions.push(ne(characters.user_uuid, excludeAuthorUuid));
  }

  const data = await db()
    .select()
    .from(characters)
    .where(and(...conditions))
    .orderBy(desc(characters.like_count), desc(characters.created_at))
    .limit(limit);

  return data;
}

/**
 * 查询热门公开角色（用于推荐补充）
 * @param excludeUuids - 要排除的角色UUID列表
 * @param limit - 返回数量限制
 * @returns 按点赞数和创建时间排序的热门公开角色列表
 */
export async function findPopularPublicCharacters(
  excludeUuids: string[] = [],
  limit: number = 10
): Promise<Character[]> {
  const conditions = [eq(characters.visibility_level, "public")];

  if (excludeUuids.length > 0) {
    // Use sql template with proper array formatting
    const placeholders = excludeUuids.map((uuid) => sql`${uuid}`);
    conditions.push(sql`${characters.uuid} NOT IN (${sql.join(placeholders, sql`, `)})`);
  }

  const data = await db()
    .select()
    .from(characters)
    .where(and(...conditions))
    .orderBy(desc(characters.like_count), desc(characters.created_at))
    .limit(limit);

  return data;
}
