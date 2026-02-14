/**
 * Pending Transfers List API
 * 待转存任务列表API - Admin专用
 *
 * 功能：
 * 1. 验证管理员权限
 * 2. 通过Service层获取待转存任务列表（已按优先级排序）
 * 3. 返回任务列表
 *
 * 架构说明：
 * - API层：仅负责权限验证和响应处理
 * - Service层：负责业务逻辑和数据排序
 * - Model层：负责数据库访问
 */

import { getFileTransferService } from "@/services/generation/file-transfer-service";
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/admin-auth';

export async function GET(request: Request) {
  // Verify admin access (Bearer Token OR session)
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    console.log(`🔐 [Pending-List] Authenticated via: ${authResult.method}`);

    const url = new URL(request.url);
    const start_date = url.searchParams.get('start_date');
    const end_date = url.searchParams.get('end_date');
    const type_filter = url.searchParams.get('type_filter');

    console.log('📋 [Pending-List] 查询待转存任务...', {
      start_date,
      end_date,
      type_filter
    });

    // 解析类型筛选参数
    let typeFilter: string[] | undefined;
    if (type_filter) {
      typeFilter = type_filter.split(',').filter(t => t.trim().length > 0);
      console.log('🔍 [Pending-List] 解析类型筛选参数:', typeFilter);
    }

    // 通过Service层获取业务数据（包含排序和格式化）
    const fileTransferService = getFileTransferService();
    const pendingTransfers = await fileTransferService.getPendingTransfersList({
      typeFilter,
      startDate: start_date || undefined,
      endDate: end_date || undefined,
    });

    console.log(`✅ [Pending-List] 查询完成，共 ${pendingTransfers.count} 个待转存任务`);

    return Response.json({
      success: true,
      message: 'Pending transfers retrieved successfully',
      data: pendingTransfers,
      filters: {
        start_date: start_date || 'all',
        end_date: end_date || 'all',
        type: type_filter || 'all'
      }
    });

  } catch (error) {
    console.error('❌ [Pending-List] 查询失败:', error);

    return Response.json(
      {
        message: 'Failed to retrieve pending transfers',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
