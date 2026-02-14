// 角色生图服务类型定义

import type { BaseGenerationRequest } from '../base/generation-types';
import type { Character } from '@/models/character';

export interface CharacterGenerationRequest extends BaseGenerationRequest {
  character_data: Character;
  art_style?: string;
  gen_type: 'avatar' | 'character' | 'profile' | 'full_body';
  prompt?: string;
  reference_image_urls?: string[];
}

export interface CharacterPromptBuilderParams {
  character_data: Character;
  art_style?: string;
  gen_type: 'avatar' | 'character' | 'profile' | 'full_body';
  addQualityTerms?: boolean;
}

export interface CharacterPromptTemplate {
  basic_template: string;
  avatar_template: string;
  character_template: string;
}
