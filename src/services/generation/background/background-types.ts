import type { BaseGenerationRequest } from '../base/generation-types';

export interface BackgroundGenerationRequest extends BaseGenerationRequest {
  scene_description: string;
  style?: string;
  reference_image_urls?: string[];
  gen_type?: 'background';
}

export interface BackgroundPromptBuilderParams {
  scene_description: string;
  style?: string;
  addQualityTerms?: boolean;
}
