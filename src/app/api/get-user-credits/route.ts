import { respErr, respData } from "@/lib/resp";
import {
  getUserCreditSummary,
  getUserCreditTimeline,
} from "@/services/credit";
import type { CreditType, CreditWindow } from "@/types/credit.d";
import { getUserUuid } from "@/services/user";

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth");
    }

    let window: CreditWindow = "all";
    let type: CreditType = "all";
    let includeTimeline = false;
    let limit = 50;
    let page: number | undefined = undefined;

    // Parse optional body
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.window && ["all", "30d", "7d"].includes(body.window)) {
        window = body.window;
      }
      if (body?.type && ["all", "in", "out"].includes(body.type)) {
        type = body.type;
      }
      if (typeof body?.includeTimeline === "boolean") {
        includeTimeline = body.includeTimeline;
      }
      if (typeof body?.limit === "number") {
        limit = Math.max(1, Math.min(5000, body.limit));
      }
      if (typeof body?.page === "number") {
        page = Math.max(1, body.page);
      }
    } catch (_) {}

    const summary = await getUserCreditSummary({ userUuid: user_uuid, window, type });
    let timeline: any = undefined;
    if (includeTimeline) {
      timeline = await getUserCreditTimeline({ userUuid: user_uuid, window, type, limit, page });
    }

    // Backward compatibility: expose left_credits
    return respData({
      ...summary,
      left_credits: Math.max(0, summary.balance),
      timeline,
    });
  } catch (e) {
    console.log("get user credits failed: ", e);
    // Standardized error code per spec
    return respErr("ERR_CREDITS_AGGREGATION_FAILED");
  }
}
