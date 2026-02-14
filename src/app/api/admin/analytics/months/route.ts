import { NextRequest } from "next/server";
import { requireAdmin, getAllMonthsWithData } from "@/services/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const months = await getAllMonthsWithData();

    return Response.json({
      data: months,
    });
  } catch (error: any) {
    console.error("Months error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch months" },
      { status: 500 }
    );
  }
}
