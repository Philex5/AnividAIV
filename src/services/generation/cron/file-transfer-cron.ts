/**
 * File Transfer Cron Job
 * 文件转存定时任务 - 每10分钟扫描并转存未完成的任务
 *
 * Cron表达式: every 10 minutes
 */

import { getFileTransferService } from "../file-transfer-service";
import { findGenerationByUuid } from "@/models/generation";
import { db } from "@/db";
import { generations, generationImages, generationVideos } from "@/db/schema";
import { eq, and, gt, lt, inArray } from "drizzle-orm";
import { getGenerationVideosByGenerationUuid } from "@/models/generation-video";
import { videoProcessor } from "../video-processor";

export const FILE_TRANSFER_CRON = "*/10 * * * *";

export class FileTransferCron {
  private fileTransferService = getFileTransferService();
  private isRunning = false;

  /**
   * 定时扫描并转存未完成的任务
   * @param filters 筛选条件：日期范围和类型筛选
   */
  async scanAndTransfer(filters?: {
    startDate?: string | null;
    endDate?: string | null;
    typeFilter?: string[];
  }): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ [FileTransferCron] 任务已在运行，跳过本次执行");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log("🔄 [FileTransferCron] 开始扫描未转存任务...", {
        filters: filters || "no filters",
      });

      // 1. 查找所有使用临时URL且未转存的generation
      const pendingGenerations = await this.findPendingTransfers(filters);

      if (pendingGenerations.length === 0) {
        console.log("✅ [FileTransferCron] 没有需要转存的任务");
        return;
      }

      console.log(
        `📋 [FileTransferCron] 找到 ${pendingGenerations.length} 个待转存任务`
      );

      // 2. 按优先级排序
      const sortedTasks = this.sortByPriority(pendingGenerations);

      // 3. 批量转存
      let successCount = 0;
      let failureCount = 0;

      for (const task of sortedTasks) {
        try {
          console.log(
            `📤 [FileTransferCron] 开始转存: ${task.uuid}, 类型: ${task.type}`
          );

          let success = false;

          // 根据generation类型选择转存策略
          if (task.type === "video") {
            // 视频转存
            success = await this.transferVideoFiles(task.uuid);
          } else {
            // 图片转存（默认）
            success = await this.fileTransferService.transferGenerationFiles(
              task.uuid
            );
          }

          if (success) {
            successCount++;
            console.log(`✅ [FileTransferCron] 转存成功: ${task.uuid}`);
          } else {
            failureCount++;
            console.log(`❌ [FileTransferCron] 转存失败: ${task.uuid}`);
          }
        } catch (error) {
          failureCount++;
          console.error(`❌ [FileTransferCron] 转存异常: ${task.uuid}`, error);

          // 更新重试次数
          await this.incrementRetryCount(task.uuid);
        }
      }

      const duration = Date.now() - startTime;

      console.log("✅ [FileTransferCron] 扫描完成", {
        total: pendingGenerations.length,
        success: successCount,
        failed: failureCount,
        duration: `${duration}ms`,
      });
    } catch (error) {
      console.error("❌ [FileTransferCron] 扫描失败:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 查找所有待转存的任务
   * @param filters 筛选条件：日期范围和类型筛选
   */
  private async findPendingTransfers(filters?: {
    startDate?: string | null;
    endDate?: string | null;
    typeFilter?: string[];
  }) {
    // 查找条件：
    // 1. 状态为completed
    // 2. 转存状态为pending或failed
    // 3. 重试次数小于3次
    // 4. 临时URL未过期
    // 5. 根据筛选条件过滤
    const now = new Date();

    // 构建WHERE条件
    const whereConditions = [eq(generations.status, "completed")];

    // 只查询需要转存的状态：pending或failed
    whereConditions.push(
      inArray(generations.file_transfer_status, ["pending", "failed"])
    );

    // 应用日期筛选
    if (filters?.startDate) {
      whereConditions.push(
        gt(generations.created_at, new Date(filters.startDate))
      );
    }
    if (filters?.endDate) {
      whereConditions.push(
        lt(generations.created_at, new Date(filters.endDate))
      );
    }

    // 应用重试次数筛选（小于3次）
    whereConditions.push(lt(generations.transfer_retry_count, 3));

    const results = await db()
      .select()
      .from(generations)
      .where(and(...whereConditions));

    // 过滤出需要转存的记录（检查是否有临时URL需要转存）
    let filteredResults = results.filter((gen) => {
      // 检查临时URL是否过期
      const hasTempUrl =
        gen.temp_url_expires_at !== null &&
        gen.temp_url_expires_at !== undefined;
      const notExpired =
        !hasTempUrl || new Date(gen.temp_url_expires_at!) > now;

      if (!notExpired) {
        console.log(`⏰ [FileTransferCron] 临时URL已过期，跳过: ${gen.uuid}`);
        return false;
      }

      return true;
    });

    // 应用类型筛选（图片/视频/角色）
    if (filters?.typeFilter && filters.typeFilter.length > 0) {
      console.log("🔍 [FileTransferCron] 应用类型筛选:", filters.typeFilter);

      const imageGenerations = new Set<string>();
      const videoGenerations = new Set<string>();

      // 查询 generation_images 表中的 generation_uuid
      const imageResults = await db()
        .select({ generation_uuid: generationImages.generation_uuid })
        .from(generationImages);
      imageResults.forEach(row => {
        if (row.generation_uuid) {
          imageGenerations.add(row.generation_uuid);
        }
      });

      // 查询 generation_videos 表中的 generation_uuid
      const videoResults = await db()
        .select({ generation_uuid: generationVideos.generation_uuid })
        .from(generationVideos);
      videoResults.forEach(row => {
        if (row.generation_uuid) {
          videoGenerations.add(row.generation_uuid);
        }
      });

      console.log("📊 [FileTransferCron] 统计信息:", {
        totalFound: results.length,
        imageCount: imageGenerations.size,
        videoCount: videoGenerations.size,
        typeFilter: filters.typeFilter
      });

      // 根据筛选条件过滤
      filteredResults = filteredResults.filter((gen) => {
        const hasImages = imageGenerations.has(gen.uuid);
        const hasVideos = videoGenerations.has(gen.uuid);
        const isCharacter = gen.type === 'character';

        const typeFilter = filters.typeFilter!;
        const matchesImage = typeFilter.includes('image') && hasImages;
        const matchesVideo = typeFilter.includes('video') && hasVideos;
        const matchesCharacter = typeFilter.includes('character') && isCharacter;

        const matches = matchesImage || matchesVideo || matchesCharacter;

        if (!matches && typeFilter.length > 0) {
          console.log(`⚠️ [FileTransferCron] 过滤掉 generation ${gen.uuid}:`, {
            hasImages,
            hasVideos,
            type: gen.type,
            typeFilter
          });
        }

        return matches;
      });
    }

    console.log(
      `🔍 [FileTransferCron] 筛选结果: ${filteredResults.length}/${results.length}`,
      {
        totalFound: results.length,
        afterTypeFilter: filteredResults.length,
        typeFilter: filters?.typeFilter,
        dateRange:
          filters?.startDate || filters?.endDate
            ? `${filters?.startDate || "beginning"} to ${filters?.endDate || "now"}`
            : "all time",
      }
    );

    return filteredResults;
  }

  /**
   * 按优先级排序
   * 1. 即将过期的临时URL优先
   * 2. 转存失败的优先
   * 3. 创建时间早的优先
   */
  private sortByPriority(tasks: any[]): any[] {
    return tasks.sort((a, b) => {
      // 过期时间排序（如果有）
      if (a.temp_url_expires_at && b.temp_url_expires_at) {
        const aExpire = new Date(a.temp_url_expires_at).getTime();
        const bExpire = new Date(b.temp_url_expires_at).getTime();
        if (aExpire !== bExpire) {
          return aExpire - bExpire;
        }
      }

      // 重试次数排序
      if (a.transfer_retry_count !== b.transfer_retry_count) {
        return b.transfer_retry_count - a.transfer_retry_count;
      }

      // 创建时间排序
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }

  /**
   * 增加重试次数
   */
  private async incrementRetryCount(generationUuid: string): Promise<void> {
    const generation = await findGenerationByUuid(generationUuid);
    if (!generation) return;

    await db()
      .update(generations)
      .set({
        transfer_retry_count: (generation.transfer_retry_count || 0) + 1,
        updated_at: new Date(),
      })
      .where(eq(generations.uuid, generationUuid));
  }

  /**
   * 获取cron状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      cronExpression: FILE_TRANSFER_CRON,
    };
  }

  /**
   * 转存视频文件（专用方法）
   */
  private async transferVideoFiles(generationUuid: string): Promise<boolean> {
    try {
      console.log(`🎬 [FileTransferCron] 开始转存视频文件: ${generationUuid}`);

      // 1. 获取generation记录
      const generation = await findGenerationByUuid(generationUuid);
      if (!generation) {
        console.error(
          `❌ [FileTransferCron] 未找到generation记录: ${generationUuid}`
        );
        return false;
      }

      // 2. 获取该generation的所有视频
      const videos = await getGenerationVideosByGenerationUuid(generationUuid);

      // 3. 过滤出使用临时URL的视频
      const tempUrlVideos = videos.filter((v) => {
        // 检查是否为临时URL（不在R2域内）
        const videoUrl = v.video_url;
        if (!videoUrl) return false;

        const r2Domain = process.env.STORAGE_DOMAIN || "";
        const isTempUrl = !videoUrl.includes(r2Domain);

        // 检查是否已经有poster_url（说明已经处理过）
        const hasPoster = !!v.poster_url;

        return isTempUrl && !hasPoster;
      });

      if (tempUrlVideos.length === 0) {
        console.log(
          `ℹ️ [FileTransferCron] 没有需要转存的视频: ${generationUuid}`
        );
        return true;
      }

      console.log(
        `📊 [FileTransferCron] 找到 ${tempUrlVideos.length} 个视频需要转存`
      );

      // 4. 更新generation状态为转存中
      await this.updateTransferStatus(generationUuid, "transferring");

      // 5. 提取临时URL列表
      const tempUrls = tempUrlVideos.map((v) => v.video_url!);

      // 6. 批量处理视频：下载 -> 上传到R2 -> 提取封面
      const processedVideos = await videoProcessor.processVideos(
        tempUrls,
        generationUuid
      );

      console.log(
        `✅ [FileTransferCron] 视频处理完成: ${processedVideos.length} 个视频`
      );

      // 7. 更新数据库
      // 注意：由于处理后的videos顺序可能与原数组不同，需要重新获取最新的videos
      const updatedVideos =
        await getGenerationVideosByGenerationUuid(generationUuid);

      let successCount = 0;
      for (
        let i = 0;
        i < processedVideos.length && i < updatedVideos.length;
        i++
      ) {
        const processed = processedVideos[i];
        const video = updatedVideos[i];

        try {
          // 更新视频记录
          await db()
            .update((await import("@/db/schema")).generationVideos)
            .set({
              video_url: processed.videoUrl,
              poster_url: processed.posterUrl,
              updated_at: new Date(),
            })
            .where(
              eq(
                (await import("@/db/schema")).generationVideos.uuid,
                video.uuid
              )
            );

          successCount++;
          console.log(
            `✅ [FileTransferCron] 视频 ${i + 1}/${processedVideos.length} 更新成功`
          );
        } catch (error) {
          console.error(
            `❌ [FileTransferCron] 视频 ${i + 1}/${processedVideos.length} 更新失败:`,
            error
          );
        }
      }

      // 8. 更新generation记录为转存完成
      await this.updateTransferStatus(generationUuid, "completed");

      console.log(
        `✅ [FileTransferCron] 视频转存完成: ${successCount}/${processedVideos.length}`
      );
      return successCount === processedVideos.length;
    } catch (error) {
      console.error(
        `❌ [FileTransferCron] 视频转存失败: ${generationUuid}`,
        error
      );

      // 更新generation状态为转存失败
      await this.updateTransferStatus(generationUuid, "failed");

      return false;
    }
  }

  /**
   * 更新转存状态
   */
  private async updateTransferStatus(
    generationUuid: string,
    status: string
  ): Promise<void> {
    await db()
      .update(generations)
      .set({
        file_transfer_status: status,
        updated_at: new Date(),
      })
      .where(eq(generations.uuid, generationUuid));

    console.log(
      `📝 [FileTransferCron] 更新转存状态: ${generationUuid} -> ${status}`
    );
  }
}

// 单例实例
let fileTransferCronInstance: FileTransferCron | null = null;

export function getFileTransferCron(): FileTransferCron {
  if (!fileTransferCronInstance) {
    fileTransferCronInstance = new FileTransferCron();
  }
  return fileTransferCronInstance;
}

/**
 * 启动定时任务（在应用启动时调用）
 */
export async function startFileTransferCron() {
  const cron = getFileTransferCron();

  // 使用node-cron或类似的定时任务库
  // 这里先用setInterval模拟
  console.log(
    "⏰ [FileTransferCron] 启动定时任务，表达式:",
    FILE_TRANSFER_CRON
  );

  setInterval(
    async () => {
      await cron.scanAndTransfer();
    },
    10 * 60 * 1000
  ); // 每10分钟执行一次

  console.log("✅ [FileTransferCron] 定时任务已启动");
}

/**
 * 手动触发一次转存扫描（用于测试或紧急转存）
 */
export async function triggerFileTransferScan() {
  const cron = getFileTransferCron();
  await cron.scanAndTransfer();
}
