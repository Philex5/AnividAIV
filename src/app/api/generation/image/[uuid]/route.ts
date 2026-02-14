import { NextRequest } from "next/server";
import { getUserUuid, getUserInfo } from "@/services/user";
import { isAdminUser } from "@/services/admin";
import {
  findGenerationImageByUuid,
  updateGenerationImage,
  deleteGenerationImage,
} from "@/models/generation-image";
import { findGenerationByUuid, updateGeneration } from "@/models/generation";
import { findCharactersWithAvatarsByUuids } from "@/models/character";
import { toImageUrl } from "@/lib/r2-utils";
import { respData, respErr } from "@/lib/resp";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    // 检查用户登录状态（用于权限验证）
    const userUuid = await getUserUuid();

    const resolvedParams = await params;
    const imageUuid = resolvedParams.uuid;

    // 获取图片记录
    const image = await findGenerationImageByUuid(imageUuid);
    if (!image) {
      return respErr("Image not found", 404);
    }

    // 验证权限
    const generation = await findGenerationByUuid(image.generation_uuid);
    if (!generation) {
      return respErr("Generation not found", 404);
    }

    // 权限检查：公开图片、所有者或管理员
    const isPublic = image.visibility_level === "public";
    const isOwner = userUuid && generation.user_uuid === userUuid;
    let isAdmin = false;

    if (!isPublic && !isOwner) {
      if (userUuid) {
        isAdmin = await isAdminUser();
      }
      if (!isAdmin) {
        if (!userUuid) {
          return respErr("User not authenticated", 401);
        }
        return respErr("No permission to access this image", 403);
      }
    }

    // 解析关联OC
    const characterUuids = (generation.character_uuids || "")
      .split(",")
      .map((uuid) => uuid.trim())
      .filter(Boolean);

    let charactersData: Array<{
      uuid: string;
      name: string | null;
      avatar_url: string | null;
      visibility_level: string | null;
      user_uuid: string | null;
    }> = [];

    if (characterUuids.length > 0) {
      const characterRecords =
        await findCharactersWithAvatarsByUuids(characterUuids);
      const recordMap = new Map(
        characterRecords.map((char) => [
          char.uuid,
          {
            uuid: char.uuid,
            name: char.name,
            avatar_url: char.image_url
              ? toImageUrl(
                  char.thumbnail_desktop ||
                    char.thumbnail_mobile ||
                    char.image_url
                )
              : null,
            visibility_level: char.visibility_level,
            user_uuid: char.user_uuid,
          },
        ])
      );

      charactersData = characterUuids
        .map((uuid) => recordMap.get(uuid))
        .filter((item): item is NonNullable<typeof item> => item !== undefined);
    }

    // 解析 generation_params 以提取参数
    let parsedGenerationParams: any = {};
    try {
      if (image.generation_params) {
        parsedGenerationParams = JSON.parse(image.generation_params);
      }
    } catch (error) {
      console.warn("Failed to parse generation_params:", error);
    }

    // 解析 generation.metadata
    let metadata: any = {};
    try {
      if (generation.metadata) {
        metadata = typeof generation.metadata === 'string'
          ? JSON.parse(generation.metadata as string)
          : generation.metadata;
      }
    } catch (error) {
      console.warn("Failed to parse generation.metadata:", error);
    }

    // 构建返回数据（只使用schema中存在的字段）
    const imageData = {
      uuid: image.uuid,
      user_uuid: image.user_uuid,
      image_url: toImageUrl(image.image_url), // 使用原图作为主要图片地址
      thumbnail_desktop: image.thumbnail_desktop
        ? toImageUrl(image.thumbnail_desktop)
        : null,
      thumbnail_mobile: image.thumbnail_mobile
        ? toImageUrl(image.thumbnail_mobile)
        : null,
      thumbnail_detail: image.thumbnail_detail
        ? toImageUrl(image.thumbnail_detail)
        : null,
      created_at: image.created_at,
      visibility_level: image.visibility_level,
      // 来自 generation_images 表的参数
      style: image.style,
      generation_params: image.generation_params,
      final_prompt: image.final_prompt,
      original_prompt: image.original_prompt,
      model_id: image.model_id,
      reference_image_url: image.reference_image_url,
      generation_time: image.generation_time,
      gen_type: image.gen_type,
      generation: {
        uuid: generation.uuid,
        prompt: image.original_prompt,
        model_id: generation.model_id,
        style_preset: generation.style_preset,
        counts: generation.counts,
        status: generation.status,
        credits_cost: generation.credits_cost,
        reference_image_url: generation.reference_image_url,
        visibility_level: generation.visibility_level,
        created_at: generation.created_at,
        character_uuids: generation.character_uuids,
        user_uuid: generation.user_uuid,
        // 添加 metadata 字段和解析后的关键参数
        metadata: metadata,
        template_id: metadata.template_id || parsedGenerationParams.template_id || null,
        user_prompt: parsedGenerationParams.user_prompt || parsedGenerationParams.original_prompt || null,
      },
      characters: charactersData,
    };

    return respData(imageData);
  } catch (error: any) {
    console.error("Failed to get image details:", error);
    return respErr(error.message || "Failed to get image details", 500);
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("User not authenticated", 401);
    }

    const resolvedParams = await params;
    const imageUuid = resolvedParams.uuid;

    // Verify ownership
    const image = await findGenerationImageByUuid(imageUuid);
    if (!image) {
      return respErr("Image not found", 404);
    }

    if (image.user_uuid !== userUuid) {
      return respErr("No permission", 403);
    }

    // Delete the image record (hard delete)
    await deleteGenerationImage(imageUuid);

    return respData({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error: any) {
    console.error("Failed to delete image:", error);
    return respErr(error.message || "Failed to delete image", 500);
  }
}
