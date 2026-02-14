import { newStorage } from '@/lib/storage';
import { StorageResult, StorageError, UploadResult, ThumbnailConfig } from '@/types/storage';
import { ImageProcessor, THUMBNAIL_CONFIGS } from '../image-processor';

export class AnimeStorageService {
  private storage: ReturnType<typeof newStorage>;
  private _imageProcessor: ImageProcessor | null = null;
  private thumbnailConfigs: ThumbnailConfig[];

  constructor(customThumbnailConfigs?: ThumbnailConfig[]) {
    this.storage = newStorage();
    this.thumbnailConfigs = customThumbnailConfigs || THUMBNAIL_CONFIGS;
    // ImageProcessor 延迟初始化，只在实际需要时创建
  }

  /**
   * 获取 ImageProcessor 实例，实现延迟初始化
   */
  private getImageProcessor(): ImageProcessor {
    if (!this._imageProcessor) {
      this._imageProcessor = new ImageProcessor();
    }
    return this._imageProcessor;
  }

  /**
   * 上传生成的图片到 Cloudflare R2
   * 核心功能：原图和多尺寸缩略图并行上传
   */
  async uploadGenerationImage(
    generationUuid: string,
    imageIndex: number,
    imageBuffer: Buffer
  ): Promise<StorageResult> {
    try {
      const imageProcessor = this.getImageProcessor();
      
      // 验证图片
      const validation = await imageProcessor.validateImage(imageBuffer);
      if (!validation.isValid) {
        throw new StorageError(validation.error || 'Image validation failed');
      }

      // 定义存储路径
      const imageKey = `generations/${generationUuid}/image_${imageIndex}.png`;

      // 生成多尺寸缩略图 - 使用自定义配置
      const thumbnails = await imageProcessor.generateMultipleThumbnails(imageBuffer, this.thumbnailConfigs);

      // 并行上传原图和所有缩略图
      const uploadPromises = [
        // 上传原图
        this.storage.uploadFile({
          body: imageBuffer,
          key: imageKey,
          contentType: 'image/png',
          disposition: 'inline'
        }),
        // 上传所有缩略图
        ...thumbnails.map(thumbnail => {
          const thumbnailKey = `generations/${generationUuid}/thumb_${imageIndex}_${thumbnail.suffix}.png`;
          return this.storage.uploadFile({
            body: thumbnail.buffer,
            key: thumbnailKey,
            contentType: 'image/png',
            disposition: 'inline'
          });
        })
      ];

      const [originalUpload, ...thumbnailUploads] = await Promise.all(uploadPromises);

      // 构建缩略图 URL 映射
      const thumbnailUrls = {
        mobile: thumbnailUploads[0]?.url || originalUpload.url,
        desktop: thumbnailUploads[1]?.url || originalUpload.url,
        detail: thumbnailUploads[2]?.url || originalUpload.url
      };

      return {
        imageUrl: originalUpload.url,
        thumbnailUrls,
        key: imageKey,
        size: imageBuffer.length
      };

    } catch (error) {
      console.error('Failed to upload generation image:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`图片上传失败: ${errorMessage}`);
    }
  }

  /**
   * 从远程URL下载并上传到R2
   * 用于处理AI服务返回的图片URL
   */
  async downloadAndUploadImage(
    url: string,
    generationUuid: string,
    imageIndex: number
  ): Promise<StorageResult> {
    try {
      console.log(`正在下载图片: ${url}`);

      // 下载图片
      const imageProcessor = this.getImageProcessor();
      const imageBuffer = await imageProcessor.downloadImage(url);

      // 上传到存储
      const result = await this.uploadGenerationImage(generationUuid, imageIndex, imageBuffer);

      console.log(`图片下载并上传完成: ${result.imageUrl}`);
      return result;

    } catch (error) {
      console.error('Failed to download and upload image:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`图片下载上传失败: ${errorMessage}`);
    }
  }

  /**
   * 批量处理生成的图片
   */
  async uploadGenerationImages(
    generationUuid: string,
    imageUrls: string[]
  ): Promise<StorageResult[]> {
    try {
      // 并行下载和上传所有图片
      const uploadPromises = imageUrls.map(async (imageUrl, index) => {
        return await this.downloadAndUploadImage(imageUrl, generationUuid, index + 1);
      });

      const results = await Promise.all(uploadPromises);

      console.log(`批量上传完成: ${results.length} 张图片`);
      return results;

    } catch (error) {
      console.error('Failed to upload generation images:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`批量图片上传失败: ${errorMessage}`);
    }
  }

  /**
   * 上传重试机制
   */
  async uploadWithRetry(
    uploadFunc: () => Promise<UploadResult>,
    maxRetries: number = 3
  ): Promise<UploadResult> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await uploadFunc();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 指数退避
          await new Promise(resolve => setTimeout(resolve, delay));
          console.log(`Upload attempt ${attempt} failed, retrying in ${delay}ms...`);
        }
      }
    }

    throw new StorageError(`上传失败，已重试 ${maxRetries} 次`);
  }

  /**
   * 获取预签名 URL（用于临时访问）
   * 注意：当前框架的 storage.ts 可能不支持预签名 URL
   * 这里使用公开访问或者需要扩展框架
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // 如果配置了自定义域名，直接返回公开URL
    const storageDomain = process.env.STORAGE_DOMAIN;
    if (storageDomain) {
      return `${storageDomain}/${key}`;
    }

    // 否则需要生成预签名URL（可能需要扩展框架功能）
    console.warn('预签名URL功能需要扩展框架 storage.ts');
    return `${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET}/${key}`;
  }

  /**
   * 批量删除生成图片（清理功能）
   */
  async deleteGenerationImages(generationUuid: string): Promise<void> {
    try {
      // 注意：当前的 storage.ts 可能没有删除方法，需要扩展
      // 这里仅记录日志，实际删除功能需要扩展框架或直接使用 R2 API
      console.log(`TODO: Delete images for generation ${generationUuid}`);

      // 未来可以实现：
      // 1. 列出该生成记录下的所有文件
      // 2. 批量删除文件
      // 3. 更新数据库记录状态

    } catch (error) {
      console.error('Failed to delete generation images:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`删除图片失败: ${errorMessage}`);
    }
  }

  /**
   * 存储健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'error'; message?: string }> {
    try {
      // 尝试上传一个小的测试文件
      const testBuffer = Buffer.from('storage-health-check');
      const testKey = `health-check/${Date.now()}.txt`;

      await this.storage.uploadFile({
        body: testBuffer,
        key: testKey,
        contentType: 'text/plain',
        disposition: 'inline'
      });

      return { status: 'healthy' };

    } catch (error) {
      console.error('Storage health check failed:', error);
      return {
        status: 'error',
        message: `存储服务异常: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}