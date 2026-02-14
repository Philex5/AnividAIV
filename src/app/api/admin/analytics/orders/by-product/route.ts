import { NextRequest } from "next/server";
import { requireAdmin, getOrdersByProduct } from "@/services/admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") as "current" | "all") || "all";

    const products = await getOrdersByProduct(range);

    return Response.json({
      data: products,
      range,
    });
  } catch (error: any) {
    console.error("Orders by product error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch orders by product" },
      { status: 500 }
    );
  }
}
