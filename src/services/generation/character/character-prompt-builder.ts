/**
 * Character Prompt Builder
 * 专门用于角色生图的提示词构建
 */

import ConfigManager from "@/lib/config-manager";
import type { CharacterPromptBuilderParams } from "./character-types";
import type { Character } from "@/models/character";
import characterColors from "@/configs/colors/character-colors.json";
import { buildModulesFromLegacyFields, buildPromptFromModules } from "@/services/character-modules";
import { parseCharacterModules } from "@/types/oc";

export class CharacterPromptBuilder {
  /**
   * 构建完整的角色生图提示词
   */
  static async buildPrompt(
    params: CharacterPromptBuilderParams
  ): Promise<string> {
    try {
      if (params.character_data.modules) {
        const baseModules = parseCharacterModules(params.character_data.modules);
        const modules = buildModulesFromLegacyFields(
          {
            name: params.character_data.name,
            gender: params.character_data.gender,
            age: params.character_data.age,
            species: params.character_data.species,
            role: params.character_data.role,
            personality_tags: params.character_data.personality_tags,
            brief_introduction: params.character_data.brief_introduction,
            art_style: params.art_style,
          },
          baseModules
        );
        const promptType = params.gen_type === "avatar" ? "avatar" : "profile";
        return await buildPromptFromModules(modules, promptType, {
          styleId: params.art_style ?? null,
        });
      }

      console.log("🎨 [PromptBuilder] Building prompt with params:", {
        character_name: params.character_data.name,
        art_style: params.art_style,
        gen_type: params.gen_type,
      });

      console.log("📝 [PromptBuilder] Character appearance fields:", {
        name: params.character_data.name,
        gender: params.character_data.gender,
        age: params.character_data.age,
        species: params.character_data.species,
        role: params.character_data.role,
      });

      // 获取模板配置
      const template = await ConfigManager.getCharacterPromptTemplate();

      // 收集所有的prompt片段
      const promptParts: { [key: string]: string } = {};

      // 角色数据部分
      const characterData = await this.buildCharacterData(
        params.character_data,
        template
      );
      if (characterData) {
        promptParts.character_data = characterData;
      }

      // 艺术风格
      if (params.art_style) {
        const artStylePrompt = await this.getArtStylePrompt(params.art_style);
        if (artStylePrompt) {
          console.log(`✅ Art style prompt added: ${artStylePrompt}`);
          promptParts.art_style = artStylePrompt;
        } else {
          console.warn(`❌ No art style prompt found for: ${params.art_style}`);
        }
      } else {
        console.log(`ℹ️ No art_style parameter provided`);
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

      // 添加艺术风格（如果存在且不在integration_order中）
      if (
        promptParts.art_style &&
        !template.prompt_structure.integration_order.includes("art_style")
      ) {
        orderedParts.push(promptParts.art_style);
      }

      // 使用配置的分隔符连接
      let fullPrompt = orderedParts.join(template.prompt_structure.separator);

      console.log("✅ [PromptBuilder] Prompt parts assembled:", {
        promptParts,
        integration_order: template.prompt_structure.integration_order,
        orderedParts,
      });

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
      // 如果模板加载失败，回退到简化逻辑
      return this.buildLegacyPrompt(params);
    }
  }

  /**
   * 构建角色数据部分的提示词
   */
  private static async buildCharacterData(
    character: Character,
    template: any
  ): Promise<string> {
    const parts: string[] = [];
    const { field_naming_rules } = template;
    const modules = parseCharacterModules(character.modules);
    const appearance = modules.appearance || {};

    const toNormalizedHex = (color: string): string => {
      const trimmed = color.trim();
      if (!trimmed) return "";
      const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
      return prefixed.toLowerCase();
    };

    const isHexColor = (color: string | null | undefined): boolean => {
      if (!color) return false;
      return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(
        toNormalizedHex(color.trim())
      );
    };

    // 颜色 code 转值的辅助函数（向后兼容旧数据）
    const getColorValue = (
      colorCode: string | null | undefined,
      colorType: "hair" | "eye"
    ): string => {
      if (!colorCode) {
        console.log(`  ⚠️ Color code is empty`);
        return "";
      }

      const cleanedInput = colorCode.trim();

      if (isHexColor(cleanedInput)) {
        return toNormalizedHex(cleanedInput);
      }

      const colorList =
        colorType === "hair"
          ? characterColors.hair_colors
          : characterColors.eye_colors;

      const colorObj = colorList.find(
        (c: { key: string; code: string }) =>
          c.key.toLowerCase() === cleanedInput.toLowerCase() ||
          (isHexColor(c.code) &&
            toNormalizedHex(c.code) === toNormalizedHex(cleanedInput))
      );

      if (colorObj) {
        return toNormalizedHex(colorObj.code);
      }

      return cleanedInput;
    };

    // 处理各个字段
    const fieldMappings: { [key: string]: any } = {
      name: appearance.name || character.name,
      gender: appearance.gender || character.gender,
      species: appearance.species || character.species,
      age: appearance.age ?? character.age,
      hair_color: getColorValue(appearance.hair_color, "hair"),
      hair_style: appearance.hair_style,
      eye_color: getColorValue(appearance.eye_color, "eye"),
      body_type: appearance.body_type,
      outfit_style: appearance.outfit_style,
      accessories: appearance.accessories,
      appearance_features: appearance.appearance_features,
      personality_tags:
        (modules.personality?.personality_tags as string[] | undefined) ||
        character.personality_tags,
    };

    for (const [field, value] of Object.entries(fieldMappings)) {
      const hasValue = !!value;
      const action = hasValue ? "✅ Added" : "⏭️ Skipped (empty)";

      console.log(`  ${action} ${field}:`, value || "(empty)");

      if (!value) continue;

      // 无需标签的字段（直接输出值）
      if (field_naming_rules.no_label_fields.includes(field)) {
        parts.push(String(value));
      }
      // 需要后缀的字段
      else if (field_naming_rules.suffix_fields[field]) {
        parts.push(`${value} ${field_naming_rules.suffix_fields[field]}`);
      }
      // 需要标签的字段
      else if (field_naming_rules.labeled_fields[field]) {
        parts.push(`${field_naming_rules.labeled_fields[field]}: ${value}`);
      }
      // 列表字段
      else if (field_naming_rules.list_fields[field]) {
        // 假设 value 是数组
        if (Array.isArray(value) && value.length > 0) {
          const label = field_naming_rules.list_fields[field];
          const listStr = value.join(", ");
          parts.push(`${label}: ${listStr}`);
        }
      }
      // 默认处理
      else {
        parts.push(String(value));
      }
    }

    const result = parts.join(", ");
    console.log("📤 [buildCharacterData] Result:", result);

    return result;
  }

  /**
   * 获取艺术风格的提示词
   */
  private static async getArtStylePrompt(styleId: string): Promise<string> {
    try {
      console.log(`🎨 Getting art style prompt for styleId: ${styleId}`);
      const styles = await ConfigManager.getCharacterStyles();

      const style = styles.find(
        (s) =>
          s.uuid === styleId ||
          s.key === styleId ||
          s.name === styleId
      );
      if (style) {
        return style.prompt_value || "";
      } else {
        console.warn(`❌ No style found for styleId: ${styleId}`);
        console.log(
          `Available styles:`,
          styles.map((s) => ({ uuid: s.uuid, name: s.name }))
        );
        return "";
      }
    } catch (error) {
      console.warn(`Failed to get art style prompt for ${styleId}:`, error);
      return "";
    }
  }

  /**
   * Legacy版本的构建方法（向后兼容）
   */
  private static buildLegacyPrompt(
    params: CharacterPromptBuilderParams
  ): string {
    const parts: string[] = [];

    // 基础角色描述
    const character = params.character_data;
    const modules = parseCharacterModules(character.modules);
    const appearance = modules.appearance || {};
    if (character.name || appearance.name) parts.push(appearance.name || character.name);
    if (character.gender || appearance.gender)
      parts.push(appearance.gender || character.gender);
    if (character.age || appearance.age)
      parts.push(`${appearance.age ?? character.age} years old`);
    if (appearance.hair_color) parts.push(`${appearance.hair_color} hair`);
    if (appearance.eye_color) parts.push(`${appearance.eye_color} eyes`);
    if (appearance.outfit_style)
      parts.push(`wearing ${appearance.outfit_style}`);

    // 添加质量术语
    if (params.addQualityTerms !== false) {
      parts.push(
        "masterpiece, best quality, highres, detailed character design, anime style"
      );
    }

    return parts.filter((part) => part.length > 0).join(", ");
  }

  /**
   * 验证角色数据完整性
   */
  static validateCharacterData(character: Character): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!character.name || character.name.trim().length === 0) {
      errors.push("Character name is required");
    }

    if (!character.gender) {
      errors.push("Character gender is required");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证提示词长度
   */
  static async validatePromptLength(
    prompt: string,
    maxLength?: number
  ): Promise<boolean> {
    try {
      // 如果没有指定maxLength，从配置中获取
      if (maxLength === undefined) {
        const template = await ConfigManager.getCharacterPromptTemplate();
        maxLength = template.settings.max_length;
      }
      return prompt.length <= maxLength;
    } catch (error) {
      console.warn(
        "Failed to get max length from config, using default 2000:",
        error
      );
      return prompt.length <= (maxLength || 2000);
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
