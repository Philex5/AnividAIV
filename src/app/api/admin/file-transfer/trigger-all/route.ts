/**
 * Manual File Transfer Trigger API
 * 手动触发文件转存API - Admin专用
 *
 * 功能：
 * 1. 验证管理员权限
 * 2. 触发所有待转存任务
 * 3. 返回转存结果统计
 */

import { getFileTransferCron } from '@/services/generation/cron/file-transfer-cron';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/admin-auth';

export async function POST(request: Request) {
  // Verify admin access (Bearer Token OR session)
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    console.log(`🔐 [Admin-Trigger] Authenticated via: ${authResult.method}`);

    const body = await request.json().catch(() => ({}));
    const { start_date, end_date, type_filter } = body;

    console.log('🚀 [Admin-Trigger] 手动触发文件转存扫描...', {
      start_date,
      end_date,
      type_filter
    });

    const cron = getFileTransferCron();
    const startTime = Date.now();

    // 手动触发转存扫描（支持筛选）
    // 构建筛选条件对象
    const filters = {
      startDate: start_date || null,
      endDate: end_date || null,
      typeFilter: type_filter || null
    };

    await cron.scanAndTransfer(filters);

    const duration = Date.now() - startTime;

    console.log(`✅ [Admin-Trigger] 手动转存完成，耗时 ${duration}ms`);

    // 获取状态
    const status = cron.getStatus();

    return Response.json({
      success: true,
      message: 'File transfer triggered successfully',
      data: {
        triggerTime: new Date().toISOString(),
        duration: `${duration}ms`,
        status,
        filters: {
          start_date: start_date || 'all',
          end_date: end_date || 'all',
          type: type_filter || 'all'
        }
      }
    });

  } catch (error) {
    console.error('❌ [Admin-Trigger] 手动转存失败:', error);

    return Response.json(
      {
        message: 'File transfer trigger failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
