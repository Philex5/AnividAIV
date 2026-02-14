/**
 * Community Model Layer
 * Handles all database operations for community content (images, videos, characters)
 */

import { db } from "@/db";
import { users, generationImages, generationVideos, characters, userInteractions } from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export interface CommunityListQueryParams {
  type: "all" | "image" | "video" | "oc";
  limit: number;
  cursorCondImage?: string;
  cursorCondVideo?: string;
  cursorCondChar?: string;
  qCondImage?: string;
  qCondVideo?: string;
  qCondChar?: string;
  genTypeCondImage?: string;
  genTypeCondVideo?: string;
  genTypeCondChar?: string;
}

export interface CommunityRawRow {
  type: string;
  source_type: string;
  source_uuid: string;
  author_uuid: string;
  title: string;
  cover_url: string;
  media_urls: any;
  created_at: Date | string;
  gen_type?: string;
  extra?: any;
}

interface MembershipRaw {
  is_sub: boolean | null;
  sub_expired_at: Date | string | null;
  sub_plan_type?: string | null;
}

export interface AuthorBrief {
  uuid: string;
  name: string;
  avatar: string;
  membership_level?: string | null;
  membership_display_name?: string | null;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveMembershipMeta(
  raw: MembershipRaw
): { level: string | null; displayName: string | null } {
  const expiredAt = normalizeDate(raw.sub_expired_at);
  const now = new Date();

  const isActivePro =
    Boolean(raw.is_sub) && expiredAt !== null && expiredAt.getTime() > now.getTime();

  if (!isActivePro) {
    return { level: null, displayName: null };
  }

  const planRaw = raw.sub_plan_type?.trim();
  const normalizedPlan = planRaw ? planRaw.toLowerCase() : null;
  if (normalizedPlan === "free") {
    return { level: null, displayName: null };
  }

  const level =
    normalizedPlan && normalizedPlan.length > 0 ? normalizedPlan : "pro";

  const displayMap: Record<string, string> = {
    free: "Free Member",
    pro: "Pro Member",
    basic: "Basic Member",
    plus: "Plus Member",
    premium: "Premium Member",
    vip: "VIP Member",
    enterprise: "Enterprise Member",
  };

  const label = displayMap[level] || `${level.charAt(0).toUpperCase()}${level.slice(1)} Member`;
  return {
    level,
    displayName: `AnividAI ${label}`,
  };
}

/**
 * Execute raw SQL query for community list with UNION ALL
 */
export async function queryCommunityListRaw(
  params: CommunityListQueryParams
): Promise<CommunityRawRow[]> {
  const {
    type,
    limit,
    cursorCondImage = "",
    cursorCondVideo = "",
    cursorCondChar = "",
    qCondImage = "",
    qCondVideo = "",
    qCondChar = "",
    genTypeCondImage = "",
    genTypeCondVideo = "",
    genTypeCondChar = "",
  } = params;

  const selects: string[] = [];

  if (type === "all" || type === "image") {
    selects.push(`
      SELECT
        'image'::text AS type,
        'generation_image'::text AS source_type,
        gi.uuid AS source_uuid,
        gi.user_uuid AS author_uuid,
        coalesce(gi.original_prompt,'') AS title,
        gi.thumbnail_detail AS cover_url,
        jsonb_build_array(gi.thumbnail_detail) AS media_urls,
        gi.created_at AS created_at,
        gi.gen_type AS gen_type,
        NULL::jsonb AS extra
      FROM generation_images gi
      WHERE gi.visibility_level = 'public' AND gi.moderation_status = 'normal'${cursorCondImage}${qCondImage}${genTypeCondImage}
    `);
  }

  if (type === "all" || type === "video") {
    selects.push(`
      SELECT
        'video'::text AS type,
        'generation_video'::text AS source_type,
        gv.uuid AS source_uuid,
        gv.user_uuid AS author_uuid,
        '' AS title,
        coalesce(gv.poster_url, gv.reference_image_url, '') AS cover_url,
        jsonb_build_array(coalesce(gv.video_url,'')) AS media_urls,
        gv.created_at AS created_at,
        gv.gen_type AS gen_type,
        jsonb_build_object('duration_seconds', gv.duration_seconds, 'resolution', gv.resolution) AS extra
      FROM generation_videos gv
      WHERE gv.visibility_level = 'public' AND gv.moderation_status = 'normal'${cursorCondVideo}${qCondVideo}${genTypeCondVideo}
    `);
  }

  if (type === "all" || type === "oc") {
    selects.push(`
      SELECT
        'oc'::text AS type,
        'character'::text AS source_type,
        c.uuid AS source_uuid,
        c.user_uuid AS author_uuid,
        c.name AS title,
        coalesce(img.thumbnail_detail, img.image_url, '') AS cover_url,
        jsonb_build_array(coalesce(img.thumbnail_detail, img.image_url, '')) AS media_urls,
        c.created_at AS created_at,
        img.gen_type AS gen_type,
        jsonb_build_object('race_code', c.species) AS extra
      FROM characters c
      LEFT JOIN generation_images img ON img.uuid = c.profile_generation_image_uuid
      WHERE c.visibility_level = 'public' AND c.moderation_status = 'normal'
        AND c.name IS NOT NULL AND c.name != ''
        AND c.brief_introduction IS NOT NULL AND c.brief_introduction != ''
        AND (c.profile_generation_image_uuid IS NOT NULL AND c.profile_generation_image_uuid != '')
        ${cursorCondChar}${qCondChar}${genTypeCondChar}
    `);
  }

  if (!selects.length) {
    return [];
  }

  const sqlText = `
    SELECT *
    FROM (${selects.join(" UNION ALL ")}) AS community_union
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  const result = await db().execute(sql.raw(sqlText));
  const rows: any[] = (result as any).rows || result || [];

  return rows as CommunityRawRow[];
}

/**
 * Batch load authors by uuids
 */
export async function batchLoadAuthors(
  authorUuids: string[]
): Promise<AuthorBrief[]> {
  if (!authorUuids.length) return [];
  const validAuthorUuids = authorUuids.filter((uuid) => isValidUuid(uuid));
  if (!validAuthorUuids.length) return [];

  const authors = await db()
    .select({
      uuid: users.uuid,
      name: users.display_name,
      avatar: users.avatar_url,
      is_sub: users.is_sub,
      sub_expired_at: users.sub_expired_at,
      sub_plan_type: users.sub_plan_type,
    })
    .from(users)
    .where(inArray(users.uuid, validAuthorUuids));

  return authors.map((a) => {
    const membership = resolveMembershipMeta({
      is_sub: a.is_sub,
      sub_expired_at: a.sub_expired_at,
      sub_plan_type: a.sub_plan_type,
    });

    return {
      uuid: a.uuid,
      name: a.name || "",
      avatar: a.avatar || "",
      membership_level: membership.level,
      membership_display_name: membership.displayName,
    };
  });
}

/**
 * Load single author by uuid
 */
export async function loadAuthorByUuid(
  userUuid?: string | null
): Promise<AuthorBrief> {
  if (!userUuid) {
    return { uuid: "", name: "", avatar: "", membership_level: null, membership_display_name: null };
  }
  if (!isValidUuid(userUuid)) {
    return {
      uuid: userUuid,
      name: "",
      avatar: "",
      membership_level: null,
      membership_display_name: null,
    };
  }

  const [author] = await db()
    .select({
      uuid: users.uuid,
      display_name: users.display_name,
      avatar: users.avatar_url,
      is_sub: users.is_sub,
      sub_expired_at: users.sub_expired_at,
      sub_plan_type: users.sub_plan_type,
    })
    .from(users)
    .where(eq(users.uuid, userUuid))
    .limit(1);

  const membership = author
    ? resolveMembershipMeta({
        is_sub: author.is_sub,
        sub_expired_at: author.sub_expired_at,
        sub_plan_type: author.sub_plan_type,
      })
    : { level: null, displayName: null };

  return {
    uuid: userUuid,
    name: author?.display_name || "",
    avatar: author?.avatar || "",
    membership_level: membership.level,
    membership_display_name: membership.displayName,
  };
}

/**
 * Query image detail with joins
 */
export async function queryImageDetailRaw(imageUuid: string): Promise<any> {
  const sqlText = `
    SELECT
      gi.*,
      g.prompt AS generation_prompt,
      g.model_id AS generation_model_id,
      g.style_preset AS generation_style_preset,
      g.character_uuids AS generation_character_uuids,
      g.metadata AS generation_metadata,
      g.created_at AS generation_created_at
    FROM generation_images gi
    LEFT JOIN generations g ON g.uuid = gi.generation_uuid
    WHERE gi.uuid = $1 AND gi.visibility_level = 'public' AND gi.moderation_status = 'normal'
    LIMIT 1
  `;

  const result = await (db().execute as any)(sql.raw(sqlText), [imageUuid]);
  const rows: any[] = (result as any).rows || result || [];
  return rows[0] || null;
}

/**
 * Query video detail with joins
 */
export async function queryVideoDetailRaw(videoUuid: string): Promise<any> {
  const sqlText = `
    SELECT
      gv.*,
      g.prompt AS generation_prompt,
      g.model_id AS generation_model_id,
      g.character_uuids AS generation_character_uuids,
      g.metadata AS generation_metadata,
      g.created_at AS generation_created_at
    FROM generation_videos gv
    LEFT JOIN generations g ON g.uuid = gv.generation_uuid
    WHERE gv.uuid = $1 AND gv.visibility_level = 'public' AND gv.moderation_status = 'normal'
    LIMIT 1
  `;

  const result = await (db().execute as any)(sql.raw(sqlText), [videoUuid]);
  const rows: any[] = (result as any).rows || result || [];
  return rows[0] || null;
}

/**
 * Query video variants by generation uuid
 */
export async function queryVideoVariantsByGenerationUuid(
  generationUuid: string
): Promise<any[]> {
  const rows = await db()
    .select({
      uuid: generationVideos.uuid,
      video_url: generationVideos.video_url,
      visibility_level: generationVideos.visibility_level,
    })
    .from(generationVideos)
    .where(eq(generationVideos.generation_uuid, generationUuid))
    .orderBy(desc(generationVideos.created_at));

  return rows;
}

/**
 * Query character detail with joins
 */
export async function queryCharacterDetailRaw(
  characterUuid: string
): Promise<any> {
  const query = sql`
    SELECT
      c.*,
      u.display_name AS author_name,
      u.avatar_url AS author_avatar,
      profile.thumbnail_detail AS profile_thumbnail_detail,
      profile.thumbnail_desktop AS profile_thumbnail_desktop,
      profile.thumbnail_mobile AS profile_thumbnail_mobile,
      profile.image_url AS profile_image_url,
      avatar.thumbnail_detail AS avatar_thumbnail_detail,
      avatar.thumbnail_desktop AS avatar_thumbnail_desktop,
      avatar.thumbnail_mobile AS avatar_thumbnail_mobile,
      avatar.image_url AS avatar_image_url
    FROM characters c
    LEFT JOIN users u ON u.uuid = c.user_uuid
    LEFT JOIN generation_images profile ON profile.uuid = c.profile_generation_image_uuid
    LEFT JOIN generation_images avatar ON avatar.uuid = c.avatar_generation_image_uuid
    WHERE c.uuid = ${characterUuid} AND c.visibility_level = 'public' AND c.moderation_status = 'normal'
    LIMIT 1
  `;

  const result = await db().execute(query);
  const rows: any[] = (result as any).rows || (Array.isArray(result) ? result : []);
  return rows[0] || null;
}

// ===== Helpers for interactions & id mapping =====

// 交互计数/状态按资源uuid统计

export async function countLikesFor(
  type: "image" | "video" | "character",
  artUuids: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!artUuids.length) return result;
  const rows = await db()
    .select({ art_id: userInteractions.art_id, count: sql<number>`count(*)` })
    .from(userInteractions)
    .where(
      and(
        inArray(userInteractions.art_id, artUuids),
        eq(userInteractions.art_type, type),
        eq(userInteractions.interaction_type, "like")
      )
    )
    .groupBy(userInteractions.art_id);
  rows.forEach((r: any) => result.set(String(r.art_id), Number(r.count) || 0));
  return result;
}

export async function getUserFlagsFor(
  userUuid: string,
  type: "image" | "video" | "character",
  artUuids: string[]
): Promise<{ liked: Set<string>; favorited: Set<string> }> {
  const liked = new Set<string>();
  const favorited = new Set<string>();
  if (!artUuids.length) return { liked, favorited };
  const rows = await db()
    .select({ art_id: userInteractions.art_id, interaction_type: userInteractions.interaction_type })
    .from(userInteractions)
    .where(
      and(
        eq(userInteractions.user_uuid, userUuid),
        eq(userInteractions.art_type, type),
        inArray(userInteractions.art_id, artUuids),
        inArray(userInteractions.interaction_type, ["like", "favorite"]) as any
      )
    );
  rows.forEach((r: any) => {
    const key = String(r.art_id);
    if (r.interaction_type === "like") liked.add(key);
    if (r.interaction_type === "favorite") favorited.add(key);
  });
  return { liked, favorited };
}

export async function getCharacterLikeCountsByUuids(
  uuids: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!uuids.length) return map;
  const rows = await db()
    .select({ uuid: characters.uuid, like_count: characters.like_count })
    .from(characters)
    .where(inArray(characters.uuid, uuids));
  rows.forEach((r: any) => map.set(r.uuid, Number(r.like_count) || 0));
  return map;
}
