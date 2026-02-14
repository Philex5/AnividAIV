/**
 * API: 取消订阅
 * POST /api/subscriptions/cancel
 * 统一使用period_end（到期末取消）方式
 * v5.1优化：移除immediate立即取消方式，避免用户损失
 *
 * Body:
 * {
 *   "sub_id": "sub_xxx",  // Stripe订阅ID
 *   "reason": "user_request"  // 取消原因（可选）
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrdersByUserUuid } from "@/models/order";
import { updateSubscriptionByStripeId } from "@/models/subscription";
import { SubscriptionStatus } from "@/models/subscription";
import { logSubscriptionCanceled } from "@/services/subscription-log.service";

type StripeSubscriptionSnapshot = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: number | null;
  current_period_end: number | null;
  canceled_at: number | null;
};

type StripeApiError = Error & {
  type?: string;
  code?: string;
  statusCode?: number;
  requestId?: string;
  raw?: {
    message?: string;
    type?: string;
    code?: string;
    request_log_url?: string;
  };
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const STRIPE_MAX_RETRIES = 2;
const STRIPE_TIMEOUT_MS = 10000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toStripeError(params: {
  message: string;
  type?: string;
  code?: string;
  statusCode?: number;
  requestId?: string;
  raw?: StripeApiError["raw"];
}): StripeApiError {
  const error = new Error(params.message) as StripeApiError;
  error.type = params.type;
  error.code = params.code;
  error.statusCode = params.statusCode;
  error.requestId = params.requestId;
  error.raw = params.raw;
  return error;
}

function shouldRetryNetworkError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const name = (error as { name?: string }).name;
  return name === "AbortError" || name === "TypeError";
}

async function stripeRequest<T>({
  secretKey,
  method,
  path,
  body,
  idempotencyKey,
}: {
  secretKey: string;
  method: "GET" | "POST";
  path: string;
  body?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<T> {
  const url = `${STRIPE_API_BASE}${path}`;
  const requestBody = body ? new URLSearchParams(body).toString() : undefined;

  for (let attempt = 0; attempt <= STRIPE_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STRIPE_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          ...(requestBody
            ? { "Content-Type": "application/x-www-form-urlencoded" }
            : {}),
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: requestBody,
        signal: controller.signal,
      });

      const requestId = response.headers.get("request-id") || undefined;
      const text = await response.text();
      let json: unknown = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }

      if (response.ok) {
        return json as T;
      }

      const stripeErr = (json as { error?: StripeApiError["raw"] } | null)
        ?.error;
      const error = toStripeError({
        message: stripeErr?.message || `Stripe API request failed: ${response.status}`,
        type: stripeErr?.type || "StripeAPIError",
        code: stripeErr?.code,
        statusCode: response.status,
        requestId,
        raw: stripeErr,
      });

      if (response.status >= 500 && attempt < STRIPE_MAX_RETRIES) {
        await wait(200 * Math.pow(2, attempt));
        continue;
      }

      throw error;
    } catch (error) {
      if (attempt < STRIPE_MAX_RETRIES && shouldRetryNetworkError(error)) {
        await wait(200 * Math.pow(2, attempt));
        continue;
      }

      if (shouldRetryNetworkError(error)) {
        throw toStripeError({
          message:
            "An error occurred with our connection to Stripe. Request was retried 2 times.",
          type: "StripeConnectionError",
        });
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw toStripeError({
    message: "Stripe request retry limit reached",
    type: "StripeConnectionError",
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestContext = {
    path: request.nextUrl.pathname,
    method: request.method,
    cfRay: request.headers.get("cf-ray"),
    cfIpCountry: request.headers.get("cf-ipcountry"),
    userAgent: request.headers.get("user-agent"),
  };

  try {
    const session = await auth();
    if (!session?.user?.uuid) {
      console.warn("Cancel subscription unauthorized", {
        ...requestContext,
        elapsedMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userUuid = session.user.uuid;
    const { sub_id, reason } = await request.json();

    console.info("Cancel subscription request received", {
      ...requestContext,
      userUuid,
      subId: sub_id,
      reason: reason || "user_request",
    });

    if (!sub_id) {
      console.warn("Cancel subscription missing sub_id", {
        ...requestContext,
        userUuid,
        elapsedMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // 验证订阅是否属于当前用户
    const orders = await getOrdersByUserUuid(userUuid) || [];
    const userSubscriptions = orders.filter(
      (order) => order.sub_id === sub_id &&
                 (order.interval === 'month' || order.interval === 'year')
    );

    if (userSubscriptions.length === 0) {
      console.warn("Cancel subscription not found for user", {
        ...requestContext,
        userUuid,
        subId: sub_id,
        elapsedMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Subscription not found or not owned by user" },
        { status: 404 }
      );
    }

    const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY;
    if (!stripePrivateKey) {
      throw new Error("STRIPE_PRIVATE_KEY is not set");
    }

    // 获取订阅信息用于更新本地状态
    const stripeSubscription = await stripeRequest<StripeSubscriptionSnapshot>({
      secretKey: stripePrivateKey,
      method: "GET",
      path: `/subscriptions/${encodeURIComponent(sub_id)}`,
    });

    const currentPeriodEndIso = stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
      : null;

    // 幂等处理：订阅已取消时，避免再次调用 update 导致 Stripe 400
    if (stripeSubscription.status === "canceled") {
      await updateSubscriptionByStripeId(sub_id, {
        status: SubscriptionStatus.CANCELED,
        current_period_start: stripeSubscription.current_period_start
          ? new Date(stripeSubscription.current_period_start * 1000)
          : undefined,
        current_period_end: stripeSubscription.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000)
          : undefined,
        canceled_at: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : new Date(),
      });

      console.info("Cancel subscription idempotent already canceled", {
        ...requestContext,
        userUuid,
        subId: sub_id,
        elapsedMs: Date.now() - startedAt,
      });

      return NextResponse.json({
        success: true,
        message: "Subscription is already canceled.",
        cancel_type: "already_canceled",
        current_period_end: currentPeriodEndIso,
      });
    }

    // 幂等处理：已设置到期末取消时，直接返回成功
    if (stripeSubscription.cancel_at_period_end) {
      await updateSubscriptionByStripeId(sub_id, {
        status: SubscriptionStatus.PENDING_CANCEL,
        current_period_start: stripeSubscription.current_period_start
          ? new Date(stripeSubscription.current_period_start * 1000)
          : undefined,
        current_period_end: stripeSubscription.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000)
          : undefined,
        canceled_at: new Date(),
      });

      console.info("Cancel subscription idempotent period_end already set", {
        ...requestContext,
        userUuid,
        subId: sub_id,
        elapsedMs: Date.now() - startedAt,
      });

      return NextResponse.json({
        success: true,
        message: "Subscription is already scheduled to cancel at period end.",
        cancel_type: "period_end",
        current_period_end: currentPeriodEndIso,
      });
    }

    // v5.1优化：统一使用period_end（到期末取消）
    // 不再支持immediate立即取消，避免用户权益损失
    const subscription = await stripeRequest<StripeSubscriptionSnapshot>({
      secretKey: stripePrivateKey,
      method: "POST",
      path: `/subscriptions/${encodeURIComponent(sub_id)}`,
      body: {
        cancel_at_period_end: "true",
      },
      idempotencyKey: `cancel-subscription:${sub_id}:${userUuid}`,
    });
    console.log(`[v5.1] Subscription ${sub_id} set to cancel at period end (reason: ${reason || 'user_request'})`);
    const updatedCurrentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : undefined;
    const updatedCurrentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : undefined;

    // 更新本地订阅状态为pending_cancel
    try {
      await updateSubscriptionByStripeId(sub_id, {
        status: SubscriptionStatus.PENDING_CANCEL,
        current_period_start: updatedCurrentPeriodStart,
        current_period_end: updatedCurrentPeriodEnd,
        canceled_at: new Date(),
      });
      console.log(`[v5.1] Local subscription status updated to pending_cancel for ${sub_id}`);

      // 记录取消订阅日志
      try {
        await logSubscriptionCanceled({
          subscription_id: sub_id,
          user_uuid: userUuid,
          from_status: stripeSubscription.status,
          cancel_type: "period_end", // 统一为period_end
          canceled_by: userUuid,
        });
        console.log(`[v5.1] Logged subscription cancellation for ${sub_id}`);
      } catch (logError) {
        console.error(`Failed to log subscription cancellation:`, logError);
        // 日志失败不影响业务逻辑
      }
    } catch (error) {
      console.error(`Failed to update local subscription status:`, error);
    }

    // 返回成功响应
    console.info("Cancel subscription request succeeded", {
      ...requestContext,
      userUuid,
      subId: sub_id,
      elapsedMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription will be canceled at the end of the current billing period. You will continue to have access to all premium features until then.",
      cancel_type: "period_end",
      current_period_end:
        updatedCurrentPeriodEnd?.toISOString() || currentPeriodEndIso,
    });

  } catch (error: any) {
    // 兜底：如果并发场景下Stripe状态刚变为canceled，按幂等成功处理
    if (error?.code === "invalid_canceled_subscription_fields") {
      return NextResponse.json({
        success: true,
        message: "Subscription was already canceled.",
        cancel_type: "already_canceled",
      });
    }

    const errorMessage = error?.message || "Failed to cancel subscription";
    const errorType = error?.type || "UnknownError";

    console.error("Cancel subscription failed:", {
      ...requestContext,
      message: errorMessage,
      type: errorType,
      code: error?.code,
      statusCode: error?.statusCode,
      requestId: error?.requestId,
      elapsedMs: Date.now() - startedAt,
    });

    // Stripe 网络连接异常：返回 503，提示前端重试
    if (
      errorType === "StripeConnectionError" ||
      /connection to Stripe/i.test(errorMessage)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Temporary connection issue with Stripe. Please retry shortly.",
          code: "stripe_connection_error",
          retryable: true,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
