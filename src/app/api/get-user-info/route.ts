import { respData, respErr, respJson } from "@/lib/resp";

import { findUserByUuid } from "@/models/user";
import { getUserUuid, isUserSubscribed } from "@/services/user";
import { getUserBalance } from "@/services/credit";
import { getMembershipLevel } from "@/services/membership";
import { getFirstPaidOrderByUserUuid } from "@/models/order";
import { User } from "@/types/user";

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respJson(-2, "no auth");
    }

    const dbUser = await findUserByUuid(user_uuid);
    if (!dbUser) {
      return respErr("user not exist");
    }

    const [balance, firstPaidOrder, membershipLevel] = await Promise.all([
      getUserBalance(user_uuid),
      getFirstPaidOrderByUserUuid(user_uuid),
      getMembershipLevel(user_uuid),
    ]);

    const admin_emails = process.env.ADMIN_EMAILS?.split(",");

    // 使用 isUserSubscribed 获取正确的订阅状态（包括过期检查）
    const isSub = await isUserSubscribed(dbUser as User);

    const user = {
      ...(dbUser as unknown as User),
      membership_level: membershipLevel,
      credits: {
        left_credits: balance,
        is_recharged: !!firstPaidOrder,
      },
      is_admin: !!admin_emails?.includes(dbUser.email),
      is_sub: isSub, // 明确返回is_sub字段给前端组件使用
    };

    return respData(user);
  } catch (e) {
    console.log("get user info failed: ", e);
    return respErr("get user info failed");
  }
}
