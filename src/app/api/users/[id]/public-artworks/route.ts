import { respData, respErr } from "@/lib/resp";
import { findUserByUuid } from "@/models/user";
import { listPublicArtworks } from "@/services/user-profile";

const ALLOWED_TYPES = new Set(["all", "image", "video"]);

// GET /api/users/[id]/public-artworks - 获取用户公开 artworks
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
    const typeParam = (searchParams.get("type") || "all").toLowerCase();

    if (!ALLOWED_TYPES.has(typeParam)) {
      return respErr("Invalid type", 400);
    }

    const result = await listPublicArtworks(id, {
      page,
      limit,
      type: typeParam as "all" | "image" | "video",
    });

    return respData(result);
  } catch (error) {
    console.error("Failed to load public artworks:", error);
    return respErr("Failed to load public artworks");
  }
}
