import { credits } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, and, gte, lte, asc, sql, gt, lt, or, isNull, isNotNull, ilike, not } from "drizzle-orm";

export const IMAGE_MC_COST_PER_UNIT_DOLLARS = 0.0005;
export const VIDEO_MC_COST_PER_UNIT_DOLLARS = 0.001;

interface CreditCostSummaryOptions {
  month?: string;
  range?: "all" | "current";
}

interface CreditCostSummary {
  consumedMc: number;
  costCents: number;
  imageConsumedMc: number;
  imageCostCents: number;
  videoConsumedMc: number;
  videoCostCents: number;
}

function resolveMonthDateRange(month?: string): { start: Date; end: Date } | null {
  if (!month) return null;
  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex) return null;

  const start = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function getCreditConsumptionCostSummary(
  options?: CreditCostSummaryOptions
): Promise<CreditCostSummary> {
  const whereClauses: any[] = [
    lt(credits.credits, 0),
    isNotNull(credits.created_at),
    ilike(credits.trans_type, "%_generation"),
    not(ilike(credits.trans_type, "%chat%")),
    or(eq(credits.is_voided, false), isNull(credits.is_voided)),
  ];

  if (options?.month) {
    const monthRange = resolveMonthDateRange(options.month);
    if (!monthRange) {
      throw new Error("Invalid month format, expected YYYY-MM");
    }
    whereClauses.push(gte(credits.created_at, monthRange.start));
    whereClauses.push(lt(credits.created_at, monthRange.end));
  } else if (options?.range === "current") {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    whereClauses.push(gte(credits.created_at, start));
    whereClauses.push(lt(credits.created_at, end));
  }

  const rows = await db()
    .select({ amount: credits.credits, transType: credits.trans_type })
    .from(credits)
    .where(and(...whereClauses));

  let imageConsumedMc = 0;
  let videoConsumedMc = 0;

  rows.forEach((row) => {
    const consumed = Math.abs(Number(row.amount || 0));
    const transType = (row.transType || "").toLowerCase();
    if (transType.includes("video")) {
      videoConsumedMc += consumed;
      return;
    }
    imageConsumedMc += consumed;
  });

  const imageCostCents = imageConsumedMc * IMAGE_MC_COST_PER_UNIT_DOLLARS * 100;
  const videoCostCents = videoConsumedMc * VIDEO_MC_COST_PER_UNIT_DOLLARS * 100;
  const consumedMc = imageConsumedMc + videoConsumedMc;
  const costCents = imageCostCents + videoCostCents;

  return {
    consumedMc,
    costCents,
    imageConsumedMc,
    imageCostCents,
    videoConsumedMc,
    videoCostCents,
  };
}

export interface CreditSummaryQueryParams {
  userUuid: string;
  fromDate?: Date;
  typePredicate?: any;
}

export interface CreditTimelineQueryParams {
  userUuid: string;
  fromDate?: Date;
  typePredicate?: any;
  limit: number;
  page?: number;
}

export async function insertCredit(
  data: typeof credits.$inferInsert,
  tx?: any
): Promise<typeof credits.$inferSelect | undefined> {
  if (data.created_at && typeof data.created_at === "string") {
    data.created_at = new Date(data.created_at);
  }
  if (data.expired_at && typeof data.expired_at === "string") {
    data.expired_at = new Date(data.expired_at);
  }
  if (data.actived_at && typeof data.actived_at === "string") {
    data.actived_at = new Date(data.actived_at);
  }

  const dbInstance = tx || db();
  const [credit] = await dbInstance.insert(credits).values(data).returning();

  return credit;
}

export async function findCreditByTransNo(
  trans_no: string
): Promise<typeof credits.$inferSelect | undefined> {
  const [credit] = await db()
    .select()
    .from(credits)
    .where(eq(credits.trans_no, trans_no))
    .limit(1);

  return credit;
}

export async function findCreditByOrderNo(
  order_no: string
): Promise<typeof credits.$inferSelect | undefined> {
  const [credit] = await db()
    .select()
    .from(credits)
    .where(eq(credits.order_no, order_no))
    .limit(1);

  return credit;
}

export async function getUserValidCredits(
  user_uuid: string
): Promise<(typeof credits.$inferSelect)[] | undefined> {
  const now = new Date();
  const data = await db()
    .select()
    .from(credits)
    .where(
      and(
        lte(credits.actived_at, now), // actived_at must be in the past or now (credit is active)
        gte(credits.expired_at, now), // not expired
        eq(credits.user_uuid, user_uuid),
        // ✅ 排除作废记录
        or(eq(credits.is_voided, false), isNull(credits.is_voided))
      )
    )
    .orderBy(asc(credits.expired_at));

  return data;
}

export async function getCreditsByUserUuid(
  user_uuid: string,
  page: number = 1,
  limit: number = 50
): Promise<(typeof credits.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(credits)
    .where(eq(credits.user_uuid, user_uuid))
    .orderBy(desc(credits.created_at))
    .limit(limit)
    .offset((page - 1) * limit);

  return data;
}

/**
 * Query user's current balance (lightweight)
 * Only counts credits that are both active (actived_at <= now) and not expired
 */
export async function queryUserBalance(userUuid: string): Promise<number> {
  const now = new Date();
  const [row] = await db()
    .select({
      balance: sql<number>`COALESCE(SUM(${credits.credits}), 0)`,
    })
    .from(credits)
    .where(
      and(
        eq(credits.user_uuid, userUuid),
        // ✅ 只计算已激活的积分
        lte(credits.actived_at, now),
        // ✅ 只计算未过期的积分
        gte(credits.expired_at, now),
        // ✅ 排除作废记录
        or(eq(credits.is_voided, false), isNull(credits.is_voided))
      )
    );

  return Number(row?.balance || 0);
}

/**
 * Query expiring credits info (credits expiring in 7 days)
 */
export async function queryExpiringCredits(userUuid: string): Promise<{
  amount: number;
  expiresAt: string | null;
}> {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [row] = await db()
    .select({
      amount: sql<number>`COALESCE(SUM(CASE WHEN ${credits.credits} > 0 THEN ${credits.credits} ELSE 0 END), 0)`,
      expiresAt: sql<Date | null>`MIN(CASE WHEN ${credits.expired_at} IS NOT NULL THEN ${credits.expired_at} ELSE NULL END)`,
    })
    .from(credits)
    .where(eq(credits.user_uuid, userUuid));

  return {
    amount: Number(row?.amount || 0),
    expiresAt: row?.expiresAt ? new Date(row.expiresAt).toISOString() : null,
  };
}

/**
 * Query aggregated credit summary for a user
 */
export async function queryCreditSummary(
  params: CreditSummaryQueryParams
): Promise<any> {
  const { userUuid, fromDate, typePredicate } = params;

  const now = new Date();

  const whereClauses: any[] = [
    eq(credits.user_uuid, userUuid),
    // ✅ 只计算已激活的积分
    lte(credits.actived_at, now),
    // ✅ 只计算未过期的积分
    gte(credits.expired_at, now),
    // ✅ 排除作废记录
    or(eq(credits.is_voided, false), isNull(credits.is_voided))
  ];
  if (fromDate) whereClauses.push(gte(credits.created_at, fromDate));
  if (typePredicate) whereClauses.push(typePredicate);

  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [row] = await db()
    .select({
      balance: sql<number>`COALESCE(SUM(${credits.credits}), 0)`,
      totalEarned: sql<number>`COALESCE(SUM(CASE WHEN ${credits.credits} > 0 THEN ${credits.credits} ELSE 0 END), 0)`,
      totalUsed: sql<number>`COALESCE(SUM(CASE WHEN ${credits.credits} < 0 THEN -${credits.credits} ELSE 0 END), 0)`,
      expiringCredits: sql<number>`COALESCE(SUM(CASE WHEN ${credits.credits} > 0 THEN ${credits.credits} ELSE 0 END), 0)`,
      lastEventAt: sql<Date | null>`MAX(${credits.created_at})`,
      nextExpiringAt: sql<Date | null>`MIN(CASE WHEN ${credits.expired_at} IS NOT NULL THEN ${credits.expired_at} ELSE NULL END)`,
    })
    .from(credits)
    .where(and(...whereClauses));

  return row;
}

/**
 * Query credit timeline with filters
 */
export async function queryCreditTimeline(
  params: CreditTimelineQueryParams
): Promise<any[]> {
  const { userUuid, fromDate, typePredicate, limit, page } = params;

  const whereClauses: any[] = [
    eq(credits.user_uuid, userUuid),
    lte(credits.actived_at, new Date()), // Only return activated credits
    // ✅ 排除作废记录
    or(eq(credits.is_voided, false), isNull(credits.is_voided)),
  ];
  if (fromDate) whereClauses.push(gte(credits.created_at, fromDate));
  if (typePredicate) whereClauses.push(typePredicate);

  const offset = page ? (page - 1) * limit : 0;

  // Import orders table
  const { orders } = await import("@/db/schema");

  const rows = await db()
    .select({
      id: credits.id,
      trans_no: credits.trans_no,
      amount: credits.credits,
      trans_type: credits.trans_type,
      generation_uuid: credits.generation_uuid, // ✅ 新增字段
      order_no: credits.order_no,
      expiresAt: credits.expired_at,
      createdAt: credits.created_at,
      activedAt: credits.actived_at,
      // JOIN orders table to get interval for distinguishing subscription vs one-time
      order_interval: orders.interval,
    })
    .from(credits)
    .leftJoin(orders, eq(credits.order_no, orders.order_no))
    .where(and(...whereClauses))
    .orderBy(sql`${credits.created_at} DESC`)
    .limit(Math.min(5000, Math.max(1, limit)))
    .offset(offset);

  return rows;
}
