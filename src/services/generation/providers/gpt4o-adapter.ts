/**
 * GPT-4o Image Adapter
 * Handles gpt-image-1 model API calls
 */

import { BaseAdapter } from './base-adapter';
import type { GenerationParams, TaskCreationResult, TaskQueryResult } from '@/types/kie-ai-provider';

interface GPT4oCreateResponse {
  code: number;
  msg?: string;
  data?: {
    taskId: string;
  };
}

interface GPT4oQueryResponse {
  code: number;
  msg?: string;
  data?: {
    taskId: string;
    state: string;
    response?: {
      resultUrls?: string[];
    };
    errorMessage?: string;
    errorCode?: string;
  };
}

export class GPT4oAdapter extends BaseAdapter {
  private readonly createEndpoint = '/api/v1/gpt4o-image/generate';
  private readonly queryEndpoint = '/api/v1/gpt4o-image/record-info';

  async createTask(params: GenerationParams, callbackUrl: string): Promise<TaskCreationResult> {
    const requestBody = {
      prompt: params.prompt,
      size: this.mapAspectRatio(params.aspect_ratio),
      callBackUrl: callbackUrl,
      filesUrl: params.reference_image_urls && params.reference_image_urls.length > 0
        ? params.reference_image_urls
        : undefined,
      isEnhance: false,
      uploadCn: false,
      nVariants: this.resolveVariantCount(params.counts),
      enableFallback: false,
    };

    const response = await this.fetchAPI<GPT4oCreateResponse>(
      this.buildApiUrl(this.createEndpoint),
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }
    );

    if (response.code !== 200 || !response.data?.taskId) {
      throw new Error(`Failed to create GPT-4o task: ${response.msg || 'Unknown error'}`);
    }

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<TaskQueryResult> {
    const url = this.buildApiUrl(`${this.queryEndpoint}?taskId=${taskId}`);

    const response = await this.fetchAPI<GPT4oQueryResponse>(url, {
      method: 'GET',
    });

    if (response.code !== 200 || !response.data) {
      throw new Error(`Failed to query GPT-4o task: ${response.msg || 'Unknown error'}`);
    }

    const { data } = response;

    return {
      taskId: data.taskId,
      state: this.normalizeState(data.state),
      resultUrls: data.response?.resultUrls,
      failMsg: data.errorMessage,
      failCode: data.errorCode,
    };
  }

  protected mapAspectRatio(aspectRatio: string): string {
    // gpt-image-1 only supports: "1:1", "2:3", "3:2"
    const supportedRatios = ['1:1', '2:3', '3:2'];

    // If already supported, return as-is
    if (supportedRatios.includes(aspectRatio)) {
      return aspectRatio;
    }

    // Map unsupported ratios to closest supported ratio
    const ratioMap: Record<string, string> = {
      '3:4': '2:3',     // 0.75 -> 0.667 (closest portrait)
      '4:3': '3:2',     // 1.333 -> 1.5 (closest landscape)
      '16:9': '3:2',    // 1.778 -> 1.5 (closest landscape)
      '9:16': '2:3',    // 0.5625 -> 0.667 (closest portrait)
    };

    const mappedRatio = ratioMap[aspectRatio];
    if (mappedRatio) {
      console.warn(
        `[GPT4oAdapter] Unsupported aspect_ratio "${aspectRatio}" mapped to "${mappedRatio}"`
      );
      return mappedRatio;
    }

    // Fallback to 1:1 for unknown ratios
    console.warn(
      `[GPT4oAdapter] Unknown aspect_ratio "${aspectRatio}", falling back to "1:1"`
    );
    return '1:1';
  }

  /**
   * Normalize GPT-4o state to standard TaskState
   */
  private normalizeState(state: string): 'waiting' | 'queuing' | 'generating' | 'success' | 'fail' {
    const upperState = state.toUpperCase();

    if (upperState === 'SUCCESS') return 'success';
    if (upperState === 'FAIL' || upperState === 'FAILED') return 'fail';
    if (upperState === 'GENERATING' || upperState === 'PROCESSING') return 'generating';
    if (upperState === 'QUEUING') return 'queuing';

    return 'waiting';
  }

  private resolveVariantCount(requestedCount?: number): number {
    if (typeof requestedCount !== 'number' || Number.isNaN(requestedCount)) {
      return 1;
    }

    // GPT-4o image generation currently supports 1-4 variants
    return Math.min(Math.max(Math.round(requestedCount), 1), 4);
  }
}
