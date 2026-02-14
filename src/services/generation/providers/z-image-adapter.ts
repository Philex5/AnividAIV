/**
 * Z-Image Adapter
 * Handles z-image model API calls
 * Supports text-to-image only, no reference image support
 */

import { BaseAdapter } from './base-adapter';
import type { GenerationParams, TaskCreationResult, TaskQueryResult } from '@/types/kie-ai-provider';

interface ZImageCreateResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface ZImageQueryResponse {
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

export class ZImageAdapter extends BaseAdapter {
  private readonly createEndpoint = '/api/v1/jobs/createTask';
  private readonly queryEndpoint = '/api/v1/jobs/recordInfo';

  async createTask(params: GenerationParams, callbackUrl: string): Promise<TaskCreationResult> {
    // z-image only supports text-to-image, no reference images
    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      throw new Error('Z-Image model does not support reference images. Please use a text-to-image model like nano-banana or seedream instead.');
    }

    const inputParams: Record<string, any> = {
      prompt: params.prompt,
      aspect_ratio: this.mapAspectRatio(params.aspect_ratio),
    };

    const requestBody = {
      model: 'z-image',
      callBackUrl: callbackUrl,
      input: inputParams,
    };

    const response = await this.fetchAPI<ZImageCreateResponse>(
      this.buildApiUrl(this.createEndpoint),
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }
    );

    if (response.code !== 200 || !response.data?.taskId) {
      throw new Error(`Failed to create Z-Image task: ${(response as any)?.message || 'Unknown error'}`);
    }

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<TaskQueryResult> {
    const url = this.buildApiUrl(`${this.queryEndpoint}?taskId=${taskId}`);

    const response = await this.fetchAPI<ZImageQueryResponse>(url, {
      method: 'GET',
    });

    if (response.code !== 200 || !response.data) {
      throw new Error(`Failed to query Z-Image task: ${(response as any)?.message || 'Unknown error'}`);
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
    // z-image supports: 1:1, 4:3, 3:4, 16:9, 9:16, default: 1:1
    const validRatios = ['1:1', '4:3', '3:4', '16:9', '9:16'];
    if (validRatios.includes(aspectRatio)) {
      return aspectRatio;
    }
    return '1:1'; // default
  }

  /**
   * Normalize Z-Image state to standard TaskState
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
