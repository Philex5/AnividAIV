import Stripe from "stripe";
import { updateOrder, updateSubOrder } from "./order";
import { sendSubscriptionThankYouEmail } from "./email";
import { createSubscription } from "@/models/subscription";
import { findOrderByOrderNo } from "@/models/order";
import { SubscriptionStatus } from "@/models/subscription";
import { logSubscriptionCreated, logPaymentSuccess } from "@/services/subscription-log.service";
import { findSubscriptionByStripeId } from "@/models/subscription";

// handle checkout session completed
export async function handleCheckoutSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  try {
    // not handle unpaid session
    if (session.payment_status !== "paid") {
      throw new Error("not handle unpaid session");
    }

    // get session metadata
    const metadata = session.metadata;
    if (!metadata || !metadata.order_no) {
      throw new Error("no metadata in session");
    }

    const subId = session.subscription as string;
  if (subId) {
    // handle subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(subId);

      // update subscription metadata
      await stripe.subscriptions.update(subId, {
        metadata: metadata,
      });

      const item = stripeSubscription.items.data[0];

      metadata["sub_id"] = subId;
      metadata["sub_times"] = "1";
      metadata["sub_interval"] = item.plan.interval;
      metadata["sub_interval_count"] = item.plan.interval_count.toString();
      metadata["sub_cycle_anchor"] =
        stripeSubscription.billing_cycle_anchor.toString();
      metadata["sub_period_start"] =
        stripeSubscription.current_period_start.toString();
      metadata["sub_period_end"] = stripeSubscription.current_period_end.toString();

    // update subscription first time paid order
    await updateSubOrder({
      order_no: metadata.order_no,
      user_email: metadata.user_email,
      sub_id: subId,
      sub_interval_count: Number(metadata.sub_interval_count),
      sub_cycle_anchor: Number(metadata.sub_cycle_anchor),
      sub_period_end: Number(metadata.sub_period_end),
      sub_period_start: Number(metadata.sub_period_start),
      sub_times: Number(metadata.sub_times || "1"), // 确保首次订阅的 sub_times 为 1
      paid_detail: JSON.stringify(session),
    });

    // 创建本地订阅记录
    console.log(`[Stripe Checkout] ==================== CREATING LOCAL SUBSCRIPTION ====================`);
    console.log(`[Stripe Checkout] Creating local subscription record for ${subId}`);
    try {
      const order = await findOrderByOrderNo(metadata.order_no);
      if (order && order.user_uuid) {
        // 验证日期有效性
        const periodStart = new Date(stripeSubscription.current_period_start * 1000);
        const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

        if (isNaN(periodStart.valueOf()) || isNaN(periodEnd.valueOf())) {
          throw new Error(`Invalid subscription period dates for ${subId}`);
        }

        console.log(`[Stripe Checkout]   - user_uuid: ${order.user_uuid}`);
        console.log(`[Stripe Checkout]   - subscription_id: ${subId}`);
        console.log(`[Stripe Checkout]   - plan_type: ${order.product_id}`);
        console.log(`[Stripe Checkout]   - interval: ${item.plan.interval}`);
        console.log(`[Stripe Checkout]   - current_period_start: ${periodStart.toISOString()}`);
        console.log(`[Stripe Checkout]   - current_period_end: ${periodEnd.toISOString()}`);

        const subscription = await createSubscription({
          user_uuid: order.user_uuid,
          subscription_id: subId,
          plan_type: order.product_id?.includes('basic') ? 'basic' :
                     order.product_id?.includes('plus') ? 'plus' :
                     order.product_id?.includes('pro') ? 'pro' : 'basic',
          interval: item.plan.interval,
          status: SubscriptionStatus.ACTIVE,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          sub_times: 1, // 首次订阅，sub_times 为 1
          total_credits: order.credits, // 传递订单中的总积分
        });

        console.log(`[Stripe Checkout] ✅ Created local subscription record successfully`);
        console.log(`[Stripe Checkout]   - subscription_id: ${subscription.subscription_id}`);
        console.log(`[Stripe Checkout]   - sub_times: ${subscription.sub_times}`);
        console.log(`[Stripe Checkout]   - status: ${subscription.status}`);

        // 记录订阅创建日志
        try {
          await logSubscriptionCreated({
            subscription_id: subId,
            user_uuid: order.user_uuid,
            plan_type: order.product_id?.includes('basic') ? 'basic' :
                       order.product_id?.includes('plus') ? 'plus' :
                       order.product_id?.includes('pro') ? 'pro' : 'basic',
            interval: item.plan.interval,
            created_by: "stripe_checkout",
          });
          console.log(`[Stripe Checkout] ✅ Logged subscription creation for ${subId}`);
        } catch (logError) {
          console.error(`[Stripe Checkout] ❌ Failed to log subscription creation:`, logError);
          // 日志失败不影响主流程
        }

        // 记录首次支付成功日志
        try {
          await logPaymentSuccess({
            subscription_id: subId,
            user_uuid: order.user_uuid,
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            invoice_id: session.id,
          });
          console.log(`[Stripe Checkout] ✅ Logged payment success for ${subId}`);
        } catch (logError) {
          console.error(`[Stripe Checkout] ❌ Failed to log payment success:`, logError);
          // 日志失败不影响主流程
        }

        // Note: GTM payment success events are now handled on the frontend payment_success page
        // This avoids the issue where GTM cannot receive events when users are not on the page
      } else {
        console.warn(`[Stripe Checkout] ⚠️  WARNING: Order or user_uuid not found for ${metadata.order_no}`);
        console.warn(`[Stripe Checkout]   Order exists: ${!!order}`);
        console.warn(`[Stripe Checkout]   Has user_uuid: ${order?.user_uuid ? 'yes' : 'no'}`);
      }
      console.log(`[Stripe Checkout] ====================================================================`);
    } catch (error) {
      console.error(`[Stripe Checkout] ❌ CRITICAL: Failed to create local subscription record:`, error);
      console.error(`[Stripe Checkout]   Error name: ${(error as any)?.name}`);
      console.error(`[Stripe Checkout]   Error message: ${(error as any)?.message}`);
      console.error(`[Stripe Checkout]   Stack: ${(error as any)?.stack}`);
      console.error(`[Stripe Checkout] This subscription will not be tracked locally!`);
      // 不抛出错误，因为订单更新已成功
    }

    // send subscription thank-you email (only for first-time subscription)
    try {
      const toEmail = metadata.user_email || session.customer_details?.email || session.customer_email || "";
      if (toEmail) {
        const item = stripeSubscription.items.data[0];
        const planName = (metadata.product_name as string) || item.plan.nickname || "Premium";
        const nextBillingDate = stripeSubscription.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString()
          : "";
        const startDate = stripeSubscription.current_period_start
          ? new Date(stripeSubscription.current_period_start * 1000).toLocaleDateString()
          : new Date().toLocaleDateString();
        const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://anividai.com";
        const manageUrl = `${webUrl}/user-center`;

        // 从 session metadata 获取正确的 MC 数量
        let mcAmount = parseInt(metadata.credits as string) || 0;

        // 获取用户 uuid 以查询正确的会员等级
        const order = await findOrderByOrderNo(metadata.order_no);

        // 根据计划类型设置 OC 限制（使用正确的值）
        let ocLimit: number | undefined = undefined; // undefined 表示让邮件函数根据会员等级自动计算
        if (order?.user_uuid) {
          // 动态获取用户的 OC 限制
          try {
            const { getUserOcLimit } = await import("@/services/membership");
            ocLimit = await getUserOcLimit(order.user_uuid);
          } catch (error) {
            console.error(`Failed to get OC limit for user ${order.user_uuid}:`, error);
            // 使用默认值
            const planType = (metadata.product_name as string)?.toLowerCase() || planName.toLowerCase();
            if (planType.includes('basic')) {
              ocLimit = 50;
            } else if (planType.includes('plus')) {
              ocLimit = 30;
            } else if (planType.includes('pro')) {
              ocLimit = Infinity;
            }
          }
        }

        // 判断是否为年度订阅
        const isAnnual = item.plan.interval === 'year';

        await sendSubscriptionThankYouEmail({
          to: toEmail,
          userName: session.customer_details?.name || "there",
          userUuid: order?.user_uuid,
          planName,
          startDate,
          nextBillingDate,
          manageUrl,
          mcAmount,
          ocLimit,
          isAnnual,
          earlyAccess: false, // 默认不启用早期访问
        });
        console.log(`Subscription thank you email sent to ${toEmail}`);
      }
    } catch (emailError) {
      console.error(`Failed to send subscription thank you email:`, emailError);
      // do not throw – email failure shouldn't block order update
    }

    return;
  }

    // update one-time payment order
    const order_no = metadata.order_no;
    const paid_email =
      session.customer_details?.email || session.customer_email || "";
    const paid_detail = JSON.stringify(session);

    await updateOrder({ order_no, paid_email, paid_detail });

    // Note: GTM payment success events are now handled on the frontend payment_success page
    // This avoids the issue where GTM cannot receive events when users are not on the page

  // one-time payments should not trigger subscription thank-you email
  } catch (e) {
    console.log("handle session completed failed: ", e);
    throw e;
  }
}

// handle invoice payment succeeded
export async function handleInvoice(stripe: Stripe, invoice: Stripe.Invoice) {
  try {
    console.log(`[Stripe Invoice] ==================== START ====================`);
    console.log(`[Stripe Invoice] Processing invoice: ${invoice.id}`);
    console.log(`[Stripe Invoice]   - subscription: ${invoice.subscription}`);
    console.log(`[Stripe Invoice]   - amount_paid: ${invoice.amount_paid} (${invoice.currency})`);
    console.log(`[Stripe Invoice]   - billing_reason: ${invoice.billing_reason}`);
    console.log(`[Stripe Invoice]   - status: ${invoice.status}`);
    console.log(`[Stripe Invoice]   - customer: ${invoice.customer}`);
    console.log(`[Stripe Invoice]   - customer_email: ${invoice.customer_email}`);
    console.log(`[Stripe Invoice] ==================================================`);

    // not handle unpaid invoice
    if (invoice.status !== "paid") {
      console.log(`[Stripe Invoice] ❌ Invoice ${invoice.id} is not paid (status: ${invoice.status}), skipping`);
      throw new Error("not handle unpaid invoice");
    }

    let subId = invoice.subscription as string;
    console.log(`[Stripe Invoice] Initial subscription ID from invoice.subscription: ${subId}`);

    // 如果 invoice.subscription 为空，尝试从其他位置获取订阅ID
    if (!subId) {
      console.log(`[Stripe Invoice] ⚠️  No subscription ID in invoice.subscription, trying alternative sources...`);

      // 方式1: 从 invoice.parent.subscription_details.subscription 获取
      if ((invoice as any).parent?.subscription_details?.subscription) {
        subId = (invoice as any).parent.subscription_details.subscription;
        console.log(`[Stripe Invoice] ✅ Found subscription ID from invoice.parent.subscription_details.subscription: ${subId}`);
      }
      // 方式2: 从 invoice.lines[0].parent.subscription_item_details.subscription 获取
      else if ((invoice.lines?.data?.[0] as any)?.parent?.subscription_item_details?.subscription) {
        subId = (invoice.lines!.data[0] as any).parent.subscription_item_details.subscription;
        console.log(`[Stripe Invoice] ✅ Found subscription ID from invoice.lines[0].parent.subscription_item_details.subscription: ${subId}`);
      }
      // 方式3: 通过 customer 搜索订阅
      else if (invoice.customer) {
        console.log(`[Stripe Invoice] Trying to find via customer subscriptions...`);

        try {
          // 获取客户的所有订阅
          const subscriptions = await stripe.subscriptions.list({
            customer: invoice.customer as string,
            status: 'all',
            limit: 10,
          });

          console.log(`[Stripe Invoice] Found ${subscriptions.data.length} subscription(s) for customer ${invoice.customer}`);

          // 查找包含当前发票的订阅
          for (const sub of subscriptions.data) {
            // 检查订阅的发票列表
            const invoices = await stripe.invoices.list({
              subscription: sub.id,
              limit: 10,
            });

            const hasInvoice = invoices.data.some(inv => inv.id === invoice.id);
            if (hasInvoice) {
              subId = sub.id;
              console.log(`[Stripe Invoice] ✅ Found matching subscription: ${subId} for invoice ${invoice.id}`);
              console.log(`[Stripe Invoice]   - Subscription status: ${sub.status}`);
              console.log(`[Stripe Invoice]   - Current period: ${sub.current_period_start} - ${sub.current_period_end}`);
              break;
            }
          }

          if (!subId) {
            console.log(`[Stripe Invoice] ❌ Could not find subscription for invoice ${invoice.id} via customer subscriptions`);
          }
        } catch (error) {
          console.error(`[Stripe Invoice] ❌ Failed to search for subscription via customer:`, error);
        }
      }
    }

    console.log(`[Stripe Invoice] Final subscription ID: ${subId}`);

    // not handle none-subscription payment
    if (!subId) {
      console.log(`[Stripe Invoice] ⚠️  No subscription ID found for invoice ${invoice.id}, treating as one-time payment, skipping`);
      return; // 静默忽略，而不是抛出错误
    }

    // not handle first subscription, because it's be handled in session completed event
    if (invoice.billing_reason === "subscription_create") {
      console.log(`[Stripe Invoice] ⏭️  Skipping first subscription invoice (billing_reason: subscription_create): ${invoice.id}`);
      return;
    }

    console.log(`[Stripe Invoice] ✅ Processing RENEWAL payment for subscription: ${subId}`);
    console.log(`[Stripe Invoice]   - billing_reason indicates this is a renewal: ${invoice.billing_reason}`);

    // get subscription
    console.log(`[Stripe Invoice] Retrieving subscription from Stripe...`);
    const subscription = await stripe.subscriptions.retrieve(subId);
    console.log(`[Stripe Invoice]   - Subscription status: ${subscription.status}`);
    console.log(`[Stripe Invoice]   - Current period: ${subscription.current_period_start} - ${subscription.current_period_end}`);

    let metadata = subscription.metadata;
    console.log(`[Stripe Invoice] Current subscription metadata:`, metadata);

    if (!metadata || !metadata.order_no) {
      console.log(`[Stripe Invoice] ⚠️  No metadata or order_no in subscription ${subId}, trying alternative sources...`);

      // 方式1: 从 invoice.lines[0].metadata 获取
      if (invoice.lines?.data?.[0]?.metadata?.order_no) {
        console.log(`[Stripe Invoice] Found metadata from invoice.lines[0].metadata:`, invoice.lines.data[0].metadata);
        metadata = invoice.lines.data[0].metadata;
        console.log(`[Stripe Invoice] ✅ Using metadata from invoice line item`);

        // 可选：更新到订阅 metadata 中
        try {
          await stripe.subscriptions.update(subId, { metadata });
          console.log(`[Stripe Invoice] ✅ Successfully updated subscription metadata`);
        } catch (error) {
          console.log(`[Stripe Invoice] ⚠️  Failed to update subscription metadata:`, error);
        }
      }
      // 方式2: 从 checkout session 获取
      else {
        console.log(`[Stripe Invoice] Fetching metadata from checkout sessions...`);
        // get subscription session metadata
        const checkoutSessions = await stripe.checkout.sessions.list({
          subscription: subId,
        });

        console.log(`[Stripe Invoice] Found ${checkoutSessions.data.length} checkout session(s) for subscription ${subId}`);

        if (checkoutSessions.data.length > 0) {
          const session = checkoutSessions.data[0];
          console.log(`[Stripe Invoice] Using most recent checkout session: ${session.id}`);
          console.log(`[Stripe Invoice] Session metadata:`, session.metadata);

          if (session.metadata) {
            metadata = session.metadata;
            console.log(`[Stripe Invoice] Updating subscription metadata with session metadata...`);
            await stripe.subscriptions.update(subId, {
              metadata: metadata,
            });
            console.log(`[Stripe Invoice] ✅ Successfully updated metadata from checkout session`);
            console.log(`[Stripe Invoice] Final metadata:`, metadata);
          }
        }
      }
    }

    if (!metadata || !metadata.order_no) {
      console.error(`[Stripe Invoice] ❌ CRITICAL: No metadata found for subscription: ${subId}`);
      console.error(`[Stripe Invoice] This subscription cannot be processed without order_no metadata`);
      throw new Error(`no metadata in subscription: ${subId}`);
    }

    console.log(`[Stripe Invoice] ✅ Metadata validation passed`);
    console.log(`[Stripe Invoice]   - order_no: ${metadata.order_no}`);
    console.log(`[Stripe Invoice]   - user_email: ${metadata.user_email}`);
    console.log(`[Stripe Invoice]   - product_id: ${metadata.product_id}`);
    console.log(`[Stripe Invoice]   - credits: ${metadata.credits}`);

    // get subscription item
    const item = subscription.items.data[0];
    console.log(`[Stripe Invoice] Subscription item details:`);
    console.log(`[Stripe Invoice]   - Price ID: ${item.price.id}`);
    console.log(`[Stripe Invoice]   - Interval: ${item.price.recurring?.interval}`);
    console.log(`[Stripe Invoice]   - Interval count: ${item.price.recurring?.interval_count}`);
    console.log(`[Stripe Invoice]   - Amount: ${item.price.unit_amount}`);

    const anchor = subscription.billing_cycle_anchor;
    const start = subscription.current_period_start;
    const end = subscription.current_period_end;

    console.log(`[Stripe Invoice] Subscription cycle calculation:`);
    console.log(`[Stripe Invoice]   - billing_cycle_anchor: ${anchor}`);
    console.log(`[Stripe Invoice]   - current_period_start: ${start}`);
    console.log(`[Stripe Invoice]   - current_period_end: ${end}`);

    // 验证订阅周期数据
    if (!anchor || !start || !end || end <= start) {
      console.error(`[Stripe Invoice] ❌ Invalid subscription period data for ${subId}`);
      throw new Error(`Invalid subscription period data for ${subId}`);
    }

    // 🎯 优先使用元数据中的 sub_times（从 checkout session 设置）
    // 这是最可靠的方式，避免计算误差
    let subTimes: number;

    if (metadata?.sub_times) {
      // 从元数据获取（最可靠）
      subTimes = Number(metadata.sub_times);
      console.log(`[Stripe Invoice] ✅ Using sub_times from metadata: ${subTimes}`);
    } else {
      // 计算得出（可能有误差，仅作为备选）
      console.log(`[Stripe Invoice] ⚠️  No sub_times in metadata, calculating...`);
      const periodDuration = end - start;
      subTimes = Math.round((start - anchor) / periodDuration) + 1;
      console.log(`[Stripe Invoice]   - periodDuration: ${periodDuration} seconds (${periodDuration / 86400} days)`);
      console.log(`[Stripe Invoice]   - Calculated subTimes: ${subTimes}`);
    }

    console.log(`[Stripe Invoice] ✅ Final subscription cycle info:`);
    console.log(`[Stripe Invoice]   - subTimes: ${subTimes} (this is renewal #${subTimes})`);

    const updatedMetadata = {
      ...metadata,
      "sub_id": subId,
      "sub_times": subTimes.toString(),
      "sub_interval": item.price.recurring?.interval || "month",
      "sub_interval_count": item.price.recurring?.interval_count?.toString() || "1",
      "sub_cycle_anchor": subscription.billing_cycle_anchor.toString(),
      "sub_period_start": subscription.current_period_start.toString(),
      "sub_period_end": subscription.current_period_end.toString(),
    };

    console.log(`[Stripe Invoice] Prepared metadata for updateSubOrder:`, updatedMetadata);

    console.log(`[Stripe Invoice] ==================== CALLING updateSubOrder ====================`);
    console.log(`[Stripe Invoice] Calling updateSubOrder for renewal (subTimes=${subTimes})...`);

    // create renew order
    await updateSubOrder({
      order_no: metadata.order_no,
      user_email: metadata.user_email,
      sub_id: subId,
      sub_interval_count: Number(updatedMetadata.sub_interval_count),
      sub_cycle_anchor: Number(updatedMetadata.sub_cycle_anchor),
      sub_period_end: Number(updatedMetadata.sub_period_end),
      sub_period_start: Number(updatedMetadata.sub_period_start),
      sub_times: Number(updatedMetadata.sub_times),
      paid_detail: JSON.stringify(invoice),
    });

    console.log(`[Stripe Invoice] ✅ updateSubOrder completed successfully`);
    console.log(`[Stripe Invoice] ==================== SUCCESS ====================`);

    // 记录续费支付成功日志
    try {
      const subscription = await findSubscriptionByStripeId(subId);
      if (subscription) {
        console.log(`[Stripe Invoice] Logging payment success for subscription ${subId}...`);
        await logPaymentSuccess({
          subscription_id: subId,
          user_uuid: subscription.user_uuid,
          amount: invoice.amount_paid || 0,
          currency: invoice.currency || 'usd',
          invoice_id: invoice.id,
        });
        console.log(`[Stripe Invoice] ✅ Payment success logged for ${subId}`);
      } else {
        console.log(`[Stripe Invoice] ⚠️  No local subscription found for ${subId}, skipping log`);
      }
    } catch (logError) {
      console.error(`[Stripe Invoice] ❌ Failed to log renewal payment success:`, logError);
      // 日志失败不影响主流程
    }

    // Note: GTM payment success events are now handled on the frontend payment_success page
    // This avoids the issue where GTM cannot receive events when users are not on the page

    console.log(`[Stripe Invoice] 🎉 Renewal payment processing completed for subscription: ${subId}`);
  } catch (e) {
    console.error(`[Stripe Invoice] ❌ ==================== ERROR ====================`);
    console.error(`[Stripe Invoice] Failed to handle invoice payment succeeded:`, e);
    console.error(`[Stripe Invoice] Invoice ID: ${invoice?.id}`);
    console.error(`[Stripe Invoice] Subscription ID: ${invoice?.subscription}`);
    console.error(`[Stripe Invoice] Error message:`, e instanceof Error ? e.message : String(e));
    console.error(`[Stripe Invoice] Error stack:`, e instanceof Error ? e.stack : undefined);
    console.error(`[Stripe Invoice] ==============================================`);
    throw e;
  }
}
