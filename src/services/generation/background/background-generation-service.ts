import { BaseGenerationService } from "../base/base-generation-service";
import { ValidationResult } from "../base/generation-types";
import { getResolutionConfig } from "@/configs/generation/resolution-configs";
import { ThumbnailConfig } from "@/types/storage";
import type { BackgroundGenerationRequest } from "./background-types";
import { BackgroundPromptBuilder } from "./background-prompt-builder";

export class BackgroundGenerationService extends BaseGenerationService<BackgroundGenerationRequest> {
  protected async validateGenerationParams(
    params: BackgroundGenerationRequest
  ): Promise<ValidationResult> {
    const result = new ValidationResult(true);

    if (!params.scene_description || params.scene_description.trim().length === 0) {
      result.addError("Scene description is required");
    }

    if (params.scene_description && params.scene_description.length > 500) {
      result.addError("Scene description must be less than 500 characters");
    }

    if (!params.model_id) {
      result.addError("Model ID is required");
    }

    if (params.counts < 1 || params.counts > 4) {
      result.addError("Image count must be between 1 and 4");
    }

    return result;
  }

  protected async buildFullPrompt(
    params: BackgroundGenerationRequest
  ): Promise<string> {
    const promptParams = {
        scene_description: params.scene_description,
        style: params.style,
        addQualityTerms: false // Controlled by template
    };
    
    return await BackgroundPromptBuilder.buildPrompt(promptParams);
  }

  protected getGenerationType(): string {
    return "background";
  }

  protected getPrimaryGenerationType(_params: BackgroundGenerationRequest): string {
    return "image";
  }

  protected getGenerationSubType(params: BackgroundGenerationRequest): string {
    return "background";
  }

  protected extractPrompt(params: BackgroundGenerationRequest): string {
    return params.scene_description;
  }

  protected extractStylePreset(
    params: BackgroundGenerationRequest
  ): string | undefined {
    return params.style;
  }

  protected extractGenType(params: BackgroundGenerationRequest): string | undefined {
    return "background";
  }

  protected extractReferenceImageUrl(
    params: BackgroundGenerationRequest
  ): string | string[] | undefined {
    return params.reference_image_urls;
  }

  protected getResolutionConfig(): ThumbnailConfig[] {
    return getResolutionConfig("background");
  }
}

export const backgroundGenerationService = new BackgroundGenerationService();
