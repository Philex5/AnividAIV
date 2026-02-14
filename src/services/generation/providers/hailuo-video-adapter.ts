/**
 * Hailuo 2.3 Video Adapter
 * 处理Hailuo 2.3视频模型，仅支持图生视频
 * API版本：新版API
 * 计费：Standard 6s 768P=150MC, Pro 6s 1080P=400MC
 */

import {
  VideoBaseAdapter,
  VideoGenerationParams,
  VideoTaskCreationResult,
  VideoTaskQueryResult,
} from "@/types/video-provider";

interface HailuoCreateResponse {
  code: number;
  msg?: string;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface HailuoQueryResponse {
  code: number;
  msg?: string;
  message?: string;
  data?: {
    taskId: string;
    state: string;
    resultJson?: string;
    failMsg?: string;
    failCode?: string;
  };
}

export class HailuoVideoAdapter extends VideoBaseAdapter {
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
    console.log("[HailuoAdapter] CreateTask: Starting task creation", {
      model_name: params.model_name,
      duration_seconds: params.duration_seconds,
      resolution: params.resolution,
      prompt_length: params.prompt.length,
      has_character_image: !!params.character_image_url,
    });

    // Hailuo 2.3 仅支持图生视频，必须有图片
    const imageUrl =
      params.character_image_url ||
      (params.reference_image_urls && params.reference_image_urls.length > 0
        ? params.reference_image_urls[0]
        : undefined);

    if (!imageUrl) {
      throw new Error("Hailuo 2.3 requires an image (image-to-video only)");
    }

    // 验证分辨率约束：10s 不支持 1080p
    const duration = params.duration_seconds || 6;
    const resolution = params.resolution || "768p";
    const hailuoResolution = this.mapResolutionToHailuoFormat(resolution);

    if (duration === 10 && resolution === "1080p") {
      throw new Error("Hailuo 2.3 does not support 1080p for 10s videos");
    }

    // 构建请求体（使用新版 API 格式）
    const requestBody = {
      model: params.model_name,
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt,
        image_url: imageUrl,
        duration: duration.toString(),
        resolution: hailuoResolution,
      },
    };

    console.log("[HailuoAdapter] CreateTask: Sending request to KieAI", {
      model: requestBody.model,
      duration: requestBody.input.duration,
      resolution: requestBody.input.resolution,
      has_image: true,
    });

    const startTime = Date.now();
    const response = await this.fetchAPI<HailuoCreateResponse>(
      `${this.baseUrl}${this.getCreateEndpoint()}`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );
    const durationMs = Date.now() - startTime;

    console.log("[HailuoAdapter] CreateTask: Response received", {
      code: response.code,
      has_data: !!response.data,
      has_task_id: !!response.data?.taskId,
      message: (response as any)?.message,
      duration: `${durationMs}ms`,
    });

    // 区分两种错误情况
    if (response.code !== 200) {
      // 业务逻辑错误 (如余额不足、参数错误等)
      console.error("[HailuoAdapter] CreateTask: Business logic error", {
        code: response.code,
        message: (response as any)?.message,
        response_data: response.data,
        full_response: JSON.stringify(response),
        duration: `${durationMs}ms`,
      });

      throw new Error(
        `Failed to create Hailuo 2.3 video task [Code ${response.code}]: ${(response as any)?.message || (response as any)?.msg || "Unknown business error"}`
      );
    }

    if (!response.data?.taskId) {
      // 异常情况: code=200 但没有返回 taskId
      console.error("[HailuoAdapter] CreateTask: Missing taskId in successful response", {
        code: response.code,
        message: (response as any)?.message,
        response_data: response.data,
        full_response: JSON.stringify(response),
        duration: `${durationMs}ms`,
      });

      throw new Error(
        `Hailuo 2.3 video task created but taskId is missing. This is an API response format issue.`
      );
    }

    console.log("[HailuoAdapter] CreateTask: Task created successfully", {
      task_id: response.data.taskId,
      duration: `${durationMs}ms`,
    });

    return { taskId: response.data.taskId };
  }

  private mapResolutionToHailuoFormat(resolution: string): "768P" | "1080P" {
    if (resolution === "1080p") {
      return "1080P";
    }
    return "768P";
  }

  async queryTask(taskId: string): Promise<VideoTaskQueryResult> {
    const url = `${this.baseUrl}${this.getQueryEndpoint()}?taskId=${taskId}`;
    console.log("[HailuoAdapter] QueryTask: Querying task status", {
      task_id: taskId,
      url,
    });

    const startTime = Date.now();
    const response = await this.fetchAPI<HailuoQueryResponse>(url, {
      method: "GET",
    });
    const durationMs = Date.now() - startTime;

    console.log("[HailuoAdapter] QueryTask: Response received", {
      task_id: taskId,
      code: response.code,
      state: response.data?.state,
      duration: `${durationMs}ms`,
    });

    // 区分两种错误情况
    if (response.code !== 200) {
      // 业务逻辑错误
      console.error("[HailuoAdapter] QueryTask: Business logic error", {
        task_id: taskId,
        code: response.code,
        message: (response as any)?.message,
        response_data: response.data,
        full_response: JSON.stringify(response),
        duration: `${durationMs}ms`,
      });

      throw new Error(
        `Failed to query Hailuo 2.3 video task [Code ${response.code}]: ${(response as any)?.message || (response as any)?.msg || "Unknown business error"}`
      );
    }

    if (!response.data) {
      // 异常情况: code=200 但没有返回 data
      console.error("[HailuoAdapter] QueryTask: Missing data in successful response", {
        task_id: taskId,
        code: response.code,
        message: (response as any)?.message,
        full_response: JSON.stringify(response),
        duration: `${durationMs}ms`,
      });

      throw new Error(
        `Hailuo 2.3 video task query succeeded but data is missing. This is an API response format issue.`
      );
    }

    const { data } = response;
    let resultUrls: string[] | undefined;
    if (data.resultJson) {
      try {
        const resultObj = JSON.parse(data.resultJson);
        resultUrls = resultObj.resultUrls;
        console.log("[HailuoAdapter] QueryTask: Result URLs parsed", {
          task_id: taskId,
          urls_count: resultUrls?.length || 0,
        });
      } catch (error) {
        console.error("[HailuoAdapter] QueryTask: Failed to parse resultJson", {
          task_id: taskId,
          error,
        });
      }
    }

    const normalizedState = this.normalizeState(data.state);
    console.log("[HailuoAdapter] QueryTask: Completed", {
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
   * Hailuo 2.3 计费逻辑
   * Standard: 6s 768p=125MC, 6s 1080p=200MC, 10s 768p=200MC
   * Pro: 6s 768p=200MC, 6s 1080p=350MC, 10s 768p=400MC
   */
  calculateCredits(params: VideoGenerationParams): number {
    const duration = params.duration_seconds || 6;
    const resolution = params.resolution || "768p";

    // 验证约束：10s 不支持 1080p
    if (duration === 10 && resolution === "1080p") {
      throw new Error("Hailuo 2.3: 10s duration only supports 768p resolution");
    }

    // Check if this is Pro model (based on model_name)
    const isPro = params.model_name.includes("pro");

    const creditsMap: Record<string, Record<number, Record<string, number>>> = {
      standard: {
        6: { "768p": 125, "1080p": 200 },
        10: { "768p": 200 },
      },
      pro: {
        6: { "768p": 200, "1080p": 350 },
        10: { "768p": 400 },
      },
    };

    const variant = isPro ? "pro" : "standard";
    const credits = creditsMap[variant]?.[duration]?.[resolution];

    if (!credits) {
      throw new Error(
        `Hailuo 2.3 unsupported billing combination: duration=${duration}, resolution=${resolution}`
      );
    }

    return credits;
  }
}
