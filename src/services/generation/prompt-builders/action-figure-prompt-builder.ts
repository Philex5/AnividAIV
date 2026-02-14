/**
 * ActionFigure Prompt Builder
 * 专门用于AI手办生成的提示词构建
 */

import { IPromptBuilder, ActionFigurePromptParams } from "./types";

export class ActionFigurePromptBuilder implements IPromptBuilder {
  /**
   * 检查是否支持指定的子类型
   */
  supports(subType: string): boolean {
    const normalized = this.normalizeSubType(subType);
    return normalized === "action_figure";
  }

  /**
   * 构建ActionFigure专用的提示词
   */
  async buildPrompt(params: ActionFigurePromptParams): Promise<string> {
    const {
      template_prompt,
      user_prompt,
      reference_images,
      character_uuids,
      input_mode,
    } = params;

    if (!template_prompt) {
      throw new Error(
        "Template prompt is required for ActionFigure generation"
      );
    }

    // 构建最终prompt
    let finalPrompt = template_prompt;

    // 根据输入模式处理
    if (input_mode === "oc_character" && character_uuids && character_uuids.length > 0) {
      // OC模式：参考角色立绘
      finalPrompt += ` Use the character from the reference image(s) for visual guidance.`;
      // OC模式下 user_prompt 是补充细节
      if (user_prompt?.trim()) {
        finalPrompt += ` Additional Detail: ${user_prompt.trim()}`;
      }
    } else if (input_mode === "text_with_reference") {
      // 文字描述+参考图模式：user_prompt 是主要描述内容
      if (user_prompt?.trim()) {
        finalPrompt += ` ${user_prompt.trim()}`;
      }
      // 追加参考图引导语
      if (reference_images && reference_images.length > 0) {
        finalPrompt += ` Use the provided reference image(s) for visual guidance.`;
      }
    }

    // 添加手办特定的质量术语和风格描述
    // const qualityTerms = [
    //   "high quality PVC figure",
    //   "detailed sculpt",
    //   "premium collectible",
    //   "professional product photography",
    //   "studio lighting with soft shadows",
    //   "clean background",
    //   "ultra detailed",
    //   "8k resolution",
    // ];

    // finalPrompt += `, ${qualityTerms.join(", ")}`;

    // 清理和标准化prompt
    return this.sanitizePrompt(finalPrompt);
  }

  /**
   * 清理和标准化提示词
   */
  private sanitizePrompt(prompt: string): string {
    return prompt
      .trim()
      .replace(/\s+/g, " ") // 多个空格合并为一个
      .replace(/,\s*,/g, ",") // 移除重复的逗号
      .replace(/,\s*$/, "") // 移除末尾的逗号
      .replace(/,,+/g, ","); // 合并多个逗号
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
