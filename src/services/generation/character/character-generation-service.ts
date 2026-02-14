/**
 * Character Generation Service
 * 专门处理角色生图业务逻辑
 */

import { BaseGenerationService } from "../base/base-generation-service";
import { CharacterPromptBuilder } from "./character-prompt-builder";
import { ValidationResult } from "../base/generation-types";
import { getResolutionConfig } from "@/configs/generation/resolution-configs";
import { ThumbnailConfig } from "@/types/storage";
import type { CharacterGenerationRequest } from "./character-types";
import { findGenerationByRemoteTaskId } from "@/models/generation";
import { getGenerationImagesByGenerationUuid } from "@/models/generation-image";
import { updateCharacter } from "@/models/character";

export class CharacterGenerationService extends BaseGenerationService<CharacterGenerationRequest> {
  /**
   * 验证角色生图参数
   */
  protected async validateGenerationParams(
    params: CharacterGenerationRequest
  ): Promise<ValidationResult> {
    const result = new ValidationResult(true);

    // 验证角色数据
    if (!params.character_data) {
      result.addError("Character data is required");
      return result;
    }

    // 验证角色数据完整性
    const characterValidation = CharacterPromptBuilder.validateCharacterData(
      params.character_data
    );
    if (!characterValidation.valid) {
      characterValidation.errors.forEach((error) => result.addError(error));
    }

    // 验证生成模式
    if (
      !params.gen_type ||
      !["avatar", "character", "profile", "full_body"].includes(params.gen_type)
    ) {
      result.addError(
        'Invalid generation mode. Must be "avatar", "character", "profile", or "full_body"'
      );
    }

    // 验证基础参数
    if (!params.model_id) {
      result.addError("Model ID is required");
    }

    if (!params.aspect_ratio) {
      result.addError("Aspect ratio is required");
    }

    if (params.counts < 1 || params.counts > 4) {
      result.addError("Image count must be between 1 and 4");
    }

    // 验证艺术风格（如果提供）
    if (params.art_style) {
      const isValidStyle = await this.validateArtStyle(params.art_style);
      if (!isValidStyle) {
        result.addError(`Invalid art style: ${params.art_style}`);
      }
    }

    return result;
  }

  /**
   * 构建完整的角色生图提示词
   */
  protected async buildFullPrompt(
    params: CharacterGenerationRequest
  ): Promise<string> {
    if (params.prompt && params.prompt.trim()) {
      return params.prompt.trim();
    }
    const promptParams = {
      character_data: params.character_data,
      art_style: params.art_style,
      gen_type: params.gen_type,
      addQualityTerms: false,
    };

    let fullPrompt = await CharacterPromptBuilder.buildPrompt(promptParams);

    // 清理和标准化提示词
    fullPrompt = CharacterPromptBuilder.sanitizePrompt(fullPrompt);

    return fullPrompt;
  }

  /**
   * 获取生成类型
   */
  protected getGenerationType(): string {
    return "character";
  }

  protected getPrimaryGenerationType(
    _params: CharacterGenerationRequest
  ): string {
    return "character";
  }

  protected getGenerationSubType(
    params: CharacterGenerationRequest
  ): string {
    if (params.gen_type === "avatar") {
      return "avatar";
    }
    if (params.gen_type === "full_body") {
      return "full_body";
    }
    if (params.gen_type === "profile") {
      return "full_body";
    }
    return "full_body";
  }

  /**
   * 从请求中提取基础提示词（角色名称）
   */
  protected extractPrompt(params: CharacterGenerationRequest): string {
    return params.prompt?.trim() || params.character_data.name || "character";
  }

  /**
   * 从请求中提取样式预设（艺术风格）
   */
  protected extractStylePreset(
    params: CharacterGenerationRequest
  ): string | undefined {
    return params.art_style;
  }

  /**
   * 从请求中提取生成类型
   */
  protected extractGenType(
    params: CharacterGenerationRequest
  ): string | undefined {
    return params.gen_type;
  }

  /**
   * 从请求中提取参考图片URL
   */
  protected extractReferenceImageUrl(
    params: CharacterGenerationRequest
  ): string | string[] | undefined {
    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      return params.reference_image_urls;
    }
    return undefined;
  }

  /**
   * 获取角色生图的分辨率配置
   */
  protected getResolutionConfig(): ThumbnailConfig[] {
    return getResolutionConfig("character");
  }

  // ========== 私有辅助方法 ==========

  /**
   * 验证艺术风格是否存在
   */
  private async validateArtStyle(styleId: string): Promise<boolean> {
    try {
      // 这里可以加载配置文件验证艺术风格是否存在
      // 暂时返回 true，实际实现需要查询配置
      return true;
    } catch (error) {
      console.warn(`Failed to validate art style ${styleId}:`, error);
      return false;
    }
  }

  /**
   * 获取角色生成历史（可以添加角色特定的筛选逻辑）
   */
  async getCharacterGenerationHistory(
    userUuid: string,
    characterUuid?: string,
    options: { limit?: number; page?: number } = {}
  ) {
    const history = await this.getUserGenerationHistory(userUuid, options);

    // 如果指定了角色UUID，可以进一步筛选
    if (characterUuid) {
      // 这里可以添加基于角色UUID的筛选逻辑
      // 需要在数据库中存储character_uuid字段或通过其他方式关联
    }

    return history;
  }
}

// 导出单例实例
export const characterGenerationService = new CharacterGenerationService();
