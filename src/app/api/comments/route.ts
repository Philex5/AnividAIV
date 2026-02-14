import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/services/user";
import { createComment, getComments } from "@/services/comment";
import { z } from "zod";

const getCommentsSchema = z.object({
  art_id: z.string().min(1),
  art_type: z.enum(["character", "image", "video", "user", "world"]),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const createCommentSchema = z.object({
  art_id: z.string().min(1),
  art_type: z.enum(["character", "image", "video", "user", "world"]),
  content: z.string().trim().min(1).max(1000),
  parent_uuid: z.string().optional(),
  reply_to_user_uuid: z.string().optional(),
});

/**
 * GET /api/comments
 * 获取评论列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserInfo();
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = getCommentsSchema.safeParse(searchParams);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { art_id, art_type, page, limit } = result.data;
    const comments = await getComments(art_id, art_type, page, limit, user?.uuid);

    return NextResponse.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    console.error("[API] Failed to fetch comments:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/comments
 * 发表评论
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user || !user.uuid) {
      return NextResponse.json(
        { success: false, error: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = createCommentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { art_id, art_type, content, parent_uuid, reply_to_user_uuid } = result.data;

    const comment = await createComment({
      art_id,
      art_type,
      user_uuid: user.uuid,
      content,
      parent_uuid,
      reply_to_user_uuid,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...comment,
        user: {
          display_name: user.display_name ?? null,
          avatar_url: user.avatar_url ?? null,
        },
      },
    });
  } catch (error) {
    console.error("[API] Failed to create comment:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
