/**
 * Base Generation Service
 * 抽象基类，包含所有生图服务的通用逻辑
 */

import { v4 as uuidv4 } from "uuid";
import { KieAIProvider } from "../providers/kie-ai-provider";
import {
  insertGeneration,
  findGenerationByUuid,
  updateGeneration,
  getUserGenerations as getUserGenerationsModel,
  findGenerationByRemoteTaskId,
} from "@/models/generation";
import {
  getGenerationImagesByGenerationUuid,
  insertGenerationImage,
  insertGenerationImages,
  getImagesByGenerationUuids,
} from "@/models/generation-image";
import {
  findCharacterByUuid,
  updateCharacter,
  type NewCharacter,
} from "@/models/character";
import {
  getCharacterModules,
  updateCharacterModules,
} from "@/services/character-modules";
import {
  getUserBalance,
  decreaseCredits,
  refundCredits, // ✅ 新增：软删除退款函数
  restoreCredits, // ✅ 新增：恢复作废积分记录函数
  CreditsTransType,
} from "@/services/credit";
import { getActiveModels } from "@/lib/configs";
import { AnimeStorageService } from "../storage/anime-storage-service";
import { ThumbnailConfig } from "@/types/storage";
import type {
  BaseGenerationRequest,
  GenerationResponse,
  GenerationStatus,
  HistoryOptions,
  HistoryResponse,
} from "./generation-types";
import { ValidationResult } from "./generation-types";
import { GENERATION_ERRORS } from "./generation-errors";
import {
  insertCharacterGeneration,
  insertCharacterGenerations,
  type CharacterGenerationInsert,
} from "@/models/character-generation";
import { PromptBuilderDispatcher } from "../prompt-builders/prompt-builder-dispatcher";
import { toImageUrl } from "@/lib/r2-utils";
import {
  generateWebhookToken,
  maskUrlForLog,
  truncateForLog,
} from "../webhook/webhook-security";
import { AVATAR_CREDITS_PER_GENERATION } from "@/configs/generation/credits";
import { ImageProcessor } from "../image-processor";
import type { CharacterModules } from "@/types/oc";

type GalleryItem = NonNullable<NonNullable<CharacterModules["art"]>["gallery"]>[number];

export abstract class BaseGenerationService<
  TRequest extends BaseGenerationRequest,
> {
  protected aiProvider: KieAIProvider;
  protected storageService: AnimeStorageService;
  protected promptBuilderDispatcher: PromptBuilderDispatcher;

  constructor() {
    this.aiProvider = new KieAIProvider();
    this.storageService = new AnimeStorageService();
    this.promptBuilderDispatcher = new PromptBuilderDispatcher();
  }

  /**
   * 创建生图任务 - 模板方法
   * 直接调用KieAI API，无需队列系统
   */
  async createGeneration(params: TRequest): Promise<GenerationResponse> {
    const operationId = uuidv4();
    const startTime = Date.now();

    let generationUuid: string | undefined;
    let creditsDeducted = false;

    try {
      // 1. 验证参数（由子类实现）
      const validation = await this.validateGenerationParams(params);
      if (!validation.valid) {
        console.log(`[${operationId}] Validation failed:`, validation.errors);
        throw new Error(validation.errors.join(", "));
      }

      // 2. 计算积分消耗（允许覆盖）
      const creditsCost = await this.resolveCreditsCost(params);

      // 🔴 修复：如果 credits_cost 为 0，跳过权限检查和扣费逻辑（用于自动生成的头像）
      const isFreeGeneration = creditsCost === 0;

      // 3. 检查用户权限和积分（仅针对收费生成）
      if (!isFreeGeneration) {
        await this.checkUserPermissions(params.user_uuid, creditsCost);
      }

      // 4. 构建完整提示词并保存原始用户提示词
      const fullPrompt = await this.buildFullPrompt(params);

      const originalPrompt = this.extractPrompt(params);

      // 5. 创建数据库记录（直接模式）
      generationUuid = uuidv4();
      const primaryType = this.getPrimaryGenerationType(params);
      const subType = this.getGenerationSubType(params);
      const webhookToken = generateWebhookToken();

      const generation = await insertGeneration({
        uuid: generationUuid,
        user_uuid: params.user_uuid,
        created_at: new Date(),
        updated_at: new Date(),
        type: primaryType,
        sub_type: subType,
        prompt: fullPrompt,
        model_id: params.model_id,
        style_preset: this.extractStylePreset(params),
        reference_image_url: this.serializeReferenceImageUrl(
          this.extractReferenceImageUrl(params)
        ),
        counts: params.counts,
        success_count: 0,
        remote_task_id: null,
        callback_received: false,
        last_query_time: null,
        status: "pending",
        progress: 0,
        credits_cost: creditsCost,
        generation_time: null,
        error_message: null,
        error_code: null,
        // 将用户原始提示词和关键参数写入metadata，便于后续复用
        metadata: {
          ...(params.metadata || {}),
          webhook_token: webhookToken,
          original_prompt: originalPrompt,
          aspect_ratio: params.aspect_ratio,
          image_resolution: (params as any).image_resolution,
          style_preset: this.extractStylePreset(params),
          scene_preset: (params as any).scene_preset,
          outfit_preset: (params as any).outfit_preset,
          action_preset: (params as any).action_preset,
        },
        character_uuids: this.serializeCharacterUuids(params.character_uuids),
        visibility_level: this.extractVisibilityLevel(params),
      });

      if (!generation) {
        console.error(`[${operationId}] Failed to create generation record`);
        throw new Error("Failed to create generation record");
      }

      // 6. 直接调用KieAI API（在任务创建成功后扣费）

      const referenceImageUrls = this.extractReferenceImageUrl(params);
      const stylePreset = this.extractStylePreset(params);

      // 🔍 输出最终请求参数用于调试
      const finalRequestParams = {
        model_name: params.model_id,
        prompt: fullPrompt,
        aspect_ratio: params.aspect_ratio,
        counts: params.counts,
        reference_image_urls: Array.isArray(referenceImageUrls)
          ? referenceImageUrls
          : referenceImageUrls
            ? [referenceImageUrls]
            : [],
        style_preset: stylePreset,
        image_resolution: params.image_resolution,
      };

      console.log(`[KieAI API Request] params:`, {
        model_name: finalRequestParams.model_name,
        aspect_ratio: finalRequestParams.aspect_ratio,
        counts: finalRequestParams.counts,
        reference_image_urls: finalRequestParams.reference_image_urls.map(maskUrlForLog),
        style_preset: finalRequestParams.style_preset,
        image_resolution: finalRequestParams.image_resolution,
        prompt: truncateForLog(finalRequestParams.prompt),
      });

      let apiResult: any;
      try {
        apiResult = await this.aiProvider.createTask(
          finalRequestParams,
          this.getCallbackUrl(webhookToken)
        );
      } catch (apiError: any) {
        console.error(`[${operationId}] KieAI API request failed:`, apiError);

        // 更新generation记录为失败状态（API失败不扣费）
        await updateGeneration(generationUuid, {
          status: "failed",
          error_message: apiError.message || "Failed to create generation task",
          error_code: "API_CALL_FAILED",
          updated_at: new Date(),
        });

        throw new Error(apiError.message || "Failed to create generation task");
      }

      // 7. ✅ API成功返回taskId → 原子操作：扣除积分 + 更新状态
      try {
        // 🔴 修复：免费生成跳过扣费逻辑（自动生成的头像）
        if (isFreeGeneration) {
          // 免费生成：直接更新状态为 processing，不扣费
          const { generations } = await import("@/db/schema");
          const { eq } = await import("drizzle-orm");

          await updateGeneration(generationUuid!, {
            remote_task_id: apiResult.taskId,
            status: "processing",
            progress: 10,
            updated_at: new Date(),
          });

          console.log(
            `[${operationId}] Free generation created without credit deduction: ${generationUuid}`
          );
        } else {
          // 收费生成：使用数据库事务保证原子性
          const { db: getDb } = await import("@/db");
          const dbInstance = getDb();

          if (!generationUuid) {
            throw new Error("Generation uuid missing before credit deduction");
          }
          const generationUuidValue = generationUuid;

          await dbInstance.transaction(async (tx) => {
            // 7.1 扣除积分（传入事务对象）
            const creditsTransType =
              this.resolveCreditsTransType(params) ||
              CreditsTransType.generation(this.getGenerationType());

            await decreaseCredits({
              user_uuid: params.user_uuid,
              trans_type: creditsTransType,
              credits: creditsCost,
              generation_uuid: generationUuidValue,
              tx, // 传入事务对象
            });

            // 7.2 更新状态为 processing（与扣费原子化）
            const { generations } = await import("@/db/schema");
            const { eq } = await import("drizzle-orm");

            await tx.update(generations)
              .set({
                remote_task_id: apiResult.taskId,
                status: "processing",
                progress: 10,
                updated_at: new Date(),
              })
              .where(eq(generations.uuid, generationUuidValue));
          });

          creditsDeducted = true;
          console.log(
            `[${operationId}] Credits deducted and generation updated: ${creditsCost} credits for generation ${generationUuid}`
          );
        }
      } catch (creditError: any) {
        console.error(
          "Failed to deduct credits or update generation status:",
          creditError
        );

        if (generationUuid) {
          // 更新generation记录为失败状态
          await updateGeneration(generationUuid, {
            status: "failed",
            error_message: "Failed to deduct credits or update status",
            error_code: "CREDITS_DEDUCTION_FAILED",
            updated_at: new Date(),
          });
        }

        throw new Error("Failed to deduct credits for generation");
      }

      const duration = Date.now() - startTime;

      return {
        generation_uuid: generationUuid,
        status: "processing",
        remote_task_id: apiResult.taskId,
        estimated_time: this.estimateGenerationTime(
          params.model_id,
          params.counts
        ),
        credits_cost: creditsCost,
        message: "Generation task submitted to KieAI API",
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(
        `[${operationId}] Failed to create generation task (${duration}ms):`,
        error
      );

      // 注意：现在积分只会在API成功创建任务后才扣除（创建后即时扣费）
      // 所以在catch块中，不需要处理积分返还逻辑
      // 因为只有以下情况会进入catch：
      // 1. 参数验证失败 - 无积分操作
      // 2. KieAI API调用失败 - 无积分操作（已在try-catch中更新状态）
      // 3. 扣除积分失败 - 无需返还（已在try-catch中更新状态）

      throw new Error(
        (error as any)?.message || "Failed to create generation task"
      );
    }
  }

  /**
   * 查询生成状态（只读操作）
   */
  async getGenerationStatus(uuid: string): Promise<GenerationStatus | null> {
    try {
      const generation = await findGenerationByUuid(uuid);

      if (!generation) {
        return null;
      }

      // 🔴 检查图片记录以确定真实状态
      const images = await getGenerationImagesByGenerationUuid(uuid);
      let actualStatus = generation.status;
      let results = undefined;

      // 🔴 如果存在图片记录，说明生成已完成，无论数据库状态如何
      if (images && images.length > 0) {
        console.log(
          `[getGenerationStatus] Found ${images.length} images for generation ${uuid}, forcing status to 'completed'`
        );
        console.log(
          `[getGenerationStatus] Original status: ${generation.status}, webhook received: ${generation.callback_received}`
        );

        actualStatus = "completed";
        results = images.map((img) => ({
          id: img.id!,
          image_url: toImageUrl(img.image_url!),
          generation_uuid: img.generation_uuid!,
          created_at: img.created_at?.toISOString() || "",
          image_uuid: img.uuid || `${img.id}`, // 确保返回image_uuid
          thumbnail_url: toImageUrl(img.thumbnail_mobile || img.thumbnail_desktop),
        }));
      } else if (generation.status === "completed") {
        // 🔴 如果状态是completed但没有图片，可能是数据不一致
        console.warn(
          `[getGenerationStatus] Generation ${uuid} marked as completed but no images found`
        );
        results = [];
      }

      return {
        uuid: generation.uuid!,
        status: actualStatus as any,
        progress: actualStatus === "completed" ? 100 : generation.progress || 0,
        results,
        error_message: generation.error_message || undefined,
        created_at: generation.created_at?.toISOString(),
        batch_size: generation.counts,
        credits_used: generation.credits_cost,
      };
    } catch (error) {
      console.error("Failed to get generation status:", error);
      return null;
    }
  }

  /**
   * 获取用户历史记录
   */
  async getUserGenerationHistory(
    userUuid: string,
    options: HistoryOptions = {}
  ): Promise<HistoryResponse> {
    try {
      const { limit = 20, page = 1 } = options;

      const generations = await getUserGenerationsModel(userUuid, page, limit);

      const generationUuids = generations
        .map((gen) => gen.uuid!)
        .filter(Boolean);

      const allImages = await getImagesByGenerationUuids(generationUuids);
      const imagesByGeneration = new Map<string, typeof allImages>();
      for (const img of allImages) {
        const key = img.generation_uuid!;
        const list = imagesByGeneration.get(key);
        if (list) {
          list.push(img);
        } else {
          imagesByGeneration.set(key, [img]);
        }
      }

      const historyItems = generations.map((gen) => {
        const images = imagesByGeneration.get(gen.uuid!) || [];
        images.sort((a, b) => {
          const at = a.created_at?.getTime?.() || 0;
          const bt = b.created_at?.getTime?.() || 0;
          return at - bt;
        });

        return {
          uuid: gen.uuid!,
          status: gen.status!,
          model_id: gen.model_id!,
          counts: gen.counts || 1,
          credits_cost: gen.credits_cost || 0,
          created_at: gen.created_at?.toISOString() || "",
          completed_at: gen.updated_at?.toISOString(),
          error_message: gen.error_message || undefined,
          images: images.map((img) => ({
            id: img.id!,
            image_url: img.image_url!,
            image_alt: img.thumbnail_desktop || img.thumbnail_mobile,
            generation_uuid: img.generation_uuid!,
            created_at: img.created_at?.toISOString() || "",
          })),
        };
      });

      return {
        generations: historyItems,
        pagination: {
          page,
          limit,
          total: historyItems.length,
          totalPages: Math.ceil(historyItems.length / limit),
        },
      };
    } catch (error) {
      console.error("Failed to get user generation history:", error);
      const limit = options.limit || 20;
      return {
        generations: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * 处理 Webhook 回调 - 延迟转存MVP版本
   * 使用临时URL快速存库，不进行文件转存和分辨率处理
   */
  async handleWebhookCallback(
    taskId: string,
    state: string,
    resultUrls?: string[],
    failMsg?: string
  ): Promise<void> {
    try {
      const generation = await findGenerationByRemoteTaskId(taskId);

      if (!generation) {
        console.warn(`Generation not found for task ${taskId}`);
        return;
      }

      const normalizedState = state === "failed" ? "fail" : state;

      // Idempotency: always skip if already completed; for failed, allow success to override.
      if (generation.status === "completed") {
        console.log(
          `Generation ${generation.uuid} already in final state: ${generation.status}`
        );
        return;
      }
      if (generation.status === "failed" && normalizedState !== "success") {
        console.log(
          `Generation ${generation.uuid} already in final state: ${generation.status}`
        );
        return;
      }

      // 🔧 修复：移除 callback_received 检查
      // 让 webhook 能够处理竞态条件（轮询失败先执行，webhook 后到达的情况）
      // 只要是成功状态，就允许处理

      if (normalizedState === "success" && resultUrls && resultUrls.length > 0) {
        // 🔧 修复：允许 webhook 覆盖失败状态，特别是成功状态的 webhook
        // 如果是成功状态，即使之前被轮询失败标记，也允许处理
        console.log(
          `[BaseGenerationService.handleWebhookCallback] Allowing success webhook to override previous state for generation ${generation.uuid}, previous_status: ${generation.status}, callback_received: ${generation.callback_received}`
        );

        // 延迟转存策略：直接使用临时URL快速存库
        console.log(
          `Creating image records with temp URLs for generation ${generation.uuid}`
        );

        // 计算临时URL过期时间（KieAI临时URL通常7天后过期）
        const tempUrlExpiresAt = new Date();
        tempUrlExpiresAt.setHours(tempUrlExpiresAt.getHours() + 168);

        // 从metadata中读取用户原始提示词（在创建任务时已写入）
        const originalUserPrompt =
          (generation as any)?.metadata?.original_prompt || undefined;

        const existingImages = await getGenerationImagesByGenerationUuid(
          generation.uuid!
        );
        const existingUrls = new Set(
          existingImages.map((img) => img.image_url!).filter(Boolean)
        );
        const newUrls = resultUrls.filter((url) => !existingUrls.has(url));
        const hasCharacterBinding = Boolean(generation.character_uuids);

        // Create generation_images records using temp URLs (no transfer in webhook path).
        const imageRecords = newUrls.map((tempUrl, index) => ({
          uuid: uuidv4(),
          generation_uuid: generation.uuid!,
          user_uuid: generation.user_uuid!,
          image_index: existingImages.length + index + 1,
          gen_type: generation.sub_type || generation.type,
          style: generation.style_preset,
          image_url: tempUrl, // 使用临时URL
          thumbnail_mobile: tempUrl, // 临时：缩略图也使用原图，后续转存时优化
          thumbnail_desktop: tempUrl,
          thumbnail_detail: tempUrl,
          generation_params: JSON.stringify({
            model_id: generation.model_id,
            prompt: generation.prompt,
            original_prompt: originalUserPrompt,
            counts: generation.counts,
            reference_image_url: generation.reference_image_url,
            aspect_ratio: (generation.metadata as any)?.aspect_ratio || "1:1",
            image_resolution: (generation.metadata as any)?.image_resolution,
            style_preset: generation.style_preset,
            scene_preset: (generation.metadata as any)?.scene_preset,
            outfit_preset: (generation.metadata as any)?.outfit_preset,
          }),
          final_prompt: generation.prompt, // 完整的构建后提示词
          original_prompt: originalUserPrompt, // 真实的用户输入提示词
          model_id: generation.model_id,
          reference_image_url: generation.reference_image_url,
          generation_time: null,
          visibility_level: generation.visibility_level || "private",
          created_at: new Date(),
          updated_at: new Date(),
        }));
        const allImageRecords = [...existingImages, ...imageRecords];

        if (imageRecords.length > 0) {
          await insertGenerationImages(imageRecords);
        }

        // 更新generation记录，标记为待转存
        await updateGeneration(generation.uuid!, {
          status: "completed",
          success_count: existingImages.length + imageRecords.length,
          callback_received: true,
          progress: 100,
          file_transfer_status: "pending", // 标记为待转存
          temp_url_expires_at: tempUrlExpiresAt,
          updated_at: new Date(),
        });

        console.log(`Webhook handled successfully: ${imageRecords.length} image records created with temp URLs`);

        // 🔴 新增：恢复之前可能错误作废的积分记录
        // 处理 webhook 晚到的情况（轮询超时后 webhook 才到达）
        try {
          await restoreCredits(
            generation.user_uuid!,
            generation.uuid!,
            "Webhook received after polling timeout - generation actually succeeded"
          );
          console.log(
            `[BaseGenerationService.handleWebhookCallback] Restored voided credits for generation ${generation.uuid}`
          );
        } catch (restoreError) {
          console.error(
            `[BaseGenerationService.handleWebhookCallback] Failed to restore credits:`,
            restoreError
          );
          // 积分恢复失败不应影响主流程，仅记录错误
        }

        // 处理OC角色生成记录 - 仅针对新生成的图片
        if (hasCharacterBinding && imageRecords.length > 0) {
          try {
            // 注意：这里传入的是临时URL，不是上传后的R2 URL
            const uploadedImages = newUrls.map((url) => ({
              imageUrl: url,
              thumbnailUrls: {
                mobile: url,
                desktop: url,
                detail: url,
              },
            }));
            await this.recordCharacterGenerations(generation, uploadedImages);
          } catch (error) {
            console.error(
              `[handleWebhookCallback] Failed to record character generations for ${generation.uuid}:`,
              error
            );
            // 记录详细错误但不抛出，避免影响主流程
            console.error("[handleWebhookCallback] Error details:", {
              generation_uuid: generation.uuid,
              character_uuids: generation.character_uuids,
              error_message:
                error instanceof Error ? error.message : String(error),
              error_stack: error instanceof Error ? error.stack : undefined,
            });
          }
        }

        // 自动关联立绘到角色 - 使用所有图片（包括已有图片）
        // 这样即使轮询已经创建了图片记录，webhook也能正确关联
        if (hasCharacterBinding && allImageRecords.length > 0) {
          try {
            await this.autoAttachCharacterImages(
              generation,
              allImageRecords[0]
            );
          } catch (error) {
            console.error(
              `[handleWebhookCallback] Failed to auto attach images for characters ${generation.character_uuids}:`,
              error
            );
          }
        }

        // 自动生成头像 - 仅针对快速生成和手动创建模式
        if (hasCharacterBinding && allImageRecords.length > 0) {
          try {
            await this.autoGenerateAvatarFromProfile(
              generation,
              allImageRecords[0]
            );
          } catch (error) {
            console.error(
              `[handleWebhookCallback] Failed to auto generate avatar for characters ${generation.character_uuids}:`,
              error
            );
          }
        }

        // 添加到画廊 - 仅针对快速生成
        if (hasCharacterBinding && allImageRecords.length > 0) {
          try {
            await this.appendQuickGeneratePortraitToGallery(
              generation,
              allImageRecords[0]
            );
          } catch (error) {
            console.error(
              `[handleWebhookCallback] Failed to append quick generation portrait to gallery for characters ${generation.character_uuids}:`,
              error
            );
          }
        }

        if (hasCharacterBinding && allImageRecords.length > 0) {
          try {
            await this.appendCharacterGenerationToGallery(
              generation,
              allImageRecords
            );
          } catch (error) {
            console.error(
              `[handleWebhookCallback] Failed to append character generation images to gallery for characters ${generation.character_uuids}:`,
              error
            );
          }
        }
      } else if (normalizedState === "fail") {
        // 更新为失败状态
        await updateGeneration(generation.uuid!, {
          status: "failed",
          error_message: failMsg || "Generation failed",
          error_code: "GENERATION_FAILED",
          callback_received: true,
          progress: 0,
          updated_at: new Date(),
        });

        // 退还积分
        try {
          await this.refundCredits(
            generation.user_uuid!,
            generation.credits_cost || 0,
            generation.uuid!
          );
        } catch (refundError) {
          console.error(
            `Failed to refund credits for generation ${generation.uuid}:`,
            refundError
          );
        }
      }
    } catch (error) {
      console.error("Failed to handle webhook callback:", error);
      throw error;
    }
  }

  // ========== 抽象方法 - 由子类实现 ==========

  /**
   * 验证生成参数
   */
  protected abstract validateGenerationParams(
    params: TRequest
  ): Promise<ValidationResult>;

  /**
   * 构建完整提示词
   */
  protected abstract buildFullPrompt(params: TRequest): Promise<string>;

  /**
   * 获取生成类型标识
   */
  protected abstract getGenerationType(): string;

  /**
   * 从请求中提取基础提示词
   */
  protected abstract extractPrompt(params: TRequest): string;

  /**
   * 从请求中提取样式预设
   */
  protected abstract extractStylePreset(params: TRequest): string | undefined;

  /**
   * 从请求中提取参考图片URL
   */
  protected abstract extractReferenceImageUrl(
    params: TRequest
  ): string | string[] | undefined;

  /**
   * 序列化参考图片URL用于数据库存储
   */
  protected serializeReferenceImageUrl(
    referenceUrls: string | string[] | undefined
  ): string | undefined {
    if (!referenceUrls) return undefined;
    if (Array.isArray(referenceUrls)) {
      return referenceUrls.join(",");
    }
    return referenceUrls;
  }

  /**
   * 从请求中提取可见性级别
   */
  protected extractVisibilityLevel(params: TRequest): string {
    return (params as any).visibility_level || "private";
  }

  /**
   * 从请求中提取生成类型
   */
  protected abstract extractGenType(params: TRequest): string | undefined;

  /**
   * 获取当前生成类型的分辨率配置
   */
  protected abstract getResolutionConfig(): ThumbnailConfig[];

  // ========== 通用私有方法 ==========

  /**
   * 序列化角色UUID数组为逗号分隔字符串
   */
  private serializeCharacterUuids(
    uuids: string[] | undefined
  ): string | undefined {
    if (!uuids || uuids.length === 0) {
      return undefined;
    }

    // 过滤空值并去重
    const uniqueUuids = Array.from(new Set(uuids.filter(Boolean)));

    if (uniqueUuids.length === 0) {
      return undefined;
    }

    return uniqueUuids.join(",");
  }

  /**
   * 反序列化角色UUID字符串为数组
   */
  private deserializeCharacterUuids(
    uuidsStr: string | null | undefined
  ): string[] {
    if (!uuidsStr || typeof uuidsStr !== "string") {
      return [];
    }

    return uuidsStr
      .split(",")
      .map((uuid) => uuid.trim())
      .filter(Boolean);
  }

  /**
   * 检查用户权限和积分
   */
  private async checkUserPermissions(
    userUuid: string,
    requiredCredits: number
  ): Promise<void> {
    const balance = await getUserBalance(userUuid);

    if (balance < requiredCredits) {
      throw GENERATION_ERRORS.INSUFFICIENT_CREDITS;
    }
  }

  private async resolveCreditsCost(params: TRequest): Promise<number> {
    const override = this.resolveCreditsOverride(params);
    if (override !== undefined) {
      return override;
    }
    return await this.calculateCredits(
      params.model_id,
      params.counts,
      params.image_resolution
    );
  }

  private resolveCreditsOverride(params: TRequest): number | undefined {
    const override = params.metadata?.credits_override;
    if (typeof override !== "number" || !Number.isFinite(override)) {
      return undefined;
    }
    // 🔴 修复：允许 credits_override = 0（用于免费生成，如自动头像）
    // 只有当 override < 0 时才返回 undefined
    if (override < 0) {
      return undefined;
    }
    return Math.trunc(override);
  }

  private resolveCreditsTransType(params: TRequest): string | undefined {
    const override = params.metadata?.credits_trans_type;
    if (typeof override !== "string") {
      return undefined;
    }
    const normalized = override.trim();
    return normalized ? normalized : undefined;
  }

  /**
   * 计算积分消耗
   */
  private async calculateCredits(
    modelId: string,
    imageCount: number,
    imageResolution?: string
  ): Promise<number> {
    if (this.getGenerationType() == "avatar") {
      return AVATAR_CREDITS_PER_GENERATION;
    }
    const models = await getActiveModels();
    const model = models.find((m) => m.model_id === modelId);

    if (!model) {
      throw GENERATION_ERRORS.INVALID_MODEL;
    }

    if (!model.credits_per_generation || model.credits_per_generation <= 0) {
      throw new Error(`Invalid credits configuration for model: ${modelId}`);
    }

    const normalizedResolution =
      typeof imageResolution === "string" ? imageResolution.trim().toUpperCase() : "";
    const perResolutionCredits =
      model?.config?.resolution_credits?.[normalizedResolution];
    if (
      typeof perResolutionCredits === "number" &&
      Number.isFinite(perResolutionCredits) &&
      perResolutionCredits > 0
    ) {
      return perResolutionCredits * imageCount;
    }

    return model.credits_per_generation * imageCount;
  }

  /**
   * 获取回调 URL
   */
  private getCallbackUrl(token?: string): string {
    const baseUrl =
      process.env.NEXT_PUBLIC_WEBHOOK_URL ||
      process.env.NEXT_PUBLIC_WEB_URL ||
      "https://anividai.com";
    const url = new URL(`${baseUrl}/api/generation/webhook`);
    if (token) {
      url.searchParams.set("token", token);
    }
    return url.toString();
  }

  /**
   * 估算生成时间
   */
  private estimateGenerationTime(
    modelName: string,
    imageCount: number
  ): number {
    const baseTime = modelName.toLowerCase().includes("gpt") ? 15 : 10;
    return baseTime * imageCount;
  }

  /**
   * 安全处理轮询失败 - 避免与webhook冲突
   * 修复：采用视频服务的策略，允许 webhook 覆盖失败状态
   * 这样可以处理 webhook 延迟到达的情况（轮询超时后 webhook 才到达）
   */
  protected async safeHandlePollingFailure(
    generationUuid: string,
    reason: string,
    errorType: "polling_error" | "polling_timeout" | "network_error"
  ): Promise<void> {
    try {
      console.log(
        `[BaseGenerationService.safeHandlePollingFailure] Processing ${errorType} for generation ${generationUuid}: ${reason}`
      );

      const generation = await findGenerationByUuid(generationUuid);

      if (!generation) {
        console.warn(
          `Generation ${generationUuid} not found, skipping failure handling`
        );
        return;
      }

      // 检查是否已经被处理过（避免重复处理）
      if (generation.status === "failed" || generation.status === "completed") {
        console.log(
          `Generation ${generationUuid} already in final state: ${generation.status}, skipping`
        );
        return;
      }

      // 🔧 修复：不再检查 callback_received，允许 webhook 覆盖失败状态
      // 这样可以处理 webhook 延迟到达的情况

      console.log(
        `[BaseGenerationService.safeHandlePollingFailure] Marking generation ${generationUuid} as failed`
      );

      // 原子操作：更新状态为失败
      // 注意：不设置 callback_received=true，让 webhook 可以覆盖
      await updateGeneration(generationUuid, {
        status: "failed",
        error_message: reason,
        error_code: errorType.toUpperCase(),
        progress: 0,
        updated_at: new Date(),
      });

      // 退还积分
      if (generation.credits_cost && generation.credits_cost > 0) {
        await this.refundCredits(
          generation.user_uuid!,
          generation.credits_cost,
          generationUuid
        );
      }

      console.log(
        `[BaseGenerationService.safeHandlePollingFailure] Successfully handled failure for generation ${generationUuid}`
      );
    } catch (error) {
      console.error(
        `[BaseGenerationService.safeHandlePollingFailure] Failed to handle polling failure for ${generationUuid}:`,
        error
      );
      throw error;
    }
  }

  /**
   * 退还积分（软删除实现）
   */
  private async refundCredits(
    userUuid: string,
    _credits: number, // 保留参数但不再使用，软删除会自动恢复原积分
    generationUuid: string
  ): Promise<void> {
    try {
      // ✅ 使用新的软删除 refundCredits 函数
      await refundCredits({
        user_uuid: userUuid,
        generation_uuid: generationUuid,
        reason: "Generation failed",
      });
      console.log(
        `Refunded credits to user ${userUuid} for generation ${generationUuid} (soft delete)`
      );
    } catch (error) {
      console.error("Failed to refund credits:", error);
      throw error;
    }
  }

  private async createCroppedAvatarFromProfile(params: {
    userUuid: string;
    characterUuid: string;
    imageUrl: string;
  }): Promise<string> {
    const imageProcessor = new ImageProcessor();
    const sourceBuffer = await imageProcessor.downloadImage(params.imageUrl);
    const croppedBuffer = await imageProcessor.cropTopThirdSquare(sourceBuffer, 512);
    const generationUuid = uuidv4();
    const now = new Date();

    await insertGeneration({
      uuid: generationUuid,
      user_uuid: params.userUuid,
      created_at: now,
      updated_at: now,
      type: "avatar",
      sub_type: "crop",
      prompt: "Auto-cropped avatar from profile image",
      model_id: "manual",
      status: "completed",
      counts: 1,
      success_count: 1,
      visibility_level: "private",
      character_uuids: params.characterUuid,
      credits_cost: 0,
      file_transfer_status: "completed",
    });

    const uploadResult = await this.storageService.uploadGenerationImage(
      generationUuid,
      1,
      croppedBuffer
    );

    const imageUuid = uuidv4();
    await insertGenerationImage({
      uuid: imageUuid,
      generation_uuid: generationUuid,
      user_uuid: params.userUuid,
      image_index: 1,
      gen_type: "avatar",
      image_url: uploadResult.imageUrl,
      thumbnail_mobile: uploadResult.thumbnailUrls?.mobile,
      thumbnail_desktop: uploadResult.thumbnailUrls?.desktop,
      thumbnail_detail: uploadResult.thumbnailUrls?.detail,
      reference_image_url: params.imageUrl,
      visibility_level: "private",
      status: "archived",
      created_at: now,
      updated_at: now,
    });

    return imageUuid;
  }

  private async autoAttachCharacterImages(
    generation: any,
    imageRecord?: { uuid?: string | null; image_url?: string | null }
  ): Promise<void> {
    if (!imageRecord?.uuid) {
      return;
    }

    const metadata =
      generation?.metadata && typeof generation.metadata === "object"
        ? (generation.metadata as Record<string, any>)
        : null;

    const subType = generation?.sub_type || generation?.type;
    const shouldAttachProfile =
      (subType === "full_body" || subType === "profile") &&
      (metadata?.auto_attach_profile === true ||
        metadata?.source === "oc_quick_generate" ||
        metadata?.source === "oc_manual_create");
    const shouldAttachAvatar =
      subType === "avatar" &&
      (metadata?.auto_attach_avatar === true ||
        metadata?.source === "oc_quick_generate_avatar");

    if (
      !shouldAttachProfile &&
      !shouldAttachAvatar
    ) {
      return;
    }

    const characterUuids = this.deserializeCharacterUuids(
      generation.character_uuids
    );
    if (!characterUuids.length) {
      return;
    }

    await Promise.all(
      characterUuids.map(async (characterUuid) => {
        try {
          const character = await findCharacterByUuid(characterUuid);
          if (!character) {
            return;
          }

          const updates: Partial<NewCharacter> = {};
          if (shouldAttachProfile && !character.profile_generation_image_uuid) {
            updates.profile_generation_image_uuid = imageRecord.uuid;
          }

          if (shouldAttachAvatar && !character.avatar_generation_image_uuid) {
            updates.avatar_generation_image_uuid = imageRecord.uuid;
          }

          if (Object.keys(updates).length === 0) {
            return;
          }

          await updateCharacter(characterUuid, updates);
        } catch (error) {
          console.error(
            `[autoAttachCharacterImages] Failed to update character ${characterUuid}:`,
            error
          );
        }
      })
    );
  }

  /**
   * 自动生成头像 - 仅针对快速生成和手动创建模式
   * 检查 metadata.auto_generate_avatar 标记,触发生成头像任务
   * 头像生成不再单独计费,已包含在立绘生成费用中
   */
  private async autoGenerateAvatarFromProfile(
    generation: any,
    imageRecord?: { uuid?: string | null; image_url?: string | null }
  ): Promise<void> {
    if (!imageRecord?.image_url) {
      return;
    }

    const metadata =
      generation?.metadata && typeof generation.metadata === "object"
        ? (generation.metadata as Record<string, any>)
        : null;

    const subType = generation?.sub_type || generation?.type;

    // 仅针对快速生成和手动创建模式,并且标记了 auto_generate_avatar
    const shouldAutoGenerateAvatar =
      (subType === "full_body" || subType === "profile") &&
      (metadata?.auto_generate_avatar === true ||
        metadata?.source === "oc_quick_generate" ||
        metadata?.source === "oc_manual_create");

    if (!shouldAutoGenerateAvatar) {
      return;
    }

    const characterUuids = this.deserializeCharacterUuids(
      generation.character_uuids
    );
    if (!characterUuids.length) {
      return;
    }

    await Promise.all(
      characterUuids.map(async (characterUuid) => {
        try {
          const character = await findCharacterByUuid(characterUuid);
          if (!character || character.avatar_generation_image_uuid) {
            return; // 已有头像则跳过
          }

          // 动态导入 AvatarGenerationService 避免循环依赖
          const { AvatarGenerationService } = await import("../avatar/avatar-generation-service");
          const avatarService = new AvatarGenerationService();

          // 创建头像生成任务(不额外扣费,包含在立绘费用中)
          const result = await avatarService.createGeneration({
            user_uuid: generation.user_uuid,
            model_id: "google/nano-banana",
            aspect_ratio: "1:1",
            counts: 1,
            gen_type: "avatar",
            reference_image_urls: [imageRecord.image_url],
            character_uuids: [characterUuid], // 🔴 修复:设置 character_uuids 字段
            character_data: character,
            metadata: {
              source: metadata?.source === "oc_quick_generate"
                ? "oc_quick_generate_avatar"
                : "oc_manual_create_avatar",
              auto_attach_avatar: true,
              credits_override: 0, // 头像不再单独计费
              credits_trans_type: metadata?.credits_trans_type,
            },
          } as any);

          console.log(
            `[autoGenerateAvatarFromProfile] Avatar generation task created for character ${characterUuid}: ${result.generation_uuid}`
          );
        } catch (error) {
          console.error(
            `[autoGenerateAvatarFromProfile] Failed to generate avatar for character ${characterUuid}:`,
            error
          );
          // 头像生成失败不影响主流程,仅记录错误
        }
      })
    );
  }

  private async appendQuickGeneratePortraitToGallery(
    generation: any,
    imageRecord?: { uuid?: string | null }
  ): Promise<void> {
    if (!imageRecord?.uuid) {
      return;
    }

    const metadata =
      generation?.metadata && typeof generation.metadata === "object"
        ? (generation.metadata as Record<string, any>)
        : null;

    if (metadata?.source !== "oc_quick_generate") {
      return;
    }

    const characterUuids = this.deserializeCharacterUuids(
      generation.character_uuids
    );
    if (!characterUuids.length) {
      return;
    }

    await Promise.all(
      characterUuids.map(async (characterUuid) => {
        try {
          const modules = await getCharacterModules(characterUuid);
          const gallery: GalleryItem[] = Array.isArray(modules.art?.gallery)
            ? [...modules.art.gallery]
            : [];
          if (!imageRecord.uuid) {
            throw new Error("Missing image uuid for gallery append");
          }
          const imageUuid = imageRecord.uuid;
          const hasImage = gallery.some(
            (item) =>
              item.meta?.image_uuid === imageUuid ||
              item.url === imageUuid
          );
          if (hasImage) {
            return;
          }

          const newItem: GalleryItem = {
            id: `generation_${imageUuid}`,
            url: imageUuid,
            type: "generation",
            meta: { image_uuid: imageUuid },
          };
          const nextGallery: GalleryItem[] = [...gallery, newItem];

          await updateCharacterModules(characterUuid, {
            art: { gallery: nextGallery },
          });
        } catch (error) {
          console.error(
            `[appendQuickGeneratePortraitToGallery] Failed to update character ${characterUuid}:`,
            error
          );
        }
      })
    );
  }

  private async appendCharacterGenerationToGallery(
    generation: any,
    imageRecords: Array<{ uuid?: string | null }>
  ): Promise<void> {
    if (!generation || generation.type !== "character") {
      return;
    }

    const characterUuids = this.deserializeCharacterUuids(
      generation.character_uuids
    );
    if (!characterUuids.length) {
      return;
    }

    const validImages = imageRecords.filter((record) => !!record?.uuid);
    if (!validImages.length) {
      return;
    }

    await Promise.all(
      characterUuids.map(async (characterUuid) => {
        try {
          const modules = await getCharacterModules(characterUuid);
          const gallery: GalleryItem[] = Array.isArray(modules.art?.gallery)
            ? [...modules.art.gallery]
            : [];
          let nextGallery: GalleryItem[] = [...gallery];
          let changed = false;

          validImages.forEach((record) => {
            const imageUuid = record.uuid!;
            const hasImage = nextGallery.some(
              (item) =>
                item.meta?.image_uuid === imageUuid || item.url === imageUuid
            );
            if (hasImage) {
              return;
            }

            const newItem: GalleryItem = {
              id: `generation_${imageUuid}`,
              url: imageUuid,
              type: "generation",
              meta: { image_uuid: imageUuid },
            };
            nextGallery.push(newItem);
            changed = true;
          });

          if (!changed) {
            return;
          }

          await updateCharacterModules(characterUuid, {
            art: { gallery: nextGallery },
          });
        } catch (error) {
          console.error(
            `[appendCharacterGenerationToGallery] Failed to update character ${characterUuid}:`,
            error
          );
        }
      })
    );
  }

  /**
   * 处理OC角色生成记录（支持多角色）
   */
  private async recordCharacterGenerations(
    generation: any,
    uploadedImages: any[]
  ): Promise<void> {
    // 反序列化角色UUID列表
    const characterUuids = this.deserializeCharacterUuids(
      generation.character_uuids
    );

    if (characterUuids.length === 0) {
      console.log(
        `[recordCharacterGenerations] No character UUIDs found for generation ${generation.uuid}`
      );
      return;
    }

    console.log(
      `[recordCharacterGenerations] Processing ${characterUuids.length} character(s) for generation ${generation.uuid}: ${characterUuids.join(", ")}`
    );

    try {
      // 为每个角色创建一条记录
      const characterGenerationRecords: CharacterGenerationInsert[] =
        characterUuids.map((characterUuid) => ({
          character_uuid: characterUuid,
          created_at: new Date(),
          generation_type: "image",
          generation_uuid: generation.uuid,
          parameters: {
            model_id: generation.model_id,
            style_preset: generation.style_preset,
            counts: generation.counts,
            reference_image_url: generation.reference_image_url,
            image_urls: uploadedImages.map((img) => img.imageUrl),
            generation_type: generation.sub_type || generation.type,
            prompt: generation.prompt,
          },
          visibility_level: generation.visibility_level || "private",
        }));

      // 批量插入
      const inserted = await insertCharacterGenerations(
        characterGenerationRecords
      );
      console.log(
        `[recordCharacterGenerations] Successfully inserted ${inserted.length} character generation records for generation ${generation.uuid}`
      );
    } catch (error) {
      console.error(
        `[recordCharacterGenerations] Failed to insert character generations:`,
        error
      );
      throw error; // 重新抛出以便上层捕获
    }
  }

  /**
   * 获取数据库记录使用的一级类型（默认等同于服务类型）
   */
  protected getPrimaryGenerationType(_params: TRequest): string {
    return this.getGenerationType();
  }

  /**
   * 获取数据库记录使用的二级类型（默认等同于服务类型，可由子类覆盖）
   */
  protected getGenerationSubType(_params: TRequest): string {
    return this.getGenerationType();
  }
}
