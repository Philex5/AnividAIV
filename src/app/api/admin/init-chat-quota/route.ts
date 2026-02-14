import { NextRequest } from "next/server";
import { initializeChatQuotas } from "@/scripts/init-chat-quotas";
import { verifyAdminToken, unauthorizedResponse } from '@/lib/admin-auth';

// 管理员专用接口，用于初始化聊天配额系统
export async function POST(request: NextRequest) {
  // Verify admin Bearer Token
  if (!(await verifyAdminToken(request))) {
    return unauthorizedResponse();
  }

  try {
    console.log("[Init Chat Quota] Starting initialization...");

    const result = await initializeChatQuotas();

    return Response.json({
      success: true,
      message: "Chat quota system initialized successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("[Init Chat Quota] Failed:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Initialization failed",
      },
      { status: 500 }
    );
  }
}
