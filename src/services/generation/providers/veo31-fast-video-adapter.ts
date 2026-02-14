/**
 * Veo 3.1 Fast Video Adapter
 * 处理Veo3.1 Fast视频模型，支持文本生成视频和图片生成视频
 * API版本：旧版API
 * 计费：300MC
 */

import {
  VideoBaseAdapter,
  VideoGenerationParams,
  VideoTaskCreationResult,
  VideoTaskQueryResult,
} from "@/types/video-provider";

interface VeoCreateResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface VeoQueryResponse {
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

export class Veo31FastVideoAdapter extends VideoBaseAdapter {
  protected getCreateEndpoint(): string {
    return "/api/v1/jobs/createTask";
  }

  protected getQueryEndpoint(): string {
    return "/api/v1/jobs/recordInfo";
  }

  async createTask(
    params: VideoGenerationParams,
    callbackUrl: string
  ): Promise<VideoTaskCreationResult> {
    console.log("[Veo31FastAdapter] CreateTask: Starting task creation", {
      model_name: params.model_name,
      duration_seconds: params.duration_seconds,
      aspect_ratio: params.aspect_ratio,
      prompt_length: params.prompt.length,
      has_character_image: !!params.character_image_url,
      reference_images_count: params.reference_image_urls?.length || 0,
    });

    // 收集图片 - Veo3.1 Fast支持1张图片
    const images: string[] = [];

    // 添加OC角色图（优先）
    if (params.character_image_url) {
      images.push(params.character_image_url);
      console.log("[Veo31FastAdapter] CreateTask: Added character image");
    }

    // 添加参考图
    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      images.push(...params.reference_image_urls);
      console.log("[Veo31FastAdapter] CreateTask: Added reference images", {
        count: params.reference_image_urls.length,
      });
    }

    // Veo3.1 Fast最多支持1张图片
    const finalImages = images.slice(0, 1);
    if (images.length > 1) {
      console.warn("[Veo31FastAdapter] CreateTask: Too many images, limited to 1", {
        original_count: images.length,
        final_count: finalImages.length,
      });
    }

    // 根据是否有图片决定生成类型
    const isImageToVideo = finalImages.length > 0;
    const generationType = isImageToVideo
      ? "FIRST_AND_LAST_FRAMES_2_VIDEO"
      : "TEXT_2_VIDEO";

    console.log("[Veo31FastAdapter] CreateTask: Generation type determined", {
      is_image_to_video: isImageToVideo,
      generation_type: generationType,
      images_count: finalImages.length,
    });

    // 构建请求体（使用旧版API格式）
    const requestBody: any = {
      model: "veo3_fast",
      prompt: params.prompt,
      generationType: generationType,
      callBackUrl: callbackUrl,
    };

    // 图片生成视频模式需要传imageUrls
    if (isImageToVideo && finalImages.length > 0) {
      requestBody.imageUrls = finalImages;
    }

    // 可选参数
    if (params.aspect_ratio) {
      // 映射aspect_ratio到veo3.1 fast的aspectRatio格式
      const aspectRatioMap: Record<string, string> = {
        "1:1": "Auto",
        "9:16": "9:16",
        "16:9": "16:9",
        "portrait": "9:16",
        "landscape": "16:9",
      };
      requestBody.aspectRatio = aspectRatioMap[params.aspect_ratio] || "16:9";
    } else {
      requestBody.aspectRatio = "16:9"; // 默认16:9
    }

    if (params.watermark) {
      requestBody.watermark = params.watermark;
    }

    console.log("[Veo31FastAdapter] CreateTask: Sending request to KieAI", {
      url: `${this.baseUrl}${this.getCreateEndpoint()}`,
      model: requestBody.model,
      generation_type: requestBody.generationType,
      aspect_ratio: requestBody.aspectRatio,
      has_image: finalImages.length > 0,
      has_watermark: !!params.watermark,
      request_body: JSON.stringify(requestBody),
    });

    const startTime = Date.now();
    const response = await this.fetchAPI<VeoCreateResponse>(
      `${this.baseUrl}${this.getCreateEndpoint()}`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );
    const duration = Date.now() - startTime;

    console.log("[Veo31FastAdapter] CreateTask: Response received", {
      code: response.code,
      has_data: !!response.data,
      has_task_id: !!response.data?.taskId,
      message: (response as any)?.message,
      duration: `${duration}ms`,
    });

    // 区分两种错误情况
    if (response.code !== 200) {
      // 业务逻辑错误 (如余额不足、参数错误等)
      console.error("[Veo31FastAdapter] CreateTask: Business logic error", {
        code: response.code,
        message: (response as any)?.message,
        response_data: response.data,
        full_response: JSON.stringify(response),
        request_body: JSON.stringify(requestBody),
        duration: `${duration}ms`,
      });

      throw new Error(
        `Failed to create Veo3.1 Fast video task [Code ${response.code}]: ${(response as any)?.message || "Unknown business error"}`
      );
    }

    if (!response.data?.taskId) {
      // 异常情况: code=200 但没有返回 taskId
      console.error("[Veo31FastAdapter] CreateTask: Missing taskId in successful response", {
        code: response.code,
        message: (response as any)?.message,
        response_data: response.data,
        full_response: JSON.stringify(response),
        request_body: JSON.stringify(requestBody),
        duration: `${duration}ms`,
      });

      throw new Error(
        `Veo3.1 Fast video task created but taskId is missing. This is an API response format issue.`
      );
    }

    console.log("[Veo31FastAdapter] CreateTask: Task created successfully", {
      task_id: response.data.taskId,
      duration: `${duration}ms`,
    });

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<VideoTaskQueryResult> {
    const url = `${this.baseUrl}${this.getQueryEndpoint()}?taskId=${taskId}`;
    console.log("[Veo31FastAdapter] QueryTask: Querying task status", {
      task_id: taskId,
      url,
    });

    const startTime = Date.now();
    const response = await this.fetchAPI<VeoQueryResponse>(url, {
      method: "GET",
    });
    const duration = Date.now() - startTime;

    console.log("[Veo31FastAdapter] QueryTask: Response received", {
      task_id: taskId,
      code: response.code,
      state: response.data?.state,
      duration: `${duration}ms`,
    });

    // 区分两种错误情况
    if (response.code !== 200) {
      // 业务逻辑错误
      console.error("[Veo31FastAdapter] QueryTask: Business logic error", {
        task_id: taskId,
        code: response.code,
        message: (response as any)?.message,
        response_data: response.data,
        full_response: JSON.stringify(response),
        duration: `${duration}ms`,
      });

      throw new Error(
        `Failed to query Veo3.1 Fast video task [Code ${response.code}]: ${(response as any)?.message || "Unknown business error"}`
      );
    }

    if (!response.data) {
      // 异常情况: code=200 但没有返回 data
      console.error("[Veo31FastAdapter] QueryTask: Missing data in successful response", {
        task_id: taskId,
        code: response.code,
        message: (response as any)?.message,
        full_response: JSON.stringify(response),
        duration: `${duration}ms`,
      });

      throw new Error(
        `Veo3.1 Fast video task query succeeded but data is missing. This is an API response format issue.`
      );
    }

    const { data } = response;
    let resultUrls: string[] | undefined;
    if (data.resultJson) {
      try {
        const resultObj = JSON.parse(data.resultJson);
        resultUrls = resultObj.resultUrls;
        console.log("[Veo31FastAdapter] QueryTask: Result URLs parsed", {
          task_id: taskId,
          urls_count: resultUrls?.length || 0,
        });
      } catch (error) {
        console.error("[Veo31FastAdapter] QueryTask: Failed to parse resultJson", {
          task_id: taskId,
          error,
        });
      }
    }

    const normalizedState = this.normalizeState(data.state);
    console.log("[Veo31FastAdapter] QueryTask: Completed", {
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
   * Veo3.1 Fast计费逻辑：固定300MC
   * 基于KIE API文档的计费说明
   */
  calculateCredits(params: VideoGenerationParams): number {
    // Veo3.1 Fast固定收费300MC，不根据分辨率或时长变化
    return 300;
  }
}
