import { respData, respErr } from "@/lib/resp";
import { verifyAdminAccess, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminChatSessionDetail } from "@/services/admin/chat-analytics";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return respErr("Session ID is required", 400);
    }

    const data = await getAdminChatSessionDetail(sessionId);
    if (!data) {
      return respErr("Chat session not found", 404);
    }

    return respData(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get session messages";
    return respErr(message);
  }
}

