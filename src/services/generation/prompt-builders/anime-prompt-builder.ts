/**
 * Anime Prompt Builder (New Architecture)
 * 专门用于动漫生图的提示词构建 - 基于新架构
 */

import ConfigManager from "@/lib/config-manager";
import { findCharacterByUuid } from "@/models/character";
import { IPromptBuilder } from "./types";

type AnimePromptBuilderParams = {
  prompt: string;
  style_preset?: string;
  scene_preset?: string;
  action_preset?: string;
  outfit_preset?: string;
  character_uuids?: string[];
  addQualityTerms?: boolean;
};

export class AnimePromptBuilder implements IPromptBuilder {
  /**
   * 检查是否支持指定的子类型
   */
  supports(subType: string): boolean {
    const normalized = this.normalizeSubType(subType);
    return normalized === "anime";
  }

  /**
   * 构建完整的动漫生图提示词
   */
  async buildPrompt(params: AnimePromptBuilderParams): Promise<string> {
    try {
      // 获取模板配置
      const template = await ConfigManager.getPromptTemplate();

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

      // 场景预设（如果提供）
      if (params.scene_preset) {
        const scenePrompt = await this.getScenePrompt(params.scene_preset);
        if (scenePrompt) {
          promptParts.scene_prompt = scenePrompt;
        }
      }

      // 动作预设（如果提供）
      if (params.action_preset) {
        const actionPrompt = await this.getActionPrompt(params.action_preset);
        if (actionPrompt) {
          promptParts.action_prompt = actionPrompt;
        }
      }

      // 服装预设（如果提供）
      if (params.outfit_preset) {
        const outfitPrompt = await this.getOutfitPrompt(params.outfit_preset);
        if (outfitPrompt) {
          promptParts.outfit_prompt = outfitPrompt;
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
        "Failed to build prompt with template, fallback to legacy method:",
        error
      );
      // 如果模板加载失败，回退到原有逻辑
      return params.prompt.trim();
    }
  }

  /**
   * 获取样式预设的提示词
   */
  private async getStylePrompt(styleId: string): Promise<string> {
    try {
      const style = await ConfigManager.getStyleById(styleId);
      return style?.prompt_value || "";
    } catch (error) {
      console.warn(`Failed to get style prompt for ${styleId}:`, error);
      return "";
    }
  }

  /**
   * 获取场景预设的提示词
   */
  private async getScenePrompt(sceneId: string): Promise<string> {
    try {
      const scene = await ConfigManager.getSceneById(sceneId);
      return scene?.prompt_value || "";
    } catch (error) {
      console.warn(`Failed to get scene prompt for ${sceneId}:`, error);
      return "";
    }
  }

  /**
   * 获取动作预设的提示词
   */
  private async getActionPrompt(actionId: string): Promise<string> {
    try {
      const action = await ConfigManager.getActionById(actionId);
      return action?.prompt_value || "";
    } catch (error) {
      console.warn(`Failed to get action prompt for ${actionId}:`, error);
      return "";
    }
  }

  /**
   * 获取服装预设的提示词
   */
  private async getOutfitPrompt(outfitId: string): Promise<string> {
    try {
      const outfit = await ConfigManager.getOutfitById(outfitId);
      return outfit?.prompt_value || "";
    } catch (error) {
      console.warn(`Failed to get outfit prompt for ${outfitId}:`, error);
      return "";
    }
  }

  /**
   * 构建角色提示词
   */
  private async buildCharacterPrompt(
    characterUuids: string[]
  ): Promise<string> {
    try {
      const template = await ConfigManager.getPromptTemplate();

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
        "The characters image is in last {oc_count} image, both character and background in the same style";

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
  private sanitizePrompt(prompt: string): string {
    return prompt
      .trim()
      .replace(/\s+/g, " ")
      .replace(/,\s*,/g, ",")
      .replace(/,\s*$/, "");
  }

  /**
   * 标准化sub_type格式
   */
  private normalizeSubType(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }
}
