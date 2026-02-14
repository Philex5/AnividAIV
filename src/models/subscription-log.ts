import { subscriptionLogs } from "@/db/schema";
import { db } from "@/db";
import { eq, and, desc, gt, lt, sql } from "drizzle-orm";

export interface CreateSubscriptionLogParams {
  subscription_id: string;
  user_uuid: string;
  from_status?: string | null;
  to_status: string;
  reason?: string | null;
  metadata?: Record<string, any>;
  created_by?: string | null;
}

/**
 * 创建订阅状态变更日志
 */
export async function createSubscriptionLog(
  data: CreateSubscriptionLogParams
): Promise<typeof subscriptionLogs.$inferSelect> {
  const [log] = await db()
    .insert(subscriptionLogs)
    .values({
      subscription_id: data.subscription_id,
      user_uuid: data.user_uuid,
      from_status: data.from_status || null,
      to_status: data.to_status,
      reason: data.reason || null,
      metadata: data.metadata || {},
      created_by: data.created_by || "system",
    })
    .returning();

  return log;
}

/**
 * 根据订阅ID获取日志列表（分页）
 */
export async function getSubscriptionLogs(
  subscription_id: string,
  limit: number = 50,
  offset: number = 0
): Promise<typeof subscriptionLogs.$inferSelect[]> {
  const logs = await db()
    .select()
    .from(subscriptionLogs)
    .where(eq(subscriptionLogs.subscription_id, subscription_id))
    .orderBy(desc(subscriptionLogs.created_at))
    .limit(limit)
    .offset(offset);

  return logs;
}

/**
 * 获取用户的所有订阅日志
 */
export async function getUserSubscriptionLogs(
  user_uuid: string,
  limit: number = 50,
  offset: number = 0
): Promise<typeof subscriptionLogs.$inferSelect[]> {
  const logs = await db()
    .select()
    .from(subscriptionLogs)
    .where(eq(subscriptionLogs.user_uuid, user_uuid))
    .orderBy(desc(subscriptionLogs.created_at))
    .limit(limit)
    .offset(offset);

  return logs;
}

/**
 * 获取指定时间范围内的日志
 */
export async function getSubscriptionLogsByDateRange(
  subscription_id: string,
  startDate: Date,
  endDate: Date,
  limit: number = 100,
  offset: number = 0
): Promise<typeof subscriptionLogs.$inferSelect[]> {
  const logs = await db()
    .select()
    .from(subscriptionLogs)
    .where(
      and(
        eq(subscriptionLogs.subscription_id, subscription_id),
        gt(subscriptionLogs.created_at, startDate),
        lt(subscriptionLogs.created_at, endDate)
      )
    )
    .orderBy(desc(subscriptionLogs.created_at))
    .limit(limit)
    .offset(offset);

  return logs;
}

/**
 * 获取订阅的最新日志
 */
export async function getLatestSubscriptionLog(
  subscription_id: string
): Promise<typeof subscriptionLogs.$inferSelect | undefined> {
  const [log] = await db()
    .select()
    .from(subscriptionLogs)
    .where(eq(subscriptionLogs.subscription_id, subscription_id))
    .orderBy(desc(subscriptionLogs.created_at))
    .limit(1);

  return log;
}

/**
 * 获取特定状态的日志记录
 */
export async function getSubscriptionLogsByStatus(
  subscription_id: string,
  status: string,
  limit: number = 20
): Promise<typeof subscriptionLogs.$inferSelect[]> {
  const logs = await db()
    .select()
    .from(subscriptionLogs)
    .where(
      and(
        eq(subscriptionLogs.subscription_id, subscription_id),
        eq(subscriptionLogs.to_status, status)
      )
    )
    .orderBy(desc(subscriptionLogs.created_at))
    .limit(limit);

  return logs;
}

/**
 * 统计订阅状态变更次数
 */
export async function getSubscriptionLogStats(
  subscription_id: string
): Promise<{
  total_logs: number;
  status_changes: Record<string, number>;
  last_change_at: Date | null;
}> {
  const result = await db()
    .select({
      count: sql<number>`count(*)`,
      to_status: subscriptionLogs.to_status,
      last_created_at: sql<Date>`max(${subscriptionLogs.created_at})`,
    })
    .from(subscriptionLogs)
    .where(eq(subscriptionLogs.subscription_id, subscription_id))
    .groupBy(subscriptionLogs.to_status);

  const total_logs = result.reduce((sum, row) => sum + row.count, 0);
  const status_changes: Record<string, number> = {};
  let last_change_at: Date | null = null;

  result.forEach((row) => {
    status_changes[row.to_status] = row.count;
    if (!last_change_at || row.last_created_at > last_change_at) {
      last_change_at = row.last_created_at;
    }
  });

  return {
    total_logs,
    status_changes,
    last_change_at,
  };
}

/**
 * 批量创建日志记录（用于导入或批量操作）
 */
export async function batchCreateSubscriptionLogs(
  logs: CreateSubscriptionLogParams[]
): Promise<typeof subscriptionLogs.$inferSelect[]> {
  if (logs.length === 0) return [];

  const values = logs.map((log) => ({
    subscription_id: log.subscription_id,
    user_uuid: log.user_uuid,
    from_status: log.from_status || null,
    to_status: log.to_status,
    reason: log.reason || null,
    metadata: log.metadata || {},
    created_by: log.created_by || "system",
  }));

  const result = await db()
    .insert(subscriptionLogs)
    .values(values)
    .returning();

  return result;
}
