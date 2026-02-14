import { ChatQuotaService } from "./chat-quota-service";

/**
 * 重置所有过期的月度配额
 * 用于定时任务执行
 */
export async function resetMonthlyQuotas(): Promise<{
  success: boolean;
  resetCount: number;
  timestamp: string;
  error?: string;
}> {
  console.log("[Chat Quota Reset] Starting monthly quota reset task...");

  const startTime = Date.now();

  try {
    const resetCount = await ChatQuotaService.resetExpiredQuotas();
    const duration = Date.now() - startTime;

    console.log(
      `[Chat Quota Reset] Completed: Reset ${resetCount} quotas in ${duration}ms`
    );

    return {
      success: true,
      resetCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(
      `[Chat Quota Reset] Failed after ${duration}ms:`,
      error
    );

    return {
      success: false,
      resetCount: 0,
      timestamp: new Date().toISOString(),
      error: error?.message || "Unknown error",
    };
  }
}

/**
 * 检查配额重置任务的健康状态
 * 用于监控和告警
 */
export async function checkQuotaResetHealth(): Promise<{
  healthy: boolean;
  lastResetCount: number;
  message: string;
}> {
  try {
    // 执行一次重置任务并返回结果
    const result = await resetMonthlyQuotas();

    if (!result.success) {
      return {
        healthy: false,
        lastResetCount: 0,
        message: `Quota reset failed: ${result.error}`,
      };
    }

    return {
      healthy: true,
      lastResetCount: result.resetCount,
      message: `Successfully reset ${result.resetCount} quotas`,
    };
  } catch (error: any) {
    return {
      healthy: false,
      lastResetCount: 0,
      message: `Health check error: ${error?.message || "Unknown error"}`,
    };
  }
}
