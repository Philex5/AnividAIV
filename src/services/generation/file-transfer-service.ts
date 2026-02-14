/**
 * File Transfer Service
 * 文件转存服务 - 负责将KieAI临时URL文件转存到R2存储
 *
 * 功能：
 * 1. 下载临时URL文件
 * 2. 图片后处理（缩略图生成、分辨率优化）
 * 3. 上传到R2存储
 * 4. 批量转存generation的所有文件
 * 5. 失败重试机制
 */

import {
  findGenerationByUuid,
  updateGeneration,
  findPendingTransfersWithDetails,
} from "@/models/generation";
import {
  getGenerationImagesByGenerationUuid,
  updateGenerationImage,
} from "@/models/generation-image";
import { ImageProcessor } from "./image-processor";
import { getR2Url } from "@/lib/r2-utils";
import { newStorage } from "@/lib/storage";

export interface TransferResult {
  success: boolean;
  url?: string;
  thumbnails?: { [key: string]: string }; // 缩略图URL字典：{ mobile: 'url', desktop: 'url', detail: 'url' }
  error?: string;
}

export interface TransferProgress {
  total: number;
  completed: number;
  failed: number;
  currentIndex: number;
}

export class FileTransferService {
  private maxRetries = 3;
  private maxConcurrency = 3;
  private retryDelay = 1000; // 1秒
  private imageProcessor = new ImageProcessor();
  private storage = newStorage();

  /**
   * 转存单个文件的临时URL到R2
   */
  async transferFile(
    tempUrl: string,
    targetPath: string
  ): Promise<TransferResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`📥 [FileTransfer] 下载临时文件: ${tempUrl}`);
        const fileBuffer = await this.downloadFromTempUrl(tempUrl);

        // 检查是否为图片文件，如果是则进行后处理
        const isImage = this.isImageFile(targetPath);

        if (isImage) {
          console.log(`🖼️ [FileTransfer] 检测到图片文件，开始后处理...`);

          // 验证图片
          await this.imageProcessor.validateImage(fileBuffer);

          // 生成多尺寸缩略图
          const thumbnails =
            await this.imageProcessor.generateMultipleThumbnails(fileBuffer);

          // 上传原图到R2
          console.log(`📤 [FileTransfer] 上传原图到R2: ${targetPath}`);
          const originalUrl = await this.uploadToR2(fileBuffer, targetPath);

          // 上传缩略图到R2
          const thumbnailUrls: { [key: string]: string } = {};
          for (const thumb of thumbnails) {
            const thumbPath = this.getThumbnailPath(targetPath, thumb.suffix);
            console.log(
              `🖼️ [FileTransfer] 上传缩略图 (${thumb.suffix}) 到R2: ${thumbPath}`
            );
            const thumbUrl = await this.uploadToR2(thumb.buffer, thumbPath);
            thumbnailUrls[thumb.suffix] = thumbUrl;
          }

          console.log(`✅ [FileTransfer] 图片转存成功: ${originalUrl}`);
          return { success: true, url: originalUrl, thumbnails: thumbnailUrls };
        } else {
          // 非图片文件直接上传
          console.log(`📤 [FileTransfer] 上传文件到R2: ${targetPath}`);
          const r2Url = await this.uploadToR2(fileBuffer, targetPath);

          console.log(`✅ [FileTransfer] 转存成功: ${r2Url}`);
          return { success: true, url: r2Url };
        }
      } catch (error) {
        lastError = error as Error;
        console.error(
          `❌ [FileTransfer] 转存失败 (尝试 ${attempt}/${this.maxRetries}):`,
          error
        );

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt;
          console.log(`⏳ [FileTransfer] ${delay}ms后重试...`);
          await this.sleep(delay);
        }
      }
    }

    console.error(`💀 [FileTransfer] 转存失败，已达最大重试次数:`, lastError);
    return { success: false, error: lastError?.message || "Transfer failed" };
  }

  /**
   * 批量转存generation的所有文件
   * 新的实现：直接操作generation_images表
   */
  async transferGenerationFiles(generationUuid: string): Promise<boolean> {
    const startTime = Date.now();

    console.log(`📋 [FileTransfer] 开始转存Generation: ${generationUuid}`);

    // 1. 获取generation记录
    const generation = await findGenerationByUuid(generationUuid);
    if (!generation) {
      console.error(
        `❌ [FileTransfer] 未找到generation记录: ${generationUuid}`
      );
      return false;
    }

    // 2. 从generation_images表获取所有图片记录
    const images = await getGenerationImagesByGenerationUuid(generationUuid);
    if (!images || images.length === 0) {
      console.log(`ℹ️ [FileTransfer] 没有需要转存的文件: ${generationUuid}`);
      return true; // 视为成功
    }

    console.log(`📊 [FileTransfer] 找到 ${images.length} 个文件需要转存`);

    // 3. 更新状态为转存中
    await this.updateTransferStatus(generationUuid, "transferring");

    let successCount = 0;
    let failureCount = 0;

    // 4. 分批并发转存
    const concurrency = this.maxConcurrency;
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      const batchPromises = batch.map((image, index) => {
        const absoluteIndex = i + index;
        return this.transferSingleImageRecord(
          image,
          generationUuid,
          absoluteIndex
        );
      });

      console.log(
        `🔄 [FileTransfer] 转存批次 ${Math.floor(i / concurrency) + 1}/${Math.ceil(images.length / concurrency)}`
      );

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result, index) => {
        if (result.success) {
          successCount++;
          console.log(
            `✅ [FileTransfer] 文件 ${i + index + 1}/${images.length} 转存成功`
          );
        } else {
          failureCount++;
          console.error(
            `❌ [FileTransfer] 文件 ${i + index + 1}/${images.length} 转存失败:`,
            result.error
          );
        }
      });
    }

    const duration = Date.now() - startTime;
    console.log(`📈 [FileTransfer] 转存完成: ${generationUuid}`, {
      total: images.length,
      success: successCount,
      failed: failureCount,
      duration: `${duration}ms`,
    });

    // 5. 更新generation记录
    if (successCount === images.length) {
      // 全部成功
      await updateGeneration(generationUuid, {
        file_transfer_status: "completed",
        transfer_retry_count: 0,
        updated_at: new Date(),
      });
      console.log(`✅ [FileTransfer] Generation记录已更新: completed`);
      return true;
    } else if (successCount > 0) {
      // 部分成功
      await updateGeneration(generationUuid, {
        file_transfer_status: "failed",
        transfer_retry_count: (generation.transfer_retry_count || 0) + 1,
        updated_at: new Date(),
      });
      console.log(`⚠️ [FileTransfer] Generation记录已更新: 部分失败`);
      return false;
    } else {
      // 全部失败
      await this.updateTransferStatus(generationUuid, "failed");
      return false;
    }
  }

  /**
   * 转存单个图片记录（从generation_images表）
   */
  private async transferSingleImageRecord(
    imageRecord: any,
    generationUuid: string,
    index: number
  ): Promise<TransferResult> {
    const tempUrl = imageRecord.image_url;
    const fileExtension = this.getFileExtension(tempUrl);
    const fileName = `${generationUuid}_${index}${fileExtension}`;
    const targetPath = `generations/${generationUuid}/${fileName}`;

    // 转存文件
    const result = await this.transferFile(tempUrl, targetPath);

    // 如果转存成功，更新generation_images表
    if (result.success) {
      await updateGenerationImage(imageRecord.uuid, {
        image_url: result.url!,
        thumbnail_mobile: result.thumbnails?.mobile || result.url!,
        thumbnail_desktop: result.thumbnails?.desktop || result.url!,
        thumbnail_detail: result.thumbnails?.detail || result.url!,
        updated_at: new Date(),
      });
      console.log(
        `🖼️ [FileTransfer] 已更新generation_images记录: ${imageRecord.uuid}`
      );
    }

    return result;
  }

  /**
   * 转存单个文件（保留以兼容其他调用）
   * @deprecated 该方法未被使用，仅用于向后兼容
   */
  private async transferSingleFile(
    tempUrl: string,
    generationUuid: string,
    index: number
  ): Promise<TransferResult> {
    const fileExtension = this.getFileExtension(tempUrl);
    const fileName = `${generationUuid}_${index}${fileExtension}`;
    const targetPath = `generations/${generationUuid}/${fileName}`;

    return await this.transferFile(tempUrl, targetPath);
  }

  /**
   * 从临时URL下载文件
   */
  private async downloadFromTempUrl(tempUrl: string): Promise<Buffer> {
    const response = await fetch(tempUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to download from temp URL: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * 上传文件到R2存储
   */
  private async uploadToR2(
    fileBuffer: Buffer,
    targetPath: string
  ): Promise<string> {
    try {
      console.log(`🗄️ [FileTransfer] 开始上传到R2: ${targetPath}`);
      console.log(`📦 [FileTransfer] 文件大小: ${fileBuffer.length} bytes`);

      // 确定Content-Type
      const contentType = this.getContentType(targetPath);

      // 上传到R2
      const result = await this.storage.uploadFile({
        body: fileBuffer,
        key: targetPath,
        contentType,
        disposition: "inline",
      });

      console.log(`✅ [FileTransfer] 上传成功: ${result.url}`);
      return result.url;
    } catch (error) {
      console.error(`❌ [FileTransfer] R2上传失败:`, error);
      throw new Error(
        `R2上传失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 根据文件扩展名获取Content-Type
   */
  private getContentType(filePath: string): string {
    const extension = filePath.toLowerCase().split(".").pop() || "";
    const contentTypeMap: { [key: string]: string } = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      mp4: "video/mp4",
      webm: "video/webm",
    };
    return contentTypeMap[extension] || "application/octet-stream";
  }

  /**
   * 获取缩略图路径
   */
  private getThumbnailPath(originalPath: string, suffix: string): string {
    const lastSlashIndex = originalPath.lastIndexOf("/");
    if (lastSlashIndex === -1) {
      return `thumbs/${suffix}_${originalPath}`;
    }
    const directory = originalPath.substring(0, lastSlashIndex);
    const filename = originalPath.substring(lastSlashIndex + 1);
    return `${directory}/thumbs/${suffix}_${filename}`;
  }

  /**
   * 判断是否为图片文件
   */
  private isImageFile(path: string): boolean {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    return imageExtensions.some((ext) => path.toLowerCase().endsWith(ext));
  }

  /**
   * 更新转存状态
   */
  private async updateTransferStatus(
    generationUuid: string,
    status: string
  ): Promise<void> {
    await updateGeneration(generationUuid, {
      file_transfer_status: status,
      updated_at: new Date(),
    });
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(tempUrl: string): string {
    // 从URL或默认扩展名推断
    if (tempUrl.includes(".jpg") || tempUrl.includes(".jpeg")) return ".jpg";
    if (tempUrl.includes(".png")) return ".png";
    if (tempUrl.includes(".gif")) return ".gif";
    if (tempUrl.includes(".mp4")) return ".mp4";
    if (tempUrl.includes(".webm")) return ".webm";

    // 默认扩展名
    return ".jpg";
  }

  /**
   * 等待指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取转存统计信息
   */
  async getTransferStats(
    generationUuid: string
  ): Promise<TransferProgress | null> {
    const generation = await findGenerationByUuid(generationUuid);
    if (!generation) return null;

    // 从 generation_images 表获取图片数量
    const images = await getGenerationImagesByGenerationUuid(generationUuid);
    const total = images.length;

    return {
      total,
      completed: generation.file_transfer_status === "completed" ? total : 0,
      failed: 0,
      currentIndex: 0,
    };
  }

  /**
   * 获取待转存任务列表（带优先级排序）
   * Admin专用业务逻辑
   *
   * 排序优先级：
   * 1. 临时URL过期时间（即将过期优先）
   * 2. 转存失败状态（失败优先）
   * 3. 重试次数（重试次数多优先）
   * 4. 创建时间（创建早优先）
   */
  async getPendingTransfersList(options?: {
    typeFilter?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<{
    count: number;
    transfers: Array<{
      uuid: string;
      created_at: string;
      temp_url_expires_at: string | null;
      transfer_retry_count: number;
      file_transfer_status: string;
      result_urls_count: number;
    }>;
  }> {
    console.log("📋 [Service] 查询待转存任务列表...", options);

    // 1. 从Model层获取原始数据（传递筛选参数）
    const pendingTransfers = await findPendingTransfersWithDetails(options);

    // 2. 按优先级排序
    pendingTransfers.sort((a, b) => {
      // 1. 过期时间优先（即将过期的在前）
      if (a.temp_url_expires_at && b.temp_url_expires_at) {
        const aExpire = new Date(a.temp_url_expires_at).getTime();
        const bExpire = new Date(b.temp_url_expires_at).getTime();
        if (aExpire !== bExpire) {
          return aExpire - bExpire;
        }
      } else if (a.temp_url_expires_at) {
        return -1;
      } else if (b.temp_url_expires_at) {
        return 1;
      }

      // 2. 失败状态优先
      if (
        a.file_transfer_status === "failed" &&
        b.file_transfer_status !== "failed"
      ) {
        return -1;
      } else if (
        b.file_transfer_status === "failed" &&
        a.file_transfer_status !== "failed"
      ) {
        return 1;
      }

      // 3. 重试次数多的优先
      if (a.transfer_retry_count !== b.transfer_retry_count) {
        return b.transfer_retry_count - a.transfer_retry_count;
      }

      // 4. 创建时间早的优先
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    // 3. 返回格式化数据
    return {
      count: pendingTransfers.length,
      transfers: pendingTransfers,
    };
  }
}

// 单例实例
let fileTransferServiceInstance: FileTransferService | null = null;

export function getFileTransferService(): FileTransferService {
  if (!fileTransferServiceInstance) {
    fileTransferServiceInstance = new FileTransferService();
  }
  return fileTransferServiceInstance;
}
