import { NextRequest } from "next/server";
import { requireAdmin, getPaidOrdersTotal, getCurrentMonthRevenue } from "@/services/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";

    let total: number;

    if (range === "current") {
      total = await getCurrentMonthRevenue();
    } else {
      total = await getPaidOrdersTotal();
    }

    return Response.json({
      total,
      range,
    });
  } catch (error: any) {
    console.error("Revenue total error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch revenue total" },
      { status: 500 }
    );
  }
}
