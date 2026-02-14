/**
 * Nano Banana Adapter
 * Handles google/nano-banana and google/nano-banana-edit model API calls
 */

import { BaseAdapter } from './base-adapter';
import type { GenerationParams, TaskCreationResult, TaskQueryResult } from '@/types/kie-ai-provider';

interface NanoBananaCreateResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface NanoBananaQueryResponse {
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

export class NanoBananaAdapter extends BaseAdapter {
  private readonly createEndpoint = '/api/v1/jobs/createTask';
  private readonly queryEndpoint = '/api/v1/jobs/recordInfo';
  private readonly isEditMode: boolean;

  constructor(isEditMode: boolean = false) {
    super();
    this.isEditMode = isEditMode;
  }

  async createTask(params: GenerationParams, callbackUrl: string): Promise<TaskCreationResult> {
    const modelName = this.isEditMode ? 'google/nano-banana-edit' : 'google/nano-banana';

    if (!params.prompt || typeof params.prompt !== 'string' || params.prompt.trim() === '') {
      throw new Error('Invalid request: prompt is required');
    }

    const referenceImages = Array.isArray(params.reference_image_urls)
      ? params.reference_image_urls.filter(Boolean)
      : [];

    if (this.isEditMode && referenceImages.length === 0) {
      throw new Error('Invalid request: input.image_urls is required for google/nano-banana-edit');
    }

    const inputParams: Record<string, any> = {
      prompt: params.prompt,
      output_format: 'png',
      image_size: this.mapAspectRatio(params.aspect_ratio),
    };

    // Add reference image if provided (edit mode requires it, regular mode accepts it)
    if (referenceImages.length > 0) {
      inputParams.image_urls = referenceImages;
    }

    const requestBody = {
      model: modelName,
      callBackUrl: callbackUrl,
      input: inputParams,
    };

    const response = await this.fetchAPI<NanoBananaCreateResponse>(
      this.buildApiUrl(this.createEndpoint),
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }
    );

    if (response.code !== 200 || !response.data?.taskId) {
      throw new Error(`Failed to create Nano Banana task: ${(response as any)?.message || 'Unknown error'}`);
    }

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<TaskQueryResult> {
    const url = this.buildApiUrl(`${this.queryEndpoint}?taskId=${taskId}`);

    const response = await this.fetchAPI<NanoBananaQueryResponse>(url, {
      method: 'GET',
    });

    if (response.code !== 200 || !response.data) {
      throw new Error(`Failed to query Nano Banana task: ${(response as any)?.message || 'Unknown error'}`);
    }

    const { data } = response;

    let resultUrls: string[] | undefined;
    if (data.resultJson) {
      try {
        const resultObj = JSON.parse(data.resultJson);
        resultUrls = resultObj.resultUrls;
      } catch (error) {
        console.error('Failed to parse resultJson:', error);
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
    // nano-banana uses image_size parameter: "auto" or a ratio string (e.g., "2:3")
    const normalized = typeof aspectRatio === 'string' ? aspectRatio.trim() : '';
    if (!normalized) return 'auto';

    const allowed = new Set([
      'auto',
      '1:1',
      '2:3',
      '3:2',
      '3:4',
      '4:3',
      '4:5',
      '5:4',
      '16:9',
      '9:16',
      '21:9',
    ]);

    return allowed.has(normalized) ? normalized : 'auto';
  }

  /**
   * Normalize Nano Banana state to standard TaskState
   */
  private normalizeState(state: string): 'waiting' | 'queuing' | 'generating' | 'success' | 'fail' {
    const lowerState = state.toLowerCase();

    if (lowerState === 'success') return 'success';
    if (lowerState === 'fail' || lowerState === 'failed') return 'fail';
    if (lowerState === 'generating' || lowerState === 'processing') return 'generating';
    if (lowerState === 'queuing') return 'queuing';
    if (lowerState === 'waiting') return 'waiting';

    return 'waiting';
  }
}
