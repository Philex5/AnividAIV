import {
  findCreditByOrderNo,
  getUserValidCredits,
  insertCredit,
  queryCreditSummary,
  queryCreditTimeline,
  queryUserBalance,
  queryExpiringCredits,
} from "@/models/credit";
import { credits as creditsTable } from "@/db/schema";
import { gt, lt, eq, and, or, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { getIsoTimestr } from "@/lib/time";
import { getSnowId } from "@/lib/hash";
import { Order } from "@/types/order";
import type {
  CreditSummary,
  CreditSummaryParams,
  CreditTimelineItem,
  CreditTimelineParams,
  ExpiringCredits,
} from "@/types/credit.d";

// ✅ 混合方案：固定类型 + 动态生成函数
export const CreditsTransType = {
  // 固定类型（非生成场景）
  NewUser: "new_user" as const, // initial credits for new user
  OrderPay: "order_pay" as const, // user pay for credits (legacy, use specific types below)
  SystemAdd: "system_add" as const, // system add credits
  Ping: "ping" as const, // cost for ping api
  Chat: "chat" as const, // cost for chat message
  ChatRefund: "chat_refund" as const, // refund for failed chat
  CheckInReward: "check_in_reward" as const, // 签到奖励
  ShareReward: "share_reward" as const, // 分享奖励

  // ✅ 支付类型细分（用于前端展示积分来源）
  OrderPayOneTime: "order_pay_one_time" as const, // one-time purchase
  OrderPayMonthly: "order_pay_monthly" as const, // monthly subscription
  OrderPayYearly: "order_pay_yearly" as const, // yearly subscription (12 batches)

  // 动态生成函数（生成场景）
  generation: (genType: string) => `${genType}_generation` as const,
  refund: (genType: string) => `${genType}_generation_refund` as const,
} as const;

// 类型定义（用于类型检查）
export type CreditsTransTypeValue =
  | typeof CreditsTransType.NewUser
  | typeof CreditsTransType.OrderPay
  | typeof CreditsTransType.SystemAdd
  | typeof CreditsTransType.Ping
  | typeof CreditsTransType.Chat
  | typeof CreditsTransType.ChatRefund
  | typeof CreditsTransType.CheckInReward
  | typeof CreditsTransType.ShareReward
  | typeof CreditsTransType.OrderPayOneTime
  | typeof CreditsTransType.OrderPayMonthly
  | typeof CreditsTransType.OrderPayYearly
  | ReturnType<typeof CreditsTransType.generation>
  | ReturnType<typeof CreditsTransType.refund>;

export enum CreditsAmount {
  NewUserGet = 100,
}

function resolveWindowRange(window?: "all" | "30d" | "7d") {
  if (!window || window === "all") return {} as { from?: Date };
  const now = new Date();
  if (window === "30d") {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from } as { from?: Date };
  } else if (window === "7d") {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from } as { from?: Date };
  }
  return {} as { from?: Date };
}

function resolveTypePredicate(type?: "all" | "in" | "out") {
  if (!type || type === "all") return undefined as any;
  if (type === "in") return gt(creditsTable.credits, 0);
  return lt(creditsTable.credits, 0);
}

export class ServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ServiceError";
  }
}

/**
 * Get user's current balance only (lightweight for high-frequency calls)
 */
export async function getUserBalance(user_uuid: string): Promise<number> {
  try {
    const balance = await queryUserBalance(user_uuid);
    return Math.max(0, balance);
  } catch (e) {
    console.error("getUserBalance failed:", e);
    return 0;
  }
}

/**
 * Get expiring credits info (credits expiring in next 7 days)
 */
export async function getExpiringCredits(
  user_uuid: string,
): Promise<ExpiringCredits> {
  try {
    const result = await queryExpiringCredits(user_uuid);
    return {
      amount: result.amount,
      expiresAt: result.expiresAt || undefined,
    };
  } catch (e) {
    console.error("getExpiringCredits failed:", e);
    return {
      amount: 0,
      expiresAt: undefined,
    };
  }
}

/**
 * Aggregated credits summary for a user.
 */
export async function getUserCreditSummary(
  params: CreditSummaryParams,
): Promise<CreditSummary> {
  try {
    const { userUuid, window = "all", type = "all" } = params;
    const { from } = resolveWindowRange(window);
    const typePred = resolveTypePredicate(type);

    // Use model layer to query aggregated data
    const row = await queryCreditSummary({
      userUuid,
      fromDate: from,
      typePredicate: typePred,
    });

    return {
      balance: Number(row?.balance || 0),
      totalEarned: Number(row?.totalEarned || 0),
      totalUsed: Number(row?.totalUsed || 0),
      expiringCredits: Number(row?.expiringCredits || 0),
      expiringAt: row?.nextExpiringAt
        ? new Date(row.nextExpiringAt).toISOString()
        : undefined,
      lastEventAt: row?.lastEventAt
        ? new Date(row.lastEventAt).toISOString()
        : undefined,
      window,
      type,
    };
  } catch (err: any) {
    console.error("getUserCreditSummary failed", err);
    throw new ServiceError(
      "ERR_CREDITS_AGGREGATION_FAILED",
      err?.message || "Aggregation failed",
    );
  }
}

/**
 * Timeline list with basic filtering.
 */
export async function getUserCreditTimeline(
  params: CreditTimelineParams,
): Promise<CreditTimelineItem[]> {
  const { userUuid, window = "all", type = "all", limit = 50, page } = params;
  const { from } = resolveWindowRange(window);
  const typePred = resolveTypePredicate(type);

  // Use model layer to query timeline data
  const rows = await queryCreditTimeline({
    userUuid,
    fromDate: from,
    typePredicate: typePred,
    limit,
    page,
  });

  return rows.map((r) => ({
    id: r.id!,
    transNo: r.trans_no!,
    amount: Number(r.amount || 0),
    transType: r.trans_type!,
    orderNo: r.order_no || undefined,
    expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : undefined,
    createdAt: r.createdAt
      ? new Date(r.createdAt).toISOString()
      : new Date(0).toISOString(),
    activedAt: r.activedAt
      ? new Date(r.activedAt).toISOString()
      : new Date(0).toISOString(),
    orderInterval: r.order_interval || undefined, // For distinguishing subscription vs one-time
  }));
}

export async function decreaseCredits({
  user_uuid,
  trans_type,
  credits,
  generation_uuid, // ✅ 新增：关联生成任务
  order_no, // ✅ 新增：明确区分订单场景
  tx, // ✅ 新增：支持事务
}: {
  user_uuid: string;
  trans_type: string; // 改为 string 以支持动态生成的类型
  credits: number;
  generation_uuid?: string;
  order_no?: string;
  tx?: any; // Drizzle transaction type
}) {
  try {
    // 检查余额是否足够
    const balance = await getUserBalance(user_uuid);
    if (balance < credits) {
      throw new ServiceError(
        "INSUFFICIENT_CREDITS",
        `Required ${credits} credits, but only ${balance} available`,
      );
    }

    let inherited_order_no = "";
    let expired_at = "";
    let actived_at = "";
    let left_credits = 0;

    const userCredits = await getUserValidCredits(user_uuid);
    if (userCredits) {
      for (let i = 0, l = userCredits.length; i < l; i++) {
        const credit = userCredits[i];
        left_credits += credit.credits;

        // credit enough for cost
        if (left_credits >= credits) {
          inherited_order_no = credit.order_no || "";
          expired_at = credit.expired_at?.toISOString() || "";
          actived_at = credit.actived_at?.toISOString() || "";
          break;
        }

        // look for next credit
      }
    }

    const new_credit: typeof creditsTable.$inferInsert = {
      trans_no: getSnowId(),
      created_at: new Date(getIsoTimestr()),
      expired_at: new Date(expired_at),
      actived_at: new Date(actived_at),
      user_uuid: user_uuid,
      trans_type: trans_type,
      credits: 0 - credits,
      order_no: order_no || inherited_order_no, // ✅ 优先使用传入的 order_no
      generation_uuid, // ✅ 新增：关联生成任务
      is_voided: false, // ✅ 初始状态：未作废
    };

    // ✅ 使用传入的事务或默认数据库实例
    const dbInstance = tx || db();
    await dbInstance.insert(creditsTable).values(new_credit);
  } catch (e) {
    console.log("decrease credits failed: ", e);
    throw e;
  }
}

export async function increaseCredits({
  user_uuid,
  trans_type,
  credits,
  expired_at,
  actived_at,
  order_no,
  tx,
}: {
  user_uuid: string;
  trans_type: string;
  credits: number;
  expired_at: string;
  actived_at?: string;
  order_no?: string;
  tx?: any;
}) {
  try {
    if (!expired_at) {
      throw new ServiceError(
        "ERR_CREDITS_EXPIRED_AT_REQUIRED",
        "expired_at is required for credit issuance",
      );
    }

    const new_credit: typeof creditsTable.$inferInsert = {
      trans_no: getSnowId(),
      created_at: new Date(getIsoTimestr()),
      user_uuid: user_uuid,
      trans_type: trans_type,
      credits: credits,
      order_no: order_no || "",
      expired_at: new Date(expired_at),
      actived_at: actived_at ? new Date(actived_at) : new Date(),
    };
    await insertCredit(new_credit, tx);
  } catch (e) {
    console.error(`[IncreaseCredits] ❌ increase credits failed:`, e);
    console.error(`[IncreaseCredits]   - user_uuid: ${user_uuid}`);
    console.error(`[IncreaseCredits]   - trans_type: ${trans_type}`);
    console.error(`[IncreaseCredits]   - credits: ${credits}`);
    console.error(`[IncreaseCredits]   - order_no: ${order_no}`);
    throw e;
  }
}

/**
 * 安全地增加月份数，保持日期中的天数
 * 如果目标月份没有对应日期，则顺延到月末
 * 遵循Apple App Store订阅逻辑：
 * - 1月31日订阅 → 2月28/29日续费 → 3月28/29日续费
 */
function addMonthsWithDayPreservation(date: Date, monthsToAdd: number): Date {
  // 提取原始日期的各个组件
  const originalYear = date.getUTCFullYear();
  const originalMonth = date.getUTCMonth();
  const originalDay = date.getUTCDate();
  const originalHours = date.getUTCHours();
  const originalMinutes = date.getUTCMinutes();
  const originalSeconds = date.getUTCSeconds();
  const originalMilliseconds = date.getUTCMilliseconds();

  // 计算目标年月
  const targetMonthIndex = originalMonth + monthsToAdd;
  const targetYear = originalYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12; // 防止负数

  // 获取目标月份的最后一天
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  // 如果原日期超过目标月份的最大天数，则使用目标月份的最后一天
  const targetDay = Math.min(originalDay, lastDayOfTargetMonth);

  // 创建新的日期对象
  const result = new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      originalHours,
      originalMinutes,
      originalSeconds,
      originalMilliseconds,
    ),
  );

  return result;
}

export async function updateCreditForOrder(order: Order) {
  try {
    // Find existing credit record
    console.log(
      `[UpdateCreditForOrder] Checking if order ${order.order_no} already has a credit record...`,
    );
    const credit = await findCreditByOrderNo(order.order_no);
    if (credit) {
      console.log(
        `[UpdateCreditForOrder] ⚠️  Order ${order.order_no} already has credit record, skipping`,
      );
      console.log(`[UpdateCreditForOrder] Existing credit record:`, {
        id: credit.id,
        trans_no: credit.trans_no,
        credits: credit.credits,
        trans_type: credit.trans_type,
        created_at: credit.created_at,
      });
      // order already increased credit
      return;
    }

    console.log(
      `[UpdateCreditForOrder] ✅ No existing credit found for order ${order.order_no}, proceeding with credit update`,
    );

    // Check if this is a yearly subscription
    if (order.interval === "year") {
      console.log(
        `[UpdateCreditForOrder] ==================== YEARLY SUBSCRIPTION ====================`,
      );
      // Yearly subscription: distribute credits over 12 months
      // Based on payment date, create 12 credit records
      const paymentDate = order.paid_at
        ? new Date(order.paid_at)
        : order.created_at
          ? new Date(order.created_at)
          : new Date();
      const monthlyCredits = Math.floor(order.credits / 12);

      console.log(
        `[UpdateCreditForOrder] 📅 Payment date: ${paymentDate.toISOString()}`,
      );
      console.log(`[UpdateCreditForOrder] 📊 Total credits: ${order.credits}`);
      console.log(
        `[UpdateCreditForOrder] 📊 Monthly credits: ${monthlyCredits} (distributed over 12 months)`,
      );
      console.log(
        `[UpdateCreditForOrder] 🎯 Creating 12 monthly credit records...`,
      );

      for (let i = 0; i < 12; i++) {
        // Calculate activation date (same day each month as payment date)
        // ✅ 修复：基于支付日期的月份偏移，保持"日期位置"而非固定天数
        const activedAt = addMonthsWithDayPreservation(paymentDate, i);

        // Calculate expiration (next month same day, based on payment date)
        // ✅ 修复：到期时间为支付日期 + (i+1)个月，实现无缝衔接
        const expiredAt = addMonthsWithDayPreservation(paymentDate, i + 1);

        // Create unique order number for each month
        const monthOrderNo = `${order.order_no}_month_${i + 1}`;

        console.log(
          `[UpdateCreditForOrder]   Creating record ${i + 1}/12: ${monthOrderNo}`,
        );
        console.log(`[UpdateCreditForOrder]     - credits: ${monthlyCredits}`);
        console.log(
          `[UpdateCreditForOrder]     - actived_at: ${activedAt.toISOString()}`,
        );
        console.log(
          `[UpdateCreditForOrder]     - expired_at: ${expiredAt.toISOString()}`,
        );

        await increaseCredits({
          user_uuid: order.user_uuid,
          trans_type: CreditsTransType.OrderPayYearly, // ✅ 使用年度订阅类型
          credits: monthlyCredits,
          actived_at: activedAt.toISOString(),
          expired_at: expiredAt.toISOString(),
          order_no: monthOrderNo,
        });

        console.log(
          `[UpdateCreditForOrder]     ✅ Record ${i + 1}/12 created successfully`,
        );
      }

      console.log(
        `[UpdateCreditForOrder] ==================== YEARLY COMPLETE ====================`,
      );
      console.log(
        `[UpdateCreditForOrder] ✅ Yearly subscription: Created 12 credit records for order ${order.order_no}`,
      );
      console.log(
        `[UpdateCreditForOrder]    Total credits: ${monthlyCredits * 12} (${monthlyCredits} per month × 12)`,
      );
      console.log(
        `[UpdateCreditForOrder]    First activation: ${new Date(paymentDate).toISOString()}`,
      );
      console.log(
        `[UpdateCreditForOrder] =========================================================`,
      );
    } else if (order.interval === "month") {
      console.log(
        `[UpdateCreditForOrder] ==================== MONTHLY SUBSCRIPTION ====================`,
      );
      // Monthly subscription: immediate activation
      const activedAt = new Date();
      const expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + 30);

      console.log(
        `[UpdateCreditForOrder] 📅 Activation time: ${activedAt.toISOString()}`,
      );
      console.log(
        `[UpdateCreditForOrder] 📅 Expiration time: ${expiredAt.toISOString()}`,
      );
      console.log(
        `[UpdateCreditForOrder] 📊 Credits to issue: ${order.credits}`,
      );

      console.log(`[UpdateCreditForOrder] Creating immediate credit record...`);
      await increaseCredits({
        user_uuid: order.user_uuid,
        trans_type: CreditsTransType.OrderPayMonthly, // ✅ 使用月度订阅类型
        credits: order.credits,
        actived_at: activedAt.toISOString(),
        expired_at: expiredAt.toISOString(),
        order_no: order.order_no,
      });

      console.log(
        `[UpdateCreditForOrder] ✅ Monthly subscription: Credits activated immediately for order ${order.order_no}`,
      );
      console.log(
        `[UpdateCreditForOrder] =============================================================`,
      );
    } else {
      console.log(
        `[UpdateCreditForOrder] ==================== ONE-TIME PURCHASE ====================`,
      );
      // One-time purchase: immediate activation
      const activedAt = new Date();
      const expiredAt = new Date();
      expiredAt.setFullYear(expiredAt.getFullYear() + 30);

      console.log(`[UpdateCreditForOrder] Creating immediate credit record...`);
      await increaseCredits({
        user_uuid: order.user_uuid,
        trans_type: CreditsTransType.OrderPayOneTime, // ✅ 使用一次性购买类型
        credits: order.credits,
        actived_at: activedAt.toISOString(),
        expired_at: expiredAt.toISOString(),
        order_no: order.order_no,
      });

      console.log(
        `[UpdateCreditForOrder] ✅ One-time purchase: Credits activated immediately for order ${order.order_no}`,
      );
      console.log(
        `[UpdateCreditForOrder] =========================================================`,
      );
    }

    console.log(
      `[UpdateCreditForOrder] ==================== SUCCESS ====================`,
    );
    console.log(
      `[UpdateCreditForOrder] 🎉 Credit issuance completed for order: ${order.order_no}`,
    );
    console.log(`[UpdateCreditForOrder]    User: ${order.user_uuid}`);
    console.log(`[UpdateCreditForOrder]    Total Credits: ${order.credits}`);
    console.log(`[UpdateCreditForOrder]    Interval: ${order.interval}`);
    console.log(
      `[UpdateCreditForOrder] =================================================`,
    );
  } catch (e) {
    console.error(
      `[UpdateCreditForOrder] ❌ ==================== ERROR ====================`,
    );
    console.error(
      `[UpdateCreditForOrder] update credit for order failed for order: ${order.order_no}`,
    );
    console.error(`[UpdateCreditForOrder] Error message:`, (e as any)?.message);
    console.error(`[UpdateCreditForOrder] Error stack:`, (e as any)?.stack);
    console.error(`[UpdateCreditForOrder] Order details:`, {
      order_no: order.order_no,
      user_uuid: order.user_uuid,
      interval: order.interval,
      credits: order.credits,
    });
    console.error(
      `[UpdateCreditForOrder] ==================================================`,
    );
    throw e;
  }
}

/**
 * 退款：通过软删除标记原扣款记录
 * 优势：自动处理跨充值包场景，原充值包积分自动恢复
 */
export async function refundCredits({
  user_uuid,
  generation_uuid,
  reason = "Generation failed",
}: {
  user_uuid: string;
  generation_uuid: string;
  reason?: string;
}) {
  try {
    // 1. 查找该生成任务的扣款记录
    const deductRecords = await db()
      .select()
      .from(creditsTable)
      .where(
        and(
          eq(creditsTable.user_uuid, user_uuid),
          eq(creditsTable.generation_uuid, generation_uuid),
          lt(creditsTable.credits, 0), // 负数 = 扣款
          or(eq(creditsTable.is_voided, false), isNull(creditsTable.is_voided)), // 未作废
        ),
      );

    if (deductRecords.length === 0) {
      console.warn(
        `No deduction found for generation ${generation_uuid}, user ${user_uuid}`,
      );
      return;
    }

    // 2. 标记为作废（软删除）
    for (const record of deductRecords) {
      await db()
        .update(creditsTable)
        .set({
          is_voided: true,
          voided_at: new Date(),
          voided_reason: reason,
        })
        .where(eq(creditsTable.id, record.id));

      console.log(
        `Voided credit record ${record.trans_no} (${record.credits} credits) for generation ${generation_uuid}`,
      );
    }

    // ✅ 不再创建退款记录，原充值包积分自动恢复
  } catch (e) {
    console.log("refund credits failed: ", e);
    throw e;
  }
}

/**
 * 统计年付订阅已激活的月数
 * @param orderNo 订单号(基础订单号,不含_month_X后缀)
 * @returns 已激活的月数(1-12)
 */
/**
 * 恢复积分记录：将作废的积分记录恢复为可用状态
 * 用于处理 webhook 晚到的情况（轮询超时后 webhook 才到达，任务实际成功）
 *
 * @param user_uuid 用户UUID
 * @param generation_uuid 生成任务UUID
 * @param _reason 恢复原因（可选，已废弃）
 */
export async function restoreCredits(
  user_uuid: string,
  generation_uuid: string,
  _reason?: string,
) {
  try {
    // 1. 查找该生成任务作废的扣款记录
    const voidedRecords = await db()
      .select()
      .from(creditsTable)
      .where(
        and(
          eq(creditsTable.user_uuid, user_uuid),
          eq(creditsTable.generation_uuid, generation_uuid),
          lt(creditsTable.credits, 0), // 负数 = 扣款
          eq(creditsTable.is_voided, true), // 已作废
        ),
      );

    if (voidedRecords.length === 0) {
      console.log(
        `No voided credits found for generation ${generation_uuid}, user ${user_uuid}, nothing to restore`,
      );
      return;
    }

    // 2. 恢复为可用状态（软删除恢复）
    for (const record of voidedRecords) {
      await db()
        .update(creditsTable)
        .set({
          is_voided: false, // ✅ 恢复为未作废状态
          voided_at: null, // ✅ 清空作废时间
          voided_reason: null, // ✅ 清空作废原因
        })
        .where(eq(creditsTable.id, record.id));

      console.log(
        `Restored credit record ${record.trans_no} (${record.credits} credits) for generation ${generation_uuid}`,
      );
    }

    console.log(
      `✅ Successfully restored ${voidedRecords.length} credit record(s) for generation ${generation_uuid}`,
    );
  } catch (e) {
    console.error("restore credits failed: ", e);
    throw e;
  }
}
