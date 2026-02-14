import { NextRequest } from "next/server";
import {
  requireAdmin,
  getMonthlyOrdersByProduct,
  getMonthlyRevenue as getMonthlyRevenueFromAdmin,
  getMonthlyMcCost,
} from "@/services/admin";
import { getMonthlyCostDetails } from "@/models/operation-cost";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return Response.json(
        { error: "Month parameter is required" },
        { status: 400 }
      );
    }

    const [costs, revenue, ordersByProduct, mcCost] = await Promise.all([
      getMonthlyCostDetails(month),
      getMonthlyRevenueFromAdmin(month),
      getMonthlyOrdersByProduct(month),
      getMonthlyMcCost(month),
    ]);

    const manualCost = costs.reduce((sum, c) => sum + c.amount, 0);
    const totalCost = manualCost + mcCost.totalCostCents;

    return Response.json({
      data: {
        month,
        totalCost: totalCost / 100,
        manualCost: manualCost / 100,
        mcCost: mcCost.totalCostCents / 100,
        mcConsumed: mcCost.consumedMc,
        mcImageCost: mcCost.imageCostCents / 100,
        mcImageConsumed: mcCost.imageConsumedMc,
        mcVideoCost: mcCost.videoCostCents / 100,
        mcVideoConsumed: mcCost.videoConsumedMc,
        totalRevenue: revenue / 100,
        costs: costs.map((c) => ({
          id: c.id,
          platform: c.platform,
          amount: c.amount,
          currency: c.currency,
          note: c.note,
          created_at: c.created_at?.toISOString() || "",
        })),
        ordersByProduct,
      },
    });
  } catch (error: any) {
    console.error("Month detail error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch month detail" },
      { status: 500 }
    );
  }
}
