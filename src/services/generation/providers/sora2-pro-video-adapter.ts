/**
 * Sora-2 Pro Video Adapter
 * 支持多图传入的高端视频生成模型，Pro版本支持更高质量和更多功能
 */

import {
  VideoBaseAdapter,
  VideoGenerationParams,
  VideoTaskCreationResult,
  VideoTaskQueryResult,
} from "@/types/video-provider";
import { getVideoModels } from "@/lib/configs";

// 缓存模型配置（仅用于 createTask，不用于积分计算）
let modelConfigCache: any = null;

interface Sora2ProCreateResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface Sora2ProQueryResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
    state: string;
    resultJson?: string;
    failMsg?: string;
    failCode?: string;
  };
}

export class Sora2ProVideoAdapter extends VideoBaseAdapter {
  protected getCreateEndpoint(): string {
    return "/api/v1/jobs/createTask";
  }

  protected getQueryEndpoint(): string {
    return "/api/v1/jobs/recordInfo";
  }

  private async getModelConfig() {
    if (modelConfigCache) {
      return modelConfigCache;
    }
    const videoModels = await getVideoModels();
    modelConfigCache = videoModels.find((model) => model.model_id === "sora-2-pro")?.config;
    return modelConfigCache;
  }

  async createTask(
    params: VideoGenerationParams,
    callbackUrl: string
  ): Promise<VideoTaskCreationResult> {
    const config = await this.getModelConfig();
    if (!config) {
      throw new Error("Sora-2 Pro model configuration not found");
    }

    // 收集图片
    const images: string[] = [];

    // 添加参考图（如果有）
    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      images.push(...params.reference_image_urls);
    }

    // 添加OC角色图（如果有）
    if (params.character_image_url) {
      images.push(params.character_image_url);
    }

    // Sora2 Pro最多支持3张图片
    const finalImages = images.slice(0, 3);

    // 根据是否有图片决定模型类型
    const isImageToVideo = finalImages.length > 0;
    const modelType = isImageToVideo
      ? config.model_types.image_to_video
      : config.model_types.text_to_video;

    const requestBody = {
      model: modelType,
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt,
        n_frames: params.duration_seconds?.toString() ?? "30",
        aspect_ratio: params.aspect_ratio,
        size: params.quality,
        removeWatermark: true,
        // 图片传入
        ...(finalImages.length > 0 && {
          image_urls: finalImages,
        }),
      },
    };

    const response = await this.fetchAPI<Sora2ProCreateResponse>(
      `${this.baseUrl}${this.getCreateEndpoint()}`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    if (response.code !== 200 || !response.data?.taskId) {
      throw new Error(
        `Failed to create Sora-2 Pro video task: ${(response as any)?.message || "Unknown error"}`
      );
    }

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<VideoTaskQueryResult> {
    const url = `${this.baseUrl}${this.getQueryEndpoint()}?taskId=${taskId}`;

    const response = await this.fetchAPI<Sora2ProQueryResponse>(url, {
      method: "GET",
    });

    if (response.code !== 200 || !response.data) {
      throw new Error(
        `Failed to query Sora-2 Pro video task: ${(response as any)?.message || "Unknown error"}`
      );
    }

    const { data } = response;
    let resultUrls: string[] | undefined;
    if (data.resultJson) {
      try {
        const resultObj = JSON.parse(data.resultJson);
        resultUrls = resultObj.resultUrls;
      } catch (error) {
        console.error("Failed to parse resultJson:", error);
      }
    }

    return {
      taskId: data.taskId,
      state: this.normalizeState(data.state),
      resultUrls,
      failMsg: data.failMsg,
      failCode: data.failCode,
    };
  }

  /**
   * Sora2 Pro计费逻辑：硬编码积分映射表，支持时长+质量组合
   * 与 Kling 和 Wan 模型保持统一，不依赖外部配置
   */
  calculateCredits(params: VideoGenerationParams): number {
    const duration = params?.duration_seconds || 10;
    const quality = params?.quality || 'standard';

    // Sora2 Pro 硬编码积分映射表
    // 支持时长: 10秒、15秒；质量: standard、high
    const creditsMap: Record<string, number> = {
      '10_standard': 375,
      '15_standard': 675,
      '10_high': 825,
      '15_high': 1575,
    };

    const creditsKey = `${duration}_${quality}`;
    let credits = creditsMap[creditsKey];

    // 按比例计算不支持的时长
    if (!credits) {
      if (duration <= 10) {
        // 不超过10秒的，使用10秒的积分
        const baseKey = `10_${quality}`;
        credits = creditsMap[baseKey];
      } else {
        // 超过10秒的，按比例计算
        const baseKey = `10_${quality}`;
        const baseCredits = creditsMap[baseKey];
        credits = Math.ceil(baseCredits * (duration / 10));
      }
    }

    // 兜底方案
    if (!credits) {
      credits = 375; // 默认为10秒 standard
    }

    console.log("[Sora2ProAdapter] CalculateCredits: Credits calculated", {
      duration_seconds: duration,
      quality,
      credits,
      method: "hardcoded",
    });

    return credits;
  }
}
