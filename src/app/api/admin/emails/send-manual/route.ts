import { respData, respErr } from "@/lib/resp";
import { unauthorizedResponse, verifyAdminAccess } from "@/lib/admin-auth";
import { sendManualAdminEmails } from "@/services/admin/email";

export async function POST(request: Request) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();

    const targetTypeRaw = body?.targetType;
    if (targetTypeRaw !== "all" && targetTypeRaw !== "specific") {
      return respErr("Invalid targetType", 400);
    }

    const result = await sendManualAdminEmails({
      subject: body?.subject,
      contentText: body?.contentText,
      targetType: targetTypeRaw,
      specificEmails: body?.specificEmails,
      campaignName: body?.campaignName,
    });

    return respData(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send manual emails";

    if (
      message.includes("required") ||
      message.includes("Invalid") ||
      message.includes("No valid")
    ) {
      return respErr(message, 400);
    }

    return respErr(message);
  }
}
