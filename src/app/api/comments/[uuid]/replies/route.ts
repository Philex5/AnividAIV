import { NextRequest, NextResponse } from "next/server";
import { getReplies } from "@/services/comment";
import { getUserInfo } from "@/services/user";

/**
 * GET /api/comments/[uuid]/replies
 * 获取子评论列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const user = await getUserInfo();
    const { uuid } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const replies = await getReplies(uuid, page, limit, user?.uuid);

    return NextResponse.json({
      success: true,
      data: replies,
    });
  } catch (error) {
    console.error("[API] Failed to fetch replies:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
