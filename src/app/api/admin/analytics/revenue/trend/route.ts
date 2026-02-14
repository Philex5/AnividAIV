import { NextRequest } from "next/server";
import { requireAdmin, getDailyRevenueSince } from "@/services/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");

    if (!start) {
      return Response.json(
        { error: "Start date is required" },
        { status: 400 }
      );
    }

    const revMap = await getDailyRevenueSince(start);

    // Convert Map to plain object for JSON serialization
    const data = Object.fromEntries(revMap.entries());

    return Response.json({
      data,
    });
  } catch (error: any) {
    console.error("Revenue trend error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch revenue trend" },
      { status: 500 }
    );
  }
}
