import Stripe from "stripe";
import { respOk } from "@/lib/resp";
import { handleCheckoutSession, handleInvoice } from "@/services/stripe";
import { updateSubscriptionByStripeId } from "@/models/subscription";
import { SubscriptionStatus } from "@/models/subscription";
import {
  logSubscriptionChange,
  logPaymentFailed,
  logRefundCompleted,
  logSubscriptionDelinquency,
} from "@/services/subscription-log.service";
import { findOrderBySubId } from "@/models/order";
import {
  sendPaymentFailedEmail,
  sendRefundCompletedEmail,
  sendRefundCreatedEmail,
} from "@/services/email";
import { findUserByUuid, updateUserSubStatus } from "@/models/user";
import { findSubscriptionByStripeId } from "@/models/subscription";

// v5.0: 增强事件映射
const EVENT_MAPPING = {
  "checkout.session.completed": "CHECKOUT_SUCCESS",
  "invoice.payment_succeeded": "PAYMENT_SUCCESS",
  "invoice.payment_failed": "PAYMENT_FAILED", // v5.0新增
  "customer.subscription.updated": "SUBSCRIBE_UPDATED",
  "customer.subscription.deleted": "SUBSCRIBE_CANCELED",
  "charge.refunded": "REFUND_COMPLETED", // v5.0新增
  "refund.created": "REFUND_CREATED", // v5.0新增
} as const;

export async function POST(req: Request) {
  let event: Stripe.Event | undefined;

  try {
    const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripePrivateKey || !stripeWebhookSecret) {
      throw new Error("invalid stripe config");
    }

    const stripe = new Stripe(stripePrivateKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const sign = req.headers.get("stripe-signature") as string;
    const body = await req.text();
    if (!sign || !body) {
      throw new Error("invalid notify data");
    }

    event = await stripe.webhooks.constructEventAsync(
      body,
      sign,
      stripeWebhookSecret
    );

    console.log(
      `[Stripe Webhook] Received event: ${event.type} (${(EVENT_MAPPING as any)[event.type] || "UNKNOWN"})`
    );

    // v5.0: 处理增强事件
    switch (event.type) {
      // 原有事件
      case "checkout.session.completed": {
        const session = event.data.object;
        try {
          await handleCheckoutSession(stripe, session);
          console.log(
            `[Stripe Webhook] Successfully handled checkout.session.completed for session: ${session.id}`
          );
        } catch (error) {
          console.error(
            `[Stripe Webhook] Failed to handle checkout session ${session.id}:`,
            error
          );
          throw error; // 重新抛出错误以触发重试机制
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        try {
          await handleInvoice(stripe, invoice);
          console.log(
            `[Stripe Webhook] Successfully handled invoice.payment_succeeded for invoice: ${invoice.id}`
          );
        } catch (error) {
          console.error(
            `[Stripe Webhook] Failed to handle invoice ${invoice.id}:`,
            error
          );
          throw error; // 重新抛出错误以触发重试机制
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // v5.0新增：退款完成事件
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefundCompleted(charge);
        break;
      }

      // v5.0新增：退款创建事件
      case "refund.created": {
        const refund = event.data.object as Stripe.Refund;
        await handleRefundCreated(refund);
        break;
      }

      // v5.0新增：支付失败事件
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(stripe, invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return respOk();
  } catch (error: any) {
    console.error(`[Stripe Webhook] Processing failed for event:`, {
      type: event?.type,
      id: event?.id,
      error: error.message,
    });

    // v5.0: 事件重试机制已移除
    // Note: 使用 setTimeout 在 API 路由中会导致 EPIPE 错误
    // 重试逻辑应该在外部队列系统中处理

    return Response.json(
      { error: `handle stripe notify failed: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * 处理订阅状态更新（v5.0增强：集成日志记录）
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const subId = subscription.id;
  const status = subscription.status;

  // 安全的日期解析函数
  const safeDateFromTimestamp = (
    timestamp: number | null | undefined
  ): Date | undefined => {
    if (!timestamp) return undefined;
    const date = new Date(timestamp * 1000);
    // 检查日期是否有效
    if (isNaN(date.getTime()) || date.getTime() <= 0) {
      console.warn(
        `[Stripe Webhook] Invalid timestamp for subscription ${subId}: ${timestamp}`
      );
      return undefined;
    }
    return date;
  };

  const currentPeriodStart = safeDateFromTimestamp(
    subscription.current_period_start
  );
  const currentPeriodEnd = safeDateFromTimestamp(
    subscription.current_period_end
  );
  const canceledAt = safeDateFromTimestamp(subscription.canceled_at);

  // 根据Stripe状态映射到本地状态
  let localStatus: string;
  let isUserInitiatedCancel = false; // 标记是否为用户主动取消

  if (status === "active") {
    localStatus = subscription.cancel_at_period_end
      ? SubscriptionStatus.PENDING_CANCEL
      : SubscriptionStatus.ACTIVE;

    // 检查是否是用户主动设置周期末取消
    if (
      subscription.cancel_at_period_end &&
      subscription.cancellation_details
    ) {
      isUserInitiatedCancel =
        (subscription.cancellation_details as any).requested_by === "customer";
    }
  } else if (status === "canceled") {
    localStatus = SubscriptionStatus.CANCELED;
  } else if (status === "unpaid" || status === "past_due") {
    localStatus = SubscriptionStatus.EXPIRED;
  } else {
    console.log(
      `[Stripe Webhook] Ignoring subscription status update: ${status} for ${subId}`
    );
    return;
  }

  try {
    // 获取当前状态
    const existingSub = await updateSubscriptionByStripeId(subId, {
      status: localStatus as any,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      canceled_at: canceledAt,
    });

    // v5.0: 记录状态变更日志
    if (existingSub) {
      // 构建日志消息
      let reason = "Stripe webhook subscription updated";
      let metadata: Record<string, any> = {
        stripe_status: status,
        current_period_start: currentPeriodStart?.toISOString(),
        current_period_end: currentPeriodEnd?.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      };

      // 如果是用户主动设置周期末取消，标记并更新reason
      if (isUserInitiatedCancel) {
        reason = "User initiated subscription cancellation (period end)";
        metadata.is_user_initiated = true;
        metadata.cancellation_details = subscription.cancellation_details;
      } else if (localStatus === SubscriptionStatus.PENDING_CANCEL) {
        reason = "Subscription scheduled for cancellation at period end";
      }

      await logSubscriptionChange({
        subscription_id: subId,
        user_uuid: existingSub.user_uuid,
        from_status: existingSub.status || undefined,
        to_status: localStatus,
        reason,
        metadata,
      });

      // v5.1: 处理用户主动取消的情况
      // 如果是用户主动取消，且设置到月末生效，需要更新用户的sub_expired_at
      if (
        isUserInitiatedCancel &&
        localStatus === SubscriptionStatus.PENDING_CANCEL &&
        canceledAt
      ) {
        // 判断订阅类型
        if (existingSub.interval === "year") {
          // 年度订阅：取消到月末，计算剩余天数
          // 取当前时间的月份，最后一天是月末
          const currentYear = currentPeriodStart
            ? currentPeriodStart.getFullYear()
            : new Date().getFullYear();
          const currentMonth = currentPeriodStart
            ? currentPeriodStart.getMonth()
            : new Date().getMonth();
          const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0); // 获取当月最后一天

          await updateUserSubStatus(
            existingSub.user_uuid,
            true, // is_sub = true (继续保持有效)
            lastDayOfMonth, // sub_expired_at = 当月月末
            existingSub.plan_type // 保持plan_type不变
          );

          console.log(
            `[Stripe Webhook] Yearly subscription cancellation at period end: updated sub_expired_at to ${lastDayOfMonth.toISOString()} for user ${existingSub.user_uuid}`
          );
        } else {
          // 月度订阅：无需立即处理，sub_expired_at 会通过payment_succeeded自动更新
          console.log(
            `[Stripe Webhook] Monthly subscription cancellation at period end: no immediate action needed for user ${existingSub.user_uuid}`
          );
        }
      }
    }

    console.log(
      `[Stripe Webhook] Updated local subscription status to ${localStatus} for ${subId}`
    );
  } catch (error: any) {
    console.error(
      `[Stripe Webhook] Failed to update subscription ${subId}:`,
      error
    );
  }
}

/**
 * 处理订阅被删除（立即取消，v5.0增强：集成日志记录）
 * 区分用户主动取消和订阅自然到期
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subId = subscription.id;
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000)
    : new Date();

  try {
    const existingSub = await updateSubscriptionByStripeId(subId, {
      status: SubscriptionStatus.CANCELED,
      canceled_at: canceledAt,
    });

    // v5.0: 检查取消详情，区分用户主动取消和系统到期
    const cancellationDetails = subscription.cancellation_details;
    let cancelType: "user_initiated" | "system_expiration" | "admin_cancelled" =
      "system_expiration";
    let cancelReason = "Stripe webhook subscription deleted";

    if (cancellationDetails) {
      const requestedBy = (cancellationDetails as any).requested_by;
      if (requestedBy === "customer") {
        cancelType = "user_initiated";
        cancelReason = `User initiated cancellation${cancellationDetails.reason ? `: ${cancellationDetails.reason}` : ""}`;
      } else if (requestedBy === "admin") {
        cancelType = "admin_cancelled";
        cancelReason = `Admin cancellation${cancellationDetails.reason ? `: ${cancellationDetails.reason}` : ""}`;
      } else {
        cancelType = "system_expiration";
        cancelReason = "Subscription expired naturally";
      }
    }

    // v5.0: 记录状态变更日志，包含取消类型和原因
    if (existingSub) {
      await logSubscriptionChange({
        subscription_id: subId,
        user_uuid: existingSub.user_uuid,
        from_status: existingSub.status || undefined,
        to_status: SubscriptionStatus.CANCELED,
        reason: cancelReason,
        metadata: {
          stripe_subscription_status: subscription.status,
          canceled_at: canceledAt.toISOString(),
          cancel_type: cancelType, // 新增：区分取消类型
          cancellation_details: {
            requested_by: (cancellationDetails as any)?.requested_by || null,
            reason: cancellationDetails?.reason || null,
            feedback: cancellationDetails?.feedback || null,
            comment: cancellationDetails?.comment || null,
          },
        },
      });

      // v5.1: 立即更新用户pro状态
      // 当订阅被删除时，需要立即更新users表中的pro相关字段
      // 年度会员取消时：立即失效（不管是否设置了cancel_at_period_end）
      // 月度会员取消时：立即失效
      await updateUserSubStatus(
        existingSub.user_uuid,
        false, // is_sub = false
        canceledAt, // sub_expired_at = 取消时间
        null // sub_plan_type = null
      );

      console.log(
        `[Stripe Webhook] Updated user subscription status for ${existingSub.user_uuid}: is_sub=false, sub_expired_at=${canceledAt.toISOString()}`
      );

      console.log(
        `[Stripe Webhook] Subscription ${subId} canceled by ${cancelType}, reason: ${cancelReason}`
      );
    }

    console.log(
      `[Stripe Webhook] Updated local subscription status to canceled for ${subId}`
    );
  } catch (error: any) {
    console.error(
      `[Stripe Webhook] Failed to update subscription ${subId}:`,
      error
    );
  }
}

/**
 * v5.0新增：处理退款完成事件
 */
async function handleRefundCompleted(charge: Stripe.Charge) {
  try {
    console.log(
      `[Stripe Webhook] Processing refund completed for charge: ${charge.id}`
    );

    // 获取关联的订阅和订单
    const paymentIntentId = charge.payment_intent as string;
    if (!paymentIntentId) {
      console.error(
        `[Stripe Webhook] No payment intent found for charge: ${charge.id}`
      );
      return;
    }

    // 根据payment_intent查找订单信息
    const order = await findOrderBySubId(
      charge.metadata?.subscription_id || ""
    );
    if (!order) {
      console.error(`[Stripe Webhook] No order found for charge: ${charge.id}`);
    }

    // 记录退款完成日志
    await logRefundCompleted({
      subscription_id: charge.metadata?.subscription_id || "",
      user_uuid: order?.user_uuid || "",
      refund_amount: charge.amount,
      currency: charge.currency,
      refund_reason: charge.refunds?.data[0]?.reason || "refund",
      stripe_refund_id: charge.refunds?.data[0]?.id || charge.id,
    });

    // v5.0新增：发送退款完成邮件
    try {
      const subscriptionId = charge.metadata?.subscription_id || "";
      if (subscriptionId && order) {
        // 查询订阅信息
        const subscription = await findSubscriptionByStripeId(subscriptionId);
        // 查询用户信息
        const user = await findUserByUuid(order.user_uuid);

        if (subscription && user && user.email) {
          // 计算订阅结束日期
          const endDate = subscription.current_period_end
            ? new Date(subscription.current_period_end).toLocaleDateString()
            : new Date().toLocaleDateString();

          // 计算处理天数
          const createdAt = subscription.created_at
            ? new Date(subscription.created_at)
            : new Date();
          const completedAt = new Date();
          const processingDays = Math.ceil(
            (completedAt.getTime() - createdAt.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          // 发送退款完成邮件
          await sendRefundCompletedEmail({
            to: user.email,
            userName: user.display_name || user.email.split("@")[0],
            subscriptionId: subscriptionId,
            planName: subscription.plan_type || "Premium",
            refundAmount: charge.amount / 100, // Stripe返回的是分，转换为美元
            refundId: charge.refunds?.data[0]?.id || charge.id,
            refundReason: charge.refunds?.data[0]?.reason || undefined,
            subscriptionEndDate: endDate,
            processingDays: processingDays,
          });

          console.log(
            `[Stripe Webhook] Refund completed email sent to ${user.email}`
          );
        }
      }
    } catch (emailError) {
      console.error(
        `[Stripe Webhook] Failed to send refund completed email:`,
        emailError
      );
      // 不抛出错误，避免影响webhook主流程
    }

    console.log(
      `[Stripe Webhook] Refund completed logged for charge: ${charge.id}`
    );
  } catch (error: any) {
    console.error(`[Stripe Webhook] Failed to handle refund completed:`, error);
    throw error;
  }
}

/**
 * v5.0新增：处理退款创建事件
 */
async function handleRefundCreated(refund: Stripe.Refund) {
  try {
    console.log(`[Stripe Webhook] Processing refund created: ${refund.id}`, {
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
      status: refund.status,
    });

    // 获取关联的charge信息
    const charge = refund.charge as string;
    if (!charge) {
      console.error(
        `[Stripe Webhook] No charge found for refund: ${refund.id}`
      );
      return;
    }

    // 记录退款创建日志
    console.log(`[Stripe Webhook] Refund created for charge: ${charge}`, {
      refund_id: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
      status: refund.status,
    });

    // v5.0新增：发送退款创建邮件
    try {
      // 从metadata中获取subscription_id（如果可用）
      const subscriptionId =
        (refund.metadata && refund.metadata.subscription_id) || "";

      if (subscriptionId) {
        // 查询订阅信息
        const subscription = await findSubscriptionByStripeId(subscriptionId);
        if (subscription) {
          // 查询用户信息
          const user = await findUserByUuid(subscription.user_uuid);
          if (user && user.email) {
            // 计算订阅结束日期
            const endDate = subscription.current_period_end
              ? new Date(subscription.current_period_end).toLocaleDateString()
              : new Date().toLocaleDateString();

            // 发送退款创建邮件
            await sendRefundCreatedEmail({
              to: user.email,
              userName: user.display_name || user.email.split("@")[0],
              subscriptionId: subscriptionId,
              planName: subscription.plan_type || "Premium",
              refundAmount: refund.amount / 100, // Stripe返回的是分，转换为美元
              refundReason: refund.reason || undefined,
              subscriptionEndDate: endDate,
            });

            console.log(
              `[Stripe Webhook] Refund created email sent to ${user.email}`
            );
          }
        }
      }
    } catch (emailError) {
      console.error(
        `[Stripe Webhook] Failed to send refund created email:`,
        emailError
      );
      // 不抛出错误，避免影响webhook主流程
    }
  } catch (error: any) {
    console.error(`[Stripe Webhook] Failed to handle refund created:`, error);
    throw error;
  }
}

/**
 * v5.0新增：处理支付失败事件
 */
async function handlePaymentFailed(stripe: Stripe, invoice: Stripe.Invoice) {
  try {
    console.log(
      `[Stripe Webhook] Processing payment failed for invoice: ${invoice.id}`
    );

    const subscriptionId = invoice.subscription as string;
    const customerEmail = invoice.customer_email;
    const amountDue = invoice.amount_due;
    const attemptCount = invoice.attempt_count;
    const billingReason = invoice.billing_reason;
    const failureReason =
      (invoice as any).last_payment_error?.message || "Payment failed";
    let stripeSubscriptionStatus: Stripe.Subscription.Status | null = null;

    console.log(`[Stripe Webhook] Payment failed detail:`, {
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      billing_reason: billingReason,
      attempt_count: attemptCount,
      customer_email: customerEmail,
    });

    // 首次订阅支付（subscription_create）可能处于银行验证/授权中间态，不能按真实失败处理
    if (billingReason === "subscription_create") {
      console.log(
        `[Stripe Webhook] Skip payment_failed handling for initial subscription invoice: ${invoice.id}`
      );
      return;
    }

    // 更新订阅状态为past_due
    if (subscriptionId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );
        stripeSubscriptionStatus = stripeSubscription.status;

        const existingSub = await updateSubscriptionByStripeId(subscriptionId, {
          status: "past_due" as any,
        });

        // v5.0: 记录支付失败日志
        if (existingSub) {
          await logPaymentFailed({
            subscription_id: subscriptionId,
            user_uuid: existingSub.user_uuid,
            invoice_id: invoice.id,
            amount: amountDue,
            failure_reason: failureReason,
            attempt_count: attemptCount,
          });

          // v5.0: 处理连续失败（超过3次）
          if (attemptCount >= 3) {
            console.log(
              `[Stripe Webhook] Processing subscription delinquency for ${subscriptionId}`
            );
            await processSubscriptionDelinquency(
              subscriptionId,
              existingSub.user_uuid
            );
          }
        }
      } catch (error) {
        console.error(
          `[Stripe Webhook] Failed to update subscription status:`,
          error
        );
      }
    }

    // 仅在 Stripe 明确进入 unpaid 状态时发送失败邮件，避免验证中/暂时失败误报
    const shouldSendFailureEmail = stripeSubscriptionStatus === "unpaid";
    if (customerEmail && shouldSendFailureEmail) {
      try {
        await sendPaymentFailedEmail({
          to: customerEmail,
          userName: customerEmail.split("@")[0] || "there",
          failureReason: failureReason,
          attemptCount: attemptCount,
          manageUrl: `${process.env.NEXT_PUBLIC_WEB_URL || "https://anividai.com"}/user-center`,
        });
      } catch (emailError) {
        console.error(
          `[Stripe Webhook] Failed to send payment failed email:`,
          emailError
        );
      }
    } else {
      console.log(
        `[Stripe Webhook] Suppressed payment failed email for invoice ${invoice.id} (attempt_count=${attemptCount}, stripe_subscription_status=${stripeSubscriptionStatus || "unknown"})`
      );
    }

    console.log(
      `[Stripe Webhook] Payment failed processed for invoice: ${invoice.id}`
    );
  } catch (error: any) {
    console.error(`[Stripe Webhook] Failed to handle payment failed:`, error);
    throw error;
  }
}

/**
 * v5.0新增：处理订阅 delinquency 状态
 */
async function processSubscriptionDelinquency(
  subscriptionId: string,
  userUuid: string
) {
  try {
    // 更新订阅状态为delinquent
    await updateSubscriptionByStripeId(subscriptionId, {
      status: "delinquent" as any,
    });

    // 记录delinquency日志
    await logSubscriptionDelinquency({
      subscription_id: subscriptionId,
      user_uuid: userUuid,
      from_status: "past_due",
      reason: "Multiple payment failures (3+ attempts)",
      metadata: {
        trigger: "max_attempts_exceeded",
        threshold: 3,
      },
    });

    console.log(
      `[Stripe Webhook] Subscription delinquency processed for ${subscriptionId}`
    );
  } catch (error: any) {
    console.error(`[Stripe Webhook] Failed to process delinquency:`, error);
    throw error;
  }
}

/**
 * Note: 事件重试机制已移除
 *
 * 原因：Next.js API 路由中使用 setTimeout 会导致 EPIPE 错误
 *
 * 替代方案：
 * 1. 使用外部队列系统（如 Redis + Bull）处理重试
 * 2. 配置 Stripe Dashboard 中的自动重试
 * 3. 使用专门的 webhook 处理服务
 */
