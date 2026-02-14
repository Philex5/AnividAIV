import { generations, credits, generationImages, generationVideos } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, and, gte, lte, inArray, lt, sql } from "drizzle-orm";

// 创建图片生成记录
export async function insertGeneration(
  data: typeof generations.$inferInsert
): Promise<typeof generations.$inferSelect | undefined> {
  const [generation] = await db().insert(generations).values(data).returning();
  return generation;
}

// 根据UUID获取生成记录
export async function findGenerationByUuid(
  uuid: string
): Promise<typeof generations.$inferSelect | undefined> {
  const [generation] = await db()
    .select()
    .from(generations)
    .where(eq(generations.uuid, uuid))
    .limit(1);

  return generation;
}

// 根据远程任务ID获取生成记录
export async function findGenerationByRemoteTaskId(
  remote_task_id: string
): Promise<typeof generations.$inferSelect | undefined> {
  const [generation] = await db()
    .select()
    .from(generations)
    .where(eq(generations.remote_task_id, remote_task_id))
    .limit(1);

  return generation;
}

export async function findGenerationByWebhookToken(
  token: string
): Promise<typeof generations.$inferSelect | undefined> {
  const [generation] = await db()
    .select()
    .from(generations)
    .where(sql`${generations.metadata} ->> 'webhook_token' = ${token}`)
    .limit(1);

  return generation;
}

// 获取用户的生成记录列表
export async function getUserGenerations(
  user_uuid: string,
  page: number = 1,
  limit: number = 20
): Promise<(typeof generations.$inferSelect)[]> {
  const offset = (page - 1) * limit;

  const generationsList = await db()
    .select()
    .from(generations)
    .where(eq(generations.user_uuid, user_uuid))
    .orderBy(desc(generations.created_at))
    .limit(limit)
    .offset(offset);

  return generationsList;
}

// 更新生成记录状态
export async function updateGenerationStatus(
  uuid: string,
  status: string
): Promise<typeof generations.$inferSelect | undefined> {
  const [generation] = await db()
    .update(generations)
    .set({ 
      status,
      updated_at: new Date()
    })
    .where(eq(generations.uuid, uuid))
    .returning();

  return generation;
}

// 更新生成记录
export async function updateGeneration(
  uuid: string,
  data: Partial<typeof generations.$inferInsert>
): Promise<typeof generations.$inferSelect | undefined> {
  const updateData = {
    ...data,
    updated_at: new Date()
  };

  const [generation] = await db()
    .update(generations)
    .set(updateData)
    .where(eq(generations.uuid, uuid))
    .returning();

  return generation;
}

// 获取用户特定状态的生成记录
export async function getUserGenerationsByStatus(
  user_uuid: string,
  status: string,
  page: number = 1,
  limit: number = 20
): Promise<(typeof generations.$inferSelect)[]> {
  const offset = (page - 1) * limit;

  const generationsList = await db()
    .select()
    .from(generations)
    .where(and(
      eq(generations.user_uuid, user_uuid),
      eq(generations.status, status)
    ))
    .orderBy(desc(generations.created_at))
    .limit(limit)
    .offset(offset);

  return generationsList;
}

// 获取已完成的生成记录
export async function getCompletedGenerations(
  user_uuid: string,
  page: number = 1,
  limit: number = 20
): Promise<(typeof generations.$inferSelect)[]> {
  return getUserGenerationsByStatus(user_uuid, "completed", page, limit);
}

// 获取处理中的生成记录
export async function getProcessingGenerations(
  user_uuid: string
): Promise<(typeof generations.$inferSelect)[]> {
  const generationsList = await db()
    .select()
    .from(generations)
    .where(and(
      eq(generations.user_uuid, user_uuid),
      eq(generations.status, "processing")
    ))
    .orderBy(desc(generations.created_at));

  return generationsList;
}

// 获取用户生成记录总数
export async function getUserGenerationsCount(
  user_uuid: string,
  status?: string
): Promise<number> {
  let query = db().$count(generations, eq(generations.user_uuid, user_uuid));
  
  if (status) {
    query = db().$count(generations, and(
      eq(generations.user_uuid, user_uuid),
      eq(generations.status, status)
    ));
  }

  return await query;
}

// 获取用户今日生成次数
export async function getUserTodayGenerationsCount(
  user_uuid: string
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await db()
    .select()
    .from(generations)
    .where(and(
      eq(generations.user_uuid, user_uuid),
      // 需要使用 SQL 函数来比较日期
    ));

  // 在应用层过滤今天的记录
  const todayGenerations = count.filter(generation => {
    const createdDate = new Date(generation.created_at!);
    return createdDate >= today;
  });

  return todayGenerations.length;
}

// 根据remote_task_id查找generation（别名，用于Webhook）
export async function findGenerationByTaskId(taskId: string) {
  return findGenerationByRemoteTaskId(taskId);
}

// 查找所有待转存的任务
// 通过查询 generation_images 表，筛选出使用外部临时URL的记录
export async function findPendingTransfers() {
  const results = await db()
    .select()
    .from(generations)
    .where(eq(generations.status, 'completed'));

  // 进一步过滤：检查是否有对应的 generation_images 使用外部URL
  // 这里简化处理，实际应该通过 JOIN 查询
  return results;
}

// 更新转存状态
export async function updateTransferStatus(
  uuid: string,
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'skipped'
) {
  return updateGeneration(uuid, {
    file_transfer_status: status,
    updated_at: new Date(),
  });
}

// 获取需要图片后处理的生成记录
// 条件：status = completed, file_transfer_status = completed，但可能缺少缩略图
export async function findPendingGenerationsForImageProcessing(): Promise<(typeof generations.$inferSelect)[]> {
  const database = db();
  const results = await database
    .select()
    .from(generations)
    .where(and(
      eq(generations.status, 'completed'),
      eq(generations.file_transfer_status, 'completed')
    ));

  return results;
}
// ========================================
// 监控相关的数据查询方法 (Admin 专用)
// ========================================

// 获取所有已完成的生成记录
export async function findAllCompletedGenerations(): Promise<(typeof generations.$inferSelect)[]> {
  const database = db();
  const results = await database
    .select()
    .from(generations)
    .where(eq(generations.status, 'completed'));

  return results;
}

// 获取失败生成记录列表（包含MC退款信息）
export async function listFailedGenerations(options?: { limit?: number }) {
  const limit = options?.limit ?? 50;

  // 查询失败记录和对应的退款记录
  const failedGenerations = await db()
    .select({
      uuid: generations.uuid,
      type: generations.type,
      status: generations.status,
      prompt: generations.prompt,
      created_at: generations.created_at,
      updated_at: generations.updated_at,
      user_uuid: generations.user_uuid,
      error_code: generations.error_code,
      error_message: generations.error_message,
      model_id: generations.model_id,
      sub_type: generations.sub_type,
      progress: generations.progress,
      credits_cost: generations.credits_cost,
      generation_time: generations.generation_time,
      reference_image_url: generations.reference_image_url,
      metadata: generations.metadata,
      credits_amount: credits.credits,
      trans_type: credits.trans_type,
    })
    .from(generations)
    .leftJoin(credits, eq(generations.uuid, credits.generation_uuid))
    .where(eq(generations.status, "failed"))
    .limit(limit);

  // 在内存中聚合结果
  const resultMap = new Map<string, any>();

  failedGenerations.forEach((row) => {
    const existing = resultMap.get(row.uuid);

    // 计算退款金额：只计算trans_type包含'refund'且credits_amount为正数的记录
    // 积分返还时，credits_amount是正数（表示用户获得返还的积分）
    const isRefund = row.trans_type &&
                     row.trans_type.toLowerCase().includes('refund') &&
                     row.credits_amount !== null &&
                     row.credits_amount !== undefined &&
                     row.credits_amount > 0;
    const refundAmount = isRefund ? (row.credits_amount || 0) : 0;

    if (!existing) {
      // 第一次遇到这个generation，创建基础记录
      resultMap.set(row.uuid, {
        uuid: row.uuid,
        type: row.type,
        status: row.status,
        prompt: row.prompt,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user_uuid: row.user_uuid,
        error_code: row.error_code,
        error_message: row.error_message,
        model_id: row.model_id,
        sub_type: row.sub_type,
        progress: row.progress,
        credits_cost: row.credits_cost,
        generation_time: row.generation_time,
        reference_image_url: row.reference_image_url,
        metadata: row.metadata,
        mc_back_status: refundAmount > 0 ? 'refunded' : 'pending',
        mc_back_count: refundAmount,
      });
    } else {
      // 已有记录，累加退款金额
      if (isRefund) {
        existing.mc_back_count += refundAmount;
        existing.mc_back_status = 'refunded';
      }
    }
  });

  return Array.from(resultMap.values());
}

// 获取待转存任务列表（带详细字段映射）
// 注意：此方法仅做数据查询和基本映射，排序逻辑在Service层处理
export async function findPendingTransfersWithDetails(
  options?: {
    typeFilter?: string[]; // 文件类型筛选：['image', 'video', 'character']
    startDate?: string;
    endDate?: string;
  }
) {
  const database = db();
  const now = new Date();

  console.log("📋 [Model] 查询待转存任务列表...", options);

  const results = await database
    .select()
    .from(generations)
    .where(
      and(
        eq(generations.status, 'completed'),
        inArray(generations.file_transfer_status, ['pending', 'failed']),
        lt(generations.transfer_retry_count, 3)
      )
    );

  // 过滤出临时URL未过期的记录
  let filteredResults = results
    .filter((gen) => {
      const hasTempUrl = gen.temp_url_expires_at !== null && gen.temp_url_expires_at !== undefined;
      const notExpired = !hasTempUrl || new Date(gen.temp_url_expires_at!) > now;
      return notExpired;
    });

  // 如果有类型筛选，需要根据 generation_images、generation_videos 表和 generation 类型判断
  if (options?.typeFilter && options.typeFilter.length > 0) {
    console.log("🔍 [Model] 应用类型筛选:", options.typeFilter);

    const imageGenerations = new Set<string>();
    const videoGenerations = new Set<string>();

    // 查询 generation_images 表中的 generation_uuid
    const imageResults = await database
      .select({ generation_uuid: generationImages.generation_uuid })
      .from(generationImages);
    imageResults.forEach(row => {
      if (row.generation_uuid) {
        imageGenerations.add(row.generation_uuid);
      }
    });

    // 查询 generation_videos 表中的 generation_uuid
    const videoResults = await database
      .select({ generation_uuid: generationVideos.generation_uuid })
      .from(generationVideos);
    videoResults.forEach(row => {
      if (row.generation_uuid) {
        videoGenerations.add(row.generation_uuid);
      }
    });

    console.log("📊 [Model] 统计信息:", {
      totalFiltered: filteredResults.length,
      imageCount: imageGenerations.size,
      videoCount: videoGenerations.size,
      typeFilter: options.typeFilter
    });

    // 根据筛选条件过滤
    filteredResults = filteredResults.filter((gen) => {
      const hasImages = imageGenerations.has(gen.uuid);
      const hasVideos = videoGenerations.has(gen.uuid);
      const isCharacter = gen.type === 'character';

      const typeFilter = options.typeFilter!;
      const matchesImage = typeFilter.includes('image') && hasImages;
      const matchesVideo = typeFilter.includes('video') && hasVideos;
      const matchesCharacter = typeFilter.includes('character') && isCharacter;

      const matches = matchesImage || matchesVideo || matchesCharacter;

      if (!matches && typeFilter.length > 0) {
        console.log(`⚠️ [Model] 过滤掉 generation ${gen.uuid}:`, {
          hasImages,
          hasVideos,
          type: gen.type,
          typeFilter
        });
      }

      return matches;
    });
  }

  // 应用日期筛选
  if (options?.startDate) {
    const startDate = new Date(options.startDate);
    filteredResults = filteredResults.filter((gen) => {
      if (!gen.created_at) return false;
      return new Date(gen.created_at) >= startDate;
    });
  }

  if (options?.endDate) {
    const endDate = new Date(options.endDate);
    filteredResults = filteredResults.filter((gen) => {
      if (!gen.created_at) return false;
      return new Date(gen.created_at) <= endDate;
    });
  }

  console.log(`✅ [Model] 筛选完成，共 ${filteredResults.length} 个待转存任务`);

  return filteredResults.map((gen) => ({
    uuid: gen.uuid,
    created_at: gen.created_at?.toISOString() || '',
    temp_url_expires_at: gen.temp_url_expires_at?.toISOString() || null,
    transfer_retry_count: gen.transfer_retry_count || 0,
    file_transfer_status: gen.file_transfer_status || 'pending',
    result_urls_count: 0, // 将在 Service 层通过 JOIN 统计
  }));
}
