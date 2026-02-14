import { respData, respErr } from "@/lib/resp";
import { getUserInfo } from "@/services/user";
import { addUserInteraction, removeUserInteraction } from "@/services/user-interaction";

type ArtType = "image" | "video" | "character";

// POST /api/community/artworks/[uuid]/favorite?artworkType=image - 收藏作品
export async function POST(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const { searchParams } = new URL(req.url);
    // Support both 'type' and 'artworkType' for backward compatibility
    const typeParam = searchParams.get("artworkType") || searchParams.get("type");
    const type = typeParam as ArtType | null;

    const user = await getUserInfo();
    if (!user) {
      return respErr("User not authenticated", 401);
    }

    if (!uuid) {
      return respErr("Artwork UUID is required");
    }

    if (!type || !["image", "video", "character"].includes(type)) {
      return respErr("Valid artwork type is required (image, video, or character)");
    }

    await addUserInteraction({
      user_uuid: user.uuid,
      art_id: uuid,
      art_type: type,
      interaction_type: "favorite",
    });

    return respData({ success: true });
  } catch (error) {
    console.log("Favorite artwork failed:", error);
    return respErr("Failed to favorite artwork");
  }
}

// DELETE /api/community/artworks/[uuid]/favorite?artworkType=image - 取消收藏
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const { searchParams } = new URL(req.url);
    // Support both 'type' and 'artworkType' for backward compatibility
    const typeParam = searchParams.get("artworkType") || searchParams.get("type");
    const type = typeParam as ArtType | null;

    const user = await getUserInfo();
    if (!user) {
      return respErr("User not authenticated", 401);
    }

    if (!uuid) {
      return respErr("Artwork UUID is required");
    }

    if (!type || !["image", "video", "character"].includes(type)) {
      return respErr("Valid artwork type is required (image, video, or character)");
    }

    await removeUserInteraction({
      user_uuid: user.uuid,
      art_id: uuid,
      art_type: type,
      interaction_type: "favorite",
    });

    return respData({ success: true });
  } catch (error) {
    console.log("Unfavorite artwork failed:", error);
    return respErr("Failed to unfavorite artwork");
  }
}
