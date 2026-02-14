export interface StorageResult {
  imageUrl: string;
  thumbnailUrls: {
    mobile: string;    // 250px min edge
    desktop: string;   // 400px min edge
    detail: string;    // 800px min edge
  };
  key: string;
  size: number;
}

export interface ThumbnailConfig {
  minEdge: number;
  suffix: string;
}

export interface UploadResult {
  location: string;
  bucket: string;
  key: string;
  filename?: string;
  url: string;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export interface ImageProcessingOptions {
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp';
  withoutEnlargement?: boolean;
}

export interface StorageStats {
  totalSize: number;
  totalObjects: number;
  monthlyUsage: number;
}