import { updateCreditForOrder } from "./credit";
import {
  findOrderByOrderNo,
  insertOrder,
  OrderStatus,
  updateOrderStatus,
  updateOrderSubscription,
} from "@/models/order";
import { getIsoTimestr } from "@/lib/time";

import { updateAffiliateForOrder } from "./affiliate";
import { updateMembershipFromOrder } from "./membership";
import { Order } from "@/types/order";
import Stripe from "stripe";
import { orders } from "@/db/schema";
import { updateSubscriptionSubTimes } from "@/models/subscription";
import { updateUserSubStatus } from "@/models/user";

// update paied order, call by async callback
export async function updateOrder({
  order_no,
  paid_email,
  paid_detail,
}: {
  order_no: string;
  paid_email: string;
  paid_detail: string;
}) {
  try {
    if (!order_no || !paid_email || !paid_email) {
      throw new Error("invalid params");
    }

    // query order
    const order = await findOrderByOrderNo(order_no);
    if (!order) {
      throw new Error("invalid order");
    }

    // order already paied
    if (order.status === OrderStatus.Paid) {
      return;
    }

    // only update order status from created to paid
    if (order.status !== OrderStatus.Created) {
      throw new Error("invalid order status");
    }

    const paid_at = getIsoTimestr();
    await updateOrderStatus(
      order_no,
      OrderStatus.Paid,
      paid_at,
      paid_email,
      paid_detail
    );

    if (order.user_uuid) {
      // update membership level from order
      if (order.product_id) {
        if (!order.sub_period_end) {
          throw new Error("missing sub_period_end for initial subscription");
        }
        const periodEndDate = new Date(order.sub_period_end * 1000);
        if (isNaN(periodEndDate.valueOf())) {
          throw new Error("invalid sub_period_end for initial subscription");
        }
        await updateMembershipFromOrder({
          product_id: order.product_id,
          user_uuid: order.user_uuid,
          sub_period_end: periodEndDate,
          valid_months: order.valid_months,
        });

        // ensure users.sub_expired_at aligns with Stripe period end
        await updateUserSubStatus(
          order.user_uuid,
          true,
          periodEndDate,
          order.product_id?.includes("basic")
            ? "basic"
            : order.product_id?.includes("plus")
              ? "plus"
              : order.product_id?.includes("pro")
                ? "pro"
                : "basic"
        );
      }

      if (order.credits > 0) {
        // increase credits for paied order
        await updateCreditForOrder(order as unknown as Order);
      }

      // update affiliate for paied order
      await updateAffiliateForOrder(order as unknown as Order);
    }
  } catch (e) {
    console.log("update order failed: ", e);
    throw e;
  }
}

// update subscription order, call by async notify
export async function updateSubOrder({
  order_no,
  user_email,
  sub_id,
  sub_interval_count,
  sub_cycle_anchor,
  sub_period_end,
  sub_period_start,
  sub_times,
  paid_detail,
}: {
  order_no: string;
  user_email: string;
  sub_id: string;
  sub_interval_count: number;
  sub_cycle_anchor: number;
  sub_period_end: number;
  sub_period_start: number;
  sub_times: number;
  paid_detail: string;
}) {
  try {
    if (!order_no || !user_email || !paid_detail) {
      throw new Error("invalid params");
    }

    // not subscribe
    if (
      !sub_id ||
      !sub_interval_count ||
      !sub_cycle_anchor ||
      !sub_period_end ||
      !sub_period_start ||
      !sub_times
    ) {
      throw new Error("invalid subscription info");
    }

    const order = await findOrderByOrderNo(order_no);
    if (
      !order ||
      !order.amount ||
      !order.currency ||
      !order.stripe_session_id ||
      order.user_email !== user_email
    ) {
      throw new Error("invalid order");
    }

    // not subscription
    if (order.interval !== "year" && order.interval !== "month") {
      throw new Error("invalid subscription interval");
    }

    // subscribe first payment
    if (Number(sub_times) === 1) {
      // order paied
      if (order.status === OrderStatus.Paid) {
        return;
      }

      // update order to be paied
      const paied_at = getIsoTimestr();
      await updateOrderSubscription(
        order_no,
        sub_id,
        sub_interval_count,
        sub_cycle_anchor,
        sub_period_end,
        sub_period_start,
        OrderStatus.Paid,
        paied_at,
        sub_times,
        user_email,
        paid_detail
      );

      if (order.user_uuid) {
        // update membership level from order
        if (order.product_id) {
          await updateMembershipFromOrder({
            product_id: order.product_id,
            user_uuid: order.user_uuid,
            sub_period_end: order.sub_period_end
              ? new Date(order.sub_period_end * 1000)
              : undefined,
            valid_months: order.valid_months,
          });
        }

        if (order.credits > 0) {
          // increase credits for paied order
          await updateCreditForOrder(order as unknown as Order);
        }

        // update affiliate for paied order
        await updateAffiliateForOrder(order as unknown as Order);
      }

      return;
    }

    // subscribe renew
    if (Number(sub_times) > 1) {
      const renew_order_no = `${order.order_no}_${sub_times}`;

      console.log(`[UpdateSubOrder] ==================== RENEWAL PROCESSING ====================`);
      console.log(`[UpdateSubOrder] Processing RENEWAL payment`);
      console.log(`[UpdateSubOrder]   - Original order_no: ${order.order_no}`);
      console.log(`[UpdateSubOrder]   - Renewal order_no: ${renew_order_no}`);
      console.log(`[UpdateSubOrder]   - sub_times: ${sub_times} (this is renewal #${sub_times})`);
      console.log(`[UpdateSubOrder]   - Original credits: ${order.credits}`);
      console.log(`[UpdateSubOrder]   - Interval: ${order.interval}`);
      console.log(`[UpdateSubOrder]   - User UUID: ${order.user_uuid}`);
      console.log(`[UpdateSubOrder]   - User Email: ${order.user_email}`);
      console.log(`[UpdateSubOrder] ============================================================`);

      const currentDate = new Date();
      const created_at = currentDate;

      // align renewal expiration with Stripe current_period_end
      const expired_at = new Date(sub_period_end * 1000);
      if (isNaN(expired_at.valueOf())) {
        throw new Error("invalid sub_period_end for renewal");
      }
      console.log(
        `[UpdateSubOrder]   - Expired at: ${expired_at.toISOString()} (from Stripe current_period_end)`
      );

      const paid_at = new Date();
      console.log(`[UpdateSubOrder] Paid at: ${paid_at.toISOString()}`);

      // create renew order
      const renew_order: Order = {
        order_no: renew_order_no,
        created_at: created_at,
        user_uuid: order.user_uuid,
        user_email: order.user_email,
        amount: order.amount,
        interval: order.interval,
        expired_at: expired_at,
        status: OrderStatus.Paid,
        credits: order.credits,
        currency: order.currency,
        sub_id: sub_id,
        sub_interval_count: sub_interval_count,
        sub_cycle_anchor: sub_cycle_anchor,
        sub_period_end: sub_period_end,
        sub_period_start: sub_period_start,
        sub_times: sub_times,
        stripe_session_id: order.stripe_session_id,
        paid_at: paid_at,
        paid_email: user_email,
        paid_detail: paid_detail,
        product_id: order.product_id || "",
        product_name: order.product_name || "",
        valid_months: order.valid_months || 0,
        order_detail: order.order_detail || "",
      };

      console.log(`[UpdateSubOrder] ==================== INSERTING RENEWAL ORDER ====================`);
      console.log(`[UpdateSubOrder] Order details:`);
      console.log(`[UpdateSubOrder]   - order_no: ${renew_order.order_no}`);
      console.log(`[UpdateSubOrder]   - user_uuid: ${renew_order.user_uuid}`);
      console.log(`[UpdateSubOrder]   - amount: ${renew_order.amount}`);
      console.log(`[UpdateSubOrder]   - credits: ${renew_order.credits}`);
      console.log(`[UpdateSubOrder]   - interval: ${renew_order.interval}`);
      console.log(`[UpdateSubOrder]   - status: ${renew_order.status}`);
      console.log(`[UpdateSubOrder]   - product_id: ${renew_order.product_id}`);
      console.log(`[UpdateSubOrder]   - product_name: ${renew_order.product_name}`);
      console.log(`[UpdateSubOrder] ==================================================================`);

      console.log(`[UpdateSubOrder] Inserting renewal order into database...`);
      await insertOrder(renew_order as unknown as typeof orders.$inferInsert);
      console.log(`[UpdateSubOrder] ✅ Renewal order inserted successfully`);

      console.log(`[UpdateSubOrder] ==================== UPDATING MEMBERSHIP ====================`);
      if (renew_order.user_uuid) {
        console.log(`[UpdateSubOrder] Updating membership level from renew order...`);
        // update membership level from renew order
        if (renew_order.product_id) {
          await updateMembershipFromOrder({
            product_id: renew_order.product_id,
            user_uuid: renew_order.user_uuid,
            sub_period_end: renew_order.sub_period_end
              ? new Date(renew_order.sub_period_end * 1000)
              : undefined,
            valid_months: renew_order.valid_months,
          });
        }
        console.log(`[UpdateSubOrder] ✅ Membership level updated`);

        if (renew_order.credits > 0) {
          console.log(`[UpdateSubOrder] ==================== PROCESSING CREDITS ====================`);
          console.log(`[UpdateSubOrder] ✅ Credits to be issued: ${renew_order.credits}`);
          console.log(`[UpdateSubOrder] Calling updateCreditForOrder for renewal...`);
          console.log(`[UpdateSubOrder] Order passed to updateCreditForOrder:`, {
            order_no: renew_order.order_no,
            interval: renew_order.interval,
            credits: renew_order.credits,
            user_uuid: renew_order.user_uuid,
          });

          // increase credits for paied order
          await updateCreditForOrder(renew_order as unknown as Order);
          console.log(`[UpdateSubOrder] ✅ updateCreditForOrder completed successfully`);
          console.log(`[UpdateSubOrder] =============================================================`);
        } else {
          console.warn(`[UpdateSubOrder] ⚠️  WARNING: renew_order.credits is ${renew_order.credits}, skipping credit update`);
        }

        // update affiliate for paied order
        console.log(`[UpdateSubOrder] Updating affiliate for renew order...`);
        await updateAffiliateForOrder(renew_order as unknown as Order);
        console.log(`[UpdateSubOrder] ✅ Affiliate updated`);

        // 计算新的会员到期时间（从当前周期结束时间计算）
        const newSubExpiredAt = new Date(sub_period_end * 1000);
        console.log(`[UpdateSubOrder] ==================== UPDATING USERS TABLE ====================`);
        console.log(`[UpdateSubOrder] Updating users table sub_expired_at: ${newSubExpiredAt.toISOString()}`);
        try {
          await updateUserSubStatus(
            renew_order.user_uuid,
            true, // is_sub
            newSubExpiredAt, // sub_expired_at
            renew_order.product_id?.includes('basic') ? 'basic' :
                   renew_order.product_id?.includes('plus') ? 'plus' :
                   renew_order.product_id?.includes('pro') ? 'pro' : 'basic' // sub_plan_type
          );
          console.log(`[UpdateSubOrder] ✅ Users table updated successfully`);
          console.log(`[UpdateSubOrder]   - user_uuid: ${renew_order.user_uuid}`);
          console.log(`[UpdateSubOrder]   - sub_expired_at: ${newSubExpiredAt.toISOString()}`);
          console.log(`[UpdateSubOrder] ====================================================================`);
        } catch (userUpdateError) {
          console.error(`[UpdateSubOrder] ❌ Failed to update users table:`, userUpdateError);
          // 不抛出错误，因为订单和积分更新已成功
        }

        // 更新 subscriptions 表的 sub_times、周期时间和更新时间
        console.log(`[UpdateSubOrder] ==================== UPDATING SUBSCRIPTIONS TABLE ====================`);
        console.log(`[UpdateSubOrder] Updating subscriptions table with:`);
        console.log(`[UpdateSubOrder]   - sub_times: ${sub_times}`);
        console.log(`[UpdateSubOrder]   - current_period_start: ${new Date(sub_period_start * 1000).toISOString()}`);
        console.log(`[UpdateSubOrder]   - current_period_end: ${newSubExpiredAt.toISOString()}`);
        try {
          const updatedSub = await updateSubscriptionSubTimes(
            sub_id,
            sub_times,
            new Date(sub_period_start * 1000), // current_period_start
            newSubExpiredAt // current_period_end
          );

          if (updatedSub) {
            console.log(`[UpdateSubOrder] ✅ Subscriptions table updated successfully`);
            console.log(`[UpdateSubOrder]   - subscription_id: ${sub_id}`);
            console.log(`[UpdateSubOrder]   - sub_times: ${updatedSub.sub_times}`);
            console.log(`[UpdateSubOrder]   - current_period_start: ${updatedSub.current_period_start}`);
            console.log(`[UpdateSubOrder]   - current_period_end: ${updatedSub.current_period_end}`);
            console.log(`[UpdateSubOrder]   - updated_at: ${updatedSub.updated_at}`);
          } else {
            console.warn(`[UpdateSubOrder] ⚠️  WARNING: updateSubscriptionSubTimes returned null/undefined`);
            console.warn(`[UpdateSubOrder]   This may indicate the subscription record doesn't exist`);
            console.warn(`[UpdateSubOrder]   Attempting to create the subscription record...`);

            // 如果更新失败（可能是因为记录不存在），尝试创建
            try {
              const { createSubscription } = await import("@/models/subscription");
              const newSub = await createSubscription({
                user_uuid: renew_order.user_uuid,
                subscription_id: sub_id,
                plan_type: renew_order.product_id?.includes('basic') ? 'basic' :
                           renew_order.product_id?.includes('plus') ? 'plus' :
                           renew_order.product_id?.includes('pro') ? 'pro' : 'basic',
                interval: renew_order.interval || 'month',
                status: 'active' as const,
                current_period_start: new Date(sub_period_start * 1000),
                current_period_end: newSubExpiredAt,
                sub_times: sub_times,
                total_credits: renew_order.credits, // 传递续费订单的总积分
              });
              console.log(`[UpdateSubOrder] ✅ Created missing subscription record`);
              console.log(`[UpdateSubOrder]   - subscription_id: ${newSub.subscription_id}`);
              console.log(`[UpdateSubOrder]   - sub_times: ${newSub.sub_times}`);
            } catch (createError) {
              console.error(`[UpdateSubOrder] ❌ CRITICAL: Failed to create subscription record:`, createError);
              console.error(`[UpdateSubOrder]   This subscription will not be tracked locally`);
              // 继续执行，不中断流程
            }
          }
          console.log(`[UpdateSubOrder] ====================================================================`);
        } catch (updateError) {
          console.error(`[UpdateSubOrder] ❌ CRITICAL ERROR updating subscriptions table:`, updateError);
          console.error(`[UpdateSubOrder]   Error name: ${(updateError as any)?.name}`);
          console.error(`[UpdateSubOrder]   Error message: ${(updateError as any)?.message}`);
          console.error(`[UpdateSubOrder]   Stack: ${(updateError as any)?.stack}`);

          // 尝试创建新的订阅记录作为备选方案
          try {
            console.log(`[UpdateSubOrder] Attempting to create subscription record as fallback...`);
            const { createSubscription } = await import("@/models/subscription");
            const newSub = await createSubscription({
              user_uuid: renew_order.user_uuid,
              subscription_id: sub_id,
              plan_type: renew_order.product_id?.includes('basic') ? 'basic' :
                         renew_order.product_id?.includes('plus') ? 'plus' :
                         renew_order.product_id?.includes('pro') ? 'pro' : 'basic',
              interval: renew_order.interval || 'month',
              status: 'active' as const,
              current_period_start: new Date(sub_period_start * 1000),
              current_period_end: newSubExpiredAt,
              sub_times: sub_times,
              total_credits: renew_order.credits, // 传递续费订单的总积分
            });
            console.log(`[UpdateSubOrder] ✅ Created subscription record as fallback`);
            console.log(`[UpdateSubOrder]   - subscription_id: ${newSub.subscription_id}`);
          } catch (createError) {
            console.error(`[UpdateSubOrder] ❌ FAILED to create subscription record:`, createError);
            console.error(`[UpdateSubOrder]   This renewal may not be tracked properly`);
            // 不抛出错误，因为订单和积分更新已成功
          }
        }
      } else {
        console.error(`[UpdateSubOrder] ❌ CRITICAL ERROR: renew_order.user_uuid is missing`);
        throw new Error("User UUID is required for renewal order");
      }

      console.log(`[UpdateSubOrder] ==================== RENEWAL COMPLETE ====================`);
      console.log(`[UpdateSubOrder] ✅ Renewal order processing completed`);
      console.log(`[UpdateSubOrder]    Order: ${renew_order_no}`);
      console.log(`[UpdateSubOrder]    Credits: ${renew_order.credits}`);
      console.log(`[UpdateSubOrder]    User: ${renew_order.user_uuid}`);
      console.log(`[UpdateSubOrder]    Subscription: ${sub_id}`);
      console.log(`[UpdateSubOrder]    SubTimes: ${sub_times}`);
      console.log(`[UpdateSubOrder] =============================================================`);
    }
  } catch (e) {
    console.log("renew order failed: ", e);
    throw e;
  }
}

// get stripe billing portal url
export async function getStripeBilling(sub_id: string) {
  try {
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "");

    const subscription = await stripe.subscriptions.retrieve(sub_id);

    const billing = await stripe.billingPortal.sessions.create({
      customer: subscription.customer as string,

      return_url: `${process.env.NEXT_PUBLIC_WEB_URL}/user-center`,
    });

    return billing;
  } catch (e) {
    console.log("get subscription billing failed: ", e);
    throw e;
  }
}
