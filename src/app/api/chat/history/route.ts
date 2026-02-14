import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { getHistoryBySession } from "@/models/chat";

export async function GET(request: NextRequest) {
  const userUuid = await getUserUuid();
  if (!userUuid) {
    return Response.json({ success: false, error: "User not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const limit = Number(searchParams.get("limit") || 50);
  const offset = Number(searchParams.get("offset") || 0);
  const order = (searchParams.get("order") as "asc" | "desc") || "asc";

  if (!sessionId) {
    return Response.json({ success: false, error: "session_id is required" }, { status: 400 });
  }

  const messages = await getHistoryBySession(sessionId, limit, offset, order);
  return Response.json({ success: true, data: { messages, total: messages.length, limit, offset } });
}

