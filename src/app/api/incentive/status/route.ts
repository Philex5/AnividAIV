import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { getCheckInStatus, getShareRewardStatus } from "@/services/incentive";

export async function GET(req: Request) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("no auth");
    }

    const [checkInStatus, shareStatus] = await Promise.all([
      getCheckInStatus(userUuid),
      getShareRewardStatus(userUuid),
    ]);

    return respData({
      checkIn: checkInStatus,
      share: shareStatus,
    });
  } catch (e) {
    console.error("get incentive status failed: ", e);
    return respErr("get incentive status failed");
  }
}
