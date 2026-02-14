import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { operationCosts } from "@/db/schema";

export type OperationCost = typeof operationCosts.$inferSelect;
export type OperationCostInsert = typeof operationCosts.$inferInsert;

export async function upsertOperationCost(
  payload: OperationCostInsert
): Promise<OperationCost | undefined> {
  if (!payload.month || !payload.platform) {
    throw new Error("month and platform are required");
  }

  // 尝试更新，若无则插入
  const [existing] = await db()
    .select()
    .from(operationCosts)
    .where(
      and(
        eq(operationCosts.month, payload.month),
        eq(operationCosts.platform, payload.platform)
      )
    )
    .limit(1);

  if (existing) {
    const [updated] = await db()
      .update(operationCosts)
      .set({
        amount: payload.amount ?? existing.amount,
        currency: payload.currency ?? existing.currency,
        note: payload.note ?? existing.note,
        updated_at: new Date(),
      })
      .where(eq(operationCosts.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db()
    .insert(operationCosts)
    .values({
      ...payload,
      created_at: payload.created_at ?? new Date(),
      updated_at: payload.updated_at ?? new Date(),
    })
    .returning();
  return inserted;
}

export async function listOperationCosts(options?: {
  month?: string;
  platform?: string;
  order?: "asc" | "desc";
  limit?: number;
}): Promise<OperationCost[]> {
  const { month, platform, order = "desc", limit = 100 } = options || {};

  // @ts-ignore - drizzle ORM type issue
  let query = db().select().from(operationCosts);

  if (month) {
    // @ts-ignore - drizzle ORM type issue
    query = query.where(eq(operationCosts.month, month));
  }
  if (platform) {
    const q = db()
      .select()
      .from(operationCosts)
      .where(eq(operationCosts.platform, platform));
    // drizzle 类型推导分支，保持简单
    // @ts-ignore
    query = month
      ? db()
          .select()
          .from(operationCosts)
          .where(
            and(
              eq(operationCosts.month, month),
              eq(operationCosts.platform, platform)
            )
          )
      : q;
  }

  // 排序与限制
  // @ts-ignore
  query = query.orderBy(
    order === "asc" ? asc(operationCosts.month) : desc(operationCosts.month)
  );

  // @ts-ignore
  return query.limit(limit);
}

export async function getMonthlyCostSummary(
  months: string[]
): Promise<Record<string, number>> {
  if (months.length === 0) return {};
  const rows = await db()
    .select()
    .from(operationCosts)
    .where(eq(operationCosts.month, months[0] as any));

  // 简单实现：按传入月份循环查询，避免复杂 SQL
  const result: Record<string, number> = {};
  for (const m of months) {
    const list = await db()
      .select()
      .from(operationCosts)
      .where(eq(operationCosts.month, m));
    result[m] = list.reduce((sum, r) => sum + (r.amount || 0), 0);
  }
  return result;
}

export async function getCurrentMonthCosts(): Promise<number> {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const list = await db()
    .select()
    .from(operationCosts)
    .where(eq(operationCosts.month, monthStr));
  return list.reduce((sum, r) => sum + (r.amount || 0), 0);
}

export async function getMonthlyCostDetails(
  month: string
): Promise<OperationCost[]> {
  // @ts-ignore - drizzle ORM type issue
  const result = await db()
    .select()
    .from(operationCosts)
    .where(eq(operationCosts.month, month))
    .orderBy(desc(operationCosts.created_at));
  return result;
}

export async function updateOperationCost(
  id: number,
  data: Partial<OperationCostInsert>
): Promise<OperationCost | undefined> {
  const [updated] = await db()
    .update(operationCosts)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(operationCosts.id, id))
    .returning();
  return updated;
}

export async function deleteOperationCost(id: number): Promise<void> {
  await db()
    .delete(operationCosts)
    .where(eq(operationCosts.id, id));
}

