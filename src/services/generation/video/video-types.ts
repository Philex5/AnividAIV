import { z } from "zod";

const KlingElementsSchema = z.array(
  z
    .object({
      name: z.string().min(1).max(64),
      description: z.string().min(1).max(500),
      element_input_urls: z.array(z.string().url()).min(2).max(4).optional(),
      element_input_video_urls: z.array(z.string().url()).min(1).max(1).optional(),
    })
    .superRefine((item, ctx) => {
      const hasImageUrls = Boolean(item.element_input_urls?.length);
      const hasVideoUrls = Boolean(item.element_input_video_urls?.length);
      if (!hasImageUrls && !hasVideoUrls) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "kling_elements item must include element_input_urls or element_input_video_urls",
        });
      }
      if (hasImageUrls && hasVideoUrls) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "kling_elements item cannot include both element_input_urls and element_input_video_urls",
        });
      }
    })
);

export const VideoParamsSchema = z
  .object({
    user_uuid: z.string().min(1, "User UUID is required"),
    model_id: z.string().min(1, "Model ID is required"),
    prompt: z
      .string()
      .min(1, "Prompt cannot be empty")
      .max(2500, "Prompt too long"),
    gen_type: z.string().optional(),
    counts: z.number().int().min(1).max(1).default(1),

    // 新增字段：任务子类型，用于区分文生视频、图生视频和多图生视频
    task_subtype: z
      .enum(["text_to_video", "image_to_video", "multi_image_to_video"], {
        errorMap: () => ({
          message:
            "task_subtype must be text_to_video, image_to_video, or multi_image_to_video",
        }),
      })
      .default("text_to_video"),

    video_mode: z
      .enum(["standard", "start_end_frame", "multi_shot"], {
        errorMap: () => ({
          message:
            "video_mode must be standard, start_end_frame, or multi_shot",
        }),
      })
      .optional(),

    aspect_ratio: z
      .enum(["1:1", "9:16", "16:9", "landscape", "portrait"], {
        errorMap: () => ({ message: "Unsupported ratio" }),
      })
      .optional(),
    duration: z
      .number()
      .int()
      .min(3, "Invalid duration")
      .max(100, "Invalid duration")
      .optional(),

    // 扩展分辨率支持，与模型配置保持一致
    resolution: z
      .enum(["480p", "580p", "720p", "768p", "1080p", "2k", "4k"], {
        errorMap: () => ({ message: "Unsupported resolution" }),
      })
      .optional(),

    // Kling 3.0 mode
    mode: z
      .enum(["std", "pro"], {
        errorMap: () => ({ message: "Unsupported mode" }),
      })
      .optional(),

    multi_shots: z.boolean().optional(),

    // 扩展时长参数（秒）
    duration_seconds: z.number().int().min(3).max(15).optional(),

    // Kling 3.0 sound（可选）
    sound: z.boolean().optional(),

    // Kling 3.0 multi-shots script（可选）
    multi_prompt: z
      .array(
        z.object({
          prompt: z.string().min(1, "multi_prompt.prompt cannot be empty").max(2500),
          duration: z.number().int().min(3).max(12),
        })
      )
      .max(8)
      .optional(),

    // Kling 3.0 elements（可选）
    kling_elements: KlingElementsSchema.optional(),

    // 帧率参数（可选）
    fps: z.number().int().min(12).max(60).optional(),

    motion: z.string().optional(),
    style_preset: z.string().optional(),
    reference_image_url: z.string().url().optional(),
    reference_image_urls: z.array(z.string().url()).max(10).optional(),
    character_uuid: z.string().optional(), // OC角色UUID
    character_image_url: z.string().url().optional(), // OC角色立绘图URL (由API解析)
    visibility_level: z.enum(["public", "private"]).default("private"), // 可见度级别
    metadata: z.any().optional(),
  })
  .refine(
    (data) => {
      // 如果是图生视频或多图生视频，必须提供参考图或角色图
      if (
        (data.task_subtype === "image_to_video" ||
          data.task_subtype === "multi_image_to_video") &&
        !data.reference_image_url &&
        (!data.reference_image_urls || data.reference_image_urls.length === 0) &&
        !data.character_image_url
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "reference_image_url or character_image_url is required for image_to_video or multi_image_to_video task_subtype",
      path: ["reference_image_url"],
    }
  )
  .superRefine((data, ctx) => {
    const modelId = data.model_id.toLowerCase();
    const isKling30 = modelId.includes("kling-3.0/video");
    const videoMode = data.multi_shots
      ? "multi_shot"
      : (data.video_mode || "standard");
    const mergedImageUrls = Array.from(
      new Set(
        [
          ...(data.reference_image_urls || []),
          data.reference_image_url,
          data.character_image_url,
        ].filter((url): url is string => Boolean(url))
      )
    );
    const imageCount = mergedImageUrls.length;

    if (!data.aspect_ratio && !isKling30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["aspect_ratio"],
        message: "aspect_ratio is required",
      });
    }

    if (!isKling30) {
      if (videoMode !== "standard") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["video_mode"],
          message: "Only Kling 3.0 supports start_end_frame and multi_shot modes",
        });
      }
      return;
    }

    if (!data.aspect_ratio && imageCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["aspect_ratio"],
        message: "aspect_ratio is required when no image is provided for Kling 3.0",
      });
    }

    if (imageCount > 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reference_image_urls"],
        message: "Kling 3.0 supports up to 2 images",
      });
    }

    if (videoMode === "start_end_frame") {
      if (data.character_uuid || data.character_image_url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["character_uuid"],
          message: "Kling 3.0 start_end_frame mode does not support OC input",
        });
      }
    }

    const isMultiShotMode = videoMode === "multi_shot" || data.multi_shots;
    if (isMultiShotMode && imageCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reference_image_urls"],
        message: "Kling 3.0 multi_shots requires a start frame image",
      });
    }
    if (isMultiShotMode && imageCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reference_image_urls"],
        message: "Kling 3.0 multi_shots supports only 1 image",
      });
    }

    if (isMultiShotMode && (!data.multi_prompt || data.multi_prompt.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["multi_prompt"],
        message: "multi_prompt is required when multi_shots is enabled",
      });
    }

    if (data.multi_prompt?.length) {
      const invalidSegment = data.multi_prompt.find(
        (item) => item.duration < 3 || item.duration > 12
      );
      if (invalidSegment) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["multi_prompt"],
          message: "Each multi_prompt duration must be between 3 and 12 seconds",
        });
      }

      const totalDuration = data.multi_prompt.reduce((acc, item) => acc + item.duration, 0);
      if (totalDuration < 3 || totalDuration > 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["multi_prompt"],
          message: "Total multi_prompt duration must be between 3 and 15 seconds",
        });
      }
    }

    if (!isMultiShotMode) {
      const klingDuration = data.duration_seconds ?? data.duration;
      if (
        klingDuration !== undefined &&
        (klingDuration < 3 || klingDuration > 15)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["duration_seconds"],
          message: "Kling 3.0 duration must be between 3 and 15 seconds in non multi_shot mode",
        });
      }
    }
  });

export type VideoGenerationRequest = z.infer<typeof VideoParamsSchema>;

// VideoPromptBuilder 参数接口
export interface VideoPromptBuilderParams {
  prompt: string;
  style_preset?: string;
  camera_motion?: string;
  character_uuids?: string[];
  addQualityTerms?: boolean;
}
