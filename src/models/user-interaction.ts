import { db } from "@/db";
import { userInteractions } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { ExtractTablesWithRelations } from "drizzle-orm";
import { PgTransaction } from "drizzle-orm/pg-core";
import { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

export type Transaction = PgTransaction<PostgresJsQueryResultHKT, any, ExtractTablesWithRelations<any>>;

export interface UserInteraction {
  id: number;
  user_uuid: string;
  art_id: string; // uuid
  art_type: string;
  interaction_type: string;
  metadata?: any;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface NewUserInteraction {
  user_uuid: string;
  art_id: string; // uuid
  art_type: string;
  interaction_type: string;
  metadata?: any;
}

// 查询用户对多个资源的交互类型
export async function findUserInteractionsByArtIds(
  user_uuid: string,
  art_ids: string[],
  art_type: string,
  tx?: Transaction
): Promise<UserInteraction[]> {
  if (art_ids.length === 0) return [];
  const client = tx || db();
  const result = await client
    .select()
    .from(userInteractions)
    .where(
      and(
        eq(userInteractions.user_uuid, user_uuid),
        eq(userInteractions.art_type, art_type),
        inArray(userInteractions.art_id, art_ids)
      )
    );

  return result;
}

// 添加或更新用户交互记录
export async function upsertUserInteraction(
  data: NewUserInteraction,
  tx?: Transaction
): Promise<UserInteraction> {
  const client = tx || db();
  const result = await client
    .insert(userInteractions)
    .values({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        userInteractions.user_uuid,
        userInteractions.art_id,
        userInteractions.art_type,
        userInteractions.interaction_type,
      ],
      set: {
        updated_at: new Date(),
        metadata: data.metadata,
      },
    })
    .returning();

  return result[0];
}

// 删除用户交互记录
export async function deleteUserInteraction(
  user_uuid: string,
  art_id: string,
  art_type: string,
  interaction_type: string,
  tx?: Transaction
): Promise<boolean> {
  const client = tx || db();
  await client
    .delete(userInteractions)
    .where(
      and(
        eq(userInteractions.user_uuid, user_uuid),
        eq(userInteractions.art_id, art_id),
        eq(userInteractions.art_type, art_type),
        eq(userInteractions.interaction_type, interaction_type)
      )
    );

  return true;
}

// 查询用户的特定交互
export async function findUserInteraction(
  user_uuid: string,
  art_id: string,
  art_type: string,
  interaction_type: string,
  tx?: Transaction
): Promise<UserInteraction | undefined> {
  const client = tx || db();
  const result = await client
    .select()
    .from(userInteractions)
    .where(
      and(
        eq(userInteractions.user_uuid, user_uuid),
        eq(userInteractions.art_id, art_id),
        eq(userInteractions.art_type, art_type),
        eq(userInteractions.interaction_type, interaction_type)
      )
    )
    .limit(1);

  return result[0];
}

// 查询用户对某个资源的所有交互类型
export async function findUserInteractionsByArt(
  user_uuid: string,
  art_id: string,
  art_type: string,
  tx?: Transaction
): Promise<UserInteraction[]> {
  const client = tx || db();
  const result = await client
    .select()
    .from(userInteractions)
    .where(
      and(
        eq(userInteractions.user_uuid, user_uuid),
        eq(userInteractions.art_id, art_id),
        eq(userInteractions.art_type, art_type)
      )
    );

  return result;
}

// 检查用户是否有特定交互
export async function hasUserInteraction(
  user_uuid: string,
  art_id: string,
  art_type: string,
  interaction_type: string,
  tx?: Transaction
): Promise<boolean> {
  const interaction = await findUserInteraction(user_uuid, art_id, art_type, interaction_type, tx);
  return !!interaction;
}

// (removed uuid variant)
