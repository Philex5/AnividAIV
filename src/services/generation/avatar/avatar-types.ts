// Avatar 生图服务类型定义

import type { BaseGenerationRequest } from '../base/generation-types';

export interface AvatarGenerationRequest extends BaseGenerationRequest {
  reference_image_urls: string[]; // 必需的参考图片数组
   gen_type?: string;
}

export interface AvatarPromptBuilderParams {
  reference_image_urls: string[];
  addQualityTerms?: boolean;
}
