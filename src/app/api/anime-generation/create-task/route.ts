import { NextRequest } from "next/server";
import { generationServiceFactory } from "@/services/generation";
import type { AnimeGenerationRequest } from "@/services/generation";
import { getUserUuid, getUserInfo, isUserSubscribed } from "@/services/user";
import { findCharacterByUuid } from "@/models/character";
import { db } from "@/db";
import { characters, generationImages } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { toImageUrl } from "@/lib/r2-utils";
import { z } from "zod";
import type { User } from "@/types/user";
import { getPromptMaxLength, getPromptMinLength } from "@/lib/configs";

// Anime 生图专用验证 Schema
const AnimeGenerationSchema = z
  .object({
    gen_type: z.string().min(1, "Generation type is required"),
    prompt: z
      .string()
      .optional(),
    style_preset: z.string().optional(),
    scene_preset: z.string().optional(),
    outfit_preset: z.string().optional(),
    character_uuids: z.array(z.string()).max(1).optional(),
    aspect_ratio: z.string().default("1:1"),
    model_uuid: z.string().min(1, "Model ID is required"),
    batch_size: z.number().min(1).max(4).default(1),
    reference_image_urls: z.array(z.string()).optional(),
    visibility_level: z.enum(["public", "private"]).default("private"),
    image_resolution: z.string().optional(),
    template_id: z.string().optional(),
    template_prompt: z.string().optional(),
    user_prompt: z.string().optional(),
    input_mode: z
      .enum(["text_only", "text_with_reference", "oc_character"])
      .optional(),
    expression: z.string().optional(),
    is_nine_grid: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const normalized = data.gen_type
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (normalized === "action_figure") {
      if (!data.template_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["template_id"],
          message: "Template ID is required",
        });
      }
      if (!data.template_prompt || data.template_prompt.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["template_prompt"],
          message: "Template prompt cannot be empty",
        });
      }
      return;
    }

    if (normalized === "sticker") {
      if (!data.template_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["template_id"],
          message: "Template ID is required",
        });
      }
      if (!data.input_mode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["input_mode"],
          message: "Input mode is required",
        });
      }
      return;
    }

    if (!data.prompt || data.prompt.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prompt"],
        message: "Prompt cannot be empty",
      });
    }
  });

export async function POST(request: NextRequest) {
  try {
    // Check user authentication
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json(
        { success: false, error: "User not authenticated" },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = AnimeGenerationSchema.parse(body);

    // Validate model and model-specific constraints based on active model config
    const { getActiveModels } = await import("@/lib/configs");
    const models = await getActiveModels();
    const selectedModel = models.find((m) => m.model_id === validatedData.model_uuid);

    if (!selectedModel) {
      return Response.json(
        {
          success: false,
          error: `Unsupported or inactive model: ${validatedData.model_uuid}`,
        },
        { status: 400 },
      );
    }

    if (validatedData.prompt) {
      const maxLength = getPromptMaxLength(selectedModel);
      const minLength = getPromptMinLength(selectedModel);

      if (validatedData.prompt.length > maxLength) {
        return Response.json(
          {
            success: false,
            error: `Prompt exceeds maximum length of ${maxLength} characters`,
          },
          { status: 400 }
        );
      }

      if (validatedData.prompt.length < minLength) {
        return Response.json(
          {
            success: false,
            error: `Prompt must be at least ${minLength} characters`,
          },
          { status: 400 }
        );
      }
    }

    // Validate reference image count limit from model config (if configured)
    if (
      validatedData.reference_image_urls &&
      validatedData.reference_image_urls.length > 0
    ) {
      const configuredMaxImages = Number(
        selectedModel.config?.max_images ??
          selectedModel.config?.image_params?.max_images ??
          0,
      );

      if (
        Number.isFinite(configuredMaxImages) &&
        configuredMaxImages > 0 &&
        validatedData.reference_image_urls.length > configuredMaxImages
      ) {
        return Response.json(
          {
            success: false,
            error: `Reference image count exceeds model limit of ${configuredMaxImages}`,
          },
          { status: 400 },
        );
      }
    }

    // Flux 2 series: enforce resolution and image input limits
    const isFlux2Model = validatedData.model_uuid.startsWith("flux-2/");
    if (isFlux2Model) {
      const normalizedResolution = (validatedData.image_resolution || "1K").toUpperCase();
      if (!["1K", "2K"].includes(normalizedResolution)) {
        return Response.json(
          {
            success: false,
            error: "Flux 2 only supports image_resolution values: 1K, 2K",
          },
          { status: 400 },
        );
      }
    }

    // Verify visibility权限
    if (validatedData.visibility_level === "private") {
      const user = await getUserInfo();
      if (!user) {
        return Response.json(
          { success: false, error: "User not authenticated" },
          { status: 401 },
        );
      }

      const isSub = await isUserSubscribed(user as User);
      if (!isSub) {
        return Response.json(
          {
            success: false,
            error:
              "Private visibility requires a subscription. Upgrade to unlock this feature.",
            error_code: "SUBSCRIPTION_REQUIRED",
          },
          { status: 403 },
        );
      }
    }

    // 处理角色立绘作为参考图片
    let referenceImageUrls: string[] = [];

    // 添加用户提供的参考图片
    if (
      validatedData.reference_image_urls &&
      validatedData.reference_image_urls.length > 0
    ) {
      referenceImageUrls.push(...validatedData.reference_image_urls);
    }

    // 验证角色归属权并获取立绘URLs
    if (validatedData.character_uuids && validatedData.character_uuids.length > 0) {
      // 1. 验证所有角色的归属权
      for (const characterUuid of validatedData.character_uuids) {
        try {
          const character = await findCharacterByUuid(characterUuid);

          if (!character) {
            return Response.json(
              {
                success: false,
                error: `Character not found: ${characterUuid}`,
              },
              { status: 404 },
            );
          }

          // 验证归属权
          if (character.user_uuid !== userUuid) {
            return Response.json(
              {
                success: false,
                error: `No permission to use character: ${characterUuid}`,
              },
              { status: 403 },
            );
          }
        } catch (error) {
          console.error(`Failed to process character ${characterUuid}:`, error);
          return Response.json(
            {
              success: false,
              error: `Failed to process character: ${characterUuid}`,
            },
            { status: 400 },
          );
        }
      }

      if (referenceImageUrls.length === 0) {
        // 2. 批量获取角色立绘
        try {
          const database = db();

          const results = await database
            .select({
              character_uuid: characters.uuid,
              image_url: generationImages.image_url,
            })
            .from(characters)
            .leftJoin(
              generationImages,
              eq(generationImages.uuid, characters.profile_generation_image_uuid),
            )
            .where(
              validatedData.character_uuids.length === 1
                ? eq(characters.uuid, validatedData.character_uuids[0])
                : inArray(characters.uuid, validatedData.character_uuids),
            );

          // 添加所有有效的角色立绘作为参考图片
          for (const result of results) {
            if (result.character_uuid && result.image_url) {
              const profileUrl = toImageUrl(result.image_url);
              referenceImageUrls.push(profileUrl);
            }
          }
        } catch (error) {
          console.warn("Failed to get character profiles in batch:", error);
          // 不阻止生成，继续处理
        }
      }
    }

    const configuredMaxImages = Number(
      selectedModel.config?.max_images ??
        selectedModel.config?.image_params?.max_images ??
        0,
    );
    if (
      Number.isFinite(configuredMaxImages) &&
      configuredMaxImages > 0 &&
      referenceImageUrls.length > configuredMaxImages
    ) {
      return Response.json(
        {
          success: false,
          error: `Total reference image count exceeds model limit of ${configuredMaxImages}`,
        },
        { status: 400 },
      );
    }

    const normalizedGenType = validatedData.gen_type
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    // 根据 gen_type 构建不同的请求参数
    let animeParams: AnimeGenerationRequest;

    if (normalizedGenType === "action_figure") {
      // ActionFigure：不在 API 层拼接 prompt，分别传递原始参数
      // 让 Service 层通过 PromptBuilder 构建完整 prompt

      // 根据 reference_image_urls 和 character_uuids 推断输入模式
      const hasReferenceImages =
        validatedData.reference_image_urls &&
        validatedData.reference_image_urls.length > 0;
      const hasCharacterUuids =
        validatedData.character_uuids &&
        validatedData.character_uuids.length > 0;

      let input_mode: "text_with_reference" | "oc_character";
      if (hasCharacterUuids) {
        input_mode = "oc_character";
      } else if (hasReferenceImages) {
        input_mode = "text_with_reference";
      } else {
        // 默认为 text_with_reference
        input_mode = "text_with_reference";
      }

      animeParams = {
        user_uuid: userUuid,
        prompt: validatedData.user_prompt?.trim() || "", // 只传用户输入
        model_id: validatedData.model_uuid,
        aspect_ratio: validatedData.aspect_ratio,
        counts: validatedData.batch_size,
        character_uuids: validatedData.character_uuids,
        reference_image_urls:
          referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
        visibility_level: validatedData.visibility_level,
        gen_type: normalizedGenType,
        // 传递完整参数，便于后续复用（使用 any 类型断言避免 TypeScript 错误）
        image_resolution: (validatedData as any).image_resolution,
        style_preset: (validatedData as any).style_preset,
        scene_preset: (validatedData as any).scene_preset,
        outfit_preset: (validatedData as any).outfit_preset,
        action_preset: (validatedData as any).action_preset,
        metadata: {
          template_id: validatedData.template_id,
          template_prompt: validatedData.template_prompt, // 通过 metadata 传递模板
          input_mode, // 🔥 新增：传递输入模式
          aspect_ratio: validatedData.aspect_ratio,
          image_resolution: (validatedData as any).image_resolution,
          style_preset: (validatedData as any).style_preset,
          scene_preset: (validatedData as any).scene_preset,
          outfit_preset: (validatedData as any).outfit_preset,
          action_preset: (validatedData as any).action_preset,
        },
      };
    } else if (normalizedGenType === "sticker") {
      // Sticker：根据 input_mode 决定处理方式
      // 所有模式都统一使用 user_prompt
      const inputMode = validatedData.input_mode;

      animeParams = {
        user_uuid: userUuid,
        prompt: validatedData.user_prompt?.trim() || "", // 统一使用user_prompt
        model_id: validatedData.model_uuid,
        aspect_ratio: validatedData.aspect_ratio,
        counts: validatedData.batch_size,
        character_uuids: validatedData.character_uuids,
        reference_image_urls:
          referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
        visibility_level: validatedData.visibility_level,
        gen_type: normalizedGenType,
        metadata: {
          template_id: validatedData.template_id,
          template_prompt: validatedData.template_prompt,
          input_mode: inputMode,
          user_prompt: validatedData.user_prompt?.trim() || undefined,
          expression: validatedData.expression,
          is_nine_grid: validatedData.is_nine_grid,
        },
      };
    } else {
      // Anime 使用原有的复杂参数结构
      if (!validatedData.prompt) {
        return Response.json(
          { success: false, error: "Prompt cannot be empty" },
          { status: 400 },
        );
      }
      animeParams = {
        user_uuid: userUuid,
        prompt: validatedData.prompt,
        model_id: validatedData.model_uuid,
        aspect_ratio: validatedData.aspect_ratio,
        counts: validatedData.batch_size,
        style_preset: validatedData.style_preset,
        scene_preset: validatedData.scene_preset,
        outfit_preset: validatedData.outfit_preset,
        character_uuids: validatedData.character_uuids,
        reference_image_urls:
          referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
        visibility_level: validatedData.visibility_level,
        gen_type: normalizedGenType,
        // 传递图片分辨率参数，便于后续复用（使用 any 类型断言避免 TypeScript 错误）
        image_resolution: (validatedData as any).image_resolution,
        action_preset: (validatedData as any).action_preset,
      };
    }

    const result = await generationServiceFactory.createGeneration(
      "anime",
      animeParams,
    );

    return Response.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Create anime generation task failed:", error);

    // Handle Zod validation errors
    if (error.name === "ZodError") {
      return Response.json(
        {
          success: false,
          error: "Request parameter validation failed",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    // Handle business logic errors
    if (error.message?.includes("Insufficient credits")) {
      return Response.json(
        { success: false, error: error.message },
        { status: 402 },
      );
    }

    if (error.message?.includes("not authenticated")) {
      return Response.json(
        { success: false, error: error.message },
        { status: 401 },
      );
    }

    // Other errors
    return Response.json(
      { success: false, error: error.message || "Create task failed" },
      { status: 500 },
    );
  }
}
