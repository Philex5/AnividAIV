/**
 * Manual Image Processing Trigger API
 * 手动触发图片后处理API - Admin专用
 *
 * 功能：
 * 1. 验证管理员权限
 * 2. 处理所有待处理的generation图片
 * 3. 返回处理结果统计
 */

import { findGenerationByUuid, updateGeneration, findPendingGenerationsForImageProcessing } from '@/models/generation';
import { getFileTransferService } from '@/services/generation/file-transfer-service';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/admin-auth';

export async function POST(request: Request) {
  // Verify admin access (Bearer Token OR session)
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    console.log(`🔐 [Image-Processing] Authenticated via: ${authResult.method}`);

    const { triggered_by, environment } = await request.json().catch(() => ({}));

    console.log('🚀 [Image-Processing] 手动触发图片后处理...', {
      triggered_by,
      environment
    });

    const service = getFileTransferService();
    const startTime = Date.now();

    // 1. 查找所有已转存但未处理图片的generation
    // 条件：status = completed, file_transfer_status = completed, 但可能缺少缩略图
    const pendingGenerations = await findPendingGenerationsForImageProcessing();

    console.log(`📋 [Image-Processing] 找到 ${pendingGenerations.length} 个待检查的generation`);

    let processedCount = 0;
    let alreadyProcessedCount = 0;
    let errorCount = 0;

    for (const generation of pendingGenerations) {
      try {
        console.log(`🖼️ [Image-Processing] 开始处理 Generation ${generation.uuid}`);

        // 重新转存以生成缩略图
        // 新的实现：直接处理 generation_images 表
        const success = await service.transferGenerationFiles(generation.uuid);

        if (success) {
          processedCount++;
          console.log(`✅ [Image-Processing] Generation ${generation.uuid} 处理成功`);
        } else {
          errorCount++;
          console.error(`❌ [Image-Processing] Generation ${generation.uuid} 处理失败`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ [Image-Processing] 处理异常 Generation ${generation.uuid}:`, error);
      }
    }

    const duration = Date.now() - startTime;

    const summary = {
      triggerTime: new Date().toISOString(),
      duration: `${duration}ms`,
      totalChecked: pendingGenerations.length,
      processed: processedCount,
      alreadyProcessed: alreadyProcessedCount,
      errors: errorCount,
      success: errorCount === 0
    };

    console.log('✅ [Image-Processing] 图片后处理完成:', summary);

    return Response.json({
      message: 'Image processing triggered successfully',
      data: summary
    });

  } catch (error) {
    console.error('❌ [Image-Processing] 图片后处理失败:', error);

    return Response.json(
      {
        message: 'Image processing trigger failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
