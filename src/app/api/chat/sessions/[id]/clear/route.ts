import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { archiveSessionMessages } from "@/models/chat";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userUuid = await getUserUuid();
  if (!userUuid) {
    return Response.json({ success: false, error: "User not authenticated" }, { status: 401 });
  }

  try {
    const { id: sessionId } = await params;

    // archive all messages for this session
    await archiveSessionMessages(sessionId, userUuid);

    return Response.json({ success: true, data: { session_id: sessionId } });
  } catch (e) {
    console.error("Clear chat session error:", e);
    return Response.json(
      { success: false, error: "Failed to clear chat session" },
      { status: 500 }
    );
  }
}
