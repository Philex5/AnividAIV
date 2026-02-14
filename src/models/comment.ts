import { comments, users } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, and, sql, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { ExtractTablesWithRelations } from "drizzle-orm";
import { PgTransaction } from "drizzle-orm/pg-core";
import { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

export type NewComment = typeof comments.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type Transaction = PgTransaction<PostgresJsQueryResultHKT, any, ExtractTablesWithRelations<any>>;

export async function insertComment(
  data: Omit<NewComment, "uuid">,
  tx?: Transaction
): Promise<Comment> {
  const uuid = uuidv4();
  const client = tx || db();
  const [comment] = await client
    .insert(comments)
    .values({ ...data, uuid })
    .returning();

  return comment;
}

export async function findCommentByUuid(
  uuid: string,
  tx?: Transaction
): Promise<Comment | undefined> {
  const client = tx || db();
  const [comment] = await client
    .select()
    .from(comments)
    .where(eq(comments.uuid, uuid))
    .limit(1);

  return comment;
}

export async function softDeleteComment(
  uuid: string,
  user_uuid: string,
  tx?: Transaction
): Promise<boolean> {
  const client = tx || db();
  const [updated] = await client
    .update(comments)
    .set({ is_deleted: true, updated_at: new Date() })
    .where(and(eq(comments.uuid, uuid), eq(comments.user_uuid, user_uuid)))
    .returning();

  return !!updated;
}

export interface CommentWithUser extends Comment {
  user: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export async function getCommentsByArt(
  art_id: string,
  art_type: string,
  page: number = 1,
  limit: number = 20,
  tx?: Transaction
): Promise<CommentWithUser[]> {
  const offset = (page - 1) * limit;
  const client = tx || db();

  const results = await client
    .select({
      comment: comments,
      user: {
        display_name: users.display_name,
        avatar_url: users.avatar_url,
      },
    })
    .from(comments)
    .leftJoin(users, eq(comments.user_uuid, users.uuid))
    .where(
      and(
        eq(comments.art_id, art_id),
        eq(comments.art_type, art_type),
        isNull(comments.parent_uuid), // Only top-level comments for the main list
        eq(comments.is_deleted, false)
      )
    )
    .orderBy(desc(comments.created_at))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    ...r.comment,
    user: r.user,
  }));
}

export async function getRepliesByParent(
  parent_uuid: string,
  page: number = 1,
  limit: number = 50,
  tx?: Transaction
): Promise<CommentWithUser[]> {
  const offset = (page - 1) * limit;
  const client = tx || db();
  const results = await client
    .select({
      comment: comments,
      user: {
        display_name: users.display_name,
        avatar_url: users.avatar_url,
      },
    })
    .from(comments)
    .leftJoin(users, eq(comments.user_uuid, users.uuid))
    .where(
      and(
        eq(comments.parent_uuid, parent_uuid),
        eq(comments.is_deleted, false)
      )
    )
    .orderBy(desc(comments.created_at))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({
    ...r.comment,
    user: r.user,
  }));
}

export async function getCommentCount(
  art_id: string,
  art_type: string,
  tx?: Transaction
): Promise<number> {
  const client = tx || db();
  const [result] = await client
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(
      and(
        eq(comments.art_id, art_id),
        eq(comments.art_type, art_type),
        eq(comments.is_deleted, false)
      )
    );

  return Number(result?.count || 0);
}
