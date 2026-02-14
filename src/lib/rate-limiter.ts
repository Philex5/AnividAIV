/**
 * Rate Limiter - 基于内存的限流机制
 *
 * 设计说明：
 * 1. 使用 Map 存储限流记录（适合单实例部署）
 * 2. 支持基于 userId + resourceId 的限流
 * 3. 自动清理过期记录
 * 4. 返回详细的限流信息（是否允许、剩余时间）
 *
 * 生产环境建议：
 * - 使用 Redis 实现分布式限流
 * - 支持更复杂的限流策略（令牌桶、漏桶算法）
 */

interface RateLimitRecord {
  key: string;
  expiresAt: number; // Unix timestamp
}

class RateLimiter {
  private records: Map<string, RateLimitRecord>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.records = new Map();
    this.cleanupInterval = null;

    // 每分钟清理一次过期记录
    this.startCleanupTask();
  }

  /**
   * 检查是否允许操作
   * @param userId 用户 ID
   * @param resourceId 资源 ID（如 character_uuid）
   * @param ttlSeconds TTL（秒）
   * @returns { allowed: boolean, retryAfter?: number }
   */
  checkLimit(
    userId: string,
    resourceId: string,
    ttlSeconds: number = 5
  ): { allowed: boolean; retryAfter?: number } {
    const key = `${userId}:${resourceId}`;
    const now = Date.now();
    const record = this.records.get(key);

    // 检查是否存在且未过期
    if (record && record.expiresAt > now) {
      const retryAfter = Math.ceil((record.expiresAt - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // 允许操作，创建新记录
    const expiresAt = now + ttlSeconds * 1000;
    this.records.set(key, { key, expiresAt });

    return { allowed: true };
  }

  /**
   * 清除指定记录
   */
  clear(userId: string, resourceId: string): void {
    const key = `${userId}:${resourceId}`;
    this.records.delete(key);
  }

  /**
   * 清除所有记录
   */
  clearAll(): void {
    this.records.clear();
  }

  /**
   * 启动定时清理任务
   */
  private startCleanupTask(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 每分钟执行一次
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, record] of this.records.entries()) {
      if (record.expiresAt <= now) {
        this.records.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[RateLimiter] Cleaned ${cleanedCount} expired records`);
    }
  }

  /**
   * 停止清理任务
   */
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 获取当前记录数量
   */
  getRecordCount(): number {
    return this.records.size;
  }
}

// 单例实例
export const rateLimiter = new RateLimiter();

/**
 * 检查生成任务的速率限制
 * @param userId 用户 UUID
 * @param resourceId 资源 ID（character UUID 或其他）
 * @returns { allowed: boolean, retryAfter?: number }
 */
export function checkGenerationRateLimit(
  userId: string,
  resourceId: string = "global"
): { allowed: boolean; retryAfter?: number } {
  return rateLimiter.checkLimit(userId, resourceId, 5); // 5秒限流
}

/**
 * 清除限流记录
 */
export function clearGenerationRateLimit(
  userId: string,
  resourceId: string = "global"
): void {
  rateLimiter.clear(userId, resourceId);
}
