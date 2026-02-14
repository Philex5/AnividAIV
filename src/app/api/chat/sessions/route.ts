import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { listSessionsByUser } from "@/models/chat";
import { findCharacterByUuid } from "@/models/character";

export async function GET(request: NextRequest) {
  const userUuid = await getUserUuid();
  if (!userUuid) {
    return Response.json({ success: false, error: "User not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const characterUuid = searchParams.get("character_uuid") || undefined;
  const limit = Number(searchParams.get("limit") || 20);
  const offset = Number(searchParams.get("offset") || 0);
  const order_by = (searchParams.get("order_by") as "updated" | "created") || "updated";

  const sessions = await listSessionsByUser({ userUuid, characterUuid, limit, offset, orderBy: order_by });

  // Enrich sessions with character info (name and avatar)
  const sessionsWithCharacterInfo = await Promise.all(
    sessions.map(async (session) => {
      const character = await findCharacterByUuid(session.character_uuid);
      let avatarUrl: string | null = null;

      // Fetch avatar using the avatar API
      if (character?.uuid) {
        try {
          const avatarRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/characters/${character.uuid}/avatar?device=desktop`
          );
          if (avatarRes.ok) {
            const avatarData = await avatarRes.json();
            if (avatarData.success && avatarData.data?.url) {
              avatarUrl = avatarData.data.url;
            }
          }
        } catch (error) {
          console.error(`Failed to fetch avatar for character ${character.uuid}:`, error);
        }
      }

      return {
        ...session,
        character_name: character?.name || "Unknown Character",
        character_avatar: avatarUrl,
      };
    })
  );

  return Response.json({
    success: true,
    data: {
      sessions: sessionsWithCharacterInfo,
      total: sessionsWithCharacterInfo.length,
      limit,
      offset
    }
  });
}

