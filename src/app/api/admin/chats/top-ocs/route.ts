import { respData, respErr } from "@/lib/resp";
import { verifyAdminAccess, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminTopOcs } from "@/services/admin/chat-analytics";

function parseDateParam(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date parameter");
  }

  return date;
}

export async function GET(request: Request) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const start = parseDateParam(searchParams.get("start"));
    const end = parseDateParam(searchParams.get("end"));
    const limit = Number.parseInt(searchParams.get("limit") || "3", 10);

    if (Number.isNaN(limit) || limit <= 0) {
      return respErr("Invalid limit parameter", 400);
    }

    const items = await getAdminTopOcs({
      start,
      end,
      limit: Math.min(limit, 20),
    });

    return respData({ items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get top ocs";
    return respErr(message);
  }
}

