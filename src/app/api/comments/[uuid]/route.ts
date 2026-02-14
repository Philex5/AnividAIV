import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/services/user";
import { deleteComment } from "@/services/comment";

/**
 * DELETE /api/comments/[uuid]
 * 删除评论
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

    await deleteComment(uuid, user.uuid);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("[API] Failed to delete comment:", error);
    
    let status = 500;
    let message = "Internal Server Error";

    if (error.message === "Comment not found") {
      status = 404;
      message = "Comment not found";
    } else if (error.message === "Unauthorized") {
      status = 403;
      message = "You don't have permission to delete this comment";
    } else if (error.message === "Failed to delete comment") {
      status = 400;
      message = "Failed to delete comment";
    }

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
