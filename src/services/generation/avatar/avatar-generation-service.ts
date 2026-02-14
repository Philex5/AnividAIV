/**
 * Avatar Generation Service
 * 专门处理头像生图业务逻辑
 * 特点：基于参考图片生成多种分辨率的头像
 */

import { BaseGenerationService } from "../base/base-generation-service";
import { AvatarPromptBuilder } from "./avatar-prompt-builder";
import { ValidationResult } from "../base/generation-types";
import { getResolutionConfig } from "@/configs/generation/resolution-configs";
import { ThumbnailConfig } from "@/types/storage";
import type { AvatarGenerationRequest } from "./avatar-types";

export class AvatarGenerationService extends BaseGenerationService<AvatarGenerationRequest> {
  /**
   * 验证头像生图参数
   */
  protected async validateGenerationParams(
    params: AvatarGenerationRequest
  ): Promise<ValidationResult> {
    const result = new ValidationResult(true);

    // 验证角色数据和参考图片
    const avatarValidation = AvatarPromptBuilder.validateAvatarParams({
      reference_image_urls: params.reference_image_urls,
    });

    if (!avatarValidation.valid) {
      avatarValidation.errors.forEach((error) => result.addError(error));
    }

    // 验证基础参数
    if (!params.model_id) {
      result.addError("Model ID is required");
    }

    if (!params.aspect_ratio) {
      result.addError("Aspect ratio is required");
    }

    // 头像生成固定为1张图片
    if (params.counts !== 1) {
      result.addError("Avatar generation must have counts = 1");
    }

    // 验证参考图片URL格式
    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      for (const url of params.reference_image_urls) {
        try {
          new URL(url);
        } catch {
          result.addError(`Invalid reference image URL format: ${url}`);
        }
      }
    }

    return result;
  }

  /**
   * 构建完整的头像生图提示词
   */
  protected async buildFullPrompt(
    params: AvatarGenerationRequest
  ): Promise<string> {
    const promptParams = {
      reference_image_urls: params.reference_image_urls,
      addQualityTerms: false,
    };

    let fullPrompt = AvatarPromptBuilder.buildPrompt(promptParams);

    // 清理和优化头像提示词
    fullPrompt = AvatarPromptBuilder.sanitizeAvatarPrompt(fullPrompt);

    // 最终长度检查
    if (fullPrompt.length > 2000) {
      throw new Error("Generated avatar prompt too long");
    }

    return fullPrompt;
  }

  /**
   * 获取生成类型
   */
  protected getGenerationType(): string {
    return "avatar";
  }

  protected getPrimaryGenerationType(
    _params: AvatarGenerationRequest
  ): string {
    return "character";
  }

  protected getGenerationSubType(
    _params: AvatarGenerationRequest
  ): string {
    return "avatar";
  }

  protected extractPrompt(): string {
    return "";
  }
  protected extractStylePreset(
    params: AvatarGenerationRequest
  ): string | undefined {
    return "";
  }
  /**
   * 从请求中提取生成类型
   */
  protected extractGenType(
    params: AvatarGenerationRequest
  ): string | undefined {
    return "avatar";
  }

  /**
   * 从请求中提取参考图片URL
   */
  protected extractReferenceImageUrl(
    params: AvatarGenerationRequest
  ): string[] | undefined {
    return params.reference_image_urls;
  }

  /**
   * 获取头像生图的分辨率配置
   */
  protected getResolutionConfig(): ThumbnailConfig[] {
    return getResolutionConfig("avatar");
  }

  /**
   * 获取头像生成历史
   */
  async getAvatarGenerationHistory(
    userUuid: string,
    characterUuid?: string,
    options: { limit?: number; page?: number } = {}
  ) {
    const history = await this.getUserGenerationHistory(userUuid, options);

    // 可以在这里添加头像特定的筛选逻辑
    // 暂时返回所有历史记录
    return history;
  }
}

// 导出单例实例
export const avatarGenerationService = new AvatarGenerationService();
