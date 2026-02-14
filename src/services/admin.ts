import { and, eq, gte, or, ilike, desc, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { generations, orders, users, operationCosts } from "@/db/schema";
import { OrderStatus } from "@/models/order";
import { getCreditConsumptionCostSummary } from "@/models/credit";
import { listFailedGenerations, findAllCompletedGenerations } from "@/models/generation";

// Re-export generation-related admin functions
export { listFailedGenerations, findAllCompletedGenerations };

export async function requireAdmin() {
  const { getUserInfo } = await import("@/services/user");
  const user = await getUserInfo();
  if (!user?.email) {
    throw new Error("no auth");
  }
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  if (!adminEmails.includes(user.email)) {
    throw new Error("no access");
  }
  return user;
}

export async function isAdminUser(): Promise<boolean> {
  const { getUserInfo } = await import("@/services/user");
  const user = await getUserInfo();
  if (!user?.email) {
    return false;
  }
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  return adminEmails.includes(user.email);
}

export async function getDailyUsersSince(startISO: string) {
  const data = await db()
    .select({ created_at: users.created_at })
    .from(users)
    .where(gte(users.created_at, new Date(startISO)));
  const map = new Map<string, number>();
  data.forEach((d) => {
    const date = d.created_at!.toISOString().split("T")[0];
    map.set(date, (map.get(date) || 0) + 1);
  });
  return map;
}

export async function getDailyOrdersSince(startISO: string) {
  const data = await db()
    .select({ created_at: orders.created_at })
    .from(orders)
    .where(gte(orders.created_at, new Date(startISO)));
  const map = new Map<string, number>();
  data.forEach((d) => {
    const date = d.created_at!.toISOString().split("T")[0];
    map.set(date, (map.get(date) || 0) + 1);
  });
  return map;
}

export interface GenerationTrendItem {
  date: string;
  total: number;
  success: number;
  failed: number;
}

export async function getGenerationTrendSince(startISO: string) {
  const data = await db()
    .select({ created_at: generations.created_at, status: generations.status })
    .from(generations)
    .where(gte(generations.created_at, new Date(startISO)));
  const map = new Map<string, GenerationTrendItem>();
  data.forEach((d) => {
    const date = d.created_at!.toISOString().split("T")[0];
    const v = map.get(date) || { date, total: 0, success: 0, failed: 0 };
    v.total += 1;
    if ((d.status || "").toLowerCase() === "completed") v.success += 1;
    if ((d.status || "").toLowerCase() === "failed") v.failed += 1;
    map.set(date, v);
  });
  return map;
}

export async function getGenerationTypeSummary() {
  const data = await db().select({ type: generations.type }).from(generations);
  const map = new Map<string, number>();
  data.forEach((d) => {
    const key = (d.type || "unknown").toLowerCase();
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

export async function getDailyRevenueSince(startISO: string) {
  const data = await db()
    .select({
      created_at: orders.created_at,
      status: orders.status,
      amount: orders.amount,
    })
    .from(orders)
    .where(gte(orders.created_at, new Date(startISO)));
  const map = new Map<string, number>();
  data.forEach((d) => {
    if (d.status !== OrderStatus.Paid) return;
    const date = d.created_at!.toISOString().split("T")[0];
    map.set(date, (map.get(date) || 0) + (d.amount || 0));
  });
  return map;
}

export async function getPaidOrdersTotal(): Promise<number> {
  const data = await db()
    .select({ amount: orders.amount })
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid));
  return data.reduce((sum, d) => sum + (d.amount || 0), 0);
}

export async function getPaidOrdersCount(): Promise<number> {
  const data = await db()
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid));
  return data.length;
}

export async function getCurrentMonthPaidOrdersCount(): Promise<number> {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const data = await db()
    .select({ created_at: orders.created_at })
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid));

  const currentMonthCount = data.filter((d) => {
    const date = d.created_at!.toISOString().split("T")[0];
    const [y, m] = date.split("-");
    return `${y}-${m}` === currentMonth;
  });

  return currentMonthCount.length;
}

export async function getCurrentMonthRevenue(): Promise<number> {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const data = await db()
    .select({ created_at: orders.created_at, amount: orders.amount })
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid));

  const currentMonthRevenue = data.filter((d) => {
    const date = d.created_at!.toISOString().split("T")[0];
    const [y, m] = date.split("-");
    return `${y}-${m}` === currentMonth;
  });

  return currentMonthRevenue.reduce((sum, d) => sum + (d.amount || 0), 0);
}

export async function getTotalCosts(): Promise<number> {
  const [manualCosts, mcCosts] = await Promise.all([
    db()
      .select({ amount: operationCosts.amount })
      .from(operationCosts),
    getCreditConsumptionCostSummary({ range: "all" }),
  ]);

  const manualTotal = manualCosts.reduce((sum, d) => sum + (d.amount || 0), 0);
  return manualTotal + Math.round(mcCosts.costCents);
}

export async function getCurrentMonthCosts(): Promise<number> {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [manualCosts, mcCosts] = await Promise.all([
    db()
      .select({ month: operationCosts.month, amount: operationCosts.amount })
      .from(operationCosts),
    getCreditConsumptionCostSummary({ month: currentMonth }),
  ]);

  const currentMonthCosts = manualCosts.filter((d) => d.month === currentMonth);

  return currentMonthCosts.reduce((sum, d) => sum + (d.amount || 0), 0) + Math.round(mcCosts.costCents);
}

export async function getMonthlyMcCost(month: string): Promise<{
  consumedMc: number;
  totalCostCents: number;
  imageConsumedMc: number;
  imageCostCents: number;
  videoConsumedMc: number;
  videoCostCents: number;
}> {
  const summary = await getCreditConsumptionCostSummary({ month });
  return {
    consumedMc: summary.consumedMc,
    totalCostCents: Math.round(summary.costCents),
    imageConsumedMc: summary.imageConsumedMc,
    imageCostCents: Math.round(summary.imageCostCents),
    videoConsumedMc: summary.videoConsumedMc,
    videoCostCents: Math.round(summary.videoCostCents),
  };
}

export async function getCostBreakdown(range: "all" | "current" = "all"): Promise<{
  totalCostCents: number;
  manualCostCents: number;
  mcCostCents: number;
  mcConsumed: number;
  mcImageCostCents: number;
  mcImageConsumed: number;
  mcVideoCostCents: number;
  mcVideoConsumed: number;
}> {
  if (range === "current") {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [manualCosts, mcCosts] = await Promise.all([
      db()
        .select({ month: operationCosts.month, amount: operationCosts.amount })
        .from(operationCosts),
      getCreditConsumptionCostSummary({ month: currentMonth }),
    ]);

    const manualCostCents = manualCosts
      .filter((d) => d.month === currentMonth)
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    const mcCostCents = Math.round(mcCosts.costCents);
    const mcImageCostCents = Math.round(mcCosts.imageCostCents);
    const mcVideoCostCents = Math.round(mcCosts.videoCostCents);

    return {
      totalCostCents: manualCostCents + mcCostCents,
      manualCostCents,
      mcCostCents,
      mcConsumed: mcCosts.consumedMc,
      mcImageCostCents,
      mcImageConsumed: mcCosts.imageConsumedMc,
      mcVideoCostCents,
      mcVideoConsumed: mcCosts.videoConsumedMc,
    };
  }

  const [manualCosts, mcCosts] = await Promise.all([
    db()
      .select({ amount: operationCosts.amount })
      .from(operationCosts),
    getCreditConsumptionCostSummary({ range: "all" }),
  ]);

  const manualCostCents = manualCosts.reduce((sum, d) => sum + (d.amount || 0), 0);
  const mcCostCents = Math.round(mcCosts.costCents);
  const mcImageCostCents = Math.round(mcCosts.imageCostCents);
  const mcVideoCostCents = Math.round(mcCosts.videoCostCents);

  return {
    totalCostCents: manualCostCents + mcCostCents,
    manualCostCents,
    mcCostCents,
    mcConsumed: mcCosts.consumedMc,
    mcImageCostCents,
    mcImageConsumed: mcCosts.imageConsumedMc,
    mcVideoCostCents,
    mcVideoConsumed: mcCosts.videoConsumedMc,
  };
}

export async function getCurrentMonthProfit(): Promise<number> {
  const [revenue, costs] = await Promise.all([
    getCurrentMonthRevenue(),
    getCurrentMonthCosts(),
  ]);

  return revenue - costs;
}

export async function getTotalProfit(): Promise<number> {
  const [revenue, costs] = await Promise.all([
    getPaidOrdersTotal(),
    getTotalCosts(),
  ]);

  return revenue - costs;
}

export async function getOrdersByProduct(range: "current" | "all" = "all") {
  const data = await db()
    .select({
      product_id: orders.product_id,
      product_name: orders.product_name,
      amount: orders.amount,
      created_at: orders.created_at,
    })
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid));

  let filteredData = data;

  if (range === "current") {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    filteredData = data.filter((d) => {
      const date = d.created_at!.toISOString().split("T")[0];
      const [y, m] = date.split("-");
      return `${y}-${m}` === currentMonth;
    });
  }

  // 按产品分组统计
  const productMap = new Map<string, {
    product_name: string;
    total_amount: number;
    count: number;
  }>();

  filteredData.forEach((order) => {
    const productId = order.product_id || "unknown";
    const existing = productMap.get(productId);

    if (existing) {
      existing.total_amount += order.amount || 0;
      existing.count += 1;
    } else {
      productMap.set(productId, {
        product_name: order.product_name || "Unknown Product",
        total_amount: order.amount || 0,
        count: 1,
      });
    }
  });

  return Array.from(productMap.entries()).map(([product_id, data]) => ({
    product_id,
    ...data,
  }));
}

export async function getMonthlyRevenue(month: string): Promise<number> {
  const data = await db()
    .select({ created_at: orders.created_at, amount: orders.amount })
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid));

  const monthly = data.filter((d) => {
    const date = d.created_at!.toISOString().split("T")[0];
    const [y, m] = date.split("-");
    return `${y}-${m}` === month;
  });

  return monthly.reduce((sum, d) => sum + (d.amount || 0), 0);
}

export async function getFailureStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allFailures = await db()
    .select()
    .from(generations)
    .where(eq(generations.status, "failed"));

  const todayFailures = allFailures.filter((g) => {
    const date = g.created_at!;
    return date >= today;
  });

  const totalGenerations = await db().select().from(generations);
  const failureRate = totalGenerations.length > 0
    ? (allFailures.length / totalGenerations.length) * 100
    : 0;

  const errorCodeMap = new Map<string, number>();
  allFailures.forEach((g) => {
    const code = g.error_code || "UNKNOWN";
    errorCodeMap.set(code, (errorCodeMap.get(code) || 0) + 1);
  });

  const topErrors = Array.from(errorCodeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({ code, count }));

  return {
    totalFailures: allFailures.length,
    todayFailures: todayFailures.length,
    failureRate,
    topErrors,
  };
}

export async function getTotalGenerations(): Promise<number> {
  const data = await db().select().from(generations);
  return data.length;
}

export async function getSuccessRate(): Promise<number> {
  const data = await db().select().from(generations);
  if (data.length === 0) return 0;

  const successes = data.filter((g) => (g.status || "").toLowerCase() === "completed");
  return (successes.length / data.length) * 100;
}

export async function getGenerationStats() {
  const data = await db()
    .select({ status: generations.status })
    .from(generations);

  const total = data.length;
  let success = 0;
  let failed = 0;

  data.forEach((item) => {
    const status = (item.status || "").toLowerCase();
    if (status === "completed") {
      success += 1;
    }
    if (status === "failed") {
      failed += 1;
    }
  });

  return {
    total,
    success,
    failed,
    successRate: total > 0 ? (success / total) * 100 : 0,
  };
}

export async function getMonthlyOrdersByProduct(month: string) {
  const data = await db()
    .select({
      product_id: orders.product_id,
      product_name: orders.product_name,
      amount: orders.amount,
      created_at: orders.created_at,
    })
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid));

  const monthly = data.filter((d) => {
    const date = d.created_at!.toISOString().split("T")[0];
    const [y, m] = date.split("-");
    return `${y}-${m}` === month;
  });

  // 按产品分组统计
  const productMap = new Map<string, {
    product_name: string;
    total_amount: number;
    count: number;
    orders: typeof monthly;
  }>();

  monthly.forEach((order) => {
    const productId = order.product_id || "unknown";
    const existing = productMap.get(productId);

    if (existing) {
      existing.total_amount += order.amount || 0;
      existing.count += 1;
    } else {
      productMap.set(productId, {
        product_name: order.product_name || "Unknown Product",
        total_amount: order.amount || 0,
        count: 1,
        orders: [order],
      });
    }
  });

  return Array.from(productMap.entries()).map(([product_id, data]) => ({
    product_id,
    ...data,
  }));
}

export async function getAllMonthsWithData(): Promise<string[]> {
  // 获取所有有成本或订单数据的月份
  const costData = await db()
    .select({ month: operationCosts.month })
    .from(operationCosts);

  const orderData = await db()
    .select({ created_at: orders.created_at })
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid));

  const monthsSet = new Set<string>();

  costData.forEach((c) => {
    monthsSet.add(c.month);
  });

  orderData.forEach((o) => {
    const date = o.created_at!.toISOString().split("T")[0];
    const [y, m] = date.split("-");
    monthsSet.add(`${y}-${m}`);
  });

  const months = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  return months;
}
