import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { performCheckIn } from "@/services/incentive";

export async function POST(req: Request) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("no auth", 401);
    }

    const result = await performCheckIn(userUuid);
    if (!result.success) {
      return respErr(result.message || "check-in failed");
    }

    return respData(result);
  } catch (e) {
    console.error("check-in failed: ", e);
    return respErr("check-in failed");
  }
}
