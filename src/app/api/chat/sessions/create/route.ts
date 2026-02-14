import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { getOrCreateSession } from "@/models/chat";

export async function POST(request: NextRequest) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { character_uuid, title } = body;

    if (!character_uuid) {
      return Response.json(
        { success: false, error: "character_uuid is required" },
        { status: 400 }
      );
    }

    // Create a new session
    const session = await getOrCreateSession({
      userUuid,
      characterUuid: character_uuid,
      title,
    });

    return Response.json({
      success: true,
      data: {
        session_id: session.session_id,
        character_uuid: session.character_uuid,
        title: session.title,
        created_at: session.created_at,
      },
    });
  } catch (error) {
    console.error("Failed to create chat session:", error);
    return Response.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}
