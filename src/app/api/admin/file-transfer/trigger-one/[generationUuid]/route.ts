/**
 * Manual Single Generation Transfer Trigger API
 * 手动触发单个Generation转存API - Admin专用
 *
 * 功能：
 * 1. 验证管理员权限
 * 2. 转存指定generation的所有文件
 * 3. 返回转存结果
 */

import { getFileTransferService } from '@/services/generation/file-transfer-service';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/admin-auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ generationUuid: string }> }
) {
  const { generationUuid } = await params;

  // Verify admin access (Bearer Token OR session)
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    console.log(`🔐 [Admin-Trigger-One] Authenticated via: ${authResult.method}`);

    console.log(`🚀 [Admin-Trigger-One] 手动触发转存: ${generationUuid}`);

    const service = getFileTransferService();
    const startTime = Date.now();

    // 转存指定generation
    const success = await service.transferGenerationFiles(generationUuid);

    const duration = Date.now() - startTime;

    if (success) {
      console.log(`✅ [Admin-Trigger-One] 转存成功: ${generationUuid} (${duration}ms)`);
    } else {
      console.log(`❌ [Admin-Trigger-One] 转存失败: ${generationUuid} (${duration}ms)`);
    }

    return Response.json({
      message: success ? 'Transfer completed successfully' : 'Transfer failed',
      data: {
        generationUuid,
        success,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ [Admin-Trigger-One] 转存异常: ${generationUuid}`, error);

    return Response.json(
      {
        message: 'Transfer trigger failed',
        error: error instanceof Error ? error.message : String(error),
        generationUuid,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
