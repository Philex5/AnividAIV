import { subscriptions } from "@/db/schema";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";

export enum SubscriptionStatus {
  ACTIVE = "active",
  PENDING_CANCEL = "pending_cancel",
  CANCELED = "canceled",
  EXPIRED = "expired",
}

export interface CreateSubscriptionParams {
  user_uuid: string;
  subscription_id: string;
  plan_type: string;
  interval: string;
  current_period_start?: Date;
  current_period_end?: Date;
  status?: string;
  sub_times?: number; // 订阅续费次数，默认为1（首次订阅）
  total_credits?: number; // 订单中的总积分数量（用于年度订阅）
}

export async function createSubscription(
  data: CreateSubscriptionParams
): Promise<typeof subscriptions.$inferSelect> {
  // 幂等性检查：先检查订阅是否已存在
  const existingSub = await findSubscriptionByStripeId(data.subscription_id);
  if (existingSub) {
    console.log(`[Subscription] Subscription ${data.subscription_id} already exists, skipping creation`);
    return existingSub;
  }

  // 根据计划类型和订阅周期获取积分数量
  const credits = getCreditsByPlanAndInterval(data.plan_type, data.interval, data.total_credits);

  const [subscription] = await db()
    .insert(subscriptions)
    .values({
      user_uuid: data.user_uuid,
      subscription_id: data.subscription_id,
      plan_type: data.plan_type,
      interval: data.interval,
      status: data.status || SubscriptionStatus.ACTIVE,
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end,
      credits: credits,
      sub_times: data.sub_times || 1, // 默认为1（首次订阅）
    })
    .returning();

  return subscription;
}

/**
 * 根据计划类型和订阅周期获取积分数量
 * @param plan_type 计划类型 (basic/plus/pro)
 * @param interval 订阅周期 (month/year)
 * @param total_credits 订单中的总积分（优先使用）
 * @returns 积分数量
 */
function getCreditsByPlanAndInterval(
  plan_type: string,
  interval: string,
  total_credits?: number
): number {
  // 如果传入了总积分，直接使用
  if (total_credits && total_credits > 0) {
    return total_credits;
  }

  // 否则根据计划类型和周期计算
  const monthlyCredits = getMonthlyCreditsByPlan(plan_type);

  if (interval === 'year') {
    return monthlyCredits * 12;
  }

  return monthlyCredits;
}

/**
 * 根据计划类型获取月度积分数量
 */
function getMonthlyCreditsByPlan(plan_type: string): number {
  switch (plan_type) {
    case 'basic':
      return 2000;
    case 'plus':
      return 6000;
    case 'pro':
      return 12500;
    default:
      return 0;
  }
}

export async function updateSubscriptionByStripeId(
  subscription_id: string,
  data: Partial<typeof subscriptions.$inferInsert>
): Promise<typeof subscriptions.$inferSelect | undefined> {
  const [subscription] = await db()
    .update(subscriptions)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(subscriptions.subscription_id, subscription_id))
    .returning();

  return subscription;
}

export async function findSubscriptionByStripeId(
  subscription_id: string
): Promise<typeof subscriptions.$inferSelect | undefined> {
  const [subscription] = await db()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.subscription_id, subscription_id))
    .limit(1);

  return subscription;
}

export async function getActiveSubscriptionByUserUuid(
  user_uuid: string
): Promise<typeof subscriptions.$inferSelect | undefined> {
  const [subscription] = await db()
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.user_uuid, user_uuid),
        eq(subscriptions.status, SubscriptionStatus.ACTIVE)
      )
    )
    .orderBy(subscriptions.created_at)
    .limit(1);

  return subscription;
}

export async function getSubscriptionByUserUuid(
  user_uuid: string
): Promise<typeof subscriptions.$inferSelect | undefined> {
  const [subscription] = await db()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_uuid, user_uuid))
    .orderBy(subscriptions.created_at)
    .limit(1);

  return subscription;
}

export async function getAllSubscriptionsByUserUuid(
  user_uuid: string
): Promise<typeof subscriptions.$inferSelect[]> {
  const result = await db()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_uuid, user_uuid))
    .orderBy(subscriptions.created_at);

  return result;
}

export async function cancelSubscription(
  subscription_id: string,
  cancel_type: "immediate" | "period_end",
  canceled_at?: Date
): Promise<typeof subscriptions.$inferSelect | undefined> {
  const status =
    cancel_type === "immediate"
      ? SubscriptionStatus.CANCELED
      : SubscriptionStatus.PENDING_CANCEL;

  const [subscription] = await db()
    .update(subscriptions)
    .set({
      status,
      canceled_at: canceled_at || new Date(),
      updated_at: new Date(),
    })
    .where(eq(subscriptions.subscription_id, subscription_id))
    .returning();

  return subscription;
}

/**
 * 更新订阅的续费次数和周期时间
 * 用于在续费成功后同步更新 subscriptions 表的 sub_times、current_period_start、current_period_end 和 updated_at 字段
 */
export async function updateSubscriptionSubTimes(
  subscription_id: string,
  sub_times: number,
  current_period_start?: Date,
  current_period_end?: Date
): Promise<typeof subscriptions.$inferSelect | undefined> {
  const [subscription] = await db()
    .update(subscriptions)
    .set({
      sub_times,
      ...(current_period_start && { current_period_start }),
      ...(current_period_end && { current_period_end }),
      updated_at: new Date(),
    })
    .where(eq(subscriptions.subscription_id, subscription_id))
    .returning();

  return subscription;
}
