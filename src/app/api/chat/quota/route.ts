import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import {
  ChatQuotaService,
  MEMBERSHIP_CHAT_QUOTA,
} from "@/services/chat/chat-quota-service";

export async function GET(request: NextRequest) {
  console.log("[chat/quota] GET request received");
  const userUuid = await getUserUuid();
  console.log("[chat/quota] User UUID:", userUuid);

  if (!userUuid) {
    console.log("[chat/quota] No user UUID, returning 401");
    return Response.json(
      { success: false, error: "User not authenticated" },
      { status: 401 }
    );
  }

  try {
    const stats = await ChatQuotaService.getQuotaStats(userUuid);

    const { quota, todayUsage } = stats;

    // Pro会员享受无限畅聊
    const isPro = quota.membership_level === "pro";

    const response = {
      success: true,
      data: {
        quota: {
          membership_level: quota.membership_level,
          monthly_quota: quota.monthly_quota,
          monthly_used: quota.monthly_used,
          monthly_remaining: isPro
            ? -1
            : quota.monthly_quota - quota.monthly_used,
          reset_at: quota.quota_reset_at,
          total_used: quota.total_used,
          is_unlimited: isPro,
        },
        stats: {
          total_used: quota.total_used,
          today_used: todayUsage,
        },
        subscription: {
          // 未来可用于显示推荐的订阅计划
          current: quota.membership_level,
          next_level: getNextLevelRecommendation(quota.membership_level),
        },
      },
    };
    return Response.json(response);
  } catch (error: any) {
    console.error("[chat/quota] Get chat quota error:", error);
    return Response.json(
      { success: false, error: error?.message || "Failed to get quota" },
      { status: 500 }
    );
  }
}

/**
 * 获取下个等级的推荐
 */
function getNextLevelRecommendation(currentLevel: string): string | null {
  const levels = ["free", "basic", "plus", "pro"];
  const currentIndex = levels.indexOf(currentLevel);

  if (currentIndex === -1 || currentIndex === levels.length - 1) {
    return null;
  }

  return levels[currentIndex + 1];
}
