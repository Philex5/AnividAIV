import { respData, respErr, respOk } from "@/lib/resp";
import { listOperationCosts, upsertOperationCost } from "@/models/operation-cost";
import { requireAdmin } from "@/services/admin";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || undefined;
    const platform = searchParams.get("platform") || undefined;
    const costs = await listOperationCosts({ month, platform, limit: 500 });
    return respData({ items: costs });
  } catch (e: any) {
    return respErr(e?.message || "failed to list costs");
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body?.month || !body?.platform) {
      return respErr("month and platform are required", 400);
    }
    await upsertOperationCost({
      month: body.month,
      platform: body.platform,
      amount: Number(body.amount || 0),
      currency: body.currency || "USD",
      note: body.note || undefined,
    });
    return respOk();
  } catch (e: any) {
    return respErr(e?.message || "failed to upsert cost");
  }
}

