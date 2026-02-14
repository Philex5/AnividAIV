import { respData, respErr } from "@/lib/resp";
import { getDailyOrdersSince, getDailyUsersSince, requireAdmin } from "@/services/admin";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const startISO = start || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

    const [usersMap, ordersMap] = await Promise.all([
      getDailyUsersSince(startISO),
      getDailyOrdersSince(startISO),
    ]);

    const dates = new Set<string>([
      ...Array.from(usersMap.keys()),
      ...Array.from(ordersMap.keys()),
    ]);
    const trend = Array.from(dates)
      .sort()
      .map((date) => ({
        date,
        users: usersMap.get(date) || 0,
        orders: ordersMap.get(date) || 0,
      }));

    return respData({ trend });
  } catch (e: any) {
    return respErr(e?.message || "failed to get users analytics");
  }
}

