import { NextRequest } from "next/server";
import { requireAdmin, getPaidOrdersCount, getCurrentMonthPaidOrdersCount } from "@/services/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";

    let count: number;

    if (range === "current") {
      count = await getCurrentMonthPaidOrdersCount();
    } else {
      count = await getPaidOrdersCount();
    }

    return Response.json({
      count,
      range,
    });
  } catch (error: any) {
    console.error("Orders count error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch orders count" },
      { status: 500 }
    );
  }
}
