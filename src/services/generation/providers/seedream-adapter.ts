/**
 * Seedream 4.0 Adapter
 * Handles bytedance/seedream-v4-edit model API calls
 */

import { BaseAdapter } from "./base-adapter";
import type {
  GenerationParams,
  TaskCreationResult,
  TaskQueryResult,
} from "@/types/kie-ai-provider";

interface SeedreamCreateResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface SeedreamQueryResponse {
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

export class SeedreamAdapter extends BaseAdapter {
  private readonly createEndpoint = "/api/v1/jobs/createTask";
  private readonly queryEndpoint = "/api/v1/jobs/recordInfo";
  private readonly modelIdImageToImage = "bytedance/seedream-v4-edit";
  private readonly modelIdTextToImage = "bytedance/seedream-v4-text-to-image";

  constructor() {
    super();
  }

  async createTask(
    params: GenerationParams,
    callbackUrl: string
  ): Promise<TaskCreationResult> {
    // 🔧 增强：确保image_resolution是有效值
    let imageResolution = params.image_resolution;
    if (
      !imageResolution ||
      typeof imageResolution !== "string" ||
      imageResolution.trim() === ""
    ) {
      imageResolution = "2K"; // 兜底默认值
      console.log("[SeedreamAdapter] image_resolution无效，使用默认值: 2K");
    }

    // 🔍 增强：aspect_ratio映射调试
    const aspectRatio = params.aspect_ratio;
    const mappedAspectRatio = this.mapAspectRatio(aspectRatio);
    console.log(
      `[SeedreamAdapter] aspect_ratio映射: ${aspectRatio} -> ${mappedAspectRatio}`
    );

    // 📝 动态选择模型ID：根据是否有参考图像
    const hasReferenceImage =
      params.reference_image_urls && params.reference_image_urls.length > 0;
    const modelId = hasReferenceImage
      ? this.modelIdImageToImage
      : this.modelIdTextToImage;
    console.log(
      `[SeedreamAdapter] 选择模型ID: ${modelId} (${hasReferenceImage ? "图生图" : "文生图"})`
    );

    const inputParams: Record<string, any> = {
      prompt: params.prompt,
      output_format: "png",
      image_size: mappedAspectRatio,
      image_resolution: imageResolution, // 使用增强后的分辨率值
      max_images: params.counts || 1,
    };

    // Add reference images if provided
    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      inputParams.image_urls = params.reference_image_urls;
    }

    const requestBody = {
      model: modelId,
      callBackUrl: callbackUrl,
      input: inputParams,
    };

    console.log(`${requestBody}`);

    const response = await this.fetchAPI<SeedreamCreateResponse>(
      this.buildApiUrl(this.createEndpoint),
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    if (response.code !== 200 || !response.data?.taskId) {
      throw new Error(
        `Failed to create Seedream task: ${(response as any)?.message || "Unknown error"}`
      );
    }

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<TaskQueryResult> {
    const url = this.buildApiUrl(`${this.queryEndpoint}?taskId=${taskId}`);

    const response = await this.fetchAPI<SeedreamQueryResponse>(url, {
      method: "GET",
    });

    if (response.code !== 200 || !response.data) {
      throw new Error(
        `Failed to query Seedream task: ${(response as any)?.message || "Unknown error"}`
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

  protected mapAspectRatio(aspectRatio: string): string {
    // Seedream 4.0 specific aspect ratio mapping
    // Input: standard ratios (1:1, 3:4, etc.) from frontend
    // Output: Seedream specific format (square, portrait_3_4, etc.) for API
    const ratioMap: Record<string, string> = {
      "1:1": "square",
      auto: "square",
      "2:3": "portrait_2_3",
      "3:2": "landscape_3_2",
      "3:4": "portrait_3_4",
      "4:3": "landscape_4_3",
      "9:16": "portrait_9_16",
      "16:9": "landscape_16_9",
      "21:9": "landscape_21_9",
      "4:5": "portrait_4_5",
      "5:4": "landscape_5_4",
    };

    const mappedValue = ratioMap[aspectRatio] || "square";

    // 🔍 增强：添加映射日志和警告
    if (!ratioMap[aspectRatio]) {
      console.warn(
        `[SeedreamAdapter] 未找到aspect_ratio映射: ${aspectRatio}，使用默认值: square`
      );
    }

    return mappedValue;
  }

  /**
   * Normalize Seedream state to standard TaskState
   */
  private normalizeState(
    state: string
  ): "waiting" | "queuing" | "generating" | "success" | "fail" {
    const lowerState = state.toLowerCase();

    if (lowerState === "success") return "success";
    if (lowerState === "fail" || lowerState === "failed") return "fail";
    if (lowerState === "generating" || lowerState === "processing")
      return "generating";
    if (lowerState === "queuing") return "queuing";
    if (lowerState === "waiting") return "waiting";

    return "waiting";
  }
}
