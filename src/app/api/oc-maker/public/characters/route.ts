import { respData, respErr } from "@/lib/resp";
import {
  getPublicCharactersByUuids,
  getPublicCharactersList,
} from "@/services/character";

// GET /api/oc-maker/public/characters - 获取公开角色列表
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const uuidsParam = searchParams.get("uuids");
    const uuids = uuidsParam
      ? uuidsParam
          .split(",")
          .map((uuid) => uuid.trim())
          .filter(Boolean)
      : [];
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const characters =
      uuids.length > 0
        ? await getPublicCharactersByUuids(uuids)
        : await getPublicCharactersList({ page, limit });

    return respData({
      characters,
      page,
      limit,
    });
  } catch (error) {
    console.log("Get public characters failed:", error);
    return respErr("Failed to get public characters");
  }
}
