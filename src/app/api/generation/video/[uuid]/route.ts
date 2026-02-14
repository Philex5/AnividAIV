import { NextRequest } from "next/server";
import { getUserUuid, getUserInfo } from "@/services/user";
import { isAdminUser } from "@/services/admin";
import {
  findGenerationVideoByUuid,
  updateGenerationVideo,
  getGenerationVideosByGenerationUuid,
  deleteGenerationVideo,
} from "@/models/generation-video";
import { findGenerationByUuid, updateGeneration } from "@/models/generation";
import { findCharactersWithAvatarsByUuids } from "@/models/character";
import { toImageUrl } from "@/lib/r2-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    // 检查用户登录状态（用于权限验证）
    const userUuid = await getUserUuid();

    const resolvedParams = await params;
    const videoUuid = resolvedParams.uuid;

    // 获取视频记录
    const video = await findGenerationVideoByUuid(videoUuid);
    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    // 验证权限
    const generation = await findGenerationByUuid(video.generation_uuid);
    if (!generation) {
      return Response.json({ error: "Generation not found" }, { status: 404 });
    }

    // 权限检查：公开视频、所有者或管理员
    const isPublic = video.visibility_level === "public";
    const isOwner = userUuid && generation.user_uuid === userUuid;
    let isAdmin = false;

    if (!isPublic && !isOwner) {
      if (userUuid) {
        isAdmin = await isAdminUser();
      }
      if (!isAdmin) {
        if (!userUuid) {
          return Response.json(
            { error: "User not authenticated" },
            { status: 401 }
          );
        }
        return Response.json(
          { error: "No permission to access this video" },
          { status: 403 }
        );
      }
    }

    // 获取同一generation的所有视频variants (不同清晰度)
    const variants = await getGenerationVideosByGenerationUuid(
      video.generation_uuid
    );

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

    // 构建返回数据
    const videoData = {
      uuid: video.uuid,
      user_uuid: video.user_uuid,
      poster_url: video.poster_url ? toImageUrl(video.poster_url) : null,
      variants: variants.map((v) => ({
        quality: v.quality,
        video_url: toImageUrl(v.video_url),
        mime_type: "video/mp4", // 默认类型，可根据实际需要调整
      })),
      created_at: video.created_at,
      visibility_level: video.visibility_level,
      // 视频特有字段
      duration_seconds: video.duration_seconds,
      resolution: video.resolution,
      ratio: video.ratio,
      gen_type: video.gen_type,
      // 从video表获取的新字段（优先）或回退到generation
      style: video.style || generation.style_preset,
      original_prompt: video.original_prompt || generation.prompt,
      final_prompt: generation.prompt, // generation.prompt是增强后的提示词
      generation_params: video.generation_params,
      generation: {
        uuid: generation.uuid,
        user_uuid: generation.user_uuid,
        prompt: generation.prompt,
        model_id: generation.model_id,
        style_preset: generation.style_preset,
        duration_seconds: video.duration_seconds,
        resolution: video.resolution,
        visibility_level: generation.visibility_level,
        created_at: generation.created_at,
      },
      characters: charactersData,
    };

    return Response.json({
      success: true,
      data: videoData,
    });
  } catch (error: any) {
    console.error("获取视频详情失败:", error);

    return Response.json(
      { error: error.message || "获取视频详情失败" },
      { status: 500 }
    );
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const videoUuid = resolvedParams.uuid;

    // Verify ownership
    const video = await findGenerationVideoByUuid(videoUuid);
    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.user_uuid !== userUuid) {
      return Response.json({ error: "No permission" }, { status: 403 });
    }

    // Delete the video record (hard delete)
    await deleteGenerationVideo(videoUuid);

    return Response.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error: any) {
    console.error("Failed to delete video:", error);
    return Response.json(
      { error: error.message || "Failed to delete video" },
      { status: 500 }
    );
  }
}
