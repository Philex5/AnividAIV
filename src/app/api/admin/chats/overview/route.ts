import { respData, respErr } from "@/lib/resp";
import { verifyAdminAccess, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminChatOverview, type ChatGranularity } from "@/services/admin/chat-analytics";

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
    const granularityParam = searchParams.get("granularity") || "day";

    if (granularityParam !== "day" && granularityParam !== "month") {
      return respErr("Invalid granularity, expected day or month", 400);
    }

    const start = parseDateParam(searchParams.get("start"));
    const end = parseDateParam(searchParams.get("end"));

    const data = await getAdminChatOverview({
      granularity: granularityParam as ChatGranularity,
      start,
      end,
    });

    return respData(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get chat overview";
    return respErr(message);
  }
}

