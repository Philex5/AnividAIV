import { respData, respErr } from "@/lib/resp";
import { unauthorizedResponse, verifyAdminAccess } from "@/lib/admin-auth";
import { getAdminEmailLogDetail } from "@/services/admin/email";

export async function GET(
  request: Request,
  context: { params: Promise<{ uuid: string }> }
) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const { uuid } = await context.params;
    const detail = await getAdminEmailLogDetail(uuid);
    return respData({ item: detail });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get email log detail";
    const status = message === "Email log not found" ? 404 : 500;
    return respErr(message, status);
  }
}
