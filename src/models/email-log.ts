import { and, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { emailCampaigns, emailLogs } from "@/db/schema";

export type EmailLog = typeof emailLogs.$inferSelect;
export type EmailLogInsert = typeof emailLogs.$inferInsert;

export async function createEmailLog(payload: EmailLogInsert): Promise<EmailLog> {
  const [row] = await db()
    .insert(emailLogs)
    .values({
      ...payload,
      created_at: payload.created_at ?? new Date(),
      updated_at: payload.updated_at ?? new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create email log");
  }

  return row;
}

export async function updateEmailLogByUuid(
  uuid: string,
  payload: Partial<EmailLogInsert>
): Promise<EmailLog | undefined> {
  const [row] = await db()
    .update(emailLogs)
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where(eq(emailLogs.uuid, uuid))
    .returning();

  return row;
}

export async function listEmailLogs(options?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  campaignUuid?: string;
}) {
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.max(1, Math.min(100, options?.limit ?? 20));
  const offset = (page - 1) * limit;
  const q = options?.q?.trim();
  const status = options?.status?.trim();
  const campaignUuid = options?.campaignUuid?.trim();

  const conditions: any[] = [];

  if (q) {
    conditions.push(
      or(
        ilike(emailLogs.email, `%${q}%`),
        ilike(emailLogs.subject, `%${q}%`),
        ilike(emailLogs.uuid, `%${q}%`)
      )
    );
  }

  if (status) {
    conditions.push(eq(emailLogs.status, status));
  }

  if (campaignUuid) {
    conditions.push(eq(emailLogs.campaign_uuid, campaignUuid));
  }

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  // @ts-ignore drizzle dynamic where typing
  let rowsQuery = db()
    .select({
      uuid: emailLogs.uuid,
      email: emailLogs.email,
      user_uuid: emailLogs.user_uuid,
      campaign_uuid: emailLogs.campaign_uuid,
      campaign_name: emailCampaigns.name,
      subject: emailLogs.subject,
      status: emailLogs.status,
      resend_message_id: emailLogs.resend_message_id,
      error_message: emailLogs.error_message,
      sent_at: emailLogs.sent_at,
      created_at: emailLogs.created_at,
      updated_at: emailLogs.updated_at,
    })
    .from(emailLogs)
    .leftJoin(emailCampaigns, eq(emailLogs.campaign_uuid, emailCampaigns.uuid))
    .orderBy(desc(emailLogs.created_at))
    .limit(limit)
    .offset(offset);

  // @ts-ignore drizzle dynamic where typing
  let countQuery = db()
    .select({ total: sql<number>`count(*)::int` })
    .from(emailLogs);

  if (whereClause) {
    // @ts-ignore drizzle dynamic where typing
    rowsQuery = rowsQuery.where(whereClause);
    // @ts-ignore drizzle dynamic where typing
    countQuery = countQuery.where(whereClause);
  }

  const [rows, totalRows] = await Promise.all([rowsQuery, countQuery]);

  const total = totalRows[0]?.total ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

  return {
    items: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function findEmailLogByUuid(uuid: string) {
  const rows = await db()
    .select({
      uuid: emailLogs.uuid,
      email: emailLogs.email,
      user_uuid: emailLogs.user_uuid,
      campaign_uuid: emailLogs.campaign_uuid,
      campaign_name: emailCampaigns.name,
      subject: emailLogs.subject,
      html_content: emailLogs.html_content,
      text_content: emailLogs.text_content,
      status: emailLogs.status,
      resend_message_id: emailLogs.resend_message_id,
      error_message: emailLogs.error_message,
      metadata: emailLogs.metadata,
      sent_at: emailLogs.sent_at,
      delivered_at: emailLogs.delivered_at,
      opened_at: emailLogs.opened_at,
      clicked_at: emailLogs.clicked_at,
      created_at: emailLogs.created_at,
      updated_at: emailLogs.updated_at,
    })
    .from(emailLogs)
    .leftJoin(emailCampaigns, eq(emailLogs.campaign_uuid, emailCampaigns.uuid))
    .where(eq(emailLogs.uuid, uuid))
    .limit(1);

  return rows[0];
}

export async function findEmailLogsByUuids(uuids: string[]) {
  const normalized = Array.from(
    new Set(uuids.map((item) => item.trim()).filter(Boolean))
  );

  if (normalized.length === 0) {
    return [];
  }

  return db()
    .select({
      uuid: emailLogs.uuid,
      email: emailLogs.email,
      campaign_uuid: emailLogs.campaign_uuid,
      resend_message_id: emailLogs.resend_message_id,
      status: emailLogs.status,
      sent_at: emailLogs.sent_at,
      delivered_at: emailLogs.delivered_at,
      opened_at: emailLogs.opened_at,
      clicked_at: emailLogs.clicked_at,
    })
    .from(emailLogs)
    .where(inArray(emailLogs.uuid, normalized));
}

export async function listRecentEmailLogsForResendSync(limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, limit));

  return db()
    .select({
      uuid: emailLogs.uuid,
      email: emailLogs.email,
      campaign_uuid: emailLogs.campaign_uuid,
      resend_message_id: emailLogs.resend_message_id,
      status: emailLogs.status,
      sent_at: emailLogs.sent_at,
      delivered_at: emailLogs.delivered_at,
      opened_at: emailLogs.opened_at,
      clicked_at: emailLogs.clicked_at,
    })
    .from(emailLogs)
    .where(isNotNull(emailLogs.resend_message_id))
    .orderBy(desc(emailLogs.created_at))
    .limit(safeLimit);
}
