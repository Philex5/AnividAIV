/**
 * Video Provider Type Definitions
 * 独立的视频生成参数系统，不影响现有图片生成
 */

export interface VideoTaskCreationResult {
  taskId: string;
}

export type VideoTaskState =
  | "waiting"
  | "queuing"
  | "generating"
  | "success"
  | "fail";

export interface VideoTaskQueryResult {
  taskId: string;
  state: VideoTaskState;
  resultUrls?: string[];
  failMsg?: string;
  failCode?: string;
}

/**
 * 统一的前端视频参数接口
 * 前端使用统一参数，后端Adapter负责转换为模型特定格式
 */
export interface VideoGenerationParams {
  prompt: string;
  model_name: string;
  task_subtype: "text_to_video" | "image_to_video" | "multi_image_to_video";
  video_mode?: "standard" | "start_end_frame" | "multi_shot";

  // 统一的视频参数（前端使用）
  duration_seconds?: number; // 统一使用秒数
  quality?: "standard" | "high"; // 统一质量等级
  mode?: "std" | "pro"; // Kling 3.0 mode
  multi_shots?: boolean; // Kling 3.0 multi-shot switch
  sound?: boolean; // Kling 3.0 sound switch
  multi_prompt?: Array<{
    prompt: string;
    duration: number;
  }>; // Kling 3.0 multi-shot script
  kling_elements?: Array<{
    name: string;
    description: string;
    element_input_urls?: string[];
    element_input_video_urls?: string[];
  }>;
  aspect_ratio?: "1:1" | "9:16" | "16:9" | "portrait" | "landscape"; // 统一比例格式
  resolution?: "480p" | "580p" | "720p" | "768p" | "1080p" | "2k" | "4k"; // 分辨率
  reference_image_urls?: string[]; // 参考图片列表

  // OC角色相关参数（新增）
  character_uuid?: string; // 角色UUID
  character_image_url?: string; // 角色立绘图URL

  // 用户信息
  user_uuid?: string; // 用户UUID，用于权限检查

  // 可选扩展参数
  watermark?: string;
  negative_prompt?: string;
  seed?: number;

  // 原始参数（兼容性）
  counts?: number;
}

/**
 * 模型图片参数配置接口
 */
export interface ModelImageParams {
  max_images: number; // 最大图片数量
  image_field: string; // 使用的图片字段名 (image_url 或 image_urls 或 imageUrl)
  oc_reference_priority: "oc_first" | "reference_first" | "combine"; // OC和参考图优先级
  supports_oc_and_reference: boolean; // 是否支持OC和参考图同时使用
  multi_image_enabled?: boolean; // 是否支持多图传入
}

/**
 * 视频模型基础适配器抽象类
 */
export abstract class VideoBaseAdapter {
  protected readonly baseUrl = "https://api.kie.ai";

  /**
   * 创建视频生成任务
   */
  abstract createTask(
    params: VideoGenerationParams,
    callbackUrl: string
  ): Promise<VideoTaskCreationResult>;

  /**
   * 查询任务状态
   */
  abstract queryTask(taskId: string): Promise<VideoTaskQueryResult>;

  /**
   * 计算积分费用 - 每个模型实现自己的计费逻辑
   */
  abstract calculateCredits(params: VideoGenerationParams): number;

  /**
   * 获取支持的API端点
   */
  protected abstract getCreateEndpoint(): string;
  protected abstract getQueryEndpoint(): string;

  /**
   * 标准化状态映射
   */
  protected normalizeState(state: string): VideoTaskState {
    const lower = state.toLowerCase();
    if (lower === "success" || lower === "succeeded") return "success";
    if (lower === "fail" || lower === "failed") return "fail";
    if (lower === "generating" || lower === "processing") return "generating";
    if (lower === "queuing") return "queuing";
    return "waiting";
  }

  /**
   * Sleep helper for retry delays
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable (network/timeout errors)
   */
  private isRetryableError(error: any): boolean {
    // Network errors that should be retried
    const retryableErrors = [
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ECONNREFUSED",
    ];

    if (error.cause?.code) {
      return retryableErrors.includes(error.cause.code);
    }

    if (error.code) {
      return retryableErrors.includes(error.code);
    }

    // TypeError: fetch failed is also retryable
    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      return true;
    }

    return false;
  }

  /**
   * 通用API请求方法 - 带超时控制和重试机制
   */
  protected async fetchAPI<T>(
    url: string,
    options: RequestInit,
    timeout: number = 30000, // 30 seconds default
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const method = (options.method || "GET").toUpperCase();
        let requestPayload: unknown = undefined;

        if (typeof options.body === "string") {
          try {
            requestPayload = JSON.parse(options.body);
          } catch {
            requestPayload = options.body;
          }
        } else if (options.body) {
          requestPayload = options.body;
        }

        // Debug: print final request payload sent to KIE.
        console.log("[VideoAPI] Final KIE request params:", {
          url,
          method,
          payload: requestPayload,
        });

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.KIE_AI_API_KEY}`,
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const errorMsg = `KieAI Video API error: ${response.status} - ${errorText}`;
          console.error(`[VideoAPI] HTTP error:`, {
            url,
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          throw new Error(errorMsg);
        }

        const result = await response.json();
        return result;
      } catch (error: any) {
        lastError = error;

        // Log error details
        console.error(`[VideoAPI] Request failed on attempt ${attempt + 1}:`, {
          url,
          error: error.message,
          code: error.code || error.cause?.code,
          type: error.constructor.name,
          isRetryable: this.isRetryableError(error),
        });

        // Don't retry on HTTP errors (they are returned as successful responses but !ok)
        // Only retry on network/timeout errors
        if (!this.isRetryableError(error)) {
          console.error("[VideoAPI] Non-retryable error, aborting");
          throw error;
        }

        // If we've exhausted retries, throw the error
        if (attempt === maxRetries) {
          console.error(
            `[VideoAPI] Max retries (${maxRetries}) exceeded, giving up`
          );
          throw error;
        }

        // Exponential backoff: 2^attempt * 1000ms (1s, 2s, 4s)
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[VideoAPI] Retrying in ${backoffMs}ms...`);
        await this.sleep(backoffMs);
      }
    }

    // Should never reach here, but TypeScript requires it
    throw lastError;
  }
}
