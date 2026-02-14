import { respErr, respData } from "@/lib/resp";
import { getUserBalance } from "@/services/credit";
import { getUserUuid } from "@/services/user";

export async function GET() {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth");
    }

    const balance = await getUserBalance(user_uuid);

    return respData({ balance });
  } catch (e) {
    console.error("get user balance failed:", e);
    return respErr("ERR_BALANCE_QUERY_FAILED");
  }
}
