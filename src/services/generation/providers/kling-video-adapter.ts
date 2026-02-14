/**
 * Kling Video Adapter
 * 处理Kling视频模型，包含参数转换和计费逻辑
 */

import {
  VideoBaseAdapter,
  VideoGenerationParams,
  VideoTaskCreationResult,
  VideoTaskQueryResult,
} from "@/types/video-provider";
import aiModelsConfig from "@/configs/models/ai-models.json";

interface KlingCreateResponse {
  code: number;
  msg?: string;
  message?: string;
  data?: {
    taskId: string;
    failMsg?: string;
    failCode?: string;
  };
}

interface KlingQueryResponse {
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

interface Kling30CreditsMapping {
  billing_type?: string;
  mc_per_second?: {
    std?: {
      no_audio?: number;
      with_audio?: number;
    };
    pro?: {
      no_audio?: number;
      with_audio?: number;
    };
  };
}

export class KlingVideoAdapter extends VideoBaseAdapter {
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
    if (this.isKling30Model(params.model_name)) {
      const imageUrls = this.getKling30ImageUrls(params);
      const videoMode = this.resolveKling30VideoMode(params);
      const isStartEndFrameMode = videoMode === "start_end_frame";
      const multiShotsEnabled = videoMode === "multi_shot";
      const resolvedSound = multiShotsEnabled ? true : (params.sound ?? false);
      const duration = this.resolveKling30Duration(params.duration_seconds);
      const prompt = (params.prompt || "").trim();

      if (!multiShotsEnabled && !prompt) {
        throw new Error(
          "Kling 3.0 prompt is required when multi_shots is disabled",
        );
      }

      if (isStartEndFrameMode && params.character_image_url) {
        throw new Error(
          "Kling 3.0 start_end_frame mode does not support OC input",
        );
      }

      if (multiShotsEnabled && imageUrls.length > 1) {
        throw new Error("Kling 3.0 multi_shots supports only 1 image");
      }
      if (multiShotsEnabled && imageUrls.length < 1) {
        throw new Error("Kling 3.0 multi_shots requires a start frame image");
      }

      let multiPrompt = params.multi_prompt;
      if (multiShotsEnabled) {
        if (!multiPrompt || multiPrompt.length === 0) {
          multiPrompt = [{ prompt: prompt || "Cinematic scene", duration }];
        }
        const invalidDuration = multiPrompt.find(
          (item) => item.duration < 3 || item.duration > 12,
        );
        if (invalidDuration) {
          throw new Error(
            "Kling 3.0 multi_prompt duration must be between 3 and 12 seconds",
          );
        }
        const totalDuration = multiPrompt.reduce(
          (sum, item) => sum + item.duration,
          0,
        );
        if (totalDuration < 3 || totalDuration > 15) {
          throw new Error(
            "Kling 3.0 total multi_prompt duration must be between 3 and 15 seconds",
          );
        }
      }

      const requestBody = {
        model: "kling-3.0/video",
        callBackUrl: callbackUrl,
        input: {
          ...(!multiShotsEnabled
            ? { prompt: prompt || "Cinematic scene" }
            : {}),
          duration,
          aspect_ratio: this.mapAspectRatioToKling30(params.aspect_ratio),
          mode: this.resolveKling30Mode(params),
          multi_shots: multiShotsEnabled,
          sound: resolvedSound,
          ...(multiShotsEnabled && multiPrompt
            ? { multi_prompt: multiPrompt }
            : {}),
          ...(params.kling_elements
            ? { kling_elements: params.kling_elements }
            : {}),
          ...(imageUrls.length > 0 ? { image_urls: imageUrls } : {}),
        },
      };

      const response = await this.fetchAPI<KlingCreateResponse>(
        `${this.baseUrl}${this.getCreateEndpoint()}`,
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
      );

      if (response.code !== 200 || !response.data?.taskId) {
        console.error("[KlingAdapter] Kling 3.0 createTask failed response", {
          code: (response as any)?.code,
          message: this.extractApiErrorMessage(response),
          response,
        });
        throw new Error(
          `Failed to create Kling 3.0 video task: ${this.extractApiErrorMessage(response)}`,
        );
      }

      return { taskId: response.data.taskId };
    }

    // Kling单图模型: 优先使用OC图，没有OC时使用参考图
    const imageUrl =
      params.character_image_url ||
      (params.reference_image_urls && params.reference_image_urls.length > 0
        ? params.reference_image_urls[0]
        : undefined);

    // 根据是否有图片决定模型名
    const modelName = imageUrl
      ? "kling/v2-5-turbo-image-to-video-pro"
      : "kling/v2-5-turbo-text-to-video-pro";

    const requestBody = {
      model: modelName,
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt,
        // Kling参数 - duration 格式为字符串 "5" 或 "10"
        duration: this.mapDurationToKlingFormat(params.duration_seconds),
        negative_prompt: params.negative_prompt || "",
        cfg_scale: 0.5, // 默认值
        // 图生视频才传image_url
        ...(imageUrl && {
          image_url: imageUrl,
        }),
      },
    };

    console.log("[KlingAdapter] Creating video task:", {
      model_name: params.model_name,
      has_character_image: !!params.character_image_url,
      has_reference_images: !!params.reference_image_urls?.length,
      final_image_url: imageUrl,
      model_name_sent: modelName,
      duration_type: typeof requestBody.input.duration,
      duration_value: requestBody.input.duration,
      request_body: JSON.stringify(requestBody, null, 2),
    });

    const response = await this.fetchAPI<KlingCreateResponse>(
      `${this.baseUrl}${this.getCreateEndpoint()}`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      },
    );

    if (response.code !== 200 || !response.data?.taskId) {
      console.error("[KlingAdapter] Kling createTask failed response", {
        code: (response as any)?.code,
        message: this.extractApiErrorMessage(response),
        response,
      });
      throw new Error(
        `Failed to create Kling video task: ${this.extractApiErrorMessage(response)}`,
      );
    }

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<VideoTaskQueryResult> {
    const url = `${this.baseUrl}${this.getQueryEndpoint()}?taskId=${taskId}`;

    const response = await this.fetchAPI<KlingQueryResponse>(url, {
      method: "GET",
    });

    if (response.code !== 200 || !response.data) {
      console.error("[KlingAdapter] Kling queryTask failed response", {
        code: (response as any)?.code,
        message: this.extractApiErrorMessage(response),
        response,
      });
      throw new Error(
        `Failed to query Kling video task: ${this.extractApiErrorMessage(response)}`,
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
   * Kling计费逻辑：根据时长计算
   * 基于KIE API文档的计费说明
   */
  calculateCredits(params: VideoGenerationParams): number {
    if (this.isKling30Model(params.model_name)) {
      const mode = this.resolveKling30Mode(params);
      const videoMode = this.resolveKling30VideoMode(params);
      const durationSeconds = this.resolveKling30BillingDuration(params);
      const withSound =
        videoMode === "multi_shot"
          ? true
          : typeof params.sound === "boolean"
            ? params.sound
            : false;
      const ratePerSecond = this.getKling30RatePerSecond(mode, withSound);
      // 平台积分（MC）= 配置中的 mc_per_second * duration_seconds
      return ratePerSecond * durationSeconds;
    }

    const duration = this.mapDurationToSeconds(params.duration_seconds);

    // Kling v2.5计费规则：
    // 5s: 210mc, 10s: 420mc
    if (duration <= 5) {
      return 210;
    } else {
      return 420;
    }
  }

  private getKling30RatePerSecond(
    mode: "std" | "pro",
    withSound: boolean,
  ): number {
    const configuredRate = this.getConfiguredKling30McPerSecond(
      mode,
      withSound,
    );
    if (configuredRate && configuredRate > 0) {
      return configuredRate;
    }

    // Fallback：与当前文档口径保持一致（MC/s）
    if (mode === "pro") {
      return withSound ? 120 : 85;
    }
    return withSound ? 90 : 60;
  }

  private getConfiguredKling30McPerSecond(
    mode: "std" | "pro",
    withSound: boolean,
  ): number | undefined {
    const models = (aiModelsConfig as any)?.models;
    if (!Array.isArray(models)) {
      return undefined;
    }

    const kling30Model = models.find(
      (model: any) => model?.model_id === "kling-3.0/video",
    );
    const creditsMapping = kling30Model?.config?.credits_mapping as
      | Kling30CreditsMapping
      | undefined;
    const modeMapping =
      mode === "pro"
        ? creditsMapping?.mc_per_second?.pro
        : creditsMapping?.mc_per_second?.std;

    const value = withSound ? modeMapping?.with_audio : modeMapping?.no_audio;

    return typeof value === "number" ? value : undefined;
  }

  private resolveKling30BillingDuration(params: VideoGenerationParams): number {
    const videoMode = this.resolveKling30VideoMode(params);
    if (videoMode === "multi_shot" && params.multi_prompt?.length) {
      const total = params.multi_prompt.reduce((sum, item) => {
        if (
          !Number.isFinite(item.duration) ||
          item.duration < 3 ||
          item.duration > 12
        ) {
          throw new Error(
            "Kling 3.0 multi_prompt duration must be between 3 and 12 seconds",
          );
        }
        return sum + item.duration;
      }, 0);
      if (!Number.isInteger(total) || total < 3 || total > 15) {
        throw new Error(
          "Kling 3.0 total multi_prompt duration must be an integer between 3 and 15 seconds",
        );
      }
      return total;
    }

    const duration = this.resolveKling30Duration(params.duration_seconds);
    if (!Number.isInteger(duration)) {
      throw new Error("Kling 3.0 duration must be an integer");
    }
    return duration;
  }

  /**
   * 时长映射到Kling格式 - 返回字符串"5"或"10"
   */
  private mapDurationToKlingFormat(seconds?: number): string {
    const duration = this.mapDurationToSeconds(seconds);
    // Kling支持: "5"或"10"（字符串格式）
    if (duration <= 5) return "5";
    return "10";
  }

  /**
   * 规范化时长为秒数
   */
  private mapDurationToSeconds(seconds?: number): number {
    if (!seconds) return 5; // 默认5秒
    return Math.min(Math.max(seconds, 5), 10); // 限制在5-10秒之间
  }

  private isKling30Model(modelName: string): boolean {
    const normalized = modelName.toLowerCase();
    return (
      normalized.includes("kling-3.0/video") ||
      normalized.includes("kling/video-v3.0") ||
      normalized.includes("kling-v3.0")
    );
  }

  private resolveKling30Mode(params: VideoGenerationParams): "std" | "pro" {
    if (params.mode === "std" || params.mode === "pro") {
      return params.mode;
    }
    if (params.quality === "high") {
      return "pro";
    }
    if (params.resolution === "1080p") {
      return "pro";
    }
    return "std";
  }

  private getKling30ImageUrls(params: VideoGenerationParams): string[] {
    const urls: string[] = [];
    if (params.character_image_url) {
      urls.push(params.character_image_url);
    }
    if (params.reference_image_urls?.length) {
      urls.push(...params.reference_image_urls);
    }

    const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
    if (uniqueUrls.length > 2) {
      throw new Error("Kling 3.0 supports up to 2 images");
    }
    const videoMode = this.resolveKling30VideoMode(params);
    if (videoMode === "multi_shot" && uniqueUrls.length > 1) {
      throw new Error("Kling 3.0 multi_shots supports only 1 image");
    }
    return uniqueUrls;
  }

  private resolveKling30VideoMode(
    params: VideoGenerationParams,
  ): "standard" | "start_end_frame" | "multi_shot" {
    if (params.multi_shots === true) {
      return "multi_shot";
    }
    if (
      params.video_mode === "start_end_frame" ||
      params.video_mode === "multi_shot"
    ) {
      return params.video_mode;
    }
    return "standard";
  }

  private resolveKling30Duration(seconds?: number): number {
    if (!seconds) return 5;
    if (seconds < 3 || seconds > 15) {
      throw new Error("Kling 3.0 duration must be between 3 and 15 seconds");
    }
    return seconds;
  }

  private mapAspectRatioToKling30(
    aspectRatio?: VideoGenerationParams["aspect_ratio"],
  ): "1:1" | "9:16" | "16:9" {
    if (
      aspectRatio === "1:1" ||
      aspectRatio === "9:16" ||
      aspectRatio === "16:9"
    ) {
      return aspectRatio;
    }
    if (aspectRatio === "portrait") {
      return "9:16";
    }
    if (aspectRatio === "landscape") {
      return "16:9";
    }
    return "1:1";
  }

  private extractApiErrorMessage(response: unknown): string {
    const res = response as any;
    return (
      res?.message ||
      res?.msg ||
      res?.error ||
      res?.data?.failMsg ||
      "Unknown error"
    );
  }
}
