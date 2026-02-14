import {
  createSubscriptionLog,
  getSubscriptionLogs,
  getUserSubscriptionLogs,
  getSubscriptionLogsByDateRange,
  getLatestSubscriptionLog,
  getSubscriptionLogsByStatus,
  getSubscriptionLogStats,
  type CreateSubscriptionLogParams,
} from "@/models/subscription-log";

/**
 * 订阅日志记录服务
 * 提供订阅状态变更的自动记录和查询功能
 */

/**
 * 记录订阅状态变更
 */
export async function logSubscriptionChange(params: {
  subscription_id: string;
  user_uuid: string;
  from_status?: string | null;
  to_status: string;
  reason?: string | null;
  metadata?: Record<string, any>;
  created_by?: string | null;
}) {
  try {
    const log = await createSubscriptionLog({
      subscription_id: params.subscription_id,
      user_uuid: params.user_uuid,
      from_status: params.from_status,
      to_status: params.to_status,
      reason: params.reason,
      metadata: params.metadata,
      created_by: params.created_by || "system",
    });
    return log;
  } catch (error) {
    console.error("Failed to log subscription change:", error);
    throw error;
  }
}

/**
 * 装饰器：自动记录订阅状态变更
 * 用于包装订阅状态变更操作，自动记录日志
 */
export function withLogSubscriptionChange<
  T extends (...args: any[]) => Promise<any>
>(
  handler: T,
  contextExtractor: (args: Parameters<T>) => {
    subscription_id: string;
    user_uuid: string;
    from_status: string;
    to_status: string;
    reason: string;
    metadata?: Record<string, any>;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const context = contextExtractor(args);

    try {
      // 执行原始操作
      const result = await handler(...args);

      // 记录成功日志
      await logSubscriptionChange({
        subscription_id: context.subscription_id,
        user_uuid: context.user_uuid,
        from_status: context.from_status,
        to_status: context.to_status,
        reason: context.reason,
        metadata: context.metadata,
      });

      return result;
    } catch (error) {
      // 记录失败日志
      await logSubscriptionChange({
        subscription_id: context.subscription_id,
        user_uuid: context.user_uuid,
        from_status: context.from_status,
        to_status: `${context.to_status}_failed`,
        reason: context.reason,
        metadata: {
          ...context.metadata,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }) as T;
}

/**
 * 查询订阅日志
 */
export async function getLogs(
  subscription_id: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  return await getSubscriptionLogs(subscription_id, limit, offset);
}

/**
 * 查询用户订阅日志
 */
export async function getUserLogs(
  user_uuid: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  return await getUserSubscriptionLogs(user_uuid, limit, offset);
}

/**
 * 获取订阅状态变更统计
 */
export async function getSubscriptionChangeStats(subscription_id: string) {
  return await getSubscriptionLogStats(subscription_id);
}

/**
 * 记录订阅创建
 */
export async function logSubscriptionCreated(params: {
  subscription_id: string;
  user_uuid: string;
  plan_type: string;
  interval: string;
  created_by?: string;
}) {
  return await logSubscriptionChange({
    subscription_id: params.subscription_id,
    user_uuid: params.user_uuid,
    from_status: null,
    to_status: "created",
    reason: `Subscription created with plan ${params.plan_type} (${params.interval})`,
    metadata: {
      plan_type: params.plan_type,
      interval: params.interval,
    },
    created_by: params.created_by || "system",
  });
}

/**
 * 记录订阅取消
 */
export async function logSubscriptionCanceled(params: {
  subscription_id: string;
  user_uuid: string;
  from_status: string;
  cancel_type: "immediate" | "period_end";
  canceled_by?: string;
}) {
  const to_status =
    params.cancel_type === "immediate" ? "canceled" : "pending_cancel";

  return await logSubscriptionChange({
    subscription_id: params.subscription_id,
    user_uuid: params.user_uuid,
    from_status: params.from_status,
    to_status,
    reason: `Subscription canceled (${params.cancel_type})`,
    metadata: {
      cancel_type: params.cancel_type,
    },
    created_by: params.canceled_by || "user",
  });
}

/**
 * 记录订阅更新
 */
export async function logSubscriptionUpdated(params: {
  subscription_id: string;
  user_uuid: string;
  from_status: string;
  to_status: string;
  changes?: Record<string, any>;
  updated_by?: string;
}) {
  return await logSubscriptionChange({
    subscription_id: params.subscription_id,
    user_uuid: params.user_uuid,
    from_status: params.from_status,
    to_status: params.to_status,
    reason: "Subscription updated",
    metadata: {
      changes: params.changes,
    },
    created_by: params.updated_by || "system",
  });
}

/**
 * 记录支付成功
 */
export async function logPaymentSuccess(params: {
  subscription_id: string;
  user_uuid: string;
  amount: number;
  currency: string;
  invoice_id: string;
}) {
  return await logSubscriptionChange({
    subscription_id: params.subscription_id,
    user_uuid: params.user_uuid,
    from_status: null,
    to_status: "payment_success",
    reason: "Payment succeeded",
    metadata: {
      amount: params.amount,
      currency: params.currency,
      invoice_id: params.invoice_id,
    },
    created_by: "system",
  });
}

/**
 * 记录支付失败
 */
export async function logPaymentFailed(params: {
  subscription_id: string;
  user_uuid: string;
  invoice_id: string;
  amount: number;
  failure_reason: string;
  attempt_count: number;
}) {
  return await logSubscriptionChange({
    subscription_id: params.subscription_id,
    user_uuid: params.user_uuid,
    from_status: null,
    to_status: "payment_failed",
    reason: `Payment failed: ${params.failure_reason}`,
    metadata: {
      invoice_id: params.invoice_id,
      amount: params.amount,
      failure_reason: params.failure_reason,
      attempt_count: params.attempt_count,
    },
    created_by: "system",
  });
}

/**
 * 记录退款完成
 */
export async function logRefundCompleted(params: {
  subscription_id: string;
  user_uuid: string;
  refund_amount: number;
  currency: string;
  refund_reason: string;
  stripe_refund_id: string;
  refunded_by?: string;
}) {
  return await logSubscriptionChange({
    subscription_id: params.subscription_id,
    user_uuid: params.user_uuid,
    from_status: null,
    to_status: "refunded",
    reason: `Refund completed: ${params.refund_reason}`,
    metadata: {
      refund_amount: params.refund_amount,
      currency: params.currency,
      refund_reason: params.refund_reason,
      stripe_refund_id: params.stripe_refund_id,
    },
    created_by: params.refunded_by || "admin",
  });
}

/**
 * 记录订阅delinquency状态
 */
export async function logSubscriptionDelinquency(params: {
  subscription_id: string;
  user_uuid: string;
  from_status: string;
  reason: string;
  metadata?: Record<string, any>;
}) {
  return await logSubscriptionChange({
    subscription_id: params.subscription_id,
    user_uuid: params.user_uuid,
    from_status: params.from_status,
    to_status: "delinquent",
    reason: params.reason,
    metadata: params.metadata,
    created_by: "system",
  });
}

/**
 * 获取订阅的变更历史摘要
 */
export async function getSubscriptionChangeSummary(subscription_id: string) {
  const stats = await getSubscriptionLogStats(subscription_id);
  const latestLog = await getLatestSubscriptionLog(subscription_id);

  return {
    subscription_id,
    total_changes: stats.total_logs,
    status_distribution: stats.status_changes,
    last_change_at: stats.last_change_at,
    current_latest_log: latestLog,
  };
}

/**
 * 检查订阅是否在指定时间内发生了状态变更
 */
export async function checkRecentChanges(
  subscription_id: string,
  since: Date,
  target_status?: string
): Promise<boolean> {
  const logs = await getSubscriptionLogsByDateRange(
    subscription_id,
    since,
    new Date()
  );

  if (target_status) {
    return logs.some((log) => log.to_status === target_status);
  }

  return logs.length > 0;
}
