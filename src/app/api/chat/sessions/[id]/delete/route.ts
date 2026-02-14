import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { deleteSession } from "@/models/chat";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userUuid = await getUserUuid();
  if (!userUuid) {
    return Response.json({ success: false, error: "User not authenticated" }, { status: 401 });
  }

  try {
    const { id: sessionId } = await params;

    // Delete the session and all its messages
    await deleteSession(sessionId, userUuid);

    return Response.json({
      success: true,
      data: { session_id: sessionId }
    });
  } catch (e) {
    console.error("Delete chat session error:", e);

    const errorMessage = e instanceof Error ? e.message : "Failed to delete chat session";

    return Response.json(
      { success: false, error: errorMessage },
      { status: errorMessage === "Session not found or access denied" ? 404 : 500 }
    );
  }
}
