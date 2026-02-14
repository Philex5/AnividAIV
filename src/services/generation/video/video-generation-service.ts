import { v4 as uuidv4 } from "uuid";
import { VideoParamsSchema, VideoGenerationRequest } from "./video-types";
import { VideoPromptBuilder } from "./video-prompt-builder";
import { getVideoModels } from "@/lib/configs";
import {
  getUserBalance,
  decreaseCredits,
  refundCredits, // ✅ 新增：软删除退款函数
  restoreCredits, // ✅ 新增：恢复作废积分记录函数
  CreditsTransType,
} from "@/services/credit";
import {
  insertGeneration,
  findGenerationByUuid,
  updateGeneration,
  findGenerationByRemoteTaskId,
} from "@/models/generation";
import {
  insertGenerationVideos,
  getGenerationVideosByGenerationUuid,
} from "@/models/generation-video";
import { VideoAIProvider } from "../providers/video-ai-provider";
import type { VideoGenerationParams } from "@/types/video-provider";
import { VideoParameterConverter } from "@/services/video-parameter-converter";
import { videoProcessor } from "@/services/generation/video-processor";
import {
  insertCharacterGenerations,
  type CharacterGenerationInsert,
} from "@/models/character-generation";
import { generateWebhookToken } from "@/services/generation/webhook/webhook-security";
import { getMembershipLevel } from "@/services/membership";
import { applyVideoWatermark } from "./video-watermark-service";
import { normalizeGenType } from "@/configs/gen-type-display";

export class VideoGenerationService {
  private videoProvider: VideoAIProvider;

  constructor() {
    this.videoProvider = VideoAIProvider.getInstance();
  }

  async createGeneration(params: VideoGenerationRequest) {
    const startTime = Date.now();
    let generationUuid: string | undefined;
    let creditsCost: number | undefined;

    try {
      // 1) Validate
      const parsed = VideoParamsSchema.parse(params);
      console.log("[VideoService] CreateGeneration: Request validated", {
        user_uuid: parsed.user_uuid,
        model_id: parsed.model_id,
        duration: parsed.duration_seconds || parsed.duration,
        aspect_ratio: parsed.aspect_ratio,
      });

      // ✅ 生成 generationUuid
      generationUuid = uuidv4();
      console.log(
        "[VideoService] CreateGeneration: Generated UUID for tracking",
        {
          generation_uuid: generationUuid,
        },
      );

      // 2) 转换为统一视频参数
      const videoParams: VideoGenerationParams =
        this.transformToVideoParams(parsed);

      // 3) 使用Adapter计算积分费用
      creditsCost = await this.videoProvider.calculateVideoCredits(videoParams);
      const balance = await getUserBalance(parsed.user_uuid);

      if (balance < creditsCost) {
        console.error("[VideoService] CreateGeneration: Insufficient credits", {
          user_uuid: parsed.user_uuid,
          required: creditsCost,
          available: balance,
        });
        throw new Error("Insufficient credits");
      }

      const isMultiShotMode =
        parsed.multi_shots === true || parsed.video_mode === "multi_shot";
      const promptBuilderBaseParams = {
        style_preset: parsed.style_preset,
        camera_motion: parsed.motion,
        character_uuids: parsed.character_uuid
          ? [parsed.character_uuid]
          : undefined,
        addQualityTerms: true,
      };

      // 4) Build prompt
      // multi-shot: apply template to each multi_prompt item, not outer prompt.
      const enhancedPrompt = isMultiShotMode
        ? parsed.prompt.trim()
        : await VideoPromptBuilder.buildPrompt({
            ...promptBuilderBaseParams,
            prompt: parsed.prompt,
          });

      const enhancedMultiPrompt =
        isMultiShotMode && parsed.multi_prompt?.length
          ? await Promise.all(
              parsed.multi_prompt.map(async (segment) => ({
                duration: segment.duration,
                prompt: await VideoPromptBuilder.buildPrompt({
                  ...promptBuilderBaseParams,
                  prompt: segment.prompt,
                }),
              })),
            )
          : parsed.multi_prompt;

      // 🔴 修复：保存用户原始提示词（用于显示）
      const originalUserPrompt = parsed.prompt;
      const membershipLevel = await getMembershipLevel(parsed.user_uuid);

      // 5) 创建 generation 记录（pending状态）
      console.log(
        "[VideoService] CreateGeneration: Creating generation record",
        {
          generation_uuid: generationUuid,
        },
      );

      const subType = normalizeGenType(parsed.gen_type) || "anime_video";
      const webhookToken = generateWebhookToken();
      const primaryReferenceImage =
        parsed.reference_image_url || parsed.reference_image_urls?.[0];

      await insertGeneration({
        uuid: generationUuid,
        user_uuid: parsed.user_uuid,
        created_at: new Date(),
        updated_at: new Date(),
        type: "video",
        sub_type: subType,
        prompt: enhancedPrompt,
        model_id: parsed.model_id,
        style_preset: parsed.style_preset,
        reference_image_url: primaryReferenceImage,
        counts: 1,
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
        metadata: {
          video: {
            task_subtype: parsed.task_subtype,
            video_mode: parsed.video_mode,
            duration: parsed.duration_seconds || parsed.duration,
            ratio: parsed.aspect_ratio,
            resolution: parsed.resolution,
            mode: parsed.mode,
            multi_shots: parsed.multi_shots,
            sound: parsed.sound,
            multi_prompt: parsed.multi_prompt,
            kling_elements: parsed.kling_elements,
            motion: parsed.motion,
            style: parsed.style_preset,
            fps: parsed.fps,
          },
          original_prompt: originalUserPrompt,
          membership_level: membershipLevel,
          webhook_token: webhookToken,
          original_params: {
            model: videoParams.model_name,
            input: {
              prompt: isMultiShotMode ? undefined : enhancedPrompt,
              aspect_ratio:
                videoParams.aspect_ratio === "9:16"
                  ? "portrait"
                  : videoParams.aspect_ratio === "16:9"
                    ? "landscape"
                    : undefined,
              n_frames:
                videoParams.duration_seconds === 10
                  ? "10"
                  : videoParams.duration_seconds === 15
                    ? "15"
                    : undefined,
              size: videoParams.quality === "high" ? "high" : "standard",
              mode: videoParams.mode,
              video_mode: videoParams.video_mode,
              multi_shots: videoParams.multi_shots,
              sound: videoParams.sound,
              multi_prompt: enhancedMultiPrompt,
              kling_elements: videoParams.kling_elements,
              remove_watermark: false,
              image_urls: videoParams.reference_image_urls,
            },
          },
        },
        character_uuids: this.serializeCharacterUuids(
          parsed.character_uuid ? [parsed.character_uuid] : undefined,
        ),
        visibility_level: parsed.visibility_level,
      } as any);

      // 6) Create task using VideoAIProvider
      const callbackUrl = this.getCallbackUrl(webhookToken);
      const finalVideoParams = {
        ...videoParams,
        prompt: enhancedPrompt,
        multi_prompt: enhancedMultiPrompt,
      };

      const task = await this.videoProvider.createVideoTask(
        finalVideoParams,
        callbackUrl,
      );
      console.log("[VideoService] CreateGeneration: Remote task created", {
        task_id: task.taskId,
      });

      if (!generationUuid || creditsCost == null) {
        throw new Error("Generation context not initialized");
      }

      const generationUuidValue = generationUuid;
      const creditsCostValue = creditsCost;

      // 7) ✅ API成功返回taskId → atomic: deduct credits + update generation
      try {
        const { db: getDb } = await import("@/db");
        const dbInstance = getDb();

        await dbInstance.transaction(async (tx) => {
          await decreaseCredits({
            user_uuid: parsed.user_uuid,
            credits: creditsCostValue,
            trans_type: CreditsTransType.generation("video"),
            generation_uuid: generationUuidValue,
            tx,
          });

          const { generations } = await import("@/db/schema");
          const { eq } = await import("drizzle-orm");

          await tx
            .update(generations)
            .set({
              remote_task_id: task.taskId,
              status: "processing",
              progress: 10,
              updated_at: new Date(),
            })
            .where(eq(generations.uuid, generationUuidValue));
        });
      } catch (creditError: any) {
        console.error(
          "[VideoService] CreateGeneration: Failed to deduct credits or update generation",
          creditError,
        );

        await updateGeneration(generationUuidValue, {
          status: "failed",
          error_message: "Failed to deduct credits or update status",
          error_code: "CREDITS_DEDUCTION_FAILED",
          updated_at: new Date(),
        });

        throw new Error("Failed to deduct credits for generation");
      }

      const duration = Date.now() - startTime;
      console.log("[VideoService] CreateGeneration: Completed successfully", {
        generation_uuid: generationUuid,
        remote_task_id: task.taskId,
        credits_cost: creditsCost,
        total_duration: `${duration}ms`,
      });

      return {
        generation_uuid: generationUuid,
        status: "processing" as const,
        estimated_time: 20,
        credits_cost: creditsCost,
        message: "Generation task created successfully",
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error("[VideoService] CreateGeneration: Task creation failed", {
        duration: `${duration}ms`,
        error: error.message || error,
      });

      // API失败或积分扣除失败，更新generation记录为失败状态
      // 注意：API失败时不扣费（没有扣除就没有退还）
      if (generationUuid && error.message !== "Insufficient credits") {
        try {
          await updateGeneration(generationUuid, {
            status: "failed",
            error_message: error.message || "Failed to create video task",
            error_code: "API_CALL_FAILED",
            updated_at: new Date(),
          });
        } catch (updateError) {
          console.error(
            "[VideoService] CreateGeneration: Failed to update generation status",
            {
              generation_uuid: generationUuid,
              error: updateError,
            },
          );
        }
      }

      throw new Error((error as any)?.message || "Failed to create video task");
    }
  }

  async getGenerationStatus(uuid: string) {
    const gen = await findGenerationByUuid(uuid);
    if (!gen) return null;

    const videos = await getGenerationVideosByGenerationUuid(uuid);
    const hasVideos = videos.length > 0;

    return {
      uuid,
      status: hasVideos ? "completed" : gen.status || "pending",
      progress: hasVideos ? 100 : gen.progress || 0,
      results: hasVideos
        ? videos.map((v) => ({
            id: v.id!,
            image_url: v.video_url!,
            generation_uuid: uuid,
            created_at: v.created_at?.toISOString() || "",
            image_uuid: v.uuid,
            thumbnail_url: v.poster_url || undefined,
          }))
        : undefined,
      error_message: gen.error_message || undefined,
      created_at: gen.created_at?.toISOString(),
      batch_size: gen.counts,
      credits_used: gen.credits_cost,
    };
  }

  async handleWebhookCallback(
    taskId: string,
    state: string,
    resultUrls?: string[],
    failMsg?: string,
  ) {
    console.log("[VideoService] HandleWebhook: Processing callback", {
      task_id: taskId,
      state,
      result_urls_count: resultUrls?.length || 0,
      has_fail_msg: !!failMsg,
    });

    const gen = await findGenerationByRemoteTaskId(taskId);
    if (!gen) {
      console.warn("[VideoService] HandleWebhook: Generation not found", {
        task_id: taskId,
      });
      return;
    }

    console.log("[VideoService] HandleWebhook: Generation found", {
      generation_uuid: gen.uuid,
      current_status: gen.status,
      callback_received: gen.callback_received,
    });

    // 🔧 修复：允许 webhook 覆盖失败状态，特别是成功状态的 webhook
    // 如果是成功状态，即使之前被轮询失败标记，也允许处理
    // 只有失败状态的 webhook 遵守最终状态检查
    if (
      state !== "success" &&
      (gen.status === "completed" || gen.status === "failed")
    ) {
      console.log(
        "[VideoService] HandleWebhook: Already in final state, skipping",
        {
          generation_uuid: gen.uuid,
          status: gen.status,
        },
      );
      return;
    }

    // 🔧 修复：移除 callback_received 检查
    // 让 webhook 能够处理竞态条件（轮询失败先执行，webhook 后到达的情况）
    // 只要是成功状态，就允许处理
    if (state === "success") {
      console.log(
        "[VideoService] HandleWebhook: Allowing success webhook to override previous state",
        {
          generation_uuid: gen.uuid,
          previous_status: gen.status,
          callback_received: gen.callback_received,
        },
      );
    }

    if (state === "success" && resultUrls && resultUrls.length > 0) {
      console.log("[VideoService] HandleWebhook: Processing success state", {
        generation_uuid: gen.uuid,
        result_urls_count: resultUrls.length,
      });

      // 获取原始参数用于转换
      const originalParams = (gen.metadata as any)?.original_params;
      const modelId = gen.model_id || "unknown";

      // 使用VideoParameterConverter转换参数
      let convertedParams;
      try {
        if (originalParams) {
          console.log("[VideoService] HandleWebhook: Converting parameters", {
            generation_uuid: gen.uuid,
            original_params_structure: originalParams.model
              ? "Sora2Params"
              : "Unknown",
            model: originalParams.model,
            has_input: !!originalParams.input,
          });
          convertedParams = VideoParameterConverter.convertVideoParams(
            modelId,
            originalParams,
          );
          console.log("[VideoService] HandleWebhook: Parameters converted", {
            generation_uuid: gen.uuid,
            model_id: convertedParams.model_id,
            quality: convertedParams.quality,
            ratio: convertedParams.ratio,
          });
        } else {
          // 向后兼容：如果没有原始参数，使用现有metadata
          console.log(
            "[VideoService] HandleWebhook: Using fallback conversion",
            {
              generation_uuid: gen.uuid,
              has_original_params: !!originalParams,
            },
          );
          convertedParams = {
            model_id: modelId,
            duration_seconds: (gen.metadata as any)?.video?.duration || null,
            ratio: (gen.metadata as any)?.video?.ratio || null,
            quality: "unknown",
            resolution: (gen.metadata as any)?.video?.resolution || null,
            reference_image_url: gen.reference_image_url || null,
            generation_params: JSON.stringify(gen.metadata || {}),
          };
          console.log(
            "[VideoService] HandleWebhook: Using fallback conversion",
            {
              generation_uuid: gen.uuid,
              has_original_params: !!originalParams,
            },
          );
        }
      } catch (error) {
        console.error(
          "[VideoService] HandleWebhook: Parameter conversion failed",
          {
            generation_uuid: gen.uuid,
            error: error,
          },
        );
        // 降级处理
        convertedParams = {
          model_id: modelId,
          duration_seconds: (gen.metadata as any)?.video?.duration || null,
          ratio: (gen.metadata as any)?.video?.ratio || null,
          quality: "unknown",
          resolution: (gen.metadata as any)?.video?.resolution || null,
          reference_image_url: gen.reference_image_url || null,
          generation_params: JSON.stringify(gen.metadata || {}),
        };
      }

      const storedMembershipLevel = (gen.metadata as any)?.membership_level as
        | string
        | undefined;
      let resolvedMembershipLevel = storedMembershipLevel;

      if (!resolvedMembershipLevel) {
        try {
          resolvedMembershipLevel = await getMembershipLevel(gen.user_uuid!);
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to resolve membership level";
          await updateGeneration(gen.uuid!, {
            status: "failed",
            error_message: errorMessage,
            error_code: "WATERMARK_MEMBERSHIP_LOOKUP_FAILED",
            callback_received: true,
            progress: 0,
            updated_at: new Date(),
          });
          try {
            if (gen.credits_cost && gen.credits_cost > 0) {
              await refundCredits({
                user_uuid: gen.user_uuid!,
                generation_uuid: gen.uuid!,
                reason: "Membership lookup failed for watermark handling",
              });
            }
          } catch (refundError) {
            console.error(
              "[VideoService] HandleWebhook: Failed to refund credits after membership lookup failure",
              refundError,
            );
          }
          throw new Error(errorMessage);
        }
      }

      const shouldApplyWatermark = resolvedMembershipLevel === "free";
      let finalResultUrls = resultUrls;

      if (shouldApplyWatermark) {
        console.log("[VideoService] HandleWebhook: Applying watermark", {
          generation_uuid: gen.uuid,
          video_count: resultUrls.length,
        });

        try {
          finalResultUrls = await Promise.all(
            resultUrls.map((url) =>
              applyVideoWatermark({
                videoUrl: url,
                generationUuid: gen.uuid || undefined,
              }),
            ),
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to apply video watermark";

          await updateGeneration(gen.uuid!, {
            status: "failed",
            error_message: errorMessage,
            error_code: "WATERMARK_FAILED",
            callback_received: true,
            progress: 0,
            updated_at: new Date(),
          });

          try {
            if (gen.credits_cost && gen.credits_cost > 0) {
              await refundCredits({
                user_uuid: gen.user_uuid!,
                generation_uuid: gen.uuid!,
                reason: "Video watermark failed",
              });
            }
          } catch (refundError) {
            console.error(
              "[VideoService] HandleWebhook: Failed to refund credits after watermark failure",
              refundError,
            );
          }

          throw new Error(errorMessage);
        }
      }

      // 🔴 采用延迟转存策略：直接使用临时URL快速存库
      console.log(
        "[VideoService] HandleWebhook: Processing videos with delayed transfer",
        {
          generation_uuid: gen.uuid,
          video_count: finalResultUrls.length,
        },
      );

      // 计算临时URL过期时间（14天）
      const tempUrlExpiresAt = new Date();
      tempUrlExpiresAt.setHours(tempUrlExpiresAt.getHours() + 336);

      // 提取新增字段
      // 🔴 修复：优先使用 metadata.original_prompt（用户原始输入），fallback到增强提示词
      const original_prompt =
        (gen.metadata as any)?.original_prompt || // ✅ 用户原始输入
        originalParams?.prompt || // fallback到增强提示词
        gen.prompt ||
        null;
      const style = gen.style_preset || originalParams?.style_preset || null;
      // 🔴 使用创建任务时记录的 gen_type，避免展示侧硬编码
      const generationSubType = gen.sub_type || "anime_video";

      console.log("[VideoService] HandleWebhook: Extracted additional fields", {
        generation_uuid: gen.uuid,
        has_original_prompt: !!original_prompt,
        has_metadata_original_prompt: !!(gen.metadata as any)?.original_prompt,
        style,
        gen_type: generationSubType,
      });

      // 🔴 关键改动：直接使用临时URL，不进行同步转存
      const rows = finalResultUrls.map((url) => ({
        uuid: uuidv4(),
        generation_uuid: gen.uuid!,
        user_uuid: gen.user_uuid!,
        model_id: convertedParams.model_id,
        quality: convertedParams.quality,
        video_url: url, // 🔴 使用临时URL，不转存
        poster_url: null, // 🔴 暂时为null，后续定时任务处理
        reference_image_url: convertedParams.reference_image_url,
        generation_params: convertedParams.generation_params,
        original_prompt,
        style,
        gen_type: generationSubType,
        codec: null,
        duration_seconds: convertedParams.duration_seconds,
        ratio: convertedParams.ratio,
        resolution: convertedParams.resolution,
        visibility_level: gen.visibility_level || "private",
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await insertGenerationVideos(rows as any);

      // 🔴 更新generation记录，标记为待转存
      await updateGeneration(gen.uuid!, {
        status: "completed",
        success_count: rows.length,
        callback_received: true,
        progress: 100,
        file_transfer_status: "pending", // 🔴 标记为待转存
        temp_url_expires_at: tempUrlExpiresAt, // 🔴 设置过期时间
        updated_at: new Date(),
      });

      // 🔴 新增：恢复之前可能错误作废的积分记录
      // 处理 webhook 晚到的情况（轮询超时后 webhook 才到达）
      try {
        await restoreCredits(
          gen.user_uuid!,
          gen.uuid!,
          "Webhook received after polling timeout - generation actually succeeded",
        );
        console.log(
          `[VideoService] HandleWebhook: Restored voided credits for generation ${gen.uuid}`,
        );
      } catch (restoreError) {
        console.error(
          `[VideoService] HandleWebhook: Failed to restore credits:`,
          restoreError,
        );
        // 积分恢复失败不应影响主流程，仅记录错误
      }

      // 处理OC角色生成记录
      if (gen.character_uuids && finalResultUrls.length > 0) {
        try {
          // 注意：这里传入的是临时URL，不是上传后的R2 URL
          const tempVideos = finalResultUrls.map((url) => ({
            videoUrl: url,
            posterUrl: null,
          }));
          await this.recordCharacterGenerations(gen, tempVideos);
        } catch (error) {
          console.error(
            `[VideoService] HandleWebhook: Failed to record character generations for ${gen.uuid}:`,
            error,
          );
          // 记录详细错误但不抛出，避免影响主流程
          console.error("[VideoService] HandleWebhook: Error details:", {
            generation_uuid: gen.uuid,
            character_uuids: gen.character_uuids,
            error_message:
              error instanceof Error ? error.message : String(error),
            error_stack: error instanceof Error ? error.stack : undefined,
          });
        }
      }

      console.log(
        "[VideoService] HandleWebhook: Videos stored with temp URLs (delayed transfer)",
        {
          generation_uuid: gen.uuid,
          videos_inserted: rows.length,
          file_transfer_status: "pending",
        },
      );
    } else {
      console.log("[VideoService] HandleWebhook: Processing failed state", {
        generation_uuid: gen.uuid,
        fail_msg: failMsg,
      });

      await updateGeneration(gen.uuid!, {
        status: "failed",
        error_message: failMsg || "Generation failed",
        error_code: "GENERATION_FAILED",
        callback_received: true,
        progress: 0,
        updated_at: new Date(),
      });

      try {
        if (gen.credits_cost && gen.credits_cost > 0) {
          console.log("[VideoService] HandleWebhook: Refunding credits", {
            generation_uuid: gen.uuid,
            user_uuid: gen.user_uuid,
            credits: gen.credits_cost,
          });
          // ✅ 使用新的软删除 refundCredits 函数
          await refundCredits({
            user_uuid: gen.user_uuid!,
            generation_uuid: gen.uuid!,
            reason: "Video generation failed (webhook)",
          });
        }
      } catch (e) {
        console.error(
          "[VideoService] HandleWebhook: Failed to refund credits",
          {
            generation_uuid: gen.uuid,
            error: e,
          },
        );
      }
    }
  }

  /**
   * 安全处理轮询失败 - 确保幂等性，避免与webhook冲突
   * 修复：不再设置 callback_received=true，允许 webhook 覆盖失败状态
   */
  async safeHandlePollingFailure(
    generationUuid: string,
    reason: string,
    errorType: "polling_error" | "polling_timeout" | "network_error",
  ): Promise<void> {
    try {
      console.log(
        `[VideoGenerationService.safeHandlePollingFailure] Processing ${errorType} for generation ${generationUuid}: ${reason}`,
      );

      const generation = await findGenerationByUuid(generationUuid);

      if (!generation) {
        console.warn(
          `Generation ${generationUuid} not found, skipping failure handling`,
        );
        return;
      }

      // 检查是否已经被处理过（避免重复处理）
      if (generation.status === "failed" || generation.status === "completed") {
        console.log(
          `Generation ${generationUuid} already in final state: ${generation.status}, skipping`,
        );
        return;
      }

      // 🔧 修复：不再检查 callback_received，允许 webhook 覆盖失败状态
      // 这样可以处理 webhook 延迟到达的情况

      console.log(
        `[VideoGenerationService.safeHandlePollingFailure] Marking generation ${generationUuid} as failed`,
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
        try {
          // ✅ 使用新的软删除 refundCredits 函数
          await refundCredits({
            user_uuid: generation.user_uuid!,
            generation_uuid: generationUuid,
            reason: `Video generation polling failed: ${reason}`,
          });
        } catch (refundError) {
          console.error(
            `Failed to refund credits for video generation ${generationUuid}:`,
            refundError,
          );
        }
      }

      console.log(
        `[VideoGenerationService.safeHandlePollingFailure] Successfully handled failure for generation ${generationUuid}`,
      );
    } catch (error) {
      console.error(
        `[VideoGenerationService.safeHandlePollingFailure] Failed to handle polling failure for ${generationUuid}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 转换为统一的视频参数格式
   */
  private transformToVideoParams(
    params: VideoGenerationRequest,
  ): VideoGenerationParams {
    // 收集所有参考图片（包括reference_image_url和character_image_url）
    const referenceImages: string[] = [];
    if (params.reference_image_url) {
      referenceImages.push(params.reference_image_url);
    }
    if (params.reference_image_urls?.length) {
      referenceImages.push(...params.reference_image_urls);
    }
    if (params.character_image_url) {
      referenceImages.push(params.character_image_url);
    }
    const uniqueReferenceImages = Array.from(
      new Set(referenceImages.filter(Boolean))
    );

    // 根据是否有图片重新确定task_subtype
    const actualTaskSubtype =
      uniqueReferenceImages.length > 0 ? "image_to_video" : "text_to_video";

    return {
      prompt: params.prompt,
      model_name: params.model_id,
      task_subtype: actualTaskSubtype,
      duration_seconds: params.duration_seconds || params.duration,
      quality: this.mapResolutionToQuality(params.resolution),
      mode: params.mode,
      video_mode: params.video_mode,
      multi_shots: params.multi_shots,
      sound: params.sound,
      multi_prompt: params.multi_prompt,
      kling_elements: params.kling_elements,
      aspect_ratio: params.aspect_ratio,
      reference_image_urls:
        uniqueReferenceImages.length > 0 ? uniqueReferenceImages : undefined,
      user_uuid: params.user_uuid, // 传递用户UUID用于权限检查
      negative_prompt: undefined, // 可以从params中提取
      seed: params.metadata?.seed,
      counts: params.counts,
    };
  }

  /**
   * 分辨率映射到质量等级
   */
  private mapResolutionToQuality(resolution?: string): "standard" | "high" {
    if (!resolution) return "standard";
    // 720p及以下为标准质量，1080p及以上为高质量
    const resolutionNum = parseInt(resolution);
    return resolutionNum >= 1080 ? "high" : "standard";
  }

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
   * 序列化角色UUID数组为逗号分隔字符串
   */
  private serializeCharacterUuids(uuids?: string[]): string | undefined {
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
  private deserializeCharacterUuids(uuidsStr?: string | null): string[] {
    if (!uuidsStr || typeof uuidsStr !== "string") {
      return [];
    }

    return uuidsStr
      .split(",")
      .map((uuid) => uuid.trim())
      .filter(Boolean);
  }

  /**
   * 处理OC角色生成记录（支持多角色）
   */
  private async recordCharacterGenerations(
    generation: any,
    processedVideos: any[],
  ): Promise<void> {
    // 反序列化角色UUID列表
    const characterUuids = this.deserializeCharacterUuids(
      generation.character_uuids,
    );

    if (characterUuids.length === 0) {
      console.log(
        `[VideoService.recordCharacterGenerations] No character UUIDs found for generation ${generation.uuid}`,
      );
      return;
    }

    console.log(
      `[VideoService.recordCharacterGenerations] Processing ${characterUuids.length} character(s) for generation ${generation.uuid}: ${characterUuids.join(", ")}`,
    );

    try {
      // 为每个角色创建一条记录
      const characterGenerationRecords: CharacterGenerationInsert[] =
        characterUuids.map((characterUuid) => ({
          character_uuid: characterUuid,
          created_at: new Date(),
          generation_type: "video",
          generation_uuid: generation.uuid,
          parameters: {
            model_id: generation.model_id,
            style_preset: generation.style_preset,
            video_urls: processedVideos.map((v) => v.videoUrl),
            prompt: generation.prompt,
          },
          visibility_level: generation.visibility_level || "private",
        }));

      // 批量插入
      const inserted = await insertCharacterGenerations(
        characterGenerationRecords,
      );
      console.log(
        `[VideoService.recordCharacterGenerations] Successfully inserted ${inserted.length} character generation records for generation ${generation.uuid}`,
      );
    } catch (error) {
      console.error(
        `[VideoService.recordCharacterGenerations] Failed to insert character generations:`,
        error,
      );
      throw error; // 重新抛出以便上层捕获
    }
  }

  private normalizeVideoSubType(raw?: string | null): string {
    if (!raw) {
      return "anime_video";
    }
    return raw
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }
}

export const videoGenerationService = new VideoGenerationService();
