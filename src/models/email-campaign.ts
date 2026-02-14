import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { emailCampaignRecipients, emailCampaigns } from "@/db/schema";

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type EmailCampaignInsert = typeof emailCampaigns.$inferInsert;
export type EmailCampaignRecipientInsert =
  typeof emailCampaignRecipients.$inferInsert;

export async function createEmailCampaign(
  payload: EmailCampaignInsert
): Promise<EmailCampaign> {
  const [row] = await db()
    .insert(emailCampaigns)
    .values({
      ...payload,
      created_at: payload.created_at ?? new Date(),
      updated_at: payload.updated_at ?? new Date(),
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create email campaign");
  }

  return row;
}

export async function updateEmailCampaignByUuid(
  uuid: string,
  payload: Partial<EmailCampaignInsert>
): Promise<EmailCampaign | undefined> {
  const [row] = await db()
    .update(emailCampaigns)
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where(eq(emailCampaigns.uuid, uuid))
    .returning();

  return row;
}

export async function createCampaignRecipient(
  payload: EmailCampaignRecipientInsert
) {
  const [row] = await db()
    .insert(emailCampaignRecipients)
    .values({
      ...payload,
      created_at: payload.created_at ?? new Date(),
      updated_at: payload.updated_at ?? new Date(),
    })
    .returning();

  return row;
}

export async function updateCampaignRecipientStatus(
  campaignUuid: string,
  email: string,
  payload: Partial<EmailCampaignRecipientInsert>
) {
  const [row] = await db()
    .update(emailCampaignRecipients)
    .set({
      ...payload,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(emailCampaignRecipients.campaign_uuid, campaignUuid),
        eq(emailCampaignRecipients.email, email)
      )
    )
    .returning();

  return row;
}
