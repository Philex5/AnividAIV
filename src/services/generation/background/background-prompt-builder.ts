import ConfigManager from "@/lib/config-manager";
import type { BackgroundPromptBuilderParams } from "./background-types";

export class BackgroundPromptBuilder {
  /**
   * 构建完整的背景生图提示词
   */
  static async buildPrompt(params: BackgroundPromptBuilderParams): Promise<string> {
    try {
      // 获取模板配置
      const template = await ConfigManager.getBackgroundPromptTemplate();

      // 根据配置的顺序组装prompt
      const orderedParts: string[] = [];
      const templateKeys = Object.keys(template.templates) as Array<keyof typeof template.templates>;
      const templateKeySet = new Set(templateKeys);
      for (const key of template.prompt_structure.integration_order) {
        if (!templateKeySet.has(key as keyof typeof template.templates)) {
          throw new Error(`Unknown template key in integration_order: ${key}`);
        }

        const templateKey = key as keyof typeof template.templates;
        const templatePart = template.templates[templateKey];
        if (templatePart) {
          let part = templatePart;
          
          // 变量替换
          if (key === "base_template" && params.scene_description) {
            part = part.replace("{scene_description}", params.scene_description.trim());
          } else if (key === "style_template" && params.style) {
            part = part.replace("{style}", params.style);
          }
          
          // 如果该部分在params中有对应值或者不需要变量替换（如 quality_enhancement）
          if (
            (key === "base_template" && params.scene_description) ||
            (key === "style_template" && params.style) ||
            (key === "quality_enhancement" && params.addQualityTerms !== false && template.prompt_structure.add_quality_terms)
          ) {
            orderedParts.push(part);
          }
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
        "Failed to build background prompt with template, fallback to raw description:",
        error
      );
      // 如果模板加载失败，回退到原有逻辑
      return params.scene_description?.trim() ?? "";
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
      .replace(/,\s*$/, ""); // 移除末尾的逗号
  }
}
