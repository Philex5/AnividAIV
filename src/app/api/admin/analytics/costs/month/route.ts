import { NextRequest } from "next/server";
import { requireAdmin, getMonthlyMcCost } from "@/services/admin";
import { getMonthlyCostSummary } from "@/models/operation-cost";

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

    const [costs, mcCost] = await Promise.all([
      getMonthlyCostSummary([month]),
      getMonthlyMcCost(month),
    ]);
    const manualTotal = costs[month] || 0;
    const total = manualTotal + mcCost.totalCostCents;

    return Response.json({
      total,
      manual_total: manualTotal,
      mc_consumed: mcCost.consumedMc,
      mc_cost: mcCost.totalCostCents,
      mc_image_consumed: mcCost.imageConsumedMc,
      mc_image_cost: mcCost.imageCostCents,
      mc_video_consumed: mcCost.videoConsumedMc,
      mc_video_cost: mcCost.videoCostCents,
    });
  } catch (error: any) {
    console.error("Monthly costs error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch monthly costs" },
      { status: 500 }
    );
  }
}
