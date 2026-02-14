import { db } from "@/db";
import {
  findChatQuotaByUserUuid,
  createChatQuota,
  incrementMonthlyUsed,
  resetMonthlyQuota,
  updateChatQuota,
  findExpiredQuotas,
  isUnlimitedQuota,
  getNextMonthFirstDay,
  mapUserToMembershipLevel,
  type ChatQuota,
  type MembershipLevel,
  MEMBERSHIP_CHAT_QUOTA,
} from "@/models/chat-quota";

// 重新导出 MEMBERSHIP_CHAT_QUOTA 以供外部使用
export { MEMBERSHIP_CHAT_QUOTA };
import {
  createChatUsageLog,
  getTodayUsage,
} from "@/models/chat-usage-log";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserInfo } from "@/services/user";

/**
 * 检查是否需要重置月度配额
 * 2025-11-19 修复：增加会员等级一致性检查，防止Pro过期后配额未重置的漏洞
 * @param quota 当前配额记录
 * @param currentMembershipLevel 用户当前实际会员等级（来自users表）
 * @returns 是否需要重置
 */
export function shouldResetQuota(quota: ChatQuota, currentMembershipLevel?: MembershipLevel): boolean {
  // 漏洞修复：如果传入了当前实际会员等级，且与配额中的不一致，需要重置
  // 例如：Pro会员过期后，quota中membership_level还是"pro"，但实际已是"free"
  if (currentMembershipLevel && quota.membership_level !== currentMembershipLevel) {
    console.log(`[ChatQuota] Membership level mismatch: quota=${quota.membership_level}, actual=${currentMembershipLevel}, resetting...`);
    return true;
  }

  // Pro会员不需要重置（但上面的检查会先处理过期情况）
  if (isUnlimitedQuota(quota)) {
    return false;
  }

  const now = new Date();
  return quota.quota_reset_at !== null && now >= quota.quota_reset_at;
}

export class ChatQuotaService {
  /**
   * 获取当前用户的聊天配额
   * 如果没有记录，自动创建
   * 2025-11-19 修复：增加会员等级一致性检查
   */
  static async getCurrentQuota(userUuid: string): Promise<ChatQuota> {
    console.log(`[ChatQuotaService.getCurrentQuota] userUuid: ${userUuid}`);

    // 获取用户实际会员等级（来自users表）
    const [user] = await db()
      .select()
      .from(users)
      .where(eq(users.uuid, userUuid))
      .limit(1);

    console.log(`[ChatQuotaService.getCurrentQuota] User from DB:`, user);

    const currentMembershipLevel = user ? mapUserToMembershipLevel(user) : "free";
    console.log(`[ChatQuotaService.getCurrentQuota] Current membership level: ${currentMembershipLevel}`);

    let quota = await findChatQuotaByUserUuid(userUuid);
    console.log(`[ChatQuotaService.getCurrentQuota] Quota from DB:`, quota);

    // 如果没有记录，自动创建
    if (!quota) {
      console.log(`[ChatQuotaService.getCurrentQuota] No quota found, creating initial quota`);
      quota = await this.createInitialQuota(userUuid);
      console.log(`[ChatQuotaService.getCurrentQuota] Created quota:`, quota);
    }

    // 检查是否需要重置（传入当前实际会员等级进行一致性检查）
    if (shouldResetQuota(quota, currentMembershipLevel)) {
      console.log(`[ChatQuotaService.getCurrentQuota] Quota needs reset, resetting...`);
      quota = await this.resetMonthlyQuota(userUuid);
      console.log(`[ChatQuotaService.getCurrentQuota] Reset quota:`, quota);
    }

    console.log(`[ChatQuotaService.getCurrentQuota] Returning quota:`, quota);
    return quota;
  }

  /**
   * 创建初始配额记录
   */
  static async createInitialQuota(userUuid: string): Promise<ChatQuota> {
    console.log(`[ChatQuotaService.createInitialQuota] Creating quota for userUuid: ${userUuid}`);
    const user = await getUserInfo();
    console.log(`[ChatQuotaService.createInitialQuota] User info:`, user);

    if (!user) {
      console.error(`[ChatQuotaService.createInitialQuota] User not found!`);
      throw new Error("User not found");
    }

    // 获取会员等级
    const membershipLevel = mapUserToMembershipLevel(user);
    console.log(`[ChatQuotaService.createInitialQuota] Membership level: ${membershipLevel}`);

    // Pro会员享受无限畅聊，设置monthly_quota为-1
    const monthlyQuota = membershipLevel === 'pro' ? -1 : MEMBERSHIP_CHAT_QUOTA[membershipLevel];
    console.log(`[ChatQuotaService.createInitialQuota] Monthly quota: ${monthlyQuota}`);

    // 修复：Pro会员也设置重置时间（使用固定远期时间表示"永不过期"）
    // 使用2099年12月31日作为Pro会员的配额重置时间，避开NOT NULL约束
    const quotaResetAt = membershipLevel === 'pro'
      ? new Date('2099-12-31T00:00:00.000Z')  // Pro会员使用固定远期时间
      : getNextMonthFirstDay();               // 其他会员使用下月1号

    console.log(`[ChatQuotaService.createInitialQuota] Quota reset at: ${quotaResetAt}`);

    const createdQuota = createChatQuota({
      userUuid,
      membershipLevel,
      monthlyQuota,
      quotaResetAt,
    });

    console.log(`[ChatQuotaService.createInitialQuota] Created quota:`, createdQuota);
    return createdQuota;
  }

  /**
   * 重置月度配额
   * 2025-11-19 修复：重新获取用户当前实际会员等级，而不是依赖quota中的
   */
  static async resetMonthlyQuota(userUuid: string): Promise<ChatQuota> {
    const quota = await findChatQuotaByUserUuid(userUuid);
    if (!quota) {
      throw new Error("Quota record not found");
    }

    // 获取用户当前实际会员等级（来自users表）
    const [user] = await db()
      .select()
      .from(users)
      .where(eq(users.uuid, userUuid))
      .limit(1);

    const currentMembershipLevel = user ? mapUserToMembershipLevel(user) : "free";

    // 如果当前是Pro会员（真正的Pro），无需重置
    if (currentMembershipLevel === 'pro') {
      return quota;
    }

    // 使用当前实际会员等级重置配额
    return resetMonthlyQuota(userUuid, currentMembershipLevel);
  }

  /**
   * 消耗配额
   * Pro会员不消耗配额（无限畅聊）
   */
  static async consumeQuota(
    userUuid: string,
    sessionId: string,
    tokensUsed: number = 0
  ): Promise<void> {
    const quota = await this.getCurrentQuota(userUuid);

    // 获取用户信息
    const [user] = await db()
      .select()
      .from(users)
      .where(eq(users.uuid, userUuid))
      .limit(1);

    const membershipLevel = user
      ? mapUserToMembershipLevel(user)
      : "free";

    // Pro会员享受无限畅聊，只记录使用日志，不消耗配额
    if (isUnlimitedQuota(quota)) {
      await createChatUsageLog({
        userUuid,
        sessionId,
        membershipLevel,
        tokensUsed,
        apUsed: 1,
      });
      return;
    }

    // 使用事务保证原子性
    await db().transaction(async (trx) => {
      // 增加已使用量
      await incrementMonthlyUsed(userUuid);

      // 记录使用日志
      await createChatUsageLog({
        userUuid,
        sessionId,
        membershipLevel,
        tokensUsed,
        apUsed: 1,
      });
    });
  }

  /**
   * 重置所有过期的月度配额
   * 用于定时任务
   */
  static async resetExpiredQuotas(): Promise<number> {
    const expiredQuotas = await findExpiredQuotas();

    let resetCount = 0;

    for (const quota of expiredQuotas) {
      try {
        await this.resetMonthlyQuota(quota.user_uuid);
        resetCount++;
      } catch (error) {
        console.error(
          `Failed to reset quota for user ${quota.user_uuid}:`,
          error
        );
      }
    }

    return resetCount;
  }

  /**
   * 升级会员时更新配额
   */
  static async updateQuotaForMembership(
    userUuid: string,
    newLevel: MembershipLevel
  ): Promise<void> {
    const quota = await findChatQuotaByUserUuid(userUuid);
    // Pro会员享受无限畅聊，设置monthly_quota为-1
    const newMonthlyQuota = newLevel === 'pro' ? -1 : MEMBERSHIP_CHAT_QUOTA[newLevel];

    // 修复：Pro会员也设置重置时间（使用固定远期时间表示"永不过期"）
    const quotaResetAt = newLevel === 'pro'
      ? new Date('2099-12-31T00:00:00.000Z')
      : getNextMonthFirstDay();

    if (!quota) {
      // 如果没有配额记录，创建新的
      await createChatQuota({
        userUuid,
        membershipLevel: newLevel,
        monthlyQuota: newMonthlyQuota,
        quotaResetAt,
      });
      return;
    }

    // 更新配额
    await updateChatQuota(userUuid, {
      membershipLevel: newLevel,
      monthlyQuota: newMonthlyQuota,
      quotaResetAt,
      // Pro会员升级后重置使用量，非Pro会员保留当前使用量
      monthlyUsed: newLevel === 'pro' ? 0 : undefined,
    });
  }

  /**
   * 获取用户今日使用量
   */
  static async getTodayUsage(userUuid: string): Promise<number> {
    return getTodayUsage(userUuid);
  }

  /**
   * 获取配额统计信息
   */
  static async getQuotaStats(userUuid: string): Promise<{
    quota: ChatQuota;
    todayUsage: number;
  }> {
    const quota = await this.getCurrentQuota(userUuid);
    const todayUsage = await this.getTodayUsage(userUuid);

    return {
      quota,
      todayUsage,
    };
  }
}
