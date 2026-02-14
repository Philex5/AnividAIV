import { randomUUID } from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { chatUsageLogs } from "@/db/schema";
import type { MembershipLevel } from "./chat-quota";

export type ChatUsageLog = typeof chatUsageLogs.$inferSelect;
export type NewChatUsageLog = typeof chatUsageLogs.$inferInsert;

/**
 * 创建使用日志记录
 */
export async function createChatUsageLog(
  params: {
    userUuid: string;
    sessionId: string;
    membershipLevel: MembershipLevel;
    tokensUsed?: number;
    apUsed?: number;
  }
): Promise<ChatUsageLog> {
  const { userUuid, sessionId, membershipLevel, tokensUsed = 0, apUsed = 1 } = params;

  const [log] = await db()
    .insert(chatUsageLogs)
    .values({
      uuid: randomUUID(),
      user_uuid: userUuid,
      session_id: sessionId,
      membership_level: membershipLevel,
      tokens_used: tokensUsed,
      ap_used: apUsed,
      created_at: new Date(),
    })
    .returning();

  return log;
}

/**
 * 获取用户今日使用量
 */
export async function getTodayUsage(userUuid: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [result] = await db()
    .select({ count: sql<number>`count(*)` })
    .from(chatUsageLogs)
    .where(
      and(
        eq(chatUsageLogs.user_uuid, userUuid),
        gte(chatUsageLogs.created_at, today)
      )
    );

  return result?.count || 0;
}

/**
 * 获取用户在指定时间范围内的使用统计
 */
export async function getUsageStats(
  userUuid: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCount: number;
  totalTokens: number;
  totalAp: number;
}> {
  const stats = await db()
    .select({
      totalCount: sql<number>`count(*)`,
      totalTokens: sql<number>`sum(${chatUsageLogs.tokens_used})`,
      totalAp: sql<number>`sum(${chatUsageLogs.ap_used})`,
    })
    .from(chatUsageLogs)
    .where(
      and(
        eq(chatUsageLogs.user_uuid, userUuid),
        gte(chatUsageLogs.created_at, startDate),
        sql`${chatUsageLogs.created_at} <= ${endDate}`
      )
    );

  return {
    totalCount: stats[0]?.totalCount || 0,
    totalTokens: Number(stats[0]?.totalTokens) || 0,
    totalAp: Number(stats[0]?.totalAp) || 0,
  };
}

/**
 * 获取会员等级使用分布统计（用于数据分析）
 */
export async function getMembershipUsageStats(
  startDate: Date,
  endDate: Date
): Promise<Array<{
  membership_level: string;
  totalCount: number;
  totalUsers: number;
}>> {
  const stats = await db()
    .select({
      membership_level: chatUsageLogs.membership_level,
      totalCount: sql<number>`count(*)`,
      totalUsers: sql<number>`count(distinct ${chatUsageLogs.user_uuid})`,
    })
    .from(chatUsageLogs)
    .where(
      and(
        gte(chatUsageLogs.created_at, startDate),
        sql`${chatUsageLogs.created_at} <= ${endDate}`
      )
    )
    .groupBy(chatUsageLogs.membership_level);

  return stats;
}
