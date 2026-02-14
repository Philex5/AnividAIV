import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import {
  deleteworld,
  getworldByIdentifier,
  updateworld,
} from "@/services/world";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return respErr("world id is required", 400);

    const viewerUuid = await getUserUuid();
    const world = await getworldByIdentifier(id, viewerUuid || undefined);
    return respData(world);
  } catch (error: any) {
    if (error?.code === "NOT_FOUND") return respErr(error.message || "Not found", 404);
    return respErr(error?.message || "Failed to get world", 500);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) return respErr("User not authenticated", 401);

    const { id } = await params;
    if (!id) return respErr("world id is required", 400);

    const body = await req.json();
    const updated = await updateworld(id, body, userUuid);
    return respData(updated);
  } catch (error: any) {
    const code = error?.code;
    if (code === "NOT_FOUND") return respErr(error.message || "Not found", 404);
    if (code === "CONFLICT") return respErr(error.message || "Conflict", 409);
    if (code === "FORBIDDEN") return respErr(error.message || "Forbidden", 403);
    if (code === "SUBSCRIPTION_REQUIRED")
      return respErr(error.message || "Subscription required", 403);
    if (code === "INVALID_URL" || code === "INVALID_NAME")
      return respErr(error.message || "Invalid input", 400);
    if (error?.name === "ZodError")
      return respErr("Request parameter validation failed", 400);
    return respErr(error?.message || "Failed to update world", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) return respErr("User not authenticated", 401);

    const { id } = await params;
    if (!id) return respErr("world id is required", 400);

    await deleteworld(id, userUuid);
    return new Response(null, { status: 204 });
  } catch (error: any) {
    const code = error?.code;
    if (code === "NOT_FOUND") return respErr(error.message || "Not found", 404);
    if (code === "FORBIDDEN") return respErr(error.message || "Forbidden", 403);
    if (code === "CONFLICT") return respErr(error.message || "Conflict", 409);
    return respErr(error?.message || "Failed to delete world", 500);
  }
}
