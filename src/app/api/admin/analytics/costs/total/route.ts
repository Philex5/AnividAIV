import { NextRequest } from "next/server";
import { requireAdmin, getCostBreakdown } from "@/services/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";

    const breakdown = await getCostBreakdown(range === "current" ? "current" : "all");

    return Response.json({
      total: breakdown.totalCostCents,
      manual_total: breakdown.manualCostCents,
      mc_cost: breakdown.mcCostCents,
      mc_consumed: breakdown.mcConsumed,
      mc_image_cost: breakdown.mcImageCostCents,
      mc_image_consumed: breakdown.mcImageConsumed,
      mc_video_cost: breakdown.mcVideoCostCents,
      mc_video_consumed: breakdown.mcVideoConsumed,
      range,
    });
  } catch (error: any) {
    console.error("Costs total error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch costs total" },
      { status: 500 }
    );
  }
}
