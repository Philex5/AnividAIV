/**
 * Avatar Prompt Builder
 * 基于参考角色立绘图片生成头像
 */

import type { AvatarPromptBuilderParams } from "./avatar-types";

export class AvatarPromptBuilder {
  /**
   * 构建完整的头像生图提示词：完全基于立绘生成头像
   */
  static buildPrompt(params: AvatarPromptBuilderParams): string {
    const parts: string[] = [];

    // 头像特定的基础模板
    parts.push(
      "Generate a square profile picture featuring the character from the reference image. Crop closely so the character’s head and face fill the majority of the frame, with minimal shoulders visible. Clearly display distinctive features such as hairstyle, eye color, accessories, and any unique traits. Use a simple, unobtrusive background to keep the focus on the character."
    );

    // 头像特定的质量术语
    if (params.addQualityTerms !== false) {
      parts.push(this.getAvatarQualityTerms());
    }

    return parts.filter((part) => part.length > 0).join(", ");
  }

  /**
   * 获取头像专用的质量术语
   */
  private static getAvatarQualityTerms(): string {
    return "high quality portrait, detailed face, clear eyes, professional headshot, masterpiece";
  }

  /**
   * 验证头像生成参数
   */
  static validateAvatarParams(params: AvatarPromptBuilderParams): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 验证参考图片
    if (
      !params.reference_image_urls ||
      params.reference_image_urls.length === 0
    ) {
      errors.push("Reference image URLs are required for avatar generation");
    } else {
      for (const url of params.reference_image_urls) {
        try {
          new URL(url);
        } catch {
          errors.push(`Invalid reference image URL format: ${url}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 清理和优化头像提示词
   */
  static sanitizeAvatarPrompt(prompt: string): string {
    return (
      prompt
        .trim()
        .replace(/\s+/g, " ")
        .replace(/,\s*,/g, ",")
        .replace(/,\s*$/, "")
        // 移除可能影响头像生成的术语
        .replace(/full body|whole body|standing/gi, "")
    );
  }
}
