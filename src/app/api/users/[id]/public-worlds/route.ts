import { respData, respErr } from "@/lib/resp";
import { findUserByUuid } from "@/models/user";
import { listPublicWorlds } from "@/services/user-profile";

// GET /api/users/[id]/public-worlds - 获取用户公开世界列表
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return respErr("User id is required", 400);
    }

    const user = await findUserByUuid(id);
    if (!user) {
      return respErr("Profile not found", 404);
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await listPublicWorlds(id, { page, limit });

    return respData(result);
  } catch (error) {
    console.error("Failed to load public worlds:", error);
    return respErr("Failed to load public worlds");
  }
}
