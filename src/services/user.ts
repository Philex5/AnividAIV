import { CreditsAmount, CreditsTransType } from "./credit";
import {
  findUserByEmail,
  findUserByUuid,
  insertUser,
  updateUserProfile,
  updateUserSubStatus,
} from "@/models/user";

import { User } from "@/types/user";
import { auth } from "@/auth";
import { getIsoTimestr, getOneMonthLaterTimestr } from "@/lib/time";
import { getUserUuidByApiKey } from "@/models/apikey";
import { headers } from "next/headers";
import { increaseCredits } from "./credit";
import { users } from "@/db/schema";
import { getUuid } from "@/lib/hash";
import { sendWelcomeEmail } from "./email";

// save user to database, if user not exist, create a new user
export async function saveUser(user: User) {
  try {
    if (!user.email) {
      throw new Error("invalid user email");
    }

    const existUser = await findUserByEmail(user.email);

    if (!existUser) {
      // user not exist, create a new user
      if (!user.uuid) {
        user.uuid = getUuid();
      }

      console.log("user to be inserted:", user);

      const dbUser = await insertUser(user as typeof users.$inferInsert);

      // increase credits for new user, expire in one month
      await increaseCredits({
        user_uuid: user.uuid,
        trans_type: CreditsTransType.NewUser,
        credits: CreditsAmount.NewUserGet,
        expired_at: getOneMonthLaterTimestr(),
      });

      // send welcome email to new user
      try {
        await sendWelcomeEmail({
          to: user.email,
          userName: user.display_name || "there",
          signupDate: new Date().toLocaleDateString(),
        });
        console.log(`Welcome email sent to ${user.email}`);
      } catch (emailError) {
        console.error(
          `Failed to send welcome email to ${user.email}:`,
          emailError,
        );
        // Don't throw error - email failure shouldn't block user registration
      }

      user = {
        ...(dbUser as unknown as User),
      };
    } else {
      // user exist, return user info in db
      if (!existUser.display_name && user.display_name && existUser.uuid) {
        const patched = await updateUserProfile(existUser.uuid, {
          display_name: user.display_name,
        });
        if (patched) {
          user = {
            ...(patched as unknown as User),
          };
          return user;
        }
      }

      user = {
        ...(existUser as unknown as User),
      };
    }

    return user;
  } catch (e) {
    console.log("save user failed: ", e);
    throw e;
  }
}

export async function getUserUuid() {
  // return "73895490-0490-4dad-9dcc-2a752a21636b"
  let user_uuid = "";
  const token = await getBearerToken();

  if (token) {
    // API key
    if (token.startsWith("sk-")) {
      const apiKeyUserUuid = await getUserUuidByApiKey(token);
      return apiKeyUserUuid || "";
    }
  }

  const session = await auth();
  if (session?.user?.uuid) {
    user_uuid = session.user.uuid;
  }

  return user_uuid;
}

export async function getBearerToken() {
  const h = await headers();
  const auth = h.get("Authorization");
  if (!auth) {
    return "";
  }

  return auth.replace("Bearer ", "");
}

export async function getUserEmail() {
  let user_email = "";

  const session = await auth();
  if (session && session.user && session.user.email) {
    user_email = session.user.email;
  }

  return user_email;
}

export async function getUserInfo() {
  const user_uuid = await getUserUuid();
  if (!user_uuid) return undefined;

  const user = await findUserByUuid(user_uuid);
  if (user) return user;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return undefined;
  }

  try {
    const display_name =
      session.user.display_name ||
      (typeof session.user.name === "string" ? session.user.name : null);
    const avatar_url =
      session.user.avatar_url ||
      (typeof session.user.image === "string" ? session.user.image : null);

    const saved = await saveUser({
      uuid: session.user.uuid || user_uuid,
      email,
      display_name,
      avatar_url,
    });

    return saved as any;
  } catch (error) {
    console.error("Failed to ensure user profile", error);
    return undefined;
  }
}

export async function isUserSubscribed(user: User): Promise<boolean> {
  if (!user || !user.is_sub) {
    return false;
  }

  // 检查过期时间
  if (!user.sub_expired_at) {
    return false;
  }

  const isExpired = new Date(user.sub_expired_at) <= new Date();

  // 如果已过期，清理 sub_plan_type 和 is_sub 状态
  if (isExpired && user.uuid) {
    try {
      await updateUserSubStatus(user.uuid, false, null, null);
      console.log(`Cleared expired subscription status for user: ${user.uuid}`);
    } catch (error) {
      console.error(
        `Failed to clear expired subscription status for user ${user.uuid}:`,
        error,
      );
      // 即使更新失败，也应该返回正确的过期状态
    }
  }

  return !isExpired;
}

export async function getCurrentUserSubStatus(): Promise<boolean> {
  const user = await getUserInfo();
  if (!user) {
    return false;
  }

  return await isUserSubscribed(user as User);
}

export async function getUserSubInfo(user: User) {
  return {
    isSub: await isUserSubscribed(user),
    planType: user.sub_plan_type || null,
    expiredAt: user.sub_expired_at || null,
    isExpired: user.sub_expired_at
      ? new Date(user.sub_expired_at) <= new Date()
      : true,
  };
}
