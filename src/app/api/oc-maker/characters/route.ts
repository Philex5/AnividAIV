import { respData, respErr } from "@/lib/resp";
import {
  getUserCharacters,
  getFavoritedCharacters,
} from "@/services/character";
import { getUserInfo, getUserUuid } from "@/services/user";
import { createCharacter } from "@/services/character";
import {
  getMembershipLevel,
  getUserOcLimit,
  MembershipUserNotFoundError,
} from "@/services/membership";
import { getUserCharacterCount } from "@/models/character";
import { CreateCharacterSchema } from "@/types/oc";
import { TagValidationError } from "@/lib/tag-normalizer";

// GET /api/oc-maker/characters - 获取用户角色列表
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const tagsParam = searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : undefined;

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("User not authenticated", 401);
    }

    const favorite = searchParams.get("favorite") === "true";

    const characters = favorite
      ? await getFavoritedCharacters(user_uuid, { page, limit, tags })
      : await getUserCharacters(user_uuid, { page, limit, tags });

    return respData({
      characters,
      page,
      limit,
    });
  } catch (error) {
    console.error("Get characters failed:", error);
    return respErr("Failed to get characters");
  }
}

// POST /api/oc-maker/characters - 创建新角色
export async function POST(req: Request) {
  try {
    const rawData = await req.json();

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("User not authenticated", 401);
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr("User profile not found", 404);
    }

    // Use Zod for validation
    const validatedData = CreateCharacterSchema.safeParse(rawData);
    if (!validatedData.success) {
      const errorMsg = validatedData.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return respErr(errorMsg, 400);
    }

    const data = validatedData.data;

    // 🔴 Check OC limit before creating character
    const currentCount = await getUserCharacterCount(user_uuid);
    let membershipLevel: Awaited<ReturnType<typeof getMembershipLevel>>;
    let limit: Awaited<ReturnType<typeof getUserOcLimit>>;
    try {
      membershipLevel = await getMembershipLevel(user_uuid);
      limit = await getUserOcLimit(user_uuid);
    } catch (error) {
      if (error instanceof MembershipUserNotFoundError) {
        return respErr("User membership info not found", 404);
      }
      throw error;
    }

    // Enforce visibility rules: Free users characters default to public
    if (membershipLevel === "free") {
      data.visibility_level = "public";
    }

    // Skip limit check for PRO members (unlimited)
    if (limit !== Infinity && currentCount >= limit) {
      console.warn(
        `OC limit reached for user ${user_uuid}: ${currentCount}/${limit} (${membershipLevel})`
      );
      return respErr(
        `OC limit reached (${currentCount}/${limit}). Upgrade to create more characters.`,
        403
      );
    }

    let character;
    try {
      character = await createCharacter(data);
    } catch (error) {
      if (error instanceof TagValidationError) {
        return respErr(error.message, 400);
      }
      throw error;
    }

    return respData(character);
  } catch (error) {
    console.error("Create character failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create character";
    return respErr(errorMessage, 500);
  }
}
