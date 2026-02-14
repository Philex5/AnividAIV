/**
 * Nano Banana Pro Adapter
 * Handles nano-banana-pro model API calls
 * Supports both text2img and img2img with unified model
 */

import { BaseAdapter } from './base-adapter';
import type { GenerationParams, TaskCreationResult, TaskQueryResult } from '@/types/kie-ai-provider';

interface NanoBananaProCreateResponse {
  code: number;
  message?: string;
  data?: {
    taskId: string;
  };
}

interface NanoBananaProQueryResponse {
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

export class NanoBananaProAdapter extends BaseAdapter {
  private readonly createEndpoint = '/api/v1/jobs/createTask';
  private readonly queryEndpoint = '/api/v1/jobs/recordInfo';

  async createTask(params: GenerationParams, callbackUrl: string): Promise<TaskCreationResult> {
    const modelName = 'nano-banana-pro';

    const inputParams: Record<string, any> = {
      prompt: params.prompt,
      output_format: 'png',
      // 使用 aspect_ratio 参数（从 image_size 改名而来）
      aspect_ratio: this.mapAspectRatio(params.aspect_ratio),
      // 新增：resolution参数，nano-banana-pro特有（需要大写K）
      resolution: this.mapResolution(params.image_resolution || '2k'),
    };

    // 添加参考图片（支持图生图模式）
    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      inputParams.image_input = params.reference_image_urls;
    }

    const requestBody = {
      model: modelName,
      callBackUrl: callbackUrl,
      input: inputParams,
    };

    console.log('[NanoBananaProAdapter] Creating task with params:', {
      model: modelName,
      aspect_ratio: params.aspect_ratio,
      resolution: inputParams.resolution,
      has_reference_image: !!params.reference_image_urls?.length,
    });

    const response = await this.fetchAPI<NanoBananaProCreateResponse>(
      this.buildApiUrl(this.createEndpoint),
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }
    );

    if (response.code !== 200 || !response.data?.taskId) {
      throw new Error(`Failed to create Nano Banana Pro task: ${(response as any)?.message || 'Unknown error'}`);
    }

    return { taskId: response.data.taskId };
  }

  async queryTask(taskId: string): Promise<TaskQueryResult> {
    const url = this.buildApiUrl(`${this.queryEndpoint}?taskId=${taskId}`);

    const response = await this.fetchAPI<NanoBananaProQueryResponse>(url, {
      method: 'GET',
    });

    if (response.code !== 200 || !response.data) {
      throw new Error(`Failed to query Nano Banana Pro task: ${(response as any)?.message || 'Unknown error'}`);
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
    // nano-banana-pro uses aspect_ratio parameter
    // "auto" is not supported by nano-banana-pro
    if (aspectRatio === 'auto') {
      throw new Error('nano-banana-pro does not support "auto" aspect ratio');
    }

    // Supported: "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "16:9", "9:16", "21:9"
    return aspectRatio;
  }

  /**
   * Map resolution to nano-banana-pro format (ensure uppercase K)
   * @param resolution - Resolution value (e.g., "1k", "2k", "4k")
   * @returns Resolution with uppercase K (e.g., "1K", "2K", "4K")
   */
  protected mapResolution(resolution: string): string {
    // Ensure resolution uses uppercase K
    if (resolution) {
      return resolution.toUpperCase();
    }
    return '2K';
  }

  /**
   * Normalize Nano Banana Pro state to standard TaskState
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
