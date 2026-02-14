/**
 * Sticker Prompt Builder
 * 专门用于AI贴纸生成的提示词构建
 *
 * 支持3种输入模式：
 * 1. 纯文本模式：user_prompt
 * 2. 文字描述 + 参考图模式：模板 + user_prompt + 可选参考图
 * 3. OC角色模式：模板 + OC角色特征 + 表情选项 + user_prompt作为caption
 */

import { IPromptBuilder, StickerPromptParams } from "./types";

// 表情选项到描述的映射
const EXPRESSION_MAP: Record<string, string> = {
  happy_waving: "happily waving hand with a cheerful smile",
  angry_stomping: "angrily stomping feet with an irritated expression",
  sad_crying: "crying sadly with tears streaming down",
  proud_victory: "making a proud victory pose with V sign",
  shy_covering_face: "shyly covering face with hands, blushing",
  tired_lying_down: "tiredly lying down, exhausted expression",
};

export class StickerPromptBuilder implements IPromptBuilder {
  /**
   * 检查是否支持指定的子类型
   */
  supports(subType: string): boolean {
    const normalized = this.normalizeSubType(subType);
    return normalized === "sticker";
  }

  /**
   * 构建Sticker专用的提示词
   */
  async buildPrompt(params: StickerPromptParams): Promise<string> {
    const {
      template_prompt,
      template_id,
      input_mode,
      user_prompt,
      reference_image_urls,
      character_uuids,
      expression,
      is_nine_grid,
    } = params;

    let finalPrompt = "";

    // 根据输入模式构建不同的prompt
    switch (input_mode) {
      case "text_only":
        // 模式1：纯文本模式 - 仅使用user_prompt
        if (user_prompt?.trim()) {
          finalPrompt = `Create a sticker with the following text: ${user_prompt.trim()}. ${template_prompt ?? ""}.Do not add any images, icons, or decorative elements. Use a bold and playful font.with a background color that contrasts with the main subject, making the subject stand out clearly, the sticker shape should follow the outline of the main content, and with a thin white border around the sticker.`;
        } else {
          // 如果没有user_prompt，仅使用模板（作为fallback）
          finalPrompt = template_prompt ?? "";
        }
        break;

      case "text_with_reference":
        // 模式2：文字描述 + 参考图模式
        // 优先使用user_prompt，其次使用reference_image_urls，最后使用template
        if (user_prompt?.trim()) {
          if (reference_image_urls && reference_image_urls.length > 0) {
            finalPrompt = `Create a sticker based on the following description: ${user_prompt.trim()}. Use the provided reference image(s) for visual guidance. ${template_prompt ?? ""}.The sticker style should take priority over the reference image's style.with a background color that contrasts with the main subject, making the subject stand out clearly, the sticker shape should follow the outline of the main content, and with a thin white border around the sticker.`;
          } else {
            finalPrompt = `Create a sticker based on the following description: ${user_prompt.trim()}. ${template_prompt ?? ""}.with a background color that contrasts with the main subject, making the subject stand out clearly, the sticker shape should follow the outline of the main content, and with a thin white border around the sticker.`;
          }
        } else if (reference_image_urls && reference_image_urls.length > 0) {
          // 只有参考图的情况
          finalPrompt = `Create a sticker based on the reference image(s). ${template_prompt ?? ""}.The sticker style should take priority over the reference image's style.with a background color that contrasts with the main subject, making the subject stand out clearly, the sticker shape should follow the outline of the main content, and with a thin white border around the sticker.`;
        } else {
          // 只有模板的情况
          finalPrompt = template_prompt ?? "";
        }
        break;

      case "oc_character":
        // 模式3：OC角色模式
        // 获取表情描述
        const expressionDesc = expression
          ? EXPRESSION_MAP[expression] || expression.replace(/_/g, " ")
          : "in a cute pose";
        const shouldIncludeExpression = !is_nine_grid && template_id !== "oc_nine_grid";

        // user_prompt作为caption
        if (user_prompt?.trim()) {
          const expressionSegment = shouldIncludeExpression
            ? ` The character should be ${expressionDesc},`
            : "";
          finalPrompt = `Create a sticker of the character shown in the reference image.${expressionSegment} with the caption: "${user_prompt.trim()}". ${template_prompt ?? ""}with a background color that contrasts with the main subject, making the subject stand out clearly, the sticker shape should follow the outline of the main content, and with a thin white border around the sticker.`;
        } else {
          const expressionSegment = shouldIncludeExpression
            ? ` The character should be ${expressionDesc}.`
            : "";
          finalPrompt = `Create a sticker of the character shown in the reference image.${expressionSegment} ${template_prompt ?? ""}.with a background color that contrasts with the main subject, making the subject stand out clearly, the sticker shape should follow the outline of the main content, and with a thin white border around the sticker.`;
        }

        break;

      default:
        throw new Error(`Unsupported input mode: ${input_mode}`);
    }

    // 清理和标准化prompt
    return this.sanitizePrompt(finalPrompt);
  }

  /**
   * 清理和标准化提示词
   */
  private sanitizePrompt(prompt: string): string {
    if (!prompt) return "";

    return prompt
      .trim()
      .replace(/\s+/g, " ") // 多个空格合并为一个
      .replace(/,\s*,/g, ",") // 移除重复的逗号
      .replace(/,\s*$/, "") // 移除末尾的逗号
      .replace(/,,+/g, ",") // 合并多个逗号
      .replace(/\.\s*\./g, "."); // 合并多个句号
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
