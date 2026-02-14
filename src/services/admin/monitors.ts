/**
 * Admin Monitors Service
 * 管理员监控服务
 *
 * 功能：
 * - file_trans
 * 1. 查询转存统计数据
 * 2. 查询转存趋势
 * 3. 查询待转存任务
 *
 * 遵循架构：Model → Service → API Layer Pattern
 * 数据库操作位于 Model 层 (src/models/generation.ts)
 * 本文件仅处理业务逻辑和数据处理
 */

import {
  findAllCompletedGenerations,
  findPendingTransfersWithDetails,
} from "@/models/generation";

/**
 * 查询所有待转存的任务
 */
export async function findAllGenerationsWithPendingTransfer() {
  // 调用 Model 层方法
  return await findPendingTransfersWithDetails();
}

/**
 * 获取转存统计数据
 */
export async function getTransferStats() {
  // 调用 Model 层方法获取所有已完成的任务
  const allCompleted = await findAllCompletedGenerations();

  const now = new Date();
  const nowTime = now.getTime();
  const next24Hours = nowTime + 24 * 60 * 60 * 1000;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  // 统计各种状态
  const stats = {
    total: allCompleted.length,
    pendingTransfers: 0,
    completedTransfers: 0,
    failedTransfers: 0,
    processingImages: 0,
    expiringSoon: 0,
    todayTransfers: 0,
    successRate: 0,
  };

  const todayCompleted = [];

  for (const gen of allCompleted) {
    // 通过 file_transfer_status 字段判断状态
    if (gen.file_transfer_status === 'pending' || gen.file_transfer_status === 'failed' || gen.file_transfer_status === 'transferring') {
      stats.pendingTransfers++;

      // 检查是否即将过期（与待转存列表保持一致口径）
      // 1. 仅统计 pending/failed（待转存列表不包含 transferring）
      // 2. 仅统计重试次数 < 3
      // 3. 临时URL必须未过期，且将在未来24小时内过期
      const isPendingListStatus =
        gen.file_transfer_status === 'pending' ||
        gen.file_transfer_status === 'failed';
      const retryCount = gen.transfer_retry_count ?? 0;

      if (isPendingListStatus && retryCount < 3 && gen.temp_url_expires_at) {
        const expireTime = gen.temp_url_expires_at.getTime();
        const isNotExpired = expireTime > nowTime;
        const expiresWithin24Hours = expireTime < next24Hours;

        if (isNotExpired && expiresWithin24Hours) {
          stats.expiringSoon++;
        }
      }
    } else if (gen.file_transfer_status === 'completed') {
      stats.completedTransfers++;
      todayCompleted.push(gen);
    }

    // 检查失败状态
    if (gen.file_transfer_status === 'failed') {
      stats.failedTransfers++;
    }

    // 检查是否今天完成
    if (gen.updated_at && gen.updated_at >= today) {
      stats.todayTransfers++;
    }
  }

  // 计算成功率（最近24小时）
  const recentCompleted = allCompleted.filter(
    (gen) => gen.updated_at && gen.updated_at >= yesterday
  );

  if (recentCompleted.length > 0) {
    const successful = recentCompleted.filter(
      (gen) => gen.file_transfer_status === 'completed'
    ).length;
    stats.successRate = (successful / recentCompleted.length) * 100;
  }

  return stats;
}

/**
 * 获取转存趋势数据
 */
export async function getTransferTrend(days: number = 7) {
  // 获取所有已完成的任务（一次性查询）
  const allCompleted = await findAllCompletedGenerations();

  const data = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // 在应用层按日期过滤数据
    const dayResults = allCompleted.filter((gen) => {
      if (!gen.updated_at) return false;
      const updateTime = gen.updated_at;
      return updateTime >= startOfDay && updateTime < endOfDay;
    });

    const success = dayResults.filter((gen) => gen.file_transfer_status === 'completed').length;
    const failed = dayResults.filter((gen) => gen.file_transfer_status === 'failed').length;
    const pending = dayResults.filter((gen) => gen.file_transfer_status === 'pending' || gen.file_transfer_status === 'transferring').length;

    data.push({
      date: startOfDay.toISOString().split('T')[0],
      success,
      failed,
      pending,
    });
  }

  return data;
}
