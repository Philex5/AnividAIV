/**
 * Resolution Configuration for Different Generation Types
 * 各种生图类型的分辨率配置
 */

import { ThumbnailConfig } from "@/types/storage";

// 基础分辨率配置类型
export interface ResolutionProfile {
  name: string;
  description: string;
  thumbnails: ThumbnailConfig[];
}

// 动漫生图分辨率配置
export const ANIME_RESOLUTION_CONFIG: ResolutionProfile = {
  name: 'anime',
  description: 'Anime generation resolution profile',
  thumbnails: [
    { minEdge: 250, suffix: 'mobile' },    // 移动端列表预览
    { minEdge: 400, suffix: 'desktop' },   // 桌面端列表预览
    { minEdge: 800, suffix: 'detail' }     // 详情页预览图
  ]
};

// 角色立绘分辨率配置
export const CHARACTER_RESOLUTION_CONFIG: ResolutionProfile = {
  name: 'character',
  description: 'Character illustration resolution profile',
  thumbnails: [
    { minEdge: 250, suffix: 'mobile' },    // 移动端列表预览
    { minEdge: 400, suffix: 'desktop' },   // 桌面端列表预览
    { minEdge: 800, suffix: 'detail' }     // 详情页预览图
  ]
};

// 头像生图分辨率配置（特殊尺寸）
export const AVATAR_RESOLUTION_CONFIG: ResolutionProfile = {
  name: 'avatar',
  description: 'Avatar generation resolution profile',
  thumbnails: [
    { minEdge: 64, suffix: '64' },         // 64x64 小头像
    { minEdge: 128, suffix: '128' },       // 128x128 中等头像
    { minEdge: 256, suffix: '256' }        // 256x256 大头像
  ]
};

// 背景生图分辨率配置
export const BACKGROUND_RESOLUTION_CONFIG: ResolutionProfile = {
  name: 'background',
  description: 'Background generation resolution profile',
  thumbnails: [
    { minEdge: 250, suffix: 'mobile' },    // 移动端列表预览
    { minEdge: 400, suffix: 'desktop' },   // 桌面端列表预览
    { minEdge: 800, suffix: 'detail' }     // 详情页预览图
  ]
};

// 统一的分辨率配置映射
export const RESOLUTION_CONFIGS: Record<string, ResolutionProfile> = {
  anime: ANIME_RESOLUTION_CONFIG,
  character: CHARACTER_RESOLUTION_CONFIG,
  avatar: AVATAR_RESOLUTION_CONFIG,
  background: BACKGROUND_RESOLUTION_CONFIG
};

// 获取指定类型的分辨率配置
export function getResolutionConfig(generationType: string): ThumbnailConfig[] {
  const config = RESOLUTION_CONFIGS[generationType];
  if (!config) {
    console.warn(`No resolution config found for type: ${generationType}, using default anime config`);
    return ANIME_RESOLUTION_CONFIG.thumbnails;
  }
  return config.thumbnails;
}

// 验证生图类型是否支持
export function isSupportedGenerationType(type: string): boolean {
  return type in RESOLUTION_CONFIGS;
}

// 获取所有支持的生图类型
export function getSupportedGenerationTypes(): string[] {
  return Object.keys(RESOLUTION_CONFIGS);
}

// ===== Video generation options (quality/ratio mapping) =====
export const VIDEO_SUPPORTED_RATIOS = ["1:1", "9:16", "16:9"] as const;

export type VideoQuality = "720p" | "1080p";

export const VIDEO_RESOLUTION_BY_QUALITY: Record<VideoQuality, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 }
};

export function isSupportedVideoRatio(ratio: string): boolean {
  return (VIDEO_SUPPORTED_RATIOS as readonly string[]).includes(ratio);
}

export function isSupportedVideoQuality(q: string): q is VideoQuality {
  return q === "720p" || q === "1080p";
}

export function getVideoResolutionByQuality(q: VideoQuality) {
  return VIDEO_RESOLUTION_BY_QUALITY[q];
}
