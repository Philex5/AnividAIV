/**
 * Flux 2 Flex Adapter
 * Handles flux-2/flex-text-to-image and flux-2/flex-image-to-image model API calls
 */

import { BaseAdapter } from "./base-adapter";
import type {
  GenerationParams,
  TaskCreationResult,
  TaskQueryResult,
} from "@/types/kie-ai-provider";

interface Flux2FlexCreateResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface Flux2FlexQueryResponse {
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

export class Flux2FlexAdapter extends BaseAdapter {
  private readonly createEndpoint = "/api/v1/jobs/createTask";
  private readonly queryEndpoint = "/api/v1/jobs/recordInfo";
  private readonly modelIdImageToImage = "flux-2/flex-image-to-image";
  private readonly modelIdTextToImage = "flux-2/flex-text-to-image";

  async createTask(
    params: GenerationParams,
    callbackUrl: string
  ): Promise<TaskCreationResult> {
    const hasReferenceImage =
      params.reference_image_urls && params.reference_image_urls.length > 0;
    const modelId = hasReferenceImage
      ? this.modelIdImageToImage
      : this.modelIdTextToImage;

    const inputParams: Record<string, any> = {
      prompt: params.prompt,
      aspect_ratio: this.mapAspectRatio(params.aspect_ratio),
      resolution: this.mapResolution(params.image_resolution),
    };

    if (hasReferenceImage) {
      inputParams.input_urls = params.reference_image_urls!.slice(0, 8);
    }

    const requestBody = {
      model: modelId,
      callBackUrl: callbackUrl,
      input: inputParams,
    };

    const response = await this.fetchAPI<Flux2FlexCreateResponse>(
      this.buildApiUrl(this.createEndpoint),
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    if (response.code !== 200 || !response.data?.taskId) {
      throw new Error(
        `Failed to create Flux 2 Flex task: ${(response as any)?.message || "Unknown error"}`
      );
    }

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<TaskQueryResult> {
    const url = this.buildApiUrl(`${this.queryEndpoint}?taskId=${taskId}`);

    const response = await this.fetchAPI<Flux2FlexQueryResponse>(url, {
      method: "GET",
    });

    if (response.code !== 200 || !response.data) {
      throw new Error(
        `Failed to query Flux 2 Flex task: ${(response as any)?.message || "Unknown error"}`
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
    const supportedRatios = [
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "2:3",
      "3:2",
      "auto",
    ];

    if (!supportedRatios.includes(aspectRatio)) {
      throw new Error(`Unsupported Flux 2 Flex aspect ratio: ${aspectRatio}`);
    }

    return aspectRatio;
  }

  private mapResolution(resolution?: string): string {
    if (!resolution) {
      return "1K";
    }

    const normalized = resolution.toUpperCase();
    if (normalized !== "1K" && normalized !== "2K") {
      throw new Error(`Unsupported Flux 2 Flex resolution: ${resolution}`);
    }

    return normalized;
  }

  private normalizeState(
    state: string
  ): "waiting" | "queuing" | "generating" | "success" | "fail" {
    const lowerState = state.toLowerCase();

    if (lowerState === "success") return "success";
    if (lowerState === "fail" || lowerState === "failed") return "fail";
    if (lowerState === "generating" || lowerState === "processing") {
      return "generating";
    }
    if (lowerState === "queuing") return "queuing";
    if (lowerState === "waiting") return "waiting";

    return "waiting";
  }
}
