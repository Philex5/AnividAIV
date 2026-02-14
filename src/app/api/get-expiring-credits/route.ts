import { respErr, respData } from "@/lib/resp";
import { getExpiringCredits } from "@/services/credit";
import { getUserUuid } from "@/services/user";

export async function GET() {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth");
    }

    const expiring = await getExpiringCredits(user_uuid);

    return respData(expiring);
  } catch (e) {
    console.error("get expiring credits failed:", e);
    return respErr("ERR_EXPIRING_CREDITS_QUERY_FAILED");
  }
}
