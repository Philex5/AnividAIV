import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/services/user";
import { likeComment, unlikeComment } from "@/services/comment";

/**
 * POST /api/comments/[uuid]/like
 * 点赞评论
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const user = await getUserInfo();
    if (!user || !user.uuid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await likeComment(uuid, user.uuid);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("[API] Failed to like comment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments/[uuid]/like
 * 取消点赞
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const user = await getUserInfo();
    if (!user || !user.uuid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await unlikeComment(uuid, user.uuid);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("[API] Failed to unlike comment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
