import { ThumbnailConfig, ImageProcessingOptions, StorageError } from "@/types/storage";
import { WorkersImageProcessor } from './workers-image-processor';

// 缩略图生成配置 - 按照文档设计的等比例缩放策略
export const THUMBNAIL_CONFIGS: ThumbnailConfig[] = [
  { minEdge: 250, suffix: 'mobile' },    // 移动端列表预览
  { minEdge: 400, suffix: 'desktop' },   // 桌面端列表预览
  { minEdge: 800, suffix: 'detail' }     // 详情页预览图
];

export class ImageProcessor {
  private sharpInstance: typeof import('sharp') | null = null;
  private workersProcessor: WorkersImageProcessor | null = null;
  private useWorkers: boolean = false;

  constructor() {
    // Detect environment
    this.useWorkers = WorkersImageProcessor.isSupported();
    console.log(`ImageProcessor initialized with ${this.useWorkers ? 'Workers Canvas' : 'Sharp'} support`);
  }

  /**
   * Check if running in Workers environment
   */
  isWorkersEnvironment(): boolean {
    return this.useWorkers;
  }

  /**
   * Dynamic load Sharp library (Node.js only)
   */
  async getSharp(): Promise<typeof import('sharp')> {
    if (this.useWorkers) {
      throw new StorageError('Sharp is not available in Workers environment');
    }

    if (!this.sharpInstance) {
      try {
        this.sharpInstance = (await import('sharp')).default;
      } catch (error) {
        console.error('Failed to load Sharp library:', error);
        throw new StorageError('Image processing library not available');
      }
    }
    return this.sharpInstance;
  }

  /**
   * Get Workers processor
   */
  getWorkersProcessor(): WorkersImageProcessor {
    if (!this.workersProcessor) {
      this.workersProcessor = new WorkersImageProcessor();
    }
    return this.workersProcessor;
  }

  /**
   * 生成等比例缩略图
   * 使用Sharp库进行高质量的图片缩放处理
   */
  async generateThumbnail(
    imageBuffer: Buffer,
    minEdge: number,
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    if (this.useWorkers) {
      try {
        const workersProcessor = this.getWorkersProcessor();
        const arrayBuffer: ArrayBuffer = imageBuffer.buffer.slice(
          imageBuffer.byteOffset,
          imageBuffer.byteOffset + imageBuffer.byteLength
        ) as ArrayBuffer;
        const resultArrayBuffer = await workersProcessor.generateThumbnail(
          arrayBuffer,
          minEdge,
          { quality: options.quality || 90 }
        );
        return Buffer.from(resultArrayBuffer);
      } catch (error) {
        console.error('Workers thumbnail generation failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new StorageError(`Failed to generate thumbnail in Workers: ${errorMessage}`);
      }
    }

    try {
      const sharp = await this.getSharp();
      const sharpInstance = sharp(imageBuffer);
      
      // 获取原图尺寸
      const metadata = await sharpInstance.metadata();
      const { width = 0, height = 0 } = metadata;
      
      // 计算缩放尺寸，保持宽高比
      let targetWidth: number;
      let targetHeight: number;
      
      if (width < height) {
        // 竖图：确保宽度满足最小值
        targetWidth = Math.max(minEdge, width);
        targetHeight = Math.round((targetWidth / width) * height);
      } else {
        // 横图或正方形：确保高度满足最小值
        targetHeight = Math.max(minEdge, height);
        targetWidth = Math.round((targetHeight / height) * width);
      }
      
      // 生成缩略图
      const thumbnailBuffer = await sharpInstance
        .resize(targetWidth, targetHeight, {
          kernel: 'lanczos3',
          withoutEnlargement: true,
        })
        .png({
          quality: options.quality || 90,
          compressionLevel: 6,
        })
        .toBuffer();
      
      console.log(`Generated thumbnail: ${targetWidth}x${targetHeight} (min edge: ${minEdge}px)`);
      return thumbnailBuffer;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`缩略图生成失败: ${errorMessage}`);
    }
  }

  /**
   * 生成多尺寸缩略图
   */
  async generateMultipleThumbnails(
    imageBuffer: Buffer,
    configs: ThumbnailConfig[] = THUMBNAIL_CONFIGS,
    options: ImageProcessingOptions = {}
  ): Promise<{ suffix: string; buffer: Buffer; size: number }[]> {
    try {
      const results = await Promise.all(
        configs.map(async (config) => {
          const thumbnailBuffer = await this.generateThumbnail(
            imageBuffer,
            config.minEdge,
            options
          );

          return {
            suffix: config.suffix,
            buffer: thumbnailBuffer,
            size: config.minEdge
          };
        })
      );

      return results;
    } catch (error) {
      console.error('Multiple thumbnails generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`批量缩略图生成失败: ${errorMessage}`);
    }
  }

  /**
   * 验证图片格式和内容
   */
  async validateImage(buffer: Buffer): Promise<{
    isValid: boolean;
    metadata?: any;
    error?: string;
  }> {
    if (this.useWorkers) {
      const workersProcessor = this.getWorkersProcessor();
      const arrayBuffer: ArrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer;
      return workersProcessor.validateImage(arrayBuffer);
    }

    try {
      const sharp = await this.getSharp();
      const metadata = await sharp(buffer).metadata();

      // 检查文件格式
      const supportedFormats = ['jpeg', 'png', 'webp'];
      if (!metadata.format || !supportedFormats.includes(metadata.format)) {
        return {
          isValid: false,
          error: `Unsupported image format: ${metadata.format}. Only ${supportedFormats.join(', ')} are supported`
        };
      }

      // 检查图片尺寸
      if (!metadata.width || !metadata.height) {
        return {
          isValid: false,
          error: 'Cannot get image dimensions'
        };
      }

      // 检查文件大小（最大 10MB）
      if (buffer.length > 10 * 1024 * 1024) {
        return {
          isValid: false,
          error: `Image file too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB, maximum 10MB supported`
        };
      }

      // 检查图片分辨率（最大 4096x4096）
      if (metadata.width > 4096 || metadata.height > 4096) {
        return {
          isValid: false,
          error: `Image resolution too large: ${metadata.width}x${metadata.height}, maximum 4096x4096 supported`
        };
      }

      return {
        isValid: true,
        metadata
      };
    } catch (error) {
      console.error('Image validation failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isValid: false,
        error: `Image validation failed: ${errorMessage}`
      };
    }
  }

  /**
   * 获取图片信息
   */
  async getImageInfo(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    aspectRatio: string;
  }> {
    if (this.useWorkers) {
      const workersProcessor = this.getWorkersProcessor();
      const arrayBuffer: ArrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer;
      const info = await workersProcessor.getImageInfo(arrayBuffer);
      const width = info.width || 0;
      const height = info.height || 0;
      const ratio = width / height;

      let aspectRatio = "unknown";
      if (Math.abs(ratio - 1) < 0.1) aspectRatio = "1:1";
      else if (Math.abs(ratio - 2/3) < 0.1) aspectRatio = "2:3";
      else if (Math.abs(ratio - 3/4) < 0.1) aspectRatio = "3:4";
      else if (Math.abs(ratio - 16/9) < 0.1) aspectRatio = "16:9";
      else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = "9:16";
      else aspectRatio = `${width}:${height}`;

      return {
        width,
        height,
        format: "unknown",
        size: info.size,
        aspectRatio
      };
    }

    try {
      const sharp = await this.getSharp();
      const metadata = await sharp(buffer).metadata();

      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const ratio = width / height;

      // 计算宽高比字符串
      let aspectRatio = "unknown";
      if (Math.abs(ratio - 1) < 0.1) aspectRatio = "1:1";
      else if (Math.abs(ratio - 2/3) < 0.1) aspectRatio = "2:3";
      else if (Math.abs(ratio - 3/4) < 0.1) aspectRatio = "3:4";
      else if (Math.abs(ratio - 16/9) < 0.1) aspectRatio = "16:9";
      else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = "9:16";
      else aspectRatio = `${width}:${height}`;

      return {
        width,
        height,
        format: metadata.format || 'unknown',
        size: buffer.length,
        aspectRatio
      };
    } catch (error) {
      console.error('Get image info failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to get image info: ${errorMessage}`);
    }
  }

  /**
   * 下载远程图片
   */
  async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Download image failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to download image: ${errorMessage}`);
    }
  }

  /**
   * 裁剪图片上半部分为正方形头像
   */
  async cropTopSquare(
    imageBuffer: Buffer,
    outputSize = 512
  ): Promise<Buffer> {
    try {
      const sharp = await this.getSharp();
      const sharpInstance = sharp(imageBuffer);
      const metadata = await sharpInstance.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (!width || !height) {
        throw new StorageError("Image dimensions unavailable");
      }

      const cropSize = Math.min(width, height);
      const left = Math.max(0, Math.floor((width - cropSize) / 2));
      const top = 0;

      const cropped = sharpInstance.extract({
        left,
        top,
        width: cropSize,
        height: cropSize,
      });

      const resized = cropped.resize(outputSize, outputSize, {
        fit: "cover",
      });

      return await resized.jpeg({ quality: 90 }).toBuffer();
    } catch (error) {
      console.error("Crop avatar image failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to crop avatar image: ${errorMessage}`);
    }
  }

  /**
   * 裁剪图片顶部 1/3 区域为正方形头像
   * 符合 OC 系统自动头像生成策略（FEAT-OC-REBUILD）
   * - 取顶部 1/3 高度区域作为裁剪来源
   * - 在该区域内做水平居中裁剪为正方形
   * - 再 resize 到目标尺寸（默认 512x512）
   *
   * 自动选择运行环境：
   * - Cloudflare Workers: 使用 Canvas API
   * - Node.js: 使用 Sharp
   */
  async cropTopThirdSquare(
    imageBuffer: Buffer,
    outputSize = 512
  ): Promise<Buffer> {
    // Use Workers Canvas API if available
    if (this.useWorkers) {
      try {
        const workersProcessor = this.getWorkersProcessor();
        const arrayBuffer: ArrayBuffer = imageBuffer.buffer.slice(
          imageBuffer.byteOffset,
          imageBuffer.byteOffset + imageBuffer.byteLength
        ) as ArrayBuffer;
        const resultArrayBuffer = await workersProcessor.cropTopThirdSquare(
          arrayBuffer,
          { outputSize, quality: 90 }
        );
        return Buffer.from(resultArrayBuffer);
      } catch (error) {
        console.error('Workers Canvas processing failed, falling back to error:', error);
        throw error;
      }
    }

    // Fall back to Sharp for Node.js environment
    try {
      const sharp = await this.getSharp();
      const sharpInstance = sharp(imageBuffer);
      const metadata = await sharpInstance.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (!width || !height) {
        throw new StorageError("Image dimensions unavailable");
      }

      // 计算顶部 1/3 区域的高度
      const topThirdHeight = Math.floor(height / 3);

      // 在顶部 1/3 区域内裁剪正方形
      const cropSize = Math.min(width, topThirdHeight);
      const left = Math.max(0, Math.floor((width - cropSize) / 2));
      const top = 0;

      const cropped = sharpInstance.extract({
        left,
        top,
        width: cropSize,
        height: cropSize,
      });

      const resized = cropped.resize(outputSize, outputSize, {
        fit: "cover",
      });

      return await resized.jpeg({ quality: 90 }).toBuffer();
    } catch (error) {
      console.error("Crop top third square avatar image failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to crop top third square avatar image: ${errorMessage}`);
    }
  }
}
