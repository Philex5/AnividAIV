import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { getMembershipLevel } from "@/services/membership";
import { MembershipLevel } from "@/types/membership";
import chatLimits from "@/configs/chat/chat-limits.json" assert { type: "json" };

export async function GET(_req: NextRequest) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json({ success: false, error: "User not authenticated" }, { status: 401 });
    }

    const level = await getMembershipLevel(userUuid);
    const config = (chatLimits as any)[level];
    const availableModels = config.available_models || ["base"];

    return Response.json({
      success: true,
      data: {
        user_level: level,
        config,
        available_models: availableModels,
        all_levels: {
          free: (chatLimits as any).free,
          basic: (chatLimits as any).basic,
          plus: (chatLimits as any).plus,
          pro: (chatLimits as any).pro
        }
      }
    });
  } catch (e) {
    console.error("Chat config error:", e);
    return Response.json(
      { success: false, error: "Failed to get chat config" },
      { status: 500 }
    );
  }
}

