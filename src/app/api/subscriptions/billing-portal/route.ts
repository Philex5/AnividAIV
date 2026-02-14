/**
 * API: 创建Stripe Billing Portal会话
 * POST /api/subscriptions/billing-portal
 * 用于用户管理订阅（更新支付方式、查看账单等）
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStripeBilling } from "@/services/order";
import { getOrdersByUserUuid, OrderStatus } from "@/models/order";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.uuid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userUuid = session.user.uuid;

    // 获取用户最新的订阅订单
    const orders = await getOrdersByUserUuid(userUuid) || [];
    const subscriptionOrders = orders.filter(
      (order) => (order.interval === 'month' || order.interval === 'year') &&
                 order.status === OrderStatus.Paid &&
                 order.sub_id
    );

    if (subscriptionOrders.length === 0) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // 获取最新的订阅
    const latestSubscription = subscriptionOrders
      .sort((a, b) => {
        const aTime = new Date(a.paid_at || a.created_at || new Date()).getTime();
        const bTime = new Date(b.paid_at || b.created_at || new Date()).getTime();
        return bTime - aTime;
      })[0];

    if (!latestSubscription.sub_id) {
      return NextResponse.json(
        { error: "Invalid subscription ID" },
        { status: 400 }
      );
    }

    // 创建Stripe Billing Portal会话
    const billingPortal = await getStripeBilling(latestSubscription.sub_id);

    return NextResponse.json({
      success: true,
      url: billingPortal.url,
    });

  } catch (error: any) {
    console.error("Create billing portal failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create billing portal"
      },
      { status: 500 }
    );
  }
}
