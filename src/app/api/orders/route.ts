import { getUserUuid } from "@/services/user";
import { getOrdersByUserUuid } from "@/models/order";
import { respData, respErr } from "@/lib/resp";

export async function GET() {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("no auth, please sign-in");
    }

    const orders = await getOrdersByUserUuid(userUuid);

    return respData({
      orders: orders || [],
      total: orders?.length || 0,
    });
  } catch (e: any) {
    console.error("get orders failed:", e);
    return respErr("get orders failed: " + e.message);
  }
}
