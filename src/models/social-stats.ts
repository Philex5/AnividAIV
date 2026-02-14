import { db } from "@/db";
import {
  characters,
  generationImages,
  generationVideos,
  ocworlds,
  comments,
} from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { ExtractTablesWithRelations } from "drizzle-orm";
import { PgTransaction } from "drizzle-orm/pg-core";
import { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

export type ArtType = "character" | "image" | "video" | "comment" | "world";
export type StatField =
  | "like_count"
  | "favorite_count"
  | "comment_count"
  | "share_count";
export type Transaction = PgTransaction<PostgresJsQueryResultHKT, any, ExtractTablesWithRelations<any>>;

/**
 * Get table by art type
 */
function getTableByArtType(artType: ArtType) {
  switch (artType) {
    case "character":
      return characters;
    case "image":
      return generationImages;
    case "video":
      return generationVideos;
    case "comment":
      return comments;
    case "world":
      return ocworlds;
  }
}

/**
 * Increment stat count (atomic operation)
 *
 * @param artType - Resource type: character, image, video, comment
 * @param artUuid - Resource UUID
 * @param statField - Stat field name: like_count, favorite_count, comment_count
 * @param tx - Optional transaction client
 */
export async function incrementStat(
  artType: ArtType,
  artUuid: string,
  statField: StatField,
  tx?: Transaction
) {
  const table = getTableByArtType(artType);
  const countField = (table as any)[statField];

  if (!countField) {
    console.error(`Field ${statField} not found on table for ${artType}`);
    return;
  }

  const client = tx || db();
  const result = await client
    .update(table as any)
    .set({ [statField]: sql`${countField} + 1` } as any)
    .where(eq((table as any).uuid, artUuid))
    .returning({ uuid: (table as any).uuid });
  
  return result;
}

/**
 * Decrement stat count (atomic operation, minimum 0)
 *
 * @param artType - Resource type: character, image, video, comment
 * @param artUuid - Resource UUID
 * @param statField - Stat field name: like_count, favorite_count, comment_count
 * @param tx - Optional transaction client
 */
export async function decrementStat(
  artType: ArtType,
  artUuid: string,
  statField: StatField,
  tx?: Transaction
) {
  const table = getTableByArtType(artType);
  const countField = (table as any)[statField];

  if (!countField) {
    console.error(`Field ${statField} not found on table for ${artType}`);
    return;
  }

  const client = tx || db();
  const result = await client
    .update(table as any)
    .set({ [statField]: sql`GREATEST(0, ${countField} - 1)` } as any)
    .where(eq((table as any).uuid, artUuid))
    .returning({ uuid: (table as any).uuid });
  
  return result;
}

/**
 * Get stats for multiple resources in batch
 *
 * @param artType - Resource type: character, image, video, comment
 * @param artUuids - List of resource UUIDs
 * @returns Map of UUID to stats (like_count, favorite_count, comment_count)
 */
export async function getBatchStats(
  artType: ArtType,
  artUuids: string[]
): Promise<Map<string, { like_count: number; favorite_count: number; comment_count: number }>> {
  if (artUuids.length === 0) {
    return new Map();
  }

  const table = getTableByArtType(artType) as any;

  const results = await db()
    .select({
      uuid: table.uuid,
      like_count: table.like_count,
      favorite_count: table.favorite_count,
      comment_count: table.comment_count,
    })
    .from(table)
    .where(inArray(table.uuid, artUuids));

  return new Map(
    results.map((r) => [
      r.uuid,
      {
        like_count: r.like_count || 0,
        favorite_count: r.favorite_count || 0,
        comment_count: r.comment_count || 0,
      },
    ])
  );
}

/**
 * Get single resource stats
 *
 * @param artType - Resource type: character, image, video, comment
 * @param artUuid - Resource UUID
 * @returns Stats object or null if not found
 */
export async function getSingleStats(
  artType: ArtType,
  artUuid: string
): Promise<{ like_count: number; favorite_count: number; comment_count: number } | null> {
  const table = getTableByArtType(artType) as any;

  const results = await db()
    .select({
      like_count: table.like_count,
      favorite_count: table.favorite_count,
      comment_count: table.comment_count,
    })
    .from(table)
    .where(eq(table.uuid, artUuid))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  return {
    like_count: results[0].like_count || 0,
    favorite_count: results[0].favorite_count || 0,
    comment_count: results[0].comment_count || 0,
  };
}
