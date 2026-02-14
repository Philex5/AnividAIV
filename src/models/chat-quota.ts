import { randomUUID } from "crypto";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { chatQuotas, users } from "@/db/schema";

// 会员等级聊天配额配置
export const MEMBERSHIP_CHAT_QUOTA = {
  free: 100,
  basic: 500,
  plus: 3000,
  pro: -1, // Pro会员享受无限畅聊
} as const;

export type MembershipLevel = keyof typeof MEMBERSHIP_CHAT_QUOTA;

export type ChatQuota = typeof chatQuotas.$inferSelect;
export type NewChatQuota = typeof chatQuotas.$inferInsert;

/**
 * 检查是否是无限配额
 * Pro会员享受无限畅聊
 */
export function isUnlimitedQuota(quota: ChatQuota | string | number): boolean {
  // 如果是字符串（membership_level），直接检查是否为 'pro'
  if (typeof quota === 'string') {
    return quota === 'pro';
  }

  // 如果是 ChatQuota 对象，检查 membership_level
  if (quota && typeof quota === 'object' && 'membership_level' in quota) {
    return quota.membership_level === 'pro';
  }

  // 兼容旧代码：如果 monthly_quota 为 -1，也认为是无限
  if (typeof quota === 'number') {
    return quota === -1;
  }

  return false;
}

/**
 * 获取下个月第一天零点的时间戳（UTC时间）
 * 确保全球统一：任何时区都使用相同的UTC时间进行比较
 */
export function getNextMonthFirstDay(): Date {
  const now = new Date();

  // 获取当前 UTC 时间
  const currentUTCYear = now.getUTCFullYear();
  const currentUTCMonth = now.getUTCMonth();

  // 创建下个月第一天 UTC 零点
  const nextMonth = new Date(Date.UTC(
    currentUTCYear,
    currentUTCMonth + 1,
    1,
    0,
    0,
    0,
    0
  ));

  return nextMonth;
}

/**
 * 获取当前月份第一天零点的时间戳
 */
export function getCurrentMonthFirstDay(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
}

/**
 * 将用户映射为会员等级
 */
export function mapUserToMembershipLevel(user: typeof users.$inferSelect): MembershipLevel {
  // 检查会员是否过期
  if (user.sub_expired_at && new Date(user.sub_expired_at) < new Date()) {
    return "free";
  }

  // 根据sub_plan_type判断会员等级
  const planType = (user.sub_plan_type as MembershipLevel) || "free";

  // 如果是付费会员（is_sub为true），返回对应的等级
  if (user.is_sub) {
    return planType;
  }

  // 免费用户
  return "free";
}

/**
 * 查找用户的配额记录
 */
export async function findChatQuotaByUserUuid(
  userUuid: string
): Promise<ChatQuota | undefined> {
  try {
    const [quota] = await db()
      .select()
      .from(chatQuotas)
      .where(eq(chatQuotas.user_uuid, userUuid))
      .limit(1);
    return quota;
  } catch (error: any) {
    // If table doesn't exist, return undefined and let service handle it
    if (error.message.includes('relation "chat_quotas" does not exist')) {
      console.log("[ChatQuotaModel] Table doesn't exist");
      return undefined;
    }
    throw error;
  }
}

/**
 * 创建配额记录
 */
export async function createChatQuota(
  params: {
    userUuid: string;
    membershipLevel: MembershipLevel;
    monthlyQuota: number;
    quotaResetAt: Date | null;
  }
): Promise<ChatQuota> {
  const { userUuid, membershipLevel, monthlyQuota, quotaResetAt } = params;

  const [quota] = await db()
    .insert(chatQuotas)
    .values({
      user_uuid: userUuid,
      membership_level: membershipLevel,
      monthly_quota: monthlyQuota,
      quota_reset_at: quotaResetAt,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return quota;
}

/**
 * 更新月度已使用量（原子性操作）
 */
export async function incrementMonthlyUsed(
  userUuid: string
): Promise<ChatQuota> {
  const [updated] = await db()
    .update(chatQuotas)
    .set({
      monthly_used: sql`${chatQuotas.monthly_used} + 1`,
      total_used: sql`${chatQuotas.total_used} + 1`,
      updated_at: new Date(),
    })
    .where(eq(chatQuotas.user_uuid, userUuid))
    .returning();

  return updated;
}

/**
 * 重置月度配额
 */
export async function resetMonthlyQuota(
  userUuid: string,
  membershipLevel: MembershipLevel
): Promise<ChatQuota> {
  const [updated] = await db()
    .update(chatQuotas)
    .set({
      monthly_used: 0,
      monthly_quota: MEMBERSHIP_CHAT_QUOTA[membershipLevel],
      quota_reset_at: getNextMonthFirstDay(),
      updated_at: new Date(),
    })
    .where(eq(chatQuotas.user_uuid, userUuid))
    .returning();

  return updated;
}

/**
 * 更新配额（用于会员升级）
 */
export async function updateChatQuota(
  userUuid: string,
  params: {
    membershipLevel: MembershipLevel;
    monthlyQuota: number;
    quotaResetAt: Date | null;
    monthlyUsed?: number;
  }
): Promise<ChatQuota> {
  const { membershipLevel, monthlyQuota, quotaResetAt, monthlyUsed } = params;

  const [updated] = await db()
    .update(chatQuotas)
    .set({
      membership_level: membershipLevel,
      monthly_quota: monthlyQuota,
      quota_reset_at: quotaResetAt,
      monthly_used: monthlyUsed !== undefined ? monthlyUsed : sql`${chatQuotas.monthly_used}`,
      updated_at: new Date(),
    })
    .where(eq(chatQuotas.user_uuid, userUuid))
    .returning();

  return updated;
}

/**
 * 查找所有过期的配额（用于定时任务）
 */
export async function findExpiredQuotas(): Promise<ChatQuota[]> {
  const now = new Date();
  const expiredQuotas = await db()
    .select()
    .from(chatQuotas)
    .where(lt(chatQuotas.quota_reset_at, now));

  return expiredQuotas;
}
