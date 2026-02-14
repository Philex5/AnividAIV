import { respData, respErr } from "@/lib/resp";
import {
  getGenerationTrendSince,
  getGenerationTypeSummary,
  requireAdmin,
} from "@/services/admin";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const startISO = start || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

    const [trendMap, typeMap] = await Promise.all([
      getGenerationTrendSince(startISO),
      getGenerationTypeSummary(),
    ]);

    const trend = Array.from(trendMap.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
    const types = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

    return respData({ trend, types });
  } catch (e: any) {
    return respErr(e?.message || "failed to get generation analytics");
  }
}

