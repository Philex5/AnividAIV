/**
 * KieAI Provider
 * Unified adapter manager for gpt-image-1, nano-banana, seedream, nano-banana-pro, and z-image models
 */

import { GPT4oAdapter } from "./gpt4o-adapter";
import { Flux2FlexAdapter } from "./flux2-flex-adapter";
import { Flux2ProAdapter } from "./flux2-pro-adapter";
import { NanoBananaAdapter } from "./nano-banana-adapter";
import { NanoBananaProAdapter } from "./nano-banana-pro-adapter";
import { SeedreamAdapter } from "./seedream-adapter";
import { Seedream45Adapter } from "./seedream45-adapter";
import { ZImageAdapter } from "./z-image-adapter";
import type {
  GenerationParams,
  TaskCreationResult,
  TaskQueryResult,
} from "@/types/kie-ai-provider";

export class KieAIProvider {
  private gpt4oAdapter: GPT4oAdapter;
  private flux2ProAdapter: Flux2ProAdapter;
  private flux2FlexAdapter: Flux2FlexAdapter;
  private nanoBananaAdapter: NanoBananaAdapter;
  private nanoBananaEditAdapter: NanoBananaAdapter;
  private nanoBananaProAdapter: NanoBananaProAdapter;
  private seedreamAdapter: SeedreamAdapter;
  private seedream45Adapter: Seedream45Adapter;
  private zImageAdapter: ZImageAdapter;
  constructor() {
    this.gpt4oAdapter = new GPT4oAdapter();
    this.flux2ProAdapter = new Flux2ProAdapter();
    this.flux2FlexAdapter = new Flux2FlexAdapter();
    this.nanoBananaAdapter = new NanoBananaAdapter(false);
    this.nanoBananaEditAdapter = new NanoBananaAdapter(true);
    this.nanoBananaProAdapter = new NanoBananaProAdapter();
    this.seedreamAdapter = new SeedreamAdapter();
    this.seedream45Adapter = new Seedream45Adapter();
    this.zImageAdapter = new ZImageAdapter();
  }

  /**
   * Create a generation task using the appropriate adapter
   * Auto-switch nano-banana to edit mode when reference image is provided
   */
  async createTask(
    params: GenerationParams,
    callbackUrl: string
  ): Promise<TaskCreationResult> {
    const adapter = this.getAdapterForParams(
      params.model_name,
      params.reference_image_urls
    );
    return await adapter.createTask(params, callbackUrl);
  }

  /**
   * Query task status using the appropriate adapter
   */
  async queryTask(taskId: string, modelName: string): Promise<TaskQueryResult> {
    const adapter = this.getAdapter(modelName);
    return await adapter.queryTask(taskId);
  }

  /**
   * Get the appropriate adapter based on model name only
   */
  private getAdapter(modelName: string) {
    const lowerModelName = modelName.toLowerCase();

    if (
      lowerModelName.includes("gpt") ||
      lowerModelName.includes("gpt-image-1")
    ) {
      return this.gpt4oAdapter;
    }

    if (lowerModelName.includes("flux-2/pro")) {
      return this.flux2ProAdapter;
    }

    if (lowerModelName.includes("flux-2/flex")) {
      return this.flux2FlexAdapter;
    }

    // Seedream 4.5 takes priority over Seedream 4.0
    if (lowerModelName.includes("seedream/4.5") || lowerModelName.includes("seedream-4.5")) {
      return this.seedream45Adapter;
    }

    if (lowerModelName.includes("seedream")) {
      return this.seedreamAdapter;
    }

    if (lowerModelName.includes("nano-banana-pro")) {
      return this.nanoBananaProAdapter;
    }

    if (lowerModelName.includes("nano-banana-edit")) {
      return this.nanoBananaEditAdapter;
    }

    if (lowerModelName.includes("nano-banana")) {
      return this.nanoBananaAdapter;
    }

    if (lowerModelName.includes("z-image")) {
      return this.zImageAdapter;
    }

    throw new Error(`Unsupported model: ${modelName}`);
  }

  /**
   * Get adapter with auto-switch: if nano-banana and reference image provided, use edit adapter
   * nano-banana-pro uses unified model, no auto-switch needed
   */
  private getAdapterForParams(
    modelName: string,
    referenceImageUrls?: string[]
  ) {
    const lowerModelName = modelName.toLowerCase();

    if (lowerModelName.includes("nano-banana-pro")) {
      // nano-banana-pro uses unified model for both text2img and img2img
      // No auto-switch needed
      return this.nanoBananaProAdapter;
    }

    if (lowerModelName.includes("flux-2/pro")) {
      // Flux 2 Pro handles text2img/img2img via dedicated model IDs
      return this.flux2ProAdapter;
    }

    if (lowerModelName.includes("flux-2/flex")) {
      // Flux 2 Flex handles text2img/img2img via dedicated model IDs
      return this.flux2FlexAdapter;
    }

    if (lowerModelName.includes("nano-banana")) {
      // If reference image is provided but model is not edit, switch to edit adapter
      const hasReferenceImage =
        referenceImageUrls && referenceImageUrls.length > 0;
      if (hasReferenceImage && !lowerModelName.includes("edit")) {
        return this.nanoBananaEditAdapter;
      }
    }

    // Seedream 4.5 uses the same model for both text-to-image and image-to-image
    // No auto-switch needed
    if (lowerModelName.includes("seedream/4.5") || lowerModelName.includes("seedream-4.5")) {
      return this.seedream45Adapter;
    }

    // Seedream uses the same model for both text-to-image and image-to-image
    // No auto-switch needed
    if (lowerModelName.includes("seedream")) {
      return this.seedreamAdapter;
    }

    // Z-Image only supports text-to-image, no reference image support
    if (lowerModelName.includes("z-image")) {
      return this.zImageAdapter;
    }

    return this.getAdapter(modelName);
  }

  /**
   * Check if a model requires reference image (edit mode)
   */
  static isEditModel(modelName: string): boolean {
    return modelName.toLowerCase().includes("edit");
  }
}
