import { newStorage } from '@/lib/storage';
import { StorageError } from '@/types/storage';

/**
 * VideoProcessor - 视频后处理服务
 * 负责下载视频、提取封面、上传到 R2 存储
 */
export class VideoProcessor {
  private storage: ReturnType<typeof newStorage>;

  constructor() {
    this.storage = newStorage();
  }

  /**
   * 下载视频文件
   */
  async downloadVideo(url: string): Promise<Buffer> {
    try {
      console.log(`[VideoProcessor] Downloading video from: ${url}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`[VideoProcessor] Video downloaded successfully, size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
      return buffer;
    } catch (error) {
      console.error('[VideoProcessor] Failed to download video:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to download video: ${errorMessage}`);
    }
  }

  /**
   * 提取视频封面(首帧)
   * 使用 canvas API 从视频提取首帧作为封面图
   * 注意: 这是一个简化版本,仅用于服务端环境
   */
  async extractThumbnail(videoBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('[VideoProcessor] Extracting video thumbnail...');

      // 由于服务端环境无法直接使用 video 元素和 canvas
      // 这里我们使用一个占位实现
      // 在生产环境中应该使用 ffmpeg 或其他视频处理库

      // TODO: 集成 ffmpeg 或 @ffmpeg/ffmpeg 库
      // 当前实现: 返回一个简单的占位图
      console.warn('[VideoProcessor] Thumbnail extraction not fully implemented, using placeholder');

      // 返回一个1x1像素的透明PNG作为占位符
      // 在实际应用中,应该使用 ffmpeg 提取真实的视频帧
      const placeholderPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      return placeholderPng;
    } catch (error) {
      console.error('[VideoProcessor] Failed to extract thumbnail:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to extract thumbnail: ${errorMessage}`);
    }
  }

  /**
   * 上传视频到 R2
   */
  async uploadVideo(
    videoBuffer: Buffer,
    generationUuid: string,
    videoIndex: number = 0
  ): Promise<string> {
    try {
      const videoKey = `generations/videos/${generationUuid}/video_${videoIndex}.mp4`;

      console.log(`[VideoProcessor] Uploading video to R2: ${videoKey}`);

      const result = await this.storage.uploadFile({
        body: videoBuffer,
        key: videoKey,
        contentType: 'video/mp4',
        disposition: 'inline'
      });

      console.log(`[VideoProcessor] Video uploaded successfully: ${result.url}`);
      return result.url;
    } catch (error) {
      console.error('[VideoProcessor] Failed to upload video:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to upload video: ${errorMessage}`);
    }
  }

  /**
   * 上传封面图到 R2
   */
  async uploadThumbnail(
    thumbnailBuffer: Buffer,
    generationUuid: string,
    videoIndex: number = 0
  ): Promise<string> {
    try {
      const thumbnailKey = `generations/videos/${generationUuid}/poster_${videoIndex}.png`;

      console.log(`[VideoProcessor] Uploading thumbnail to R2: ${thumbnailKey}`);

      const result = await this.storage.uploadFile({
        body: thumbnailBuffer,
        key: thumbnailKey,
        contentType: 'image/png',
        disposition: 'inline'
      });

      console.log(`[VideoProcessor] Thumbnail uploaded successfully: ${result.url}`);
      return result.url;
    } catch (error) {
      console.error('[VideoProcessor] Failed to upload thumbnail:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to upload thumbnail: ${errorMessage}`);
    }
  }

  /**
   * 完整的视频处理流程
   * 下载视频 -> 提取封面 -> 上传到 R2
   */
  async processVideo(
    videoUrl: string,
    generationUuid: string,
    videoIndex: number = 0
  ): Promise<{ videoUrl: string; posterUrl: string }> {
    try {
      console.log(`[VideoProcessor] Processing video ${videoIndex} for generation ${generationUuid}`);

      // 1. 下载视频
      const videoBuffer = await this.downloadVideo(videoUrl);

      // 2. 上传视频到 R2
      const r2VideoUrl = await this.uploadVideo(videoBuffer, generationUuid, videoIndex);

      // 3. 提取封面
      const thumbnailBuffer = await this.extractThumbnail(videoBuffer);

      // 4. 上传封面到 R2
      const r2PosterUrl = await this.uploadThumbnail(thumbnailBuffer, generationUuid, videoIndex);

      console.log(`[VideoProcessor] Video processing completed successfully`);
      console.log(`[VideoProcessor] Video URL: ${r2VideoUrl}`);
      console.log(`[VideoProcessor] Poster URL: ${r2PosterUrl}`);

      return {
        videoUrl: r2VideoUrl,
        posterUrl: r2PosterUrl
      };
    } catch (error) {
      console.error(`[VideoProcessor] Failed to process video:`, error);
      throw error;
    }
  }

  /**
   * 批量处理多个视频
   */
  async processVideos(
    videoUrls: string[],
    generationUuid: string
  ): Promise<Array<{ videoUrl: string; posterUrl: string; index: number }>> {
    try {
      console.log(`[VideoProcessor] Processing ${videoUrls.length} videos for generation ${generationUuid}`);

      const results = await Promise.all(
        videoUrls.map(async (url, index) => {
          const result = await this.processVideo(url, generationUuid, index);
          return {
            ...result,
            index
          };
        })
      );

      console.log(`[VideoProcessor] Batch processing completed: ${results.length} videos`);
      return results;
    } catch (error) {
      console.error('[VideoProcessor] Batch processing failed:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const videoProcessor = new VideoProcessor();
