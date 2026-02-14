/**
 * API: 管理员获取订阅统计信息
 * GET /api/admin/subscriptions
 * 返回订阅统计和列表
 *
 * Query Parameters:
 * - page: 页码 (默认1)
 * - limit: 每页数量 (默认50)
 * - status: 状态筛选 (all|active|expired|canceled)
 * - plan_type: 套餐类型筛选 (all|basic|plus|pro)
 * - interval: 计费周期筛选 (all|month|year)
 * - search: 搜索关键词 (邮箱或用户UUID)
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrdersByUserUuid, OrderStatus } from "@/models/order";
import { db } from "@/db";
import { orders, users, subscriptions } from "@/db/schema";
import { eq, and, or, ilike, gte, lte, desc, asc, sql, isNull, isNotNull } from "drizzle-orm";
import { getSubscriptionLogs } from "@/models/subscription-log";
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/admin-auth';

function buildOrderSubscriptionIntervalCondition() {
  return or(
    eq(orders.interval, "month"),
    eq(orders.interval, "year"),
    eq(orders.interval, "monthly"),
    eq(orders.interval, "yearly")
  );
}

function buildLocalSubscriptionIntervalCondition() {
  return or(
    eq(subscriptions.interval, "month"),
    eq(subscriptions.interval, "year"),
    eq(subscriptions.interval, "monthly"),
    eq(subscriptions.interval, "yearly")
  );
}

export async function GET(request: NextRequest) {
  // Verify admin access (Bearer Token OR session)
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    console.log(`🔐 [Admin-Subscriptions] Authenticated via: ${authResult.method}`);

    const { searchParams } = new URL(request.url);
    const sub_id = searchParams.get("sub_id");

    // 如果提供了 sub_id，则返回订阅日志
    if (sub_id) {
      console.log('[ADMIN API] Fetching logs for subscription:', sub_id);
      const logs = await getSubscriptionLogs(sub_id, 100, 0);
      return NextResponse.json({
        success: true,
        data: {
          logs,
        },
      });
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status") || "active";
    const planType = searchParams.get("plan_type") || "all";
    const interval = searchParams.get("interval") || "all";
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sort_by") || "created_at";
    const sortOrder = searchParams.get("sort_order") || "desc";

    // 构建查询条件
    const whereConditions: any[] = [];
    const orderSubscriptionIntervalCondition = buildOrderSubscriptionIntervalCondition();

    // 只查询订阅订单
    whereConditions.push(orderSubscriptionIntervalCondition);

    // 状态筛选 - 支持本地订阅状态
    if (status !== "all") {
      if (status === "active") {
        // 活跃订阅：本地状态为active或paid
        whereConditions.push(
          or(
            eq(orders.status, OrderStatus.Paid)
          )
        );
      } else if (status === "paid") {
        // 旧版paid状态（向下兼容）
        whereConditions.push(eq(orders.status, OrderStatus.Paid));
      } else if (status === "pending_cancel") {
        // 待取消：使用本地订阅状态
        // 这里需要通过子查询或联表查询，暂时先显示paid状态的订阅
        whereConditions.push(eq(orders.status, OrderStatus.Paid));
      } else if (status === "canceled") {
        whereConditions.push(eq(orders.status, "canceled"));
      } else if (status === "expired") {
        // TODO: 筛选过期的订阅
      }
    }

    // 套餐类型筛选
    if (planType !== "all") {
      whereConditions.push(
        ilike(orders.product_id, `%${planType}%`)
      );
    }

    // 计费周期筛选
    if (interval !== "all") {
      whereConditions.push(eq(orders.interval, interval));
    }

    // 搜索筛选
    if (search) {
      whereConditions.push(
        or(
          ilike(orders.user_email, `%${search}%`),
          ilike(orders.user_uuid, `%${search}%`)
        )
      );
    }

    // 查询总数量
    const totalResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(...whereConditions));

    const total = Number(totalResult[0]?.count || 0);

    // 查询订阅列表
    const offset = (page - 1) * limit;
    const updatedAtExpr = sql<Date | null>`coalesce(${subscriptions.updated_at}, ${orders.paid_at}, ${orders.created_at})`;
    const orderByExpr = sortBy === "updated_at" ? updatedAtExpr : orders.created_at;
    const orderByFn = sortOrder === "asc" ? asc : desc;

    const subscriptionList = await db()
      .select({
        order_no: orders.order_no,
        user_email: orders.user_email,
        user_uuid: orders.user_uuid,
        user_avatar_url: users.avatar_url,
        product_id: orders.product_id,
        product_name: orders.product_name,
        interval: orders.interval,
        status: orders.status,
        amount: orders.amount,
        currency: orders.currency,
        credits: orders.credits,
        sub_id: orders.sub_id,
        sub_period_start: orders.sub_period_start,
        sub_period_end: orders.sub_period_end,
        sub_times: orders.sub_times,
        created_at: orders.created_at,
        paid_at: orders.paid_at,
        user_display_name: users.display_name,
        updated_at: updatedAtExpr,
        local_status: subscriptions.status,
        local_current_period_start: subscriptions.current_period_start,
        local_current_period_end: subscriptions.current_period_end,
      })
      .from(orders)
      .leftJoin(users, eq(orders.user_uuid, users.uuid))
      .leftJoin(subscriptions, eq(orders.sub_id, subscriptions.subscription_id))
      .where(and(...whereConditions))
      .orderBy(orderByFn(orderByExpr))
      .limit(limit)
      .offset(offset);

    // 合并本地订阅状态
    const subscriptionsWithLocalStatus = subscriptionList.map((sub) => {
      const {
        local_status,
        local_current_period_start,
        local_current_period_end,
        ...rest
      } = sub;

      return {
        ...rest,
        status: local_status || sub.status,
        current_period_start: local_current_period_start
          ? Math.floor(new Date(local_current_period_start).getTime() / 1000)
          : sub.sub_period_start,
        current_period_end: local_current_period_end
          ? Math.floor(new Date(local_current_period_end).getTime() / 1000)
          : sub.sub_period_end,
      };
    });

    // 计算统计数据
    const stats = await calculateSubscriptionStats();

    // 计算订阅趋势数据（按月）
    const trendData = await getSubscriptionTrendData();

    return NextResponse.json({
      success: true,
      data: {
        subscriptions: subscriptionsWithLocalStatus,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats,
        trendData,
      },
    });

  } catch (error: any) {
    console.error("Get admin subscriptions failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get subscriptions"
      },
      { status: 500 }
    );
  }
}

async function calculateSubscriptionStats() {
  try {
    // 获取本月开始和结束时间
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const orderSubscriptionIntervalCondition = buildOrderSubscriptionIntervalCondition();
    const localSubscriptionIntervalCondition = buildLocalSubscriptionIntervalCondition();

    // 总订阅数
    const totalSubscriptions = await db()
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(orderSubscriptionIntervalCondition);

    // 活跃订阅数
    const activeSubscriptions = await db()
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          orderSubscriptionIntervalCondition,
          eq(orders.status, OrderStatus.Paid)
        )
      );

    // 本月取消的订阅数（优先使用本地 subscriptions，再兼容历史 orders）
    const canceledFromSubscriptions = await db()
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(
        and(
          localSubscriptionIntervalCondition,
          eq(subscriptions.status, "canceled"),
          or(
            and(
              isNotNull(subscriptions.canceled_at),
              gte(subscriptions.canceled_at, startOfMonth),
              lte(subscriptions.canceled_at, endOfMonth)
            ),
            and(
              isNull(subscriptions.canceled_at),
              gte(subscriptions.updated_at, startOfMonth),
              lte(subscriptions.updated_at, endOfMonth)
            )
          )
        )
      );

    const canceledFromOrdersLegacy = await db()
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .leftJoin(subscriptions, eq(orders.sub_id, subscriptions.subscription_id))
      .where(
        and(
          orderSubscriptionIntervalCondition,
          eq(orders.status, "canceled"),
          gte(orders.paid_at, startOfMonth),
          lte(orders.paid_at, endOfMonth),
          isNull(subscriptions.subscription_id)
        )
      );

    const canceledSubscriptionsCount =
      Number(canceledFromSubscriptions[0]?.count || 0) +
      Number(canceledFromOrdersLegacy[0]?.count || 0);

    // 本月新增订阅数（按created_at时间筛选）
    const thisMonthCount = await db()
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          orderSubscriptionIntervalCondition,
          gte(orders.created_at, startOfMonth),
          lte(orders.created_at, endOfMonth)
        )
      );

    return {
      totalSubscriptions: Number(totalSubscriptions[0]?.count || 0),
      activeSubscriptions: Number(activeSubscriptions[0]?.count || 0),
      canceledSubscriptions: canceledSubscriptionsCount,
      thisMonthCount: Number(thisMonthCount[0]?.count || 0),
    };
  } catch (error) {
    console.error("Calculate subscription stats failed:", error);
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      canceledSubscriptions: 0,
      thisMonthCount: 0,
    };
  }
}

async function getSubscriptionTrendData() {
  try {
    const orderSubscriptionIntervalCondition = buildOrderSubscriptionIntervalCondition();
    // 获取过去12个月（含当月），避免手动拼接导致非法月份
    const months: string[] = [];
    const base = new Date();
    base.setDate(1);
    base.setHours(0, 0, 0, 0);
    for (let i = 11; i >= 0; i--) {
      const current = new Date(base);
      current.setMonth(base.getMonth() - i);
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      months.push(`${year}-${month}`);
    }

    // 查询每个月的订阅数
    const chartData: Array<{ date: string; subscriptions: number }> = [];
    for (const monthStr of months) {
      const [yearStr, monthStrValue] = monthStr.split("-");
      const year = Number(yearStr);
      const month = Number(monthStrValue);
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        continue;
      }

      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const result = await db()
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(
          and(
            orderSubscriptionIntervalCondition,
            gte(orders.created_at, startDate),
            lte(orders.created_at, endDate)
          )
        );

      chartData.push({
        date: monthStr,
        subscriptions: Number(result[0]?.count || 0),
      });
    }

    // 计算labels和values数组（兼容性）
    const labels = chartData.map(item => item.date);
    const values = chartData.map(item => item.subscriptions);

    return {
      labels,
      values,
      chartData,
    };
  } catch (error) {
    console.error("Get subscription trend data failed:", error);
    return {
      labels: [],
      values: [],
      chartData: [],
    };
  }
}
