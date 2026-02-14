import { respData, respErr } from "@/lib/resp";
import { verifyAdminAccess, unauthorizedResponse } from "@/lib/admin-auth";
import { listAdminChatSessions } from "@/services/admin/chat-analytics";

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
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const characterId = searchParams.get("characterId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const sortParam = searchParams.get("sort") || "created_at_desc";
    const start = parseDateParam(searchParams.get("start"));
    const end = parseDateParam(searchParams.get("end"));

    if (Number.isNaN(page) || page < 1) {
      return respErr("Invalid page parameter", 400);
    }

    if (Number.isNaN(limit) || limit < 1) {
      return respErr("Invalid limit parameter", 400);
    }

    if (sortParam !== "created_at_desc" && sortParam !== "created_at_asc") {
      return respErr("Invalid sort parameter", 400);
    }

    const data = await listAdminChatSessions({
      page,
      limit,
      start,
      end,
      characterId,
      userId,
      sort: sortParam,
    });

    return respData(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get chat sessions";
    return respErr(message);
  }
}

