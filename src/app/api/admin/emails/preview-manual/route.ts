import { respData, respErr } from "@/lib/resp";
import { unauthorizedResponse, verifyAdminAccess } from "@/lib/admin-auth";
import { generateManualAdminEmailHtml } from "@/services/admin/email";

export async function POST(request: Request) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const subject = body?.subject?.trim();
    const contentText = body?.contentText?.trim();

    if (!subject) {
      return respErr("Subject is required", 400);
    }
    if (!contentText) {
      return respErr("Text content is required", 400);
    }

    const html = generateManualAdminEmailHtml(contentText, subject);
    return respData({ html });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate preview";
    return respErr(message);
  }
}
