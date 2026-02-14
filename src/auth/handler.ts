import { AdapterUser } from "next-auth/adapters";
import { Account, User } from "next-auth";
import { getUuid } from "@/lib/hash";
import { getIsoTimestr } from "@/lib/time";
import { saveUser } from "@/services/user";
import { User as UserType } from "@/types/user";
import { getClientIp } from "@/lib/ip";
import { cookies } from "next/headers";
import { getRequestCountryCode } from "@/lib/geo";

function sanitizeAttribution(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 255);
}

export async function handleSignInUser(
  user: User | AdapterUser,
  account: Account
): Promise<UserType | null> {
  try {
    if (!user.email) {
      throw new Error("invalid signin user");
    }
    if (!account.type || !account.provider || !account.providerAccountId) {
      throw new Error("invalid signin account");
    }

    const c = await cookies();
    const signup_ref = sanitizeAttribution(c.get("anv_ref")?.value);
    const signup_utm_source = sanitizeAttribution(
      c.get("anv_utm_source")?.value
    );
    const signup_country = (await getRequestCountryCode()) || undefined;

    const userInfo: UserType = {
      uuid: getUuid(),
      email: user.email,
      display_name: user.name || "",
      avatar_url: user.image || "",
      signin_type: account.type,
      signin_provider: account.provider,
      signin_openid: account.providerAccountId,
      created_at: new Date(),
      signin_ip: await getClientIp(),
      signup_country,
      signup_ref,
      signup_utm_source,
    };

    const savedUser = await saveUser(userInfo);

    return savedUser;
  } catch (e) {
    console.error("handle signin user failed:", e);
    throw e;
  }
}
