import { getUserUuid } from "@/services/user";
import { generationServiceFactory } from "@/services/generation";
import type { CharacterGenerationRequest } from "@/services/generation";
import type { Character } from "@/models/character";
import { z } from "zod";
import { respData, respError } from "@/lib/resp";
import { checkGenerationRateLimit } from "@/lib/rate-limiter";
import { buildModulesFromLegacyFields } from "@/services/character-modules";
import { parseCharacterModules } from "@/types/oc";
import { CreditsTransType } from "@/services/credit";
import {
  CHARACTER_PORTRAIT_CREDITS,
  CHARACTER_EDIT_PORTRAIT_CREDITS,
} from "@/configs/generation/credits";

// Character 立绘生图专用验证 Schema - 接收完整角色数据
const CharacterGenerationSchema = z.object({
  gen_type: z.enum(["avatar", "character", "profile", "full_body"]).optional(),
  prompt: z.string().optional(),
  art_style: z.string().optional(),
  aspect_ratio: z.string().default("2:3"),
  model_uuid: z.string().default("google/nano-banana"),
  custom_prompt_additions: z.string().optional(),
  reference_image_urls: z.array(z.string().url()).optional(),
  is_edit_mode: z.boolean().optional().default(false), // 区分创建模式和编辑模式

  // ✅ 接收完整角色数据（实时前端数据）
  character_data: z.object({
    character_uuid: z.string().uuid().optional(),
    name: z.string(),
    gender: z.string(),
    age: z.number().optional().nullable(),
    species: z.string().optional().nullable(),
    personality_tags: z.array(z.string()).optional().nullable(),
    modules: z.record(z.unknown()).optional(),

    // 外观字段
    body_type: z.string().optional().nullable(),
    hair_color: z.string().optional().nullable(),
    hair_style: z.string().optional().nullable(),
    eye_color: z.string().optional().nullable(),
    outfit_style: z.string().optional().nullable(),
    accessories: z.array(z.string()).optional().nullable(),
    appearance_features: z.string().optional().nullable(),

    // 背景故事
    brief_introduction: z.string().optional().nullable(),
    background_story: z.string().optional().nullable(),
    extended_attributes: z.unknown().optional().nullable(),
  }),
});

// POST /api/oc-maker/characters/generate-image - 使用前端实时数据生成角色立绘
export async function POST(req: Request) {
  try {
    // 用户认证
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respError("User not authenticated", 401);
    }

    // 解析和验证请求参数
    const requestData = await req.json();
    const validatedData = CharacterGenerationSchema.parse(requestData);

    // ✅ 限流检查：同一用户同一角色 5 秒内只能生成一次
    const characterUuid = validatedData.character_data.character_uuid;
    const characterName = validatedData.character_data.name;
    const resourceId = characterUuid
      ? `character:${characterUuid}`
      : characterName
        ? `character:${characterName}`
        : "character:unnamed";

    const { allowed, retryAfter } = checkGenerationRateLimit(user_uuid, resourceId);
    if (!allowed) {
      return Response.json(
        {
          code: -1,
          message: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: { "Retry-After": retryAfter!.toString() },
        }
      );
    }

    // 📋 [API] 记录生成请求（使用实时前端数据）
    console.log(
      "📋 [API] Generate Image Request with realtime frontend data:",
      {
        character_name: validatedData.character_data.name,
        gender: validatedData.character_data.gender,
        species: validatedData.character_data.species,
        age: validatedData.character_data.age,
        has_hair_color: !!validatedData.character_data.hair_color,
        has_hair_style: !!validatedData.character_data.hair_style,
        has_eye_color: !!validatedData.character_data.eye_color,
        has_body_type: !!validatedData.character_data.body_type,
        has_outfit_style: !!validatedData.character_data.outfit_style,
        has_accessories: !!validatedData.character_data.accessories,
        has_appearance_features:
          !!validatedData.character_data.appearance_features,
        art_style: validatedData.art_style,
        has_custom_prompt: !!validatedData.prompt,
        has_reference_images: !!validatedData.reference_image_urls?.length,
      }
    );

    // 📦 [API] 记录接收到的完整角色数据
    console.log("📦 [API] Character Data from Frontend (realtime):", {
      name: validatedData.character_data.name,
      gender: validatedData.character_data.gender,
      species: validatedData.character_data.species,
      age: validatedData.character_data.age,
      // 重点：外观字段
      hair_color: validatedData.character_data.hair_color,
      hair_style: validatedData.character_data.hair_style,
      eye_color: validatedData.character_data.eye_color,
      body_type: validatedData.character_data.body_type,
      outfit_style: validatedData.character_data.outfit_style,
      accessories: validatedData.character_data.accessories,
      appearance_features: validatedData.character_data.appearance_features,
    });

    // ✅ 将前端数据转换为Character类型（不读取数据库）
    const legacyExtendedAttributes =
      validatedData.character_data.extended_attributes &&
      typeof validatedData.character_data.extended_attributes === "object" &&
      !Array.isArray(validatedData.character_data.extended_attributes)
        ? validatedData.character_data.extended_attributes
        : undefined;

    const modules = validatedData.character_data.modules
      ? parseCharacterModules(validatedData.character_data.modules)
      : buildModulesFromLegacyFields({
          name: validatedData.character_data.name,
          gender: validatedData.character_data.gender,
          age: validatedData.character_data.age ?? undefined,
          species: validatedData.character_data.species ?? undefined,
          personality_tags: validatedData.character_data.personality_tags ?? undefined,
          brief_introduction:
            validatedData.character_data.brief_introduction ?? undefined,
          background_story:
            validatedData.character_data.background_story ?? undefined,
          body_type: validatedData.character_data.body_type ?? undefined,
          hair_color: validatedData.character_data.hair_color ?? undefined,
          hair_style: validatedData.character_data.hair_style ?? undefined,
          eye_color: validatedData.character_data.eye_color ?? undefined,
          outfit_style: validatedData.character_data.outfit_style ?? undefined,
          accessories: validatedData.character_data.accessories ?? undefined,
          appearance_features:
            validatedData.character_data.appearance_features ?? undefined,
          art_style: validatedData.art_style,
          extended_attributes: legacyExtendedAttributes,
        });

    const characterData: Partial<Character> = {
      name: validatedData.character_data.name,
      gender: validatedData.character_data.gender,
      age: validatedData.character_data.age ?? null,
      species: validatedData.character_data.species ?? null,
      personality_tags: validatedData.character_data.personality_tags ?? null,
      brief_introduction:
        validatedData.character_data.brief_introduction ?? null,
      modules,
      user_uuid,
    };

    // 构建角色立绘生图请求
    const resolvedGenType = validatedData.gen_type || "full_body";
    const isFullBody =
      resolvedGenType === "full_body" ||
      resolvedGenType === "profile" ||
      resolvedGenType === "character";
    const isEditMode = validatedData.is_edit_mode || false;

    // 计费规则：
    // - 创建模式（is_edit_mode=false）: 40 credits (立绘+头像)
    // - 编辑模式（is_edit_mode=true）: 30 credits (仅立绘)
    const creditsOverride = isFullBody
      ? isEditMode
        ? CHARACTER_EDIT_PORTRAIT_CREDITS // 30 credits
        : CHARACTER_PORTRAIT_CREDITS // 40 credits
      : undefined;

    const creditsTransType = isFullBody
      ? CreditsTransType.generation("full_body")
      : undefined;

    const characterRequest: CharacterGenerationRequest = {
      user_uuid: user_uuid,
      model_id: validatedData.model_uuid || "google/nano-banana",
      aspect_ratio: validatedData.aspect_ratio,
      counts: 1,
      character_data: characterData as Character,
      art_style: validatedData.art_style,
      prompt: validatedData.prompt,
      gen_type: resolvedGenType,
      reference_image_urls: validatedData.reference_image_urls,
      metadata: {
        source: isEditMode ? "oc_edit" : "realtime_frontend_data",
        character_name: validatedData.character_data.name,
        ...(creditsOverride
          ? { credits_override: creditsOverride }
          : {}),
        ...(creditsTransType
          ? { credits_trans_type: creditsTransType }
          : {}),
        // 仅创建模式自动生成头像，编辑模式不生成
        ...(isFullBody && !isEditMode ? { auto_generate_avatar: true } : {}),
      },
    };

    // 调用角色生图服务
    const result = await generationServiceFactory.createGeneration(
      "character",
      characterRequest
    );

    return respData(result);
  } catch (error: any) {
    console.error("❌ Character image generation failed:", {
      errorType: error.name,
      errorCode: error.code,
      message: error.message,
      stack: error.stack,
    });

    // 处理Zod验证错误
    if (error.name === "ZodError") {
      const validationErrors = error.errors
        .map((e: any) => e.message)
        .join(", ");
      console.error("Validation errors:", validationErrors);
      return respError(`Validation failed: ${validationErrors}`, 400);
    }

    // 处理GenerationError (标准生成错误)
    if (error.name === "GenerationError") {
      console.error(`GenerationError [${error.code}]:`, error.message);
      return respError(error.message, error.statusCode || 400);
    }

    // 处理积分不足错误 (向后兼容)
    if (error.message?.includes("Insufficient credits")) {
      return respError(error.message, 402);
    }

    // 记录未分类错误的详细信息
    console.error("Uncategorized error during character generation:", error);

    return respError(
      error.message ||
        "Failed to generate character image. Please try again later.",
      500
    );
  }
}
