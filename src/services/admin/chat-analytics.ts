import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  characterChats,
  characters,
  chatSessions,
  generationImages,
  users,
} from "@/db/schema";
import { toImageUrl } from "@/lib/r2-utils";

export type ChatGranularity = "day" | "month";

export interface ChatOverview {
  totals: {
    sessions: number;
    users: number;
  };
  trends: Array<{
    bucket: string;
    sessions: number;
    users: number;
  }>;
}

export interface TopOcItem {
  characterId: string;
  characterName: string;
  avatarUrl: string;
  userCount: number;
  sessionCount: number;
}

export interface AdminChatSessionListItem {
  sessionId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  character: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  messageCount: number;
  createdAt: Date | null;
}

export interface AdminChatSessionListResult {
  items: AdminChatSessionListItem[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface AdminChatMessageItem {
  id: string;
  messageIndex: number;
  role: string;
  content: string;
  createdAt: Date | null;
}

export interface AdminChatSessionDetail {
  session: {
    sessionId: string;
    userId: string;
    userName: string;
    userAvatarUrl: string;
    characterId: string;
    characterName: string;
    characterAvatarUrl: string;
    messageCount: number;
    createdAt: Date | null;
  };
  messages: AdminChatMessageItem[];
}

interface TimeRangeInput {
  start?: Date;
  end?: Date;
}

interface ListSessionsInput extends TimeRangeInput {
  page?: number;
  limit?: number;
  characterId?: string;
  userId?: string;
  sort?: "created_at_desc" | "created_at_asc";
}

function buildSessionWhere(input: TimeRangeInput & { characterId?: string; userId?: string }) {
  const conditions: any[] = [];

  if (input.start) {
    conditions.push(gte(chatSessions.created_at, input.start));
  }

  if (input.end) {
    conditions.push(lte(chatSessions.created_at, input.end));
  }

  if (input.characterId) {
    conditions.push(eq(chatSessions.character_uuid, input.characterId));
  }

  if (input.userId) {
    conditions.push(eq(chatSessions.user_uuid, input.userId));
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return and(...conditions);
}

export async function getAdminChatOverview(params: {
  granularity: ChatGranularity;
  start?: Date;
  end?: Date;
}): Promise<ChatOverview> {
  const { granularity, start, end } = params;
  const where = buildSessionWhere({ start, end });

  const bucketExpr =
    granularity === "month"
      ? sql<string>`to_char(${chatSessions.created_at}, 'YYYY-MM')`
      : sql<string>`to_char(${chatSessions.created_at}, 'YYYY-MM-DD')`;

  const trendRows = where
    ? await db()
        .select({
          bucket: bucketExpr,
          sessions: sql<number>`count(*)::int`,
          users: sql<number>`count(distinct ${chatSessions.user_uuid})::int`,
        })
        .from(chatSessions)
        .where(where)
        .groupBy(bucketExpr)
    : await db()
        .select({
          bucket: bucketExpr,
          sessions: sql<number>`count(*)::int`,
          users: sql<number>`count(distinct ${chatSessions.user_uuid})::int`,
        })
        .from(chatSessions)
        .groupBy(bucketExpr);

  const totalRows = where
    ? await db()
        .select({
          sessions: sql<number>`count(*)::int`,
          users: sql<number>`count(distinct ${chatSessions.user_uuid})::int`,
        })
        .from(chatSessions)
        .where(where)
    : await db()
        .select({
          sessions: sql<number>`count(*)::int`,
          users: sql<number>`count(distinct ${chatSessions.user_uuid})::int`,
        })
        .from(chatSessions);

  const totals = totalRows[0] || { sessions: 0, users: 0 };

  return {
    totals: {
      sessions: Number(totals.sessions || 0),
      users: Number(totals.users || 0),
    },
    trends: trendRows
      .map((item) => ({
        bucket: item.bucket,
        sessions: Number(item.sessions || 0),
        users: Number(item.users || 0),
      }))
      .sort((a, b) => (a.bucket > b.bucket ? 1 : -1)),
  };
}

export async function getAdminTopOcs(params: {
  start?: Date;
  end?: Date;
  limit?: number;
}): Promise<TopOcItem[]> {
  const { start, end, limit = 3 } = params;
  const where = buildSessionWhere({ start, end });

  const avatarExpr = sql<string | null>`coalesce(${generationImages.thumbnail_desktop}, ${generationImages.thumbnail_detail}, ${generationImages.image_url})`;

  const rows = where
    ? await db()
        .select({
          characterId: characters.uuid,
          characterName: characters.name,
          avatarSource: avatarExpr,
          userCount: sql<number>`count(distinct ${chatSessions.user_uuid})::int`,
          sessionCount: sql<number>`count(*)::int`,
        })
        .from(chatSessions)
        .innerJoin(characters, eq(characters.uuid, chatSessions.character_uuid))
        .leftJoin(
          generationImages,
          eq(generationImages.uuid, characters.avatar_generation_image_uuid)
        )
        .where(where)
        .groupBy(
          characters.uuid,
          characters.name,
          generationImages.thumbnail_desktop,
          generationImages.thumbnail_detail,
          generationImages.image_url
        )
        .orderBy(desc(sql`count(*)`))
        .limit(limit)
    : await db()
        .select({
          characterId: characters.uuid,
          characterName: characters.name,
          avatarSource: avatarExpr,
          userCount: sql<number>`count(distinct ${chatSessions.user_uuid})::int`,
          sessionCount: sql<number>`count(*)::int`,
        })
        .from(chatSessions)
        .innerJoin(characters, eq(characters.uuid, chatSessions.character_uuid))
        .leftJoin(
          generationImages,
          eq(generationImages.uuid, characters.avatar_generation_image_uuid)
        )
        .groupBy(
          characters.uuid,
          characters.name,
          generationImages.thumbnail_desktop,
          generationImages.thumbnail_detail,
          generationImages.image_url
        )
        .orderBy(desc(sql`count(*)`))
        .limit(limit);

  return rows.map((item) => ({
    characterId: item.characterId,
    characterName: item.characterName || "Unknown Character",
    avatarUrl: toImageUrl(item.avatarSource || ""),
    userCount: Number(item.userCount || 0),
    sessionCount: Number(item.sessionCount || 0),
  }));
}

export async function listAdminChatSessions(
  input: ListSessionsInput
): Promise<AdminChatSessionListResult> {
  const page = input.page && input.page > 0 ? input.page : 1;
  const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 100) : 50;
  const offset = (page - 1) * limit;
  const sort = input.sort || "created_at_desc";

  const where = buildSessionWhere({
    start: input.start,
    end: input.end,
    characterId: input.characterId,
    userId: input.userId,
  });

  const avatarExpr = sql<string | null>`coalesce(${generationImages.thumbnail_desktop}, ${generationImages.thumbnail_detail}, ${generationImages.image_url})`;
  const userIdExpr = sql<string>`coalesce(${users.uuid}, ${chatSessions.user_uuid})`;
  const userNameExpr = sql<string>`coalesce(${users.display_name}, ${users.nickname}, ${users.email}, 'Unknown User')`;

  const sessionRows = where
    ? await db()
        .select({
          sessionId: chatSessions.session_id,
          messageCount: chatSessions.message_count,
          createdAt: chatSessions.created_at,
          userId: userIdExpr,
          userName: userNameExpr,
          userAvatarUrl: users.avatar_url,
          characterId: characters.uuid,
          characterName: characters.name,
          characterAvatarSource: avatarExpr,
        })
        .from(chatSessions)
        .leftJoin(users, eq(users.uuid, chatSessions.user_uuid))
        .innerJoin(characters, eq(characters.uuid, chatSessions.character_uuid))
        .leftJoin(
          generationImages,
          eq(generationImages.uuid, characters.avatar_generation_image_uuid)
        )
        .where(where)
        .orderBy(
          sort === "created_at_asc"
            ? asc(chatSessions.created_at)
            : desc(chatSessions.created_at)
        )
        .limit(limit)
        .offset(offset)
    : await db()
        .select({
          sessionId: chatSessions.session_id,
          messageCount: chatSessions.message_count,
          createdAt: chatSessions.created_at,
          userId: userIdExpr,
          userName: userNameExpr,
          userAvatarUrl: users.avatar_url,
          characterId: characters.uuid,
          characterName: characters.name,
          characterAvatarSource: avatarExpr,
        })
        .from(chatSessions)
        .leftJoin(users, eq(users.uuid, chatSessions.user_uuid))
        .innerJoin(characters, eq(characters.uuid, chatSessions.character_uuid))
        .leftJoin(
          generationImages,
          eq(generationImages.uuid, characters.avatar_generation_image_uuid)
        )
        .orderBy(
          sort === "created_at_asc"
            ? asc(chatSessions.created_at)
            : desc(chatSessions.created_at)
        )
        .limit(limit)
        .offset(offset);

  const totalRows = where
    ? await db()
        .select({ total: sql<number>`count(*)::int` })
        .from(chatSessions)
        .where(where)
    : await db()
        .select({ total: sql<number>`count(*)::int` })
        .from(chatSessions);

  const total = Number(totalRows[0]?.total || 0);

  return {
    items: sessionRows.map((item) => ({
      sessionId: item.sessionId,
      user: {
        id: item.userId,
        name: item.userName || "Unknown User",
        avatarUrl: item.userAvatarUrl || "",
      },
      character: {
        id: item.characterId,
        name: item.characterName || "Unknown Character",
        avatarUrl: toImageUrl(item.characterAvatarSource || ""),
      },
      messageCount: Number(item.messageCount || 0),
      createdAt: item.createdAt,
    })),
    total,
    page,
    limit,
    has_more: page * limit < total,
  };
}

export async function getAdminChatSessionDetail(
  sessionId: string
): Promise<AdminChatSessionDetail | null> {
  const avatarExpr = sql<string | null>`coalesce(${generationImages.thumbnail_desktop}, ${generationImages.thumbnail_detail}, ${generationImages.image_url})`;
  const userIdExpr = sql<string>`coalesce(${users.uuid}, ${chatSessions.user_uuid})`;
  const userNameExpr = sql<string>`coalesce(${users.display_name}, ${users.nickname}, ${users.email}, 'Unknown User')`;

  const sessionRows = await db()
    .select({
      sessionId: chatSessions.session_id,
      messageCount: chatSessions.message_count,
      createdAt: chatSessions.created_at,
      userId: userIdExpr,
      userName: userNameExpr,
      userAvatarUrl: users.avatar_url,
      characterId: characters.uuid,
      characterName: characters.name,
      characterAvatarSource: avatarExpr,
    })
    .from(chatSessions)
    .leftJoin(users, eq(users.uuid, chatSessions.user_uuid))
    .innerJoin(characters, eq(characters.uuid, chatSessions.character_uuid))
    .leftJoin(
      generationImages,
      eq(generationImages.uuid, characters.avatar_generation_image_uuid)
    )
    .where(eq(chatSessions.session_id, sessionId))
    .limit(1);

  const session = sessionRows[0];
  if (!session) {
    return null;
  }

  const messages = await db()
    .select({
      id: characterChats.uuid,
      idFallback: characterChats.id,
      messageIndex: characterChats.message_index,
      role: characterChats.role,
      content: characterChats.content,
      contentFallback: characterChats.message_content,
      createdAt: characterChats.created_at,
    })
    .from(characterChats)
    .where(eq(characterChats.session_id, sessionId))
    .orderBy(asc(characterChats.message_index), asc(characterChats.created_at));

  return {
    session: {
      sessionId: session.sessionId,
      userId: session.userId,
      userName: session.userName || "Unknown User",
      userAvatarUrl: session.userAvatarUrl || "",
      characterId: session.characterId,
      characterName: session.characterName || "Unknown Character",
      characterAvatarUrl: toImageUrl(session.characterAvatarSource || ""),
      messageCount: Number(session.messageCount || 0),
      createdAt: session.createdAt,
    },
    messages: messages.map((item) => ({
      id: item.id || String(item.idFallback),
      messageIndex: Number(item.messageIndex || 0),
      role: item.role || "assistant",
      content: item.content || item.contentFallback || "",
      createdAt: item.createdAt,
    })),
  };
}
