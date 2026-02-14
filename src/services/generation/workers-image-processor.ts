/**
 * Cloudflare Workers compatible image processor using Canvas API
 * This module provides image processing capabilities that work in Cloudflare Workers environment
 * where Sharp (Node.js native module) is not available.
 */

import { StorageError } from "@/types/storage";

export interface CropOptions {
  outputSize?: number;
  quality?: number;
}

export interface ThumbnailOptions {
  quality?: number;
}

export class WorkersImageProcessor {
  /**
   * Detect Cloudflare Workers runtime.
   * Use the same signal as src/db/index.ts for consistency.
   */
  static isCloudflareWorker(): boolean {
    return typeof globalThis !== "undefined" && "Cloudflare" in globalThis;
  }

  /**
   * Crop image to top third square using Canvas API
   * Compatible with Cloudflare Workers environment
   */
  async cropTopThirdSquare(
    imageBuffer: ArrayBuffer,
    options: CropOptions = {}
  ): Promise<ArrayBuffer> {
    const { outputSize = 512, quality = 90 } = options;

    try {
      // Check if we're in a Cloudflare Workers environment with Canvas support
      if (typeof caches !== 'undefined' && 'default' in caches) {
        // Cloudflare Workers environment - try to use Workers Canvas API
        return await this.cropWithWorkersCanvas(imageBuffer, outputSize, quality);
      } else {
        throw new StorageError('Canvas API not available in this environment');
      }
    } catch (error) {
      console.error('Workers image processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to process image in Workers: ${errorMessage}`);
    }
  }

  /**
   * Generate a resized thumbnail (keep aspect ratio) using Canvas API
   */
  async generateThumbnail(
    imageBuffer: ArrayBuffer,
    minEdge: number,
    options: ThumbnailOptions = {}
  ): Promise<ArrayBuffer> {
    const { quality = 90 } = options;
    try {
      if (typeof caches === 'undefined' || !('default' in caches)) {
        throw new StorageError('Canvas API not available in this environment');
      }

      // @ts-ignore - Cloudflare Workers global
      const bitmap = await createImageBitmap(imageBuffer);
      const { width, height } = bitmap;

      if (!width || !height) {
        bitmap.close();
        throw new Error('Invalid image dimensions');
      }

      let targetWidth: number;
      let targetHeight: number;

      if (width < height) {
        targetWidth = Math.max(minEdge, width);
        targetHeight = Math.round((targetWidth / width) * height);
      } else {
        targetHeight = Math.max(minEdge, height);
        targetWidth = Math.round((targetHeight / height) * width);
      }

      // @ts-ignore - Cloudflare Workers global
      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        throw new Error('Failed to get 2D context from OffscreenCanvas');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      bitmap.close();

      const blob = await canvas.convertToBlob({
        type: 'image/png',
        quality: quality / 100
      });

      return await blob.arrayBuffer();
    } catch (error) {
      console.error('Workers thumbnail generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new StorageError(`Failed to generate thumbnail in Workers: ${errorMessage}`);
    }
  }

  /**
   * Validate image basic constraints in Workers (format detection not available)
   */
  async validateImage(
    imageBuffer: ArrayBuffer
  ): Promise<{
    isValid: boolean;
    metadata?: { width: number; height: number; format: string };
    error?: string;
  }> {
    try {
      // @ts-ignore - createImageBitmap is available in Workers
      const bitmap = await createImageBitmap(imageBuffer);
      const width = bitmap.width;
      const height = bitmap.height;
      bitmap.close();

      if (!width || !height) {
        return { isValid: false, error: 'Cannot get image dimensions' };
      }

      if (imageBuffer.byteLength > 10 * 1024 * 1024) {
        return {
          isValid: false,
          error: `Image file too large: ${(imageBuffer.byteLength / 1024 / 1024).toFixed(2)}MB, maximum 10MB supported`
        };
      }

      if (width > 4096 || height > 4096) {
        return {
          isValid: false,
          error: `Image resolution too large: ${width}x${height}, maximum 4096x4096 supported`
        };
      }

      return {
        isValid: true,
        metadata: { width, height, format: 'unknown' }
      };
    } catch (error) {
      console.error('Workers image validation failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isValid: false,
        error: `Image validation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Use Cloudflare Workers Canvas API for image processing
   * Reference: https://developers.cloudflare.comWorkers/platform/changelog/2024-04-16-workers-canvas-api/
   */
  private async cropWithWorkersCanvas(
    imageBuffer: ArrayBuffer,
    outputSize: number,
    quality: number
  ): Promise<ArrayBuffer> {
    try {
      // @ts-ignore - Cloudflare Workers global
      const canvas = new OffscreenCanvas(outputSize, outputSize);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get 2D context from OffscreenCanvas');
      }

      // Load image from buffer
      // @ts-ignore - createImageBitmap is available in Workers
      const bitmap = await createImageBitmap(imageBuffer);

      const { width, height } = bitmap;

      if (!width || !height) {
        throw new Error('Invalid image dimensions');
      }

      // Calculate crop dimensions (top third square)
      const topThirdHeight = Math.floor(height / 3);
      const cropSize = Math.min(width, topThirdHeight);
      const left = Math.max(0, Math.floor((width - cropSize) / 2));
      const top = 0;

      // Enable high quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw cropped and resized image
      ctx.drawImage(
        bitmap,
        left, top, cropSize, cropSize,  // Source rectangle
        0, 0, outputSize, outputSize    // Destination rectangle
      );

      // Close bitmap to free memory
      bitmap.close();

      // Convert to blob and then to ArrayBuffer
      const blob = await canvas.convertToBlob({
        type: 'image/jpeg',
        quality: quality / 100
      });

      return await blob.arrayBuffer();

    } catch (error) {
      console.error('Workers Canvas processing failed:', error);
      throw new StorageError('Workers Canvas API not available or failed');
    }
  }

  /**
   * Get image info without processing
   * Uses createImageBitmap to get dimensions
   */
  async getImageInfo(imageBuffer: ArrayBuffer): Promise<{
    width: number;
    height: number;
    size: number;
  }> {
    try {
      // @ts-ignore - createImageBitmap is available in Workers
      const bitmap = await createImageBitmap(imageBuffer);

      const info = {
        width: bitmap.width,
        height: bitmap.height,
        size: imageBuffer.byteLength
      };

      bitmap.close();
      return info;

    } catch (error) {
      console.error('Failed to get image info:', error);
      throw new StorageError('Failed to read image dimensions');
    }
  }

  /**
   * Check if the current environment supports Workers Canvas API
   */
  static isSupported(): boolean {
    if (WorkersImageProcessor.isCloudflareWorker()) {
      // In Workers, we should avoid Sharp even if Canvas is not enabled.
      return true;
    }

    // @ts-ignore - Check for OffscreenCanvas/createImageBitmap availability
    return typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined';
  }
}
