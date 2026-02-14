// 动漫生图服务类型定义

import type { BaseGenerationRequest } from '../base/generation-types';

export interface AnimeGenerationRequest extends BaseGenerationRequest {
  prompt: string;
  style_preset?: string;
  scene_preset?: string;
  action_preset?: string;
  outfit_preset?: string;
  reference_image_urls?: string[];
  character_uuids?: string[]; // 新增：角色UUID列表
  gen_type?: string;
}

export interface AnimePromptBuilderParams {

  prompt: string;

  style_preset?: string;

  scene_preset?: string;

  action_preset?: string;

  outfit_preset?: string;

  character_uuids?: string[]; // 新增：角色UUID列表

  addQualityTerms?: boolean;

  gen_type?: string;

}
