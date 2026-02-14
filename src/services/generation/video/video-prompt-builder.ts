/**
 * Video Prompt Builder
 * 专门用于视频生成的提示词构建
 * 参考 AnimePromptBuilder 的架构设计
 */

import ConfigManager from "@/lib/config-manager";
import { findCharacterByUuid } from "@/models/character";
import type { VideoPromptBuilderParams } from "./video-types";

export class VideoPromptBuilder {
  /**
   * 构建完整的视频生成提示词
   */
  static async buildPrompt(params: VideoPromptBuilderParams): Promise<string> {
    try {
      // 获取视频提示词模板配置
      const template = await ConfigManager.getVideoPromptTemplate();

      // 收集所有的prompt片段
      const promptParts: { [key: string]: string } = {};

      // 用户提示词
      if (params.prompt?.trim()) {
        promptParts.user_prompt = params.prompt.trim();
      }

      // 样式预设
      if (params.style_preset) {
        const stylePrompt = await this.getStylePrompt(params.style_preset);
        if (stylePrompt) {
          promptParts.style_prompt = stylePrompt;
        }
      }

      // 角色信息
      if (params.character_uuids && params.character_uuids.length > 0) {
        const characterPrompt = await this.buildCharacterPrompt(
          params.character_uuids
        );
        if (characterPrompt) {
          promptParts.character_prompt = characterPrompt;
        }
      }

      // 运镜参数
      if (params.camera_motion) {
        const cameraMotionPrompt = await this.getCameraMotionPrompt(
          params.camera_motion
        );
        if (cameraMotionPrompt) {
          promptParts.camera_motion = cameraMotionPrompt;
        }
      }

      // 质量术语（根据配置决定是否添加）
      if (
        params.addQualityTerms !== false &&
        template.prompt_structure.add_quality_terms
      ) {
        promptParts.quality_enhancement =
          template.templates.quality_enhancement;
      }

      // 根据配置的顺序组装prompt
      const orderedParts: string[] = [];
      for (const key of template.prompt_structure.integration_order) {
        if (promptParts[key]) {
          orderedParts.push(promptParts[key]);
        }
      }

      // 使用配置的分隔符连接
      let fullPrompt = orderedParts.join(template.prompt_structure.separator);

      // 根据配置进行清理
      if (template.settings.sanitize_prompt) {
        fullPrompt = this.sanitizePrompt(fullPrompt);
      }

      return fullPrompt;
    } catch (error) {
      console.error(
        "Failed to build video prompt with template, fallback to basic prompt:",
        error
      );
      // 如果模板加载失败，回退到基本提示词
      return params.prompt.trim();
    }
  }

  /**
   * 获取样式预设的提示词
   */
  private static async getStylePrompt(styleId: string): Promise<string> {
    try {
      const style = await ConfigManager.getStyleById(styleId);
      return style?.prompt_value || "";
    } catch (error) {
      console.warn(`Failed to get style prompt for ${styleId}:`, error);
      return "";
    }
  }

  /**
   * 获取运镜参数的提示词
   */
  private static async getCameraMotionPrompt(
    cameraMotionKey: string
  ): Promise<string> {
    try {
      const template = await ConfigManager.getVideoPromptTemplate();
      const cameraMotion =
        await ConfigManager.getCameraMotionByKey(cameraMotionKey);

      if (!cameraMotion?.prompt_value) {
        return "";
      }

      // 如果有运镜模板，使用模板格式化
      if (template.templates.camera_motion_template) {
        return template.templates.camera_motion_template.replace(
          "{camera_motion}",
          cameraMotion.prompt_value
        );
      }

      // 否则直接返回运镜的prompt值
      return cameraMotion.prompt_value;
    } catch (error) {
      console.warn(
        `Failed to get camera motion prompt for ${cameraMotionKey}:`,
        error
      );
      return "";
    }
  }

  /**
   * 构建角色提示词
   */
  private static async buildCharacterPrompt(
    characterUuids: string[]
  ): Promise<string> {
    try {
      const template = await ConfigManager.getVideoPromptTemplate();

      // 获取所有角色信息
      const characterNames: string[] = [];

      for (const uuid of characterUuids) {
        const character = await findCharacterByUuid(uuid);
        if (character) {
          // 收集角色名称
          if (character.name) {
            characterNames.push(character.name);
          }
        }
      }

      // 构建角色 prompt - 角色名称在最前面
      let characterPrompt = "";

      // 1. 添加角色姓名（如果有）
      if (characterNames.length > 0) {
        const nameText =
          characterNames.length === 1
            ? `The name of character is ${characterNames[0]}.`
            : `The name of characters is ${characterNames.join(", ")}.`;
        characterPrompt = nameText;
      }

      // 2. 添加角色模板（关于立绘引用）
      const characterTemplate =
        (template.templates as any).character_prompt ||
        "The character image is in last {oc_count} image, both character and background in the same style";

      const templateText = characterTemplate.replace(
        "{oc_count}",
        characterUuids.length.toString()
      );

      if (characterPrompt) {
        characterPrompt += " " + templateText;
      } else {
        characterPrompt = templateText;
      }

      return characterPrompt;
    } catch (error) {
      console.warn("Failed to build character prompt:", error);
      return "";
    }
  }

  /**
   * 清理和标准化提示词
   */
  static sanitizePrompt(prompt: string): string {
    return prompt
      .trim()
      .replace(/\s+/g, " ") // 替换多个空格为单个空格
      .replace(/,\s*,/g, ",") // 移除重复的逗号
      .replace(/\.\s*\./g, ".") // 移除重复的句号
      .replace(/,\s*$/, "") // 移除末尾的逗号
      .replace(/\.\s*$/, ""); // 移除末尾的句号
  }
}
