import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { db } from "@/db";
import { generations, generationImages } from "@/db/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 检查用户登录状态
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json(
        { error: "用户未登录" },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status"); // completed, failed, pending, processing
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereConditions = [eq(generations.user_uuid, userUuid)];
    
    if (status) {
      whereConditions.push(eq(generations.status, status));
    }

    // 查询生成历史记录
    const historyQuery = db()
      .select({
        uuid: generations.uuid,
        created_at: generations.created_at,
        updated_at: generations.updated_at,
        remote_task_id: generations.remote_task_id,
        model_id: generations.model_id,
        prompt: generations.prompt,
        status: generations.status,
        counts: generations.counts,
        credits_cost: generations.credits_cost
      })
      .from(generations)
      .where(and(...whereConditions))
      .orderBy(desc(generations.created_at))
      .limit(limit)
      .offset(offset);

    const historyRecords = await historyQuery;

    // 为每个生成记录获取关联的图片
    const recordsWithImages = await Promise.all(
      historyRecords.map(async (record) => {
        const images = await db()
          .select({
            uuid: generationImages.uuid,
            image_url: generationImages.image_url,
            thumbnail_mobile: generationImages.thumbnail_mobile,
            thumbnail_desktop: generationImages.thumbnail_desktop
          })
          .from(generationImages)
          .where(eq(generationImages.generation_uuid, record.uuid))
          .orderBy(generationImages.created_at);

        return {
          ...record,
          images: images
        };
      })
    );

    // 获取总数（用于分页）
    const totalQuery = db()
      .select({ count: generations.uuid })
      .from(generations)
      .where(and(...whereConditions));
    
    const totalRecords = await totalQuery;
    const total = totalRecords.length;

    return Response.json({
      success: true,
      data: {
        records: recordsWithImages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error: any) {
    console.error("获取生成历史失败:", error);

    return Response.json(
      { error: error.message || "获取历史记录失败" },
      { status: 500 }
    );
  }
}