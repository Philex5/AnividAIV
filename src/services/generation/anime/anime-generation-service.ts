/**
 * Anime Generation Service
 * 专门处理动漫生图业务逻辑
 */

import { BaseGenerationService } from "../base/base-generation-service";
import { ValidationResult } from "../base/generation-types";
import { getResolutionConfig } from "@/configs/generation/resolution-configs";
import { ThumbnailConfig } from "@/types/storage";
import type { AnimeGenerationRequest } from "./anime-types";

export class AnimeGenerationService extends BaseGenerationService<AnimeGenerationRequest> {
  /**
   * 验证动漫生图参数
   */
  protected async validateGenerationParams(
    params: AnimeGenerationRequest,
  ): Promise<ValidationResult> {
    const result = new ValidationResult(true);

    // 验证提示词
    const normalizedGenType = this.normalizeGenType(params.gen_type);
    const allowsEmptyPrompt =
      normalizedGenType === "action_figure" || normalizedGenType === "sticker";

    if (!allowsEmptyPrompt && (!params.prompt || params.prompt.trim().length === 0)) {
      result.addError("Prompt is required");
    }

    if (params.prompt && params.prompt.length > 10000) {
      result.addError("Prompt must be less than 10000 characters");
    }

    // 验证基础参数
    if (!params.model_id) {
      result.addError("Model ID is required");
    }

    if (params.counts < 1 || params.counts > 4) {
      result.addError("Image count must be between 1 and 4");
    }

    // 验证参考图片URL格式（如果提供）
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
   * 构建完整的动漫生图提示词
   * 根据 gen_type 进行分类型处理
   */
  protected async buildFullPrompt(
    params: AnimeGenerationRequest,
  ): Promise<string> {
    const promptType = this.resolvePromptType(params.gen_type);

    // 根据 sub_type 分发到不同的 prompt builder
    if (promptType === "action_figure") {
      // ActionFigure：从 metadata 获取 template_prompt，从 params.prompt 获取用户输入
      // 由 PromptBuilder 负责拼接
      const templatePrompt = (params.metadata as any)?.template_prompt;
      const userPrompt = params.prompt; // 用户输入（可能为空）
      const inputMode = (params.metadata as any)?.input_mode; // 获取输入模式

      const actionFigureParams = {
        template_prompt: templatePrompt, // 模板 prompt
        user_prompt: userPrompt, // 用户输入
        reference_images: params.reference_image_urls,
        character_uuids: params.character_uuids,
        input_mode: inputMode, // 🔥 传递输入模式
      };

      const fullPrompt = await this.promptBuilderDispatcher.buildPrompt(
        "action_figure",
        actionFigureParams,
      );

      return this.sanitizePrompt(fullPrompt);
    } else if (promptType === "sticker") {
      // Sticker：从 metadata 获取所有sticker相关参数
      const templatePrompt = (params.metadata as any)?.template_prompt;
      const templateId = (params.metadata as any)?.template_id;
      const input_mode = (params.metadata as any)?.input_mode;
      const user_prompt = (params.metadata as any)?.user_prompt;
      const expression = (params.metadata as any)?.expression;
      const is_nine_grid = (params.metadata as any)?.is_nine_grid;

      const stickerParams = {
        template_prompt: templatePrompt,
        template_id: templateId,
        input_mode,
        user_prompt,
        reference_image_urls: params.reference_image_urls,
        character_uuids: params.character_uuids,
        expression,
        is_nine_grid,
      };

      const fullPrompt = await this.promptBuilderDispatcher.buildPrompt(
        "sticker",
        stickerParams,
      );

      return this.sanitizePrompt(fullPrompt);
    } else {
      // Anime 使用复杂的prompt构建逻辑
      const promptParams = {
        prompt: params.prompt,
        style_preset: params.style_preset,
        scene_preset: params.scene_preset,
        action_preset: params.action_preset,
        outfit_preset: params.outfit_preset,
        character_uuids: params.character_uuids,
        addQualityTerms: false,
        gen_type: params.gen_type,
      };

      let fullPrompt = await this.promptBuilderDispatcher.buildPrompt(
        "anime",
        promptParams,
      );

      // 清理和标准化提示词
      fullPrompt = this.sanitizePrompt(fullPrompt);

      return fullPrompt;
    }
  }

  /**
   * 获取生成类型
   */
  protected getGenerationType(): string {
    return "anime";
  }

  protected getPrimaryGenerationType(_params: AnimeGenerationRequest): string {
    return "image";
  }

  protected getGenerationSubType(params: AnimeGenerationRequest): string {
    return this.normalizeGenType(params.gen_type);
  }

  /**
   * 从请求中提取基础提示词（用户原始输入）
   * 对于 action_figure：返回用户在 Additional Details 输入的内容
   * 对于 sticker：返回 metadata 中的 user_prompt（用户输入的caption）
   * 对于 anime：返回用户在 prompt 字段输入的内容
   */
  protected extractPrompt(params: AnimeGenerationRequest): string {
    const promptType = this.resolvePromptType(params.gen_type);

    // 对于 action_figure 和 sticker，从 metadata 中提取真实的用户输入
    if (promptType === "action_figure" || promptType === "sticker") {
      return (params.metadata as any)?.user_prompt || "";
    }

    // 对于其他类型，使用 params.prompt
    return params.prompt || "";
  }

  /**
   * 从请求中提取样式预设
   */
  protected extractStylePreset(
    params: AnimeGenerationRequest,
  ): string | undefined {
    return params.style_preset;
  }

  /**
   * 从请求中提取生成类型
   */
  protected extractGenType(params: AnimeGenerationRequest): string | undefined {
    return params.gen_type;
  }

  /**
   * 从请求中提取参考图片URL
   */
  protected extractReferenceImageUrl(
    params: AnimeGenerationRequest,
  ): string | string[] | undefined {
    return params.reference_image_urls;
  }

  /**
   * 获取动漫生图的分辨率配置
   */
  protected getResolutionConfig(): ThumbnailConfig[] {
    return getResolutionConfig("anime");
  }

  // ========== 私有辅助方法 ==========

  /**
   * 获取生成结果（包含完整的生成信息和图片列表）
   */
  async getGenerationResult(generationUuid: string): Promise<{
    generation: any;
    images: Array<{
      uuid: string;
      image_url: string;
      thumbnail_url?: string | null;
      image_uuid: string;
      is_favorite?: boolean;
      download_count?: number;
      created_at?: string;
    }>;
  } | null> {
    try {
      // 获取生成记录
      const { findGenerationByUuid } = await import("@/models/generation");
      const generation = await findGenerationByUuid(generationUuid);

      if (!generation) {
        return null;
      }

      // 获取图片列表
      const { getGenerationImagesByGenerationUuid } =
        await import("@/models/generation-image");
      const images = await getGenerationImagesByGenerationUuid(generationUuid);

      // 转换图片数据格式（只使用schema中存在的字段）
      const imageResults = images.map((img) => ({
        uuid: img.uuid!,
        image_url: img.image_url!, // 使用原图地址
        thumbnail_desktop: img.thumbnail_desktop,
        thumbnail_mobile: img.thumbnail_mobile,
        thumbnail_detail: img.thumbnail_detail,
        image_uuid: img.uuid!, // 为兼容性保留
        created_at: img.created_at?.toISOString(),
      }));

      return {
        generation,
        images: imageResults,
      };
    } catch (error) {
      console.error("Failed to get generation result:", error);
      return null;
    }
  }

  private normalizeGenType(raw?: string): string {
    if (!raw) {
      return "anime";
    }
    return raw
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  private resolvePromptType(
    raw?: string,
  ): "anime" | "action_figure" | "sticker" {
    const normalized = this.normalizeGenType(raw);
    if (normalized === "action_figure" || normalized === "sticker") {
      return normalized;
    }
    return "anime";
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
}

// 导出单例实例
export const animeGenerationService = new AnimeGenerationService();
