/**
 * API: 获取用户的所有订阅信息
 * GET /api/subscriptions
 * 返回用户的订阅历史和当前状态
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrdersByUserUuid, OrderStatus } from "@/models/order";
import { getMembershipConfig, getMembershipLevel, getUserBillingCycle } from "@/services/membership";
import { getAllSubscriptionsByUserUuid } from "@/models/subscription";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.uuid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userUuid = session.user.uuid;

    // 获取用户的所有订单（订阅和一次性购买）
    const orders = await getOrdersByUserUuid(userUuid);

    // 筛选订阅订单
    const subscriptionOrders = (orders || []).filter(
      (order) => order.interval === 'month' || order.interval === 'year'
    );

    // 获取本地订阅状态
    const allLocalSubscriptions = await getAllSubscriptionsByUserUuid(userUuid);

    // 获取当前会员状态
    const currentMembership = await getMembershipLevel(userUuid);
    const membershipConfig = getMembershipConfig(currentMembership);

    // 获取用户计费周期
    const billingCycle = await getUserBillingCycle(userUuid);

    // 获取用户最后一次订阅
    const latestSubscription = subscriptionOrders
      .filter((order) => order.status === OrderStatus.Paid)
      .sort((a, b) => {
        const aPaidAt = a.paid_at || a.created_at;
        const bPaidAt = b.paid_at || b.created_at;
        const aTime = aPaidAt ? new Date(aPaidAt).getTime() : 0;
        const bTime = bPaidAt ? new Date(bPaidAt).getTime() : 0;
        return bTime - aTime;
      })[0];

    // 从本地订阅记录中获取最新的订阅状态
    const latestLocalSubscription = allLocalSubscriptions
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      })[0];

    // 构建响应数据 - 优先从本地订阅表获取信息
    const subscriptionData = {
      currentSubscription: latestSubscription ? {
        order_no: latestSubscription.order_no,
        sub_id: latestSubscription.sub_id,
        plan_type: latestSubscription.product_id?.includes('basic') ? 'basic' :
                   latestSubscription.product_id?.includes('plus') ? 'plus' :
                   latestSubscription.product_id?.includes('pro') ? 'pro' : 'basic',
        interval: latestSubscription.interval,
        // 优先使用最新本地订阅状态，如果没有则使用订单状态
        status: latestLocalSubscription?.status || latestSubscription.status,
        current_period_start: latestSubscription.sub_period_start ?
          new Date(latestSubscription.sub_period_start * 1000).toISOString() :
          (latestLocalSubscription?.current_period_start
            ? new Date(latestLocalSubscription.current_period_start).toISOString()
            : null),
        current_period_end: latestSubscription.sub_period_end ?
          new Date(latestSubscription.sub_period_end * 1000).toISOString() :
          (latestLocalSubscription?.current_period_end
            ? new Date(latestLocalSubscription.current_period_end).toISOString()
            : null),
        amount: latestSubscription.amount,
        currency: latestSubscription.currency,
        // 优先从订阅表获取积分，回退到订单表
        credits: latestLocalSubscription?.credits || latestSubscription.credits,
        sub_times: latestSubscription.sub_times || 1,
        created_at: latestSubscription.created_at,
        paid_at: latestSubscription.paid_at,
      } : null,

      subscriptionHistory: subscriptionOrders.map((order) => ({
        order_no: order.order_no,
        sub_id: order.sub_id,
        plan_type: order.product_id?.includes('basic') ? 'basic' :
                   order.product_id?.includes('plus') ? 'plus' :
                   order.product_id?.includes('pro') ? 'pro' : 'basic',
        interval: order.interval,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        credits: order.credits,
        sub_times: order.sub_times || 1,
        created_at: order.created_at,
        paid_at: order.paid_at,
      })),

      membership: {
        current_level: currentMembership,
        is_sub: currentMembership !== 'free',
        expired_at: null,
        plan_type: currentMembership,
        billing_cycle: billingCycle,
        config: {
          level: currentMembership,
          display_name: membershipConfig.display_name || 'Free',
          monthly_credits: membershipConfig.monthly_credits || 0,
          yearly_credits: membershipConfig.yearly_credits || 0,
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: subscriptionData,
    });

  } catch (error: any) {
    console.error("Get subscriptions failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get subscriptions"
      },
      { status: 500 }
    );
  }
}
