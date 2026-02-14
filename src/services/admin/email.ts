import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createCampaignRecipient,
  createEmailCampaign,
  updateCampaignRecipientStatus,
  updateEmailCampaignByUuid,
} from "@/models/email-campaign";
import {
  createEmailLog,
  findEmailLogByUuid,
  findEmailLogsByUuids,
  listRecentEmailLogsForResendSync,
  listEmailLogs,
  updateEmailLogByUuid,
} from "@/models/email-log";
import { sendRawEmail } from "@/services/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEB_URL || "https://anividai.com";
const STORAGE_DOMAIN =
  process.env.NEXT_PUBLIC_STORAGE_DOMAIN || process.env.STORAGE_DOMAIN || "";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function parseSpecificEmails(raw?: string[] | string): string[] {
  if (!raw) return [];

  const list = Array.isArray(raw)
    ? raw
    : raw
      .split(/[\n,;\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const uniqueEmails = Array.from(
    new Set(list.map((email) => email.trim().toLowerCase()).filter(Boolean))
  );

  const invalidEmails = uniqueEmails.filter((email) => !EMAIL_REGEX.test(email));
  if (invalidEmails.length > 0) {
    throw new Error(`Invalid email address: ${invalidEmails[0]}`);
  }

  return uniqueEmails;
}

async function resolveAllTargetUsers() {
  const rows = await db()
    .select({
      user_uuid: users.uuid,
      email: users.email,
    })
    .from(users);

  const result: Array<{ user_uuid?: string; email: string }> = [];
  const dedupe = new Set<string>();

  for (const row of rows) {
    const email = (row.email || "").trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email) || dedupe.has(email)) {
      continue;
    }
    dedupe.add(email);
    result.push({
      user_uuid: row.user_uuid || undefined,
      email,
    });
  }

  return result;
}

async function resolveSpecificTargets(raw?: string[] | string) {
  const emails = parseSpecificEmails(raw);
  if (emails.length === 0) {
    throw new Error("At least one recipient email is required");
  }

  const result: Array<{ user_uuid?: string; email: string }> = [];

  for (const email of emails) {
    const matched = await db()
      .select({ user_uuid: users.uuid })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    result.push({
      user_uuid: matched[0]?.user_uuid || undefined,
      email,
    });
  }

  return result;
}

export async function listAdminEmailLogs(params?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
}) {
  return listEmailLogs(params);
}

export async function getAdminEmailLogDetail(uuid: string) {
  if (!uuid) {
    throw new Error("Email log uuid is required");
  }

  const detail = await findEmailLogByUuid(uuid);
  if (!detail) {
    throw new Error("Email log not found");
  }

  return detail;
}

export async function sendManualAdminEmails(params: {
  subject: string;
  contentText: string;
  targetType: "all" | "specific";
  specificEmails?: string[] | string;
  campaignName?: string;
}) {
  const subject = params.subject?.trim();
  const contentText = params.contentText?.trim();
  const targetType = params.targetType;

  if (!subject) {
    throw new Error("Subject is required");
  }

  if (!contentText) {
    throw new Error("Text content is required");
  }

  if (targetType !== "all" && targetType !== "specific") {
    throw new Error("Invalid target type");
  }

  const htmlContent = generateManualAdminEmailHtml(contentText, subject);

  const recipients =
    targetType === "all"
      ? await resolveAllTargetUsers()
      : await resolveSpecificTargets(params.specificEmails);

  if (recipients.length === 0) {
    throw new Error("No valid recipients found");
  }

  const campaignUuid = uuidv4();
  const campaignName =
    params.campaignName?.trim() ||
    `manual-${new Date().toISOString().slice(0, 19)}`;

  await createEmailCampaign({
    uuid: campaignUuid,
    name: campaignName,
    type: "notification",
    subject,
    html_content: htmlContent,
    text_content: contentText,
    target_audience: targetType === "all" ? "all_users" : "specific_emails",
    target_emails:
      targetType === "specific" ? recipients.map((item) => item.email) : null,
    status: "sending",
  });

  let successCount = 0;
  const failed: Array<{ email: string; error: string }> = [];

  for (const recipient of recipients) {
    const logUuid = uuidv4();

    await createEmailLog({
      uuid: logUuid,
      user_uuid: recipient.user_uuid || null,
      email: recipient.email,
      campaign_uuid: campaignUuid,
      subject,
      html_content: htmlContent,
      text_content: contentText,
      status: "pending",
      metadata: {
        source: "admin_manual",
        target_type: targetType,
        html_generated: true,
      },
    });

    await createCampaignRecipient({
      campaign_uuid: campaignUuid,
      user_uuid: recipient.user_uuid || null,
      email: recipient.email,
      status: "pending",
      email_log_uuid: logUuid,
    });

    const sendResult = await sendRawEmail({
      to: recipient.email,
      subject,
      html: htmlContent,
      text: contentText,
    });

    if (sendResult.ok) {
      successCount += 1;
      const sentAt = new Date();

      await updateEmailLogByUuid(logUuid, {
        status: "sent",
        resend_message_id: sendResult.messageId || null,
        sent_at: sentAt,
      });

      await updateCampaignRecipientStatus(campaignUuid, recipient.email, {
        status: "sent",
        sent_at: sentAt,
      });
      continue;
    }

    const errorMessage = sendResult.error || "Failed to send email";

    await updateEmailLogByUuid(logUuid, {
      status: "failed",
      error_message: errorMessage,
    });

    await updateCampaignRecipientStatus(campaignUuid, recipient.email, {
      status: "failed",
    });

    failed.push({
      email: recipient.email,
      error: errorMessage,
    });
  }

  const finalStatus = failed.length > 0 ? "failed" : "sent";

  await updateEmailCampaignByUuid(campaignUuid, {
    status: finalStatus,
    sent_at: new Date(),
  });

  return {
    campaign_uuid: campaignUuid,
    target_type: targetType,
    total: recipients.length,
    success: successCount,
    failed_count: failed.length,
    failed,
  };
}

type SyncEmailLogStatusParams = {
  uuids?: string[];
  limit?: number;
};

export async function syncAdminEmailLogsFromResend(
  params?: SyncEmailLogStatusParams
) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const targetLogs =
    params?.uuids && params.uuids.length > 0
      ? await findEmailLogsByUuids(params.uuids)
      : await listRecentEmailLogsForResendSync(params?.limit ?? 100);

  const logs = targetLogs.filter((item) => !!item.resend_message_id);
  if (logs.length === 0) {
    return {
      total: 0,
      synced: 0,
      changed: 0,
      failed: [] as Array<{ uuid: string; error: string }>,
    };
  }

  let changed = 0;
  const failed: Array<{ uuid: string; error: string }> = [];

  for (const log of logs) {
    try {
      const response = await resend.emails.get(log.resend_message_id!);
      if (response.error || !response.data) {
        throw new Error(response.error?.message || "Failed to fetch email status from Resend");
      }

      const mapped = mapResendEventToStatus(response.data.last_event);
      const now = new Date();
      const sentAt = response.data.created_at
        ? new Date(response.data.created_at)
        : now;

      const nextPayload: {
        status?: string;
        sent_at?: Date;
        delivered_at?: Date;
        opened_at?: Date;
        clicked_at?: Date;
      } = {};

      if (mapped !== log.status) {
        nextPayload.status = mapped;
      }

      if (
        (mapped === "sent" ||
          mapped === "delivered" ||
          mapped === "opened" ||
          mapped === "clicked") &&
        !log.sent_at
      ) {
        nextPayload.sent_at = sentAt;
      }

      if (
        (mapped === "delivered" || mapped === "opened" || mapped === "clicked") &&
        !log.delivered_at
      ) {
        nextPayload.delivered_at = now;
      }

      if ((mapped === "opened" || mapped === "clicked") && !log.opened_at) {
        nextPayload.opened_at = now;
      }

      if (mapped === "clicked" && !log.clicked_at) {
        nextPayload.clicked_at = now;
      }

      if (Object.keys(nextPayload).length === 0) {
        continue;
      }

      await updateEmailLogByUuid(log.uuid, nextPayload);
      changed += 1;

      if (log.campaign_uuid) {
        await updateCampaignRecipientStatus(log.campaign_uuid, log.email, {
          status: mapped,
          sent_at: nextPayload.sent_at,
          delivered_at: nextPayload.delivered_at,
        });
      }
    } catch (error) {
      failed.push({
        uuid: log.uuid,
        error: error instanceof Error ? error.message : "Failed to sync email log status",
      });
    }
  }

  return {
    total: logs.length,
    synced: logs.length - failed.length,
    changed,
    failed,
  };
}

function mapResendEventToStatus(
  event:
    | "bounced"
    | "canceled"
    | "clicked"
    | "complained"
    | "delivered"
    | "delivery_delayed"
    | "failed"
    | "opened"
    | "queued"
    | "scheduled"
    | "sent"
) {
  if (event === "bounced") return "bounced";
  if (event === "complained") return "complained";
  if (event === "clicked") return "clicked";
  if (event === "opened") return "opened";
  if (event === "delivered") return "delivered";
  if (event === "sent") return "sent";
  if (event === "failed" || event === "canceled") return "failed";
  return "pending";
}

export function generateManualAdminEmailHtml(text: string, subject: string) {
  const logoUrl = STORAGE_DOMAIN
    ? `${STORAGE_DOMAIN.replace(/\/+$/, "")}/assets/common/logo_white.webp`
    : `${WEBSITE_URL.replace(/\/+$/, "")}/favicon.ico`;

  const escaped = escapeHtml(text.trim());
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, "<br />"))
    .map((block) => `<p style="margin:0 0 16px; line-height:1.75; color:#1f2937;">${block}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background:linear-gradient(160deg, #fff8e1 0%, #fff3d4 45%, #ffe6c2 100%); font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:680px; border-radius:20px; border:1px solid rgba(255,255,255,0.65); background:rgba(255,255,255,0.68); box-shadow:0 16px 40px rgba(192,120,149,0.16); backdrop-filter: blur(8px); overflow:hidden;">
          <tr>
            <td style="padding:18px 22px 10px; text-align:right;">
              <img src="${logoUrl}" alt="AnividAI Logo" style="height:30px; width:auto; max-width:132px; display:inline-block;" />
            </td>
          </tr>
          <tr>
            <td style="padding:8px 26px 28px;">
              <h1 style="margin:0 0 18px; font-size:24px; line-height:1.3; font-weight:700; letter-spacing:0.01em; color:#111827;">${escapeHtml(subject)}</h1>
              <div style="font-size:15px; color:#374151;">
                ${paragraphs || '<p style="margin:0; color:#6b7280;">(No content)</p>'}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 26px 24px; border-top:1px solid rgba(148,163,184,0.24); font-size:12px; color:#6b7280;">
              This email was sent by AnividAI.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
