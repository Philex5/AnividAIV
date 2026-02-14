import { MembershipConfig, MembershipLevel, BillingCycle } from "@/types/membership";
import { findUserByUuid } from "@/models/user";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import membershipConfigJson from "@/configs/membership/membership-config.json";
import { getSubscriptionByUserUuid } from "@/models/subscription";

export class MembershipUserNotFoundError extends Error {
  constructor(message: string = "User not found") {
    super(message);
    this.name = "MembershipUserNotFoundError";
  }
}

/**
 * 获取用户当前会员等级
 */
export async function getMembershipLevel(
  user_uuid: string
): Promise<MembershipLevel> {
  const user = await findUserByUuid(user_uuid);
  if (!user) {
    throw new MembershipUserNotFoundError("User not found");
  }

  // 检查是否过期
  if (user.sub_expired_at && new Date(user.sub_expired_at) < new Date()) {
    console.log("Membership expired, downgrading to free");
    // 已过期，降为free
    if (user.sub_plan_type !== "free") {
      await updateUserMembership(user_uuid, {
        sub_plan_type: "free",
        is_sub: false,
      });
    }
    return "free";
  }

  const level = (user.sub_plan_type as MembershipLevel) || "free";
  return level;
}

/**
 * 获取会员等级配置
 */
export function getMembershipConfig(level: MembershipLevel): MembershipConfig {
  const config =
    membershipConfigJson[level as keyof typeof membershipConfigJson];
  if (!config) {
    throw new Error(`Invalid membership level: ${level}`);
  }
  return config as MembershipConfig;
}

/**
 * 获取用户计费周期（月度或年度）
 */
export async function getUserBillingCycle(
  user_uuid: string
): Promise<BillingCycle> {
  const user = await findUserByUuid(user_uuid);
  if (!user) {
    return "monthly";
  }

  // 检查是否过期
  if (user.sub_expired_at && new Date(user.sub_expired_at) < new Date()) {
    return "monthly";
  }

  // 从订阅表获取计费周期
  const subscription = await getSubscriptionByUserUuid(user_uuid);
  if (subscription?.interval) {
    return subscription.interval === "year" ? "yearly" : "monthly";
  }

  return "monthly";
}

/**
 * 根据计费周期获取对应积分
 */
export async function getUserCreditsByCycle(
  user_uuid: string,
  billing_cycle?: BillingCycle
): Promise<number> {
  const level = await getMembershipLevel(user_uuid);
  const config = getMembershipConfig(level);

  // 如果没有指定计费周期，自动获取
  const cycle = billing_cycle || (await getUserBillingCycle(user_uuid));

  return cycle === "yearly" ? config.yearly_credits : config.monthly_credits;
}

/**
 * 根据订单更新用户会员等级
 * 2025-11-19 修复：支付成功后同步更新聊天配额 (FEAT-CHAT-QUOTA-OPT)
 */
export async function updateMembershipFromOrder(order: {
  product_id: string;
  user_uuid: string;
  sub_period_end?: Date | string | null;
  valid_months?: number | null;
}): Promise<void> {
  // 从产品ID推断会员等级
  const level = inferMembershipLevelFromProduct(order.product_id);

  if (level === "free") {
    // MC补充包不改变会员等级
    return;
  }

  // 计算到期时间
  const expiredAt = calculateExpiredAt(order);

  await updateUserMembership(order.user_uuid, {
    sub_plan_type: level,
    is_sub: true,
    sub_expired_at: expiredAt,
  });

  // 2025-11-19 新增：同步更新聊天配额
  // 修复支付成功后用户聊天配额未同步更新的问题
  try {
    const { ChatQuotaService } = await import("@/services/chat/chat-quota-service");
    await ChatQuotaService.updateQuotaForMembership(order.user_uuid, level);
    console.log(`[Membership] Chat quota updated for user ${order.user_uuid} after payment`);
  } catch (error) {
    console.error(
      `[Membership] Failed to update chat quota for user ${order.user_uuid}:`,
      error
    );
    // 注意：这里不抛出错误，因为会员信息已经更新成功
    // 聊天配额可以在下次用户操作时自动创建或修复
  }
}

/**
 * 从产品ID推断会员等级
 */
function inferMembershipLevelFromProduct(product_id: string): MembershipLevel {
  const lowerCaseId = product_id.toLowerCase();

  if (lowerCaseId.includes("basic")) return "basic";
  if (lowerCaseId.includes("plus")) return "plus";
  if (lowerCaseId.includes("pro")) return "pro";

  // MC补充包或其他一次性产品
  return "free";
}

/**
 * 计算会员到期时间
 */
function calculateExpiredAt(order: {
  sub_period_end?: Date | string | null;
  valid_months?: number | null;
}): Date {
  const now = new Date();

  // 订阅订单：使用sub_period_end
  if (order.sub_period_end) {
    return new Date(order.sub_period_end);
  }

  // 一次性订单：根据valid_months计算
  if (order.valid_months && order.valid_months > 0) {
    const months = order.valid_months;
    return new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
  }

  // 默认1个月
  return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * 更新用户会员信息（内部辅助函数）
 */
async function updateUserMembership(
  user_uuid: string,
  data: {
    sub_plan_type?: string;
    is_sub?: boolean;
    sub_expired_at?: Date;
  }
): Promise<void> {
  await db()
    .update(users)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(users.uuid, user_uuid));
}

/**
 * 获取用户的OC限制数量
 */
export async function getUserOcLimit(user_uuid: string): Promise<number> {
  const level = await getMembershipLevel(user_uuid);
  const config = getMembershipConfig(level);
  const limitFeature = config.features.find((feature) =>
    feature.startsWith("oc_limit_")
  );

  if (!limitFeature) {
    return 10;
  }

  if (limitFeature === "oc_limit_unlimited") {
    return Infinity;
  }

  const match = limitFeature.match(/oc_limit_(\d+)/);
  if (!match) {
    return 10;
  }

  return Number(match[1]) || 10;
}

/**
 * 获取用户的world限制数量
 */
export async function getUserWorldLimit(user_uuid: string): Promise<number> {
  const level = await getMembershipLevel(user_uuid);
  const config = getMembershipConfig(level);
  const limitFeature = config.features.find((feature) =>
    feature.startsWith("world_limit_")
  );

  if (!limitFeature) {
    return 3;
  }

  if (limitFeature === "world_limit_unlimited") {
    return Infinity;
  }

  const match = limitFeature.match(/world_limit_(\d+)/);
  if (!match) {
    return 3;
  }

  return Number(match[1]) || 3;
}

/**
 * 检查用户是否可以使用私密可见性
 */
export async function canUsePrivateVisibility(
  user_uuid: string
): Promise<boolean> {
  const level = await getMembershipLevel(user_uuid);
  return level !== "free";
}

/**
 * 检查用户是否可以移除水印
 */
export async function canRemoveWatermark(user_uuid: string): Promise<boolean> {
  const level = await getMembershipLevel(user_uuid);
  return level !== "free";
}

/**
 * 检查用户是否有优先支持
 */
export async function hasPrioritySupport(user_uuid: string): Promise<boolean> {
  const level = await getMembershipLevel(user_uuid);
  return level === "plus" || level === "pro";
}

/**
 * 检查用户是否可以创建自定义水印
 */
export async function canCreateCustomWatermark(
  user_uuid: string
): Promise<boolean> {
  const level = await getMembershipLevel(user_uuid);
  return level === "plus" || level === "pro";
}

/**
 * 检查用户是否有无限聊天上下文
 */
export async function hasUnlimitedChatContext(
  user_uuid: string
): Promise<boolean> {
  const level = await getMembershipLevel(user_uuid);
  return level === "pro";
}

/**
 * 检查用户是否可以访问Beta功能
 */
export async function canAccessBetaFeatures(
  user_uuid: string
): Promise<boolean> {
  const level = await getMembershipLevel(user_uuid);
  return level === "pro";
}

/**
 * 检查用户是否有快速队列
 */
export async function hasFastQueue(user_uuid: string): Promise<boolean> {
  const level = await getMembershipLevel(user_uuid);
  return level === "basic" || level === "plus" || level === "pro";
}

/**
 * 获取用户的聊天上下文窗口大小
 */
export async function getChatContextSize(user_uuid: string): Promise<number> {
  const level = await getMembershipLevel(user_uuid);
  const sizeMap: Record<MembershipLevel, number> = {
    free: 10,
    basic: 20,
    plus: 50,
    pro: 999999,
  };
  return sizeMap[level] || 10;
}
