import { respData, respErr } from "@/lib/resp";
import { getUserCharacterAvatars } from "@/services/character";
import { getUserUuid } from "@/services/user";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceType = searchParams.get("deviceType") || "desktop";
    const page = parseInt(searchParams.get("page") || "1", 10);
    // Default to a larger limit for the selector to show more characters
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("User not authenticated", 401);
    }

    const characters = await getUserCharacterAvatars(user_uuid, {
      page,
      limit,
      deviceType,
    });

    return respData({
      characters,
    });
  } catch (error) {
    console.error("Get character avatars failed:", error);
    return respErr("Failed to get character avatars");
  }
}
