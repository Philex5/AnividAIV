/**
 * Wan 2.2 Video Adapter
 * 处理Wan2.5视频模型，包含参数转换和计费逻辑
 */

import {
  VideoBaseAdapter,
  VideoGenerationParams,
  VideoTaskCreationResult,
  VideoTaskQueryResult,
} from "@/types/video-provider";

interface WanCreateResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface WanQueryResponse {
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

export class WanVideoAdapter extends VideoBaseAdapter {
  protected getCreateEndpoint(): string {
    return "/api/v1/jobs/createTask";
  }

  protected getQueryEndpoint(): string {
    return "/api/v1/jobs/recordInfo";
  }

  async createTask(
    params: VideoGenerationParams,
    callbackUrl: string,
  ): Promise<VideoTaskCreationResult> {
    console.log("[WanAdapter] CreateTask: Starting task creation", {
      model_name: params.model_name,
      duration_seconds: params.duration_seconds,
      aspect_ratio: params.aspect_ratio,
      prompt_length: params.prompt.length,
      has_character_image: !!params.character_image_url,
      reference_images_count: params.reference_image_urls?.length || 0,
    });

    // 收集图片
    const images: string[] = [];

    // 添加OC角色图（优先）
    if (params.character_image_url) {
      images.push(params.character_image_url);
      console.log("[WanAdapter] CreateTask: Added character image");
    }

    // 添加参考图
    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      images.push(...params.reference_image_urls);
      console.log("[WanAdapter] CreateTask: Added reference images", {
        count: params.reference_image_urls.length,
      });
    }

    // Wan2.5最多支持1张图片
    const finalImages = images.slice(0, 1);
    if (images.length > 1) {
      console.warn("[WanAdapter] CreateTask: Too many images, limited to 1", {
        original_count: images.length,
        final_count: finalImages.length,
      });
    }

    // 根据是否有图片决定模型类型
    const isImageToVideo = finalImages.length > 0;
    const modelName = isImageToVideo
      ? "wan/2-5-image-to-video"
      : "wan/2-5-text-to-video";

    console.log("[WanAdapter] CreateTask: Model type determined", {
      is_image_to_video: isImageToVideo,
      model_name: modelName,
      images_count: finalImages.length,
    });

    const requestBody = {
      model: modelName,
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt,
        // 图生视频才传image_url
        ...(finalImages.length > 0 && {
          image_url: finalImages[0],
          duration: this.mapDurationToWanFormat(params.duration_seconds),
        }),
        // 参数转换
        resolution: this.mapQualityToResolution(params.quality),
        aspect_ratio: params.aspect_ratio || "auto",
        enable_prompt_expansion: true,
        seed: params.seed,
      },
    };

    console.log("[WanAdapter] CreateTask: Sending request to KieAI", {
      url: `${this.baseUrl}${this.getCreateEndpoint()}`,
      model: requestBody.model,
      resolution: requestBody.input.resolution,
      aspect_ratio: requestBody.input.aspect_ratio,
      has_image: finalImages.length > 0,
      request_body: JSON.stringify(requestBody),
    });

    const startTime = Date.now();
    const response = await this.fetchAPI<WanCreateResponse>(
      `${this.baseUrl}${this.getCreateEndpoint()}`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      },
    );
    const duration = Date.now() - startTime;

    console.log("[WanAdapter] CreateTask: Response received", {
      code: response.code,
      has_data: !!response.data,
      has_task_id: !!response.data?.taskId,
      message: (response as any)?.message,
      duration: `${duration}ms`,
    });

    // 区分两种错误情况
    if (response.code !== 200) {
      // 业务逻辑错误 (如余额不足、参数错误等)
      console.error("[WanAdapter] CreateTask: Business logic error", {
        code: response.code,
        message: (response as any)?.message,
        response_data: response.data,
        full_response: JSON.stringify(response),
        request_body: JSON.stringify(requestBody),
        duration: `${duration}ms`,
      });

      throw new Error(
        `Failed to create Wan2.5 video task [Code ${response.code}]: ${(response as any)?.message || "Unknown business error"}`,
      );
    }

    if (!response.data?.taskId) {
      // 异常情况: code=200 但没有返回 taskId
      console.error(
        "[WanAdapter] CreateTask: Missing taskId in successful response",
        {
          code: response.code,
          message: (response as any)?.message,
          response_data: response.data,
          full_response: JSON.stringify(response),
          request_body: JSON.stringify(requestBody),
          duration: `${duration}ms`,
        },
      );

      throw new Error(
        `Wan2.5 video task created but taskId is missing. This is an API response format issue.`,
      );
    }

    console.log("[WanAdapter] CreateTask: Task created successfully", {
      task_id: response.data.taskId,
      duration: `${duration}ms`,
    });

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<VideoTaskQueryResult> {
    const url = `${this.baseUrl}${this.getQueryEndpoint()}?taskId=${taskId}`;
    console.log("[WanAdapter] QueryTask: Querying task status", {
      task_id: taskId,
      url,
    });

    const startTime = Date.now();
    const response = await this.fetchAPI<WanQueryResponse>(url, {
      method: "GET",
    });
    const duration = Date.now() - startTime;

    console.log("[WanAdapter] QueryTask: Response received", {
      task_id: taskId,
      code: response.code,
      state: response.data?.state,
      duration: `${duration}ms`,
    });

    // 区分两种错误情况
    if (response.code !== 200) {
      // 业务逻辑错误
      console.error("[WanAdapter] QueryTask: Business logic error", {
        task_id: taskId,
        code: response.code,
        message: (response as any)?.message,
        response_data: response.data,
        full_response: JSON.stringify(response),
        duration: `${duration}ms`,
      });

      throw new Error(
        `Failed to query Wan2.5 video task [Code ${response.code}]: ${(response as any)?.message || "Unknown business error"}`,
      );
    }

    if (!response.data) {
      // 异常情况: code=200 但没有返回 data
      console.error(
        "[WanAdapter] QueryTask: Missing data in successful response",
        {
          task_id: taskId,
          code: response.code,
          message: (response as any)?.message,
          full_response: JSON.stringify(response),
          duration: `${duration}ms`,
        },
      );

      throw new Error(
        `Wan2.5 video task query succeeded but data is missing. This is an API response format issue.`,
      );
    }

    const { data } = response;
    let resultUrls: string[] | undefined;
    if (data.resultJson) {
      try {
        const resultObj = JSON.parse(data.resultJson);
        resultUrls = resultObj.resultUrls;
        console.log("[WanAdapter] QueryTask: Result URLs parsed", {
          task_id: taskId,
          urls_count: resultUrls?.length || 0,
        });
      } catch (error) {
        console.error("[WanAdapter] QueryTask: Failed to parse resultJson", {
          task_id: taskId,
          error,
        });
      }
    }

    const normalizedState = this.normalizeState(data.state);
    console.log("[WanAdapter] QueryTask: Completed", {
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
   * Wan2.5计费逻辑：根据分辨率和时长计算
   * 基于最新KIE API文档的计费说明（2025-11-20更新）
   * 720p,5s=300MC, 1080p,5s=500MC, 1080p,10s=1000MC
   */
  calculateCredits(params: VideoGenerationParams): number {
    const resolution = this.mapQualityToResolution(params.quality);
    const duration = params.duration_seconds || 5; // 默认5秒

    // Wan2.5最新计费规则：
    // 720p: 300MC (5s)
    // 1080p: 500MC (5s), 1000MC (10s)
    const creditsMap: Record<string, Record<number, number>> = {
      "720p": {
        5: 300,
        10: 600, // 按比例推算
      },
      "1080p": {
        5: 500,
        10: 1000,
      },
    };

    const resolutionCredits = creditsMap[resolution];
    if (!resolutionCredits) {
      // 不支持的分辨率，使用默认计费
      return 500;
    }

    const credits = resolutionCredits[duration];
    if (!credits) {
      // 不支持的时长，使用默认计费或按比例计算
      if (duration <= 5) {
        return resolutionCredits[5];
      } else {
        // 按比例计算（基于5秒基准）
        const baseCredits = resolutionCredits[5];
        return Math.ceil(baseCredits * (duration / 5));
      }
    }

    return credits;
  }

  /**
   * 质量等级映射到Wan分辨率
   * 标准质量映射到720p，高质量映射到1080p
   */
  private mapQualityToResolution(quality?: string): string {
    switch (quality) {
      case "standard":
        return "720p";
      case "high":
        return "1080p";
      default:
        return "720p"; // 默认标准质量
    }
  }

  /**
   * Wan2.5 图生视频时长仅支持 5 或 10 秒
   */
  private mapDurationToWanFormat(seconds?: number): "5" | "10" {
    if (!seconds || seconds <= 5) {
      return "5";
    }
    return "10";
  }
}
