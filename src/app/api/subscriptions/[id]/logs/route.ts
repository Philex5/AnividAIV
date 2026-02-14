import { NextRequest } from "next/server";
import { getLogs, getSubscriptionChangeStats } from "@/services/subscription-log.service";
import { auth } from "@/auth";

/**
 * v5.0新增：订阅日志查询API
 * GET /api/subscriptions/[id]/logs?limit=50&offset=0
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 验证用户认证
    const session = await auth();
    if (!session?.user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 获取日志列表
    const logs = await getLogs(id, { limit, offset });

    // 获取统计信息
    const stats = await getSubscriptionChangeStats(id);

    return Response.json({
      logs,
      stats,
      pagination: {
        limit,
        offset,
        has_more: logs.length === limit,
      }
    });
  } catch (error: any) {
    console.error("Failed to get subscription logs:", error);
    return Response.json(
      { error: "Failed to get subscription logs", details: error.message },
      { status: 500 }
    );
  }
}
