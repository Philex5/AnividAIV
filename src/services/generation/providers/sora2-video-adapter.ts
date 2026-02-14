/**
 * Sora-2 Video Adapter
 * 支持多图传入的高端视频生成模型
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

interface Sora2CreateResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface Sora2QueryResponse {
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

export class Sora2VideoAdapter extends VideoBaseAdapter {
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
    modelConfigCache = videoModels.find(
      (model) => model.model_id === "sora-2"
    )?.config;
    return modelConfigCache;
  }

  async createTask(
    params: VideoGenerationParams,
    callbackUrl: string
  ): Promise<VideoTaskCreationResult> {
    console.log("[Sora2Adapter] CreateTask: Starting task creation", {
      model_name: params.model_name,
      duration_seconds: params.duration_seconds,
      aspect_ratio: params.aspect_ratio,
      prompt_length: params.prompt.length,
    });

    const config = await this.getModelConfig();
    if (!config) {
      console.error("[Sora2Adapter] CreateTask: Model configuration not found");
      throw new Error("Sora-2 model configuration not found");
    }

    // 收集图片
    const images: string[] = [];

    // 添加参考图（如果有）
    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      images.push(...params.reference_image_urls);
      console.log("[Sora2Adapter] CreateTask: Added reference images", {
        count: params.reference_image_urls.length,
      });
    }

    // 添加OC角色图（如果有）
    if (params.character_image_url) {
      images.push(params.character_image_url);
      console.log("[Sora2Adapter] CreateTask: Added character image");
    }

    // Sora2最多支持3张图片
    const finalImages = images.slice(0, 3);
    if (images.length > 3) {
      console.warn("[Sora2Adapter] CreateTask: Too many images, limited to 3", {
        original_count: images.length,
        final_count: finalImages.length,
      });
    }

    // 根据是否有图片决定模型类型
    const isImageToVideo = finalImages.length > 0;
    const modelType = isImageToVideo
      ? config.model_types.image_to_video
      : config.model_types.text_to_video;
    console.log("[Sora2Adapter] CreateTask: Model type determined", {
      is_image_to_video: isImageToVideo,
      model_type: modelType,
      images_count: finalImages.length,
    });

    const requestBody = {
      model: modelType,
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt,
        n_frames: params.duration_seconds?.toString() ?? "100",
        aspect_ratio:
          params.aspect_ratio === "landscape" ? "landscape" : "portrait",
        removeWatermark: true,
        // 图片传入
        ...(finalImages.length > 0 && {
          image_urls: finalImages,
        }),
      },
    };

    console.log("[Sora2Adapter] CreateTask: Sending request to KieAI", {
      url: `${this.baseUrl}${this.getCreateEndpoint()}`,
      model: requestBody.model,
      n_frames: requestBody.input.n_frames,
      aspect_ratio: requestBody.input.aspect_ratio,
      has_images: finalImages.length > 0,
      request_body: JSON.stringify(requestBody),
    });

    const startTime = Date.now();
    const response = await this.fetchAPI<Sora2CreateResponse>(
      `${this.baseUrl}${this.getCreateEndpoint()}`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );
    const duration = Date.now() - startTime;

    console.log("[Sora2Adapter] CreateTask: Response received", {
      code: response.code,
      has_data: !!response.data,
      has_task_id: !!response.data?.taskId,
      message: (response as any)?.message,
      duration: `${duration}ms`,
    });

    // 区分两种错误情况
    if (response.code !== 200) {
      // 业务逻辑错误 (如余额不足、参数错误等)
      console.error("[Sora2Adapter] CreateTask: Business logic error", {
        code: response.code,
        message: (response as any)?.message,
        response_data: response.data,
        full_response: JSON.stringify(response),
        request_body: JSON.stringify(requestBody),
        duration: `${duration}ms`,
      });

      throw new Error(
        `Failed to create Sora-2 video task [Code ${response.code}]: ${(response as any)?.message || "Unknown business error"}`
      );
    }

    if (!response.data?.taskId) {
      // 异常情况: code=200 但没有返回 taskId
      console.error(
        "[Sora2Adapter] CreateTask: Missing taskId in successful response",
        {
          code: response.code,
          message: (response as any)?.message,
          response_data: response.data,
          full_response: JSON.stringify(response),
          request_body: JSON.stringify(requestBody),
          duration: `${duration}ms`,
        }
      );

      throw new Error(
        `Sora-2 video task created but taskId is missing. This is an API response format issue.`
      );
    }

    console.log("[Sora2Adapter] CreateTask: Task created successfully", {
      task_id: response.data.taskId,
      duration: `${duration}ms`,
    });

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<VideoTaskQueryResult> {
    const url = `${this.baseUrl}${this.getQueryEndpoint()}?taskId=${taskId}`;
    console.log("[Sora2Adapter] QueryTask: Querying task status", {
      task_id: taskId,
      url,
    });

    const startTime = Date.now();
    const response = await this.fetchAPI<Sora2QueryResponse>(url, {
      method: "GET",
    });
    const duration = Date.now() - startTime;

    console.log("[Sora2Adapter] QueryTask: Response received", {
      task_id: taskId,
      code: response.code,
      state: response.data?.state,
      duration: `${duration}ms`,
    });

    // 区分两种错误情况
    if (response.code !== 200) {
      // 业务逻辑错误
      console.error("[Sora2Adapter] QueryTask: Business logic error", {
        task_id: taskId,
        code: response.code,
        message: (response as any)?.message,
        response_data: response.data,
        full_response: JSON.stringify(response),
        duration: `${duration}ms`,
      });

      throw new Error(
        `Failed to query Sora-2 video task [Code ${response.code}]: ${(response as any)?.message || "Unknown business error"}`
      );
    }

    if (!response.data) {
      // 异常情况: code=200 但没有返回 data
      console.error(
        "[Sora2Adapter] QueryTask: Missing data in successful response",
        {
          task_id: taskId,
          code: response.code,
          message: (response as any)?.message,
          full_response: JSON.stringify(response),
          duration: `${duration}ms`,
        }
      );

      throw new Error(
        `Sora-2 video task query succeeded but data is missing. This is an API response format issue.`
      );
    }

    const { data } = response;
    let resultUrls: string[] | undefined;
    if (data.resultJson) {
      try {
        const resultObj = JSON.parse(data.resultJson);
        resultUrls = resultObj.resultUrls;
        console.log("[Sora2Adapter] QueryTask: Result URLs parsed", {
          task_id: taskId,
          urls_count: resultUrls?.length || 0,
        });
      } catch (error) {
        console.error("[Sora2Adapter] QueryTask: Failed to parse resultJson", {
          task_id: taskId,
          error,
        });
      }
    }

    const normalizedState = this.normalizeState(data.state);
    console.log("[Sora2Adapter] QueryTask: Completed", {
      task_id: taskId,
      state: normalizedState,
      has_results: !!resultUrls,
      has_fail_msg: !!data.failMsg,
    });

    return {
      taskId: data.taskId,
      state: normalizedState,
      resultUrls,
      failMsg: data.failMsg,
      failCode: data.failCode,
    };
  }

  /**
   * Sora2计费逻辑：硬编码积分映射表
   * 与 Kling 和 Wan 模型保持统一，不依赖外部配置
   */
  calculateCredits(params: VideoGenerationParams): number {
    const duration = params?.duration_seconds || 10;

    // Sora2 硬编码积分映射表
    // 支持时长: 10秒和15秒
    const creditsMap: Record<number, number> = {
      10: 100,
      15: 140,
    };

    // 按比例计算不支持的时长
    let credits = creditsMap[duration];
    if (!credits) {
      // 按比例计算（基于10秒基准）
      if (duration <= 10) {
        credits = creditsMap[10];
      } else {
        credits = Math.ceil(creditsMap[10] * (duration / 10));
      }
    }

    console.log("[Sora2Adapter] CalculateCredits: Credits calculated", {
      duration_seconds: duration,
      credits,
      method: "hardcoded",
    });

    return credits;
  }
}
