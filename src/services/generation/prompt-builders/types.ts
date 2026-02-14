/**
 * Prompt Builder 共享类型定义
 * 为所有Prompt Builder提供统一的接口和类型
 */

export interface IPromptBuilder {
  /**
   * 检查是否支持指定的子类型
   */
  supports(subType: string): boolean;

  /**
   * 构建完整的提示词
   */
  buildPrompt(params: any): Promise<string>;
}

export interface PromptBuilderParams {
  prompt?: string;
  style_preset?: string;
  scene_preset?: string;
  action_preset?: string;
  outfit_preset?: string;
  character_uuids?: string[];
  reference_image_urls?: string[];
  addQualityTerms?: boolean;
}

export interface ActionFigurePromptParams {
  template_prompt: string;
  user_prompt?: string;
  reference_images?: string[];
  character_uuids?: string[];
  input_mode?: "text_with_reference" | "oc_character";
}

export interface StickerPromptParams {
  // 🔥 模板信息（"No Presets"时可选）
  template_prompt?: string;
  template_id?: string;
  style_preset?: string; // 🔥 新增：支持"No Presets"

  // 用户输入模式
  input_mode: "text_only" | "text_with_reference" | "oc_character";

  // 用户输入（统一用于所有模式）
  // - text_only: 作为文本内容
  // - text_with_reference: 作为描述文本
  // - oc_character: 作为caption
  user_prompt?: string;

  // 参考图（可选）
  reference_image_urls?: string[];

  // OC模式参数
  character_uuids?: string[];
  expression?: string; // 表情选项如：happy_waving, angry_stomping等
  is_nine_grid?: boolean;
}
