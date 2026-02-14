import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findCharacterByUuid } from "@/models/character";
import { getCharacterCreationsByType } from "@/services/character-creations";

interface RouteParams {
  params: Promise<{
    uuid: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { uuid } = await context.params;
    const { searchParams } = new URL(request.url);

    // 1. 获取当前用户
    const session = await auth();
    const currentUserUuid = session?.user?.uuid; // ✅ 修复：使用 uuid 而不是 id

    // 2. 解析查询参数
    const type = searchParams.get("type") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    // 3. 查找角色
    const character = await findCharacterByUuid(uuid);
    if (!character) {
      return NextResponse.json(
        { success: false, error: "Character not found" },
        { status: 404 }
      );
    }

    // 4. 判断是否是角色所有者
    const isOwner = currentUserUuid && character.user_uuid === currentUserUuid;

    // 5. 查询 creations
    const result = await getCharacterCreationsByType({
      characterUuid: character.uuid!,
      isOwner: Boolean(isOwner),
      type: type || undefined,
      page,
      limit,
    });

    console.log("[Creations API] Returning response:", {
      success: true,
      total: result.pagination.total,
      totalPages: result.pagination.total_pages,
      hasData: Object.keys(result.byType).length > 0,
    });

    // 12. 返回结构化数据
    return NextResponse.json({
      success: true,
      data: {
        byType: result.byType,
        character: {
          uuid: character.uuid,
          name: character.name,
          isOwner,
        },
        pagination: result.pagination,
        filters: result.filters,
      },
    });
  } catch (error) {
    console.error("Failed to get character creations:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
