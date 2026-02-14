import { db } from "@/db";
import { userIncentives } from "@/db/schema";
import { eq, and, desc, gte, lt } from "drizzle-orm";

export async function findIncentiveByUserAndDate(userUuid: string, type: string, dateStr: string) {
  const [record] = await db()
    .select()
    .from(userIncentives)
    .where(
      and(
        eq(userIncentives.user_uuid, userUuid),
        eq(userIncentives.type, type),
        eq(userIncentives.reward_date, dateStr)
      )
    )
    .limit(1);
  return record;
}

export async function findLastIncentiveByType(userUuid: string, type: string) {
  const [record] = await db()
    .select()
    .from(userIncentives)
    .where(
      and(
        eq(userIncentives.user_uuid, userUuid),
        eq(userIncentives.type, type)
      )
    )
    .orderBy(desc(userIncentives.created_at))
    .limit(1);
  return record;
}

export async function insertIncentiveRecord(data: typeof userIncentives.$inferInsert, tx?: any) {
  const dbInstance = tx || db();
  return await dbInstance.insert(userIncentives).values(data).returning();
}
