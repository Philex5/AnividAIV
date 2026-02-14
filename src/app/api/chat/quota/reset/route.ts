import { NextRequest } from "next/server";
import { resetMonthlyQuotas, checkQuotaResetHealth } from "@/services/chat/chat-quota-reset-cron";

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
// It requires a secret token for authentication

export async function POST(request: NextRequest) {
  // Check for authorization header
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_TOKEN;

  if (!expectedToken) {
    return Response.json(
      {
        success: false,
        error: "CRON_TOKEN not configured on server",
      },
      { status: 500 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return Response.json(
      {
        success: false,
        error: "Unauthorized: Invalid token",
      },
      { status: 401 }
    );
  }

  try {
    console.log("[Chat Quota Reset API] Received reset request");

    const result = await resetMonthlyQuotas();

    if (result.success) {
      return Response.json({
        success: true,
        message: "Monthly quotas reset successfully",
        data: {
          resetCount: result.resetCount,
          timestamp: result.timestamp,
          duration: Date.now() - new Date(result.timestamp).getTime(),
        },
      });
    } else {
      return Response.json(
        {
          success: false,
          error: result.error || "Reset failed",
          data: {
            resetCount: result.resetCount,
            timestamp: result.timestamp,
          },
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Chat Quota Reset API] Error:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Health check endpoint (for monitoring)
export async function GET(request: NextRequest) {
  try {
    const health = await checkQuotaResetHealth();

    return Response.json({
      success: true,
      healthy: health.healthy,
      message: health.message,
      data: {
        lastResetCount: health.lastResetCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Chat Quota Health API] Error:", error);

    return Response.json(
      {
        success: false,
        healthy: false,
        error: error?.message || "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
