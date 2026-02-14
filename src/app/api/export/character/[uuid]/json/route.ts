import { auth } from "@/auth";
import { findCharacterByUuid } from "@/models/character";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { findUserByUuid } from "@/models/user";
import { toImageUrl } from "@/lib/r2-utils";
import { parseCharacterModules } from "@/types/oc";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    // 检查用户是否登录
    const session = await auth();
    if (!session?.user?.uuid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { uuid } = await params;

    // 解析 URL 参数
    const { searchParams } = new URL(request.url);
    const include = (searchParams.get("include") || "sensitive") as "sensitive" | "public";
    const version = (searchParams.get("version") || "1") as "1" | "2";

    // 验证参数
    if (!["sensitive", "public"].includes(include)) {
      return new Response(JSON.stringify({ error: "Invalid include parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!["1", "2"].includes(version)) {
      return new Response(JSON.stringify({ error: "Invalid version parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 获取角色数据
    const character = await findCharacterByUuid(uuid);

    if (!character) {
      return new Response(JSON.stringify({ error: "Character not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 权限检查：仅角色所有者可导出
    if (character.user_uuid !== session.user.uuid) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 获取创作者信息
    const creator = await findUserByUuid(character.user_uuid);
    const avatarUrl = await resolveCharacterAvatarUrl(character);

    // 解析模块数据
    const modules = parseCharacterModules(character.modules);
    const exportModules =
      include === "sensitive"
        ? sanitizeModules(modules)
        : filterSensitiveModules(modules);

    // 构建导出数据
    const exportData = {
      version: version === "1" ? "1.0" : "2.0",
      exported_at: new Date().toISOString(),
      character: {
        uuid: character.uuid,
        name: character.name,
        gender: character.gender,
        species: character.species,
        role: character.role,
        age: character.age,
        brief_introduction: character.brief_introduction,
        personality_tags: character.personality_tags,
        tags: character.tags,
        visibility_level: character.visibility_level,
        allow_remix: character.allow_remix,
        world_uuid: character.world_uuid,
        avatar_url: avatarUrl,
        modules: exportModules,
        stats: {
          like_count: character.like_count,
          favorite_count: character.favorite_count,
          comment_count: character.comment_count,
        },
        creator: creator
          ? {
              uuid: creator.uuid,
              display_name: creator.display_name,
            }
          : null,
        created_at: character.created_at,
        updated_at: character.updated_at,
      },
    };

    // 如果 include=public，过滤敏感信息
    if (include === "public") {
      delete (exportData.character as any).creator;
      delete (exportData.character as any).stats;
    }

    // 返回 JSON 文件
    const filename = `${character.name.replace(/[^a-zA-Z0-9]/g, "_")}_${version}.json`;
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("JSON export failed:", error);
    return new Response(
      JSON.stringify({ error: "Failed to export JSON data" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// 过滤敏感模块信息（公开导出时使用）
function filterSensitiveModules(modules: any) {
  if (!modules) return null;

  return {
    appearance: pickVisualAppearance(modules.appearance),
    personality: modules.personality,
    background: modules.background,
    // 移除可能敏感的字段
  };
}

function sanitizeModules(modules: any) {
  if (!modules) return null;
  const sanitized = { ...modules, appearance: pickVisualAppearance(modules.appearance) };
  delete (sanitized as any).art;
  return sanitized;
}

function pickVisualAppearance(appearance: any) {
  if (!appearance) return undefined;
  return {
    hair_color: appearance.hair_color,
    hair_style: appearance.hair_style,
    eye_color: appearance.eye_color,
    body_type: appearance.body_type,
    outfit_style: appearance.outfit_style,
    accessories: appearance.accessories,
    appearance_features: appearance.appearance_features,
    special_features: appearance.special_features,
  };
}

async function resolveCharacterAvatarUrl(character: any): Promise<string | null> {
  const avatarUuid = character?.avatar_generation_image_uuid;
  if (!avatarUuid) return null;
  const avatarImage = await findGenerationImageByUuid(avatarUuid);
  if (!avatarImage) return null;
  const selectedUrl =
    avatarImage.thumbnail_detail ||
    avatarImage.thumbnail_desktop ||
    avatarImage.thumbnail_mobile ||
    avatarImage.image_url;
  return selectedUrl ? toImageUrl(selectedUrl) : null;
}
