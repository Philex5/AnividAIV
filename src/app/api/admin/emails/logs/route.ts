import { respData, respErr } from "@/lib/resp";
import { unauthorizedResponse, verifyAdminAccess } from "@/lib/admin-auth";
import { listAdminEmailLogs } from "@/services/admin/email";

export async function GET(request: Request) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const q = searchParams.get("q") || undefined;
    const status = searchParams.get("status") || undefined;

    if (Number.isNaN(page) || page < 1) {
      return respErr("Invalid page parameter", 400);
    }

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return respErr("Invalid limit parameter", 400);
    }

    const data = await listAdminEmailLogs({ page, limit, q, status });
    return respData(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list email logs";
    return respErr(message);
  }
}
