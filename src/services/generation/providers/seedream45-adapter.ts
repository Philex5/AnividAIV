/**
 * Seedream 4.5 Adapter
 * Handles seedream/4.5-edit and seedream/4.5-text-to-image model API calls
 * Premium model with quality options (basic=2K, high=4K)
 */

import { BaseAdapter } from "./base-adapter";
import type {
  GenerationParams,
  TaskCreationResult,
  TaskQueryResult,
} from "@/types/kie-ai-provider";

interface Seedream45CreateResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface Seedream45QueryResponse {
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

export class Seedream45Adapter extends BaseAdapter {
  private readonly createEndpoint = "/api/v1/jobs/createTask";
  private readonly queryEndpoint = "/api/v1/jobs/recordInfo";
  private readonly modelIdImageToImage = "seedream/4.5-edit";
  private readonly modelIdTextToImage = "seedream/4.5-text-to-image";

  constructor() {
    super();
  }

  async createTask(
    params: GenerationParams,
    callbackUrl: string
  ): Promise<TaskCreationResult> {
    // Quality parameter: basic=2K, high=4K
    let quality = params.quality;
    if (!quality || !["basic", "high"].includes(quality)) {
      quality = "basic"; // Default to basic (2K)
      console.log("[Seedream45Adapter] quality invalid, using default: basic");
    }

    // Aspect ratio mapping
    const aspectRatio = params.aspect_ratio;
    const mappedAspectRatio = this.mapAspectRatio(aspectRatio);

    // Dynamic model selection based on reference image presence
    const hasReferenceImage =
      params.reference_image_urls && params.reference_image_urls.length > 0;
    const modelId = hasReferenceImage
      ? this.modelIdImageToImage
      : this.modelIdTextToImage;

    const inputParams: Record<string, any> = {
      prompt: params.prompt,
      aspect_ratio: mappedAspectRatio,
      quality: quality,
    };

    // Add reference images if provided (up to 14 images)
    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      inputParams.image_urls = params.reference_image_urls.slice(0, 14);
    }

    const requestBody = {
      model: modelId,
      callBackUrl: callbackUrl,
      input: inputParams,
    };
    const response = await this.fetchAPI<Seedream45CreateResponse>(
      this.buildApiUrl(this.createEndpoint),
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    if (response.code !== 200 || !response.data?.taskId) {
      throw new Error(
        `Failed to create Seedream 4.5 task: ${(response as any)?.message || "Unknown error"}`
      );
    }

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<TaskQueryResult> {
    const url = this.buildApiUrl(`${this.queryEndpoint}?taskId=${taskId}`);

    const response = await this.fetchAPI<Seedream45QueryResponse>(url, {
      method: "GET",
    });

    if (response.code !== 200 || !response.data) {
      throw new Error(
        `Failed to query Seedream 4.5 task: ${(response as any)?.message || "Unknown error"}`
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
   * Map aspect ratio to Seedream 4.5 format
   * Seedream 4.5 uses standard ratio format: 1:1, 4:3, 3:4, 16:9, 9:16, 2:3, 3:2, 21:9
   */
  protected mapAspectRatio(aspectRatio: string): string {
    const supportedRatios = [
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "2:3",
      "3:2",
      "21:9",
    ];

    if (supportedRatios.includes(aspectRatio)) {
      return aspectRatio;
    }

    // Map non-standard ratios to closest supported
    const ratioMap: Record<string, string> = {
      auto: "1:1",
      "4:5": "3:4",
      "5:4": "4:3",
    };

    const mappedValue = ratioMap[aspectRatio] || "1:1";

    if (!ratioMap[aspectRatio] && !supportedRatios.includes(aspectRatio)) {
      console.warn(
        `[Seedream45Adapter] Unsupported aspect_ratio: ${aspectRatio}, using default: 1:1`
      );
    }

    return mappedValue;
  }

  /**
   * Normalize Seedream 4.5 state to standard TaskState
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
