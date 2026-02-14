import { NextRequest } from "next/server";
import { requireAdmin, getMonthlyRevenue, getMonthlyOrdersByProduct } from "@/services/admin";

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

    const [total, ordersByProduct] = await Promise.all([
      getMonthlyRevenue(month),
      getMonthlyOrdersByProduct(month),
    ]);

    return Response.json({
      total,
      orders: ordersByProduct,
    });
  } catch (error: any) {
    console.error("Monthly revenue error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch monthly revenue" },
      { status: 500 }
    );
  }
}
