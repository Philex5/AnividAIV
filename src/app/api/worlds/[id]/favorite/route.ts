import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { getworldByIdentifier } from "@/services/world";
import { addUserInteraction, removeUserInteraction } from "@/services/user-interaction";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return respErr("world id is required", 400);

    const userUuid = await getUserUuid();
    if (!userUuid) return respErr("AUTH_REQUIRED", 401);

    const world = await getworldByIdentifier(id, userUuid);
    if (world.visibility_level !== "public") {
      return respErr("FORBIDDEN", 403);
    }

    await addUserInteraction({
      user_uuid: userUuid,
      art_id: world.uuid,
      art_type: "world",
      interaction_type: "favorite",
    });

    return respData({ success: true });
  } catch (error: any) {
    if (error?.code === "NOT_FOUND") return respErr("Not found", 404);
    console.log("Favorite world failed:", error);
    return respErr("Failed to favorite world");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return respErr("world id is required", 400);

    const userUuid = await getUserUuid();
    if (!userUuid) return respErr("AUTH_REQUIRED", 401);

    const world = await getworldByIdentifier(id, userUuid);
    if (world.visibility_level !== "public") {
      return respErr("FORBIDDEN", 403);
    }

    await removeUserInteraction({
      user_uuid: userUuid,
      art_id: world.uuid,
      art_type: "world",
      interaction_type: "favorite",
    });

    return respData({ success: true });
  } catch (error: any) {
    if (error?.code === "NOT_FOUND") return respErr("Not found", 404);
    console.log("Unfavorite world failed:", error);
    return respErr("Failed to unfavorite world");
  }
}
