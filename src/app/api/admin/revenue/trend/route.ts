import { respData, respErr } from "@/lib/resp";
import { getDailyRevenueSince, requireAdmin } from "@/services/admin";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const startISO = start || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const revMap = await getDailyRevenueSince(startISO);
    const trend = Array.from(revMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
    return respData({ trend });
  } catch (e: any) {
    return respErr(e?.message || "failed to get revenue trend");
  }
}

