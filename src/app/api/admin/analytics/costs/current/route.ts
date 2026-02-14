import { NextRequest } from "next/server";
import { requireAdmin, getAllMonthsWithData } from "@/services/admin";
import { getCurrentMonthCosts } from "@/models/operation-cost";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const total = await getCurrentMonthCosts();

    return Response.json({
      total,
    });
  } catch (error: any) {
    console.error("Current month costs error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch current month costs" },
      { status: 500 }
    );
  }
}
