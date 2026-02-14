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
      return new Response("Unauthorized", { status: 401 });
    }

    const { uuid } = await params;

    // 解析 URL 参数
    const { searchParams } = new URL(request.url);
    const template = (searchParams.get("template") || "detailed") as "detailed" | "concise";
    const locale = (searchParams.get("locale") || "en") as "en" | "ja";

    // 验证参数
    if (!["detailed", "concise"].includes(template)) {
      return new Response("Invalid template parameter", { status: 400 });
    }
    if (!["en", "ja"].includes(locale)) {
      return new Response("Invalid locale parameter", { status: 400 });
    }

    // 获取角色数据
    const character = await findCharacterByUuid(uuid);

    if (!character) {
      return new Response("Character not found", { status: 404 });
    }

    // 权限检查：仅角色所有者可导出
    if (character.user_uuid !== session.user.uuid) {
      return new Response("Access denied", { status: 403 });
    }

    // 获取创作者信息
    const creator = await findUserByUuid(character.user_uuid);

    // 解析模块数据
    const modules = parseCharacterModules(character.modules);
    const appearance = pickVisualAppearance(modules?.appearance);
    const avatarUrl = await resolveCharacterAvatarUrl(character);
    const logoUrl = "https://artworks.anividai.com/assets/logo.webp";

    // 生成 Markdown 内容
    const markdown = generateMarkdown(
      character,
      { ...modules, appearance },
      creator,
      avatarUrl,
      logoUrl,
      template,
      locale
    );

    // 返回 Markdown 文件
    const filename = `${character.name.replace(/[^a-zA-Z0-9]/g, "_")}_${template}.md`;
    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Markdown export failed:", error);
    return new Response("Failed to export Markdown", { status: 500 });
  }
}

// 生成 Markdown 内容
function generateMarkdown(
  character: any,
  modules: any,
  creator: any,
  avatarUrl: string | null,
  logoUrl: string,
  template: "detailed" | "concise",
  locale: "en" | "ja"
): string {
  const isEn = locale === "en";

  const content = [
    `# ${character.name}`,
    "",
    avatarUrl ? `![${isEn ? "Avatar" : "アバター"}](${avatarUrl})` : "",
    "",
    "---",
    "",
    "## " + (isEn ? "Basic Information" : "基本情報"),
    "",
    `**${isEn ? "Gender" : "性別"}**: ${character.gender || "-"}`,
    `**${isEn ? "Age" : "年齢"}**: ${character.age || "-"}`,
    `**${isEn ? "Species" : "種族"}**: ${character.species || "-"}`,
    `**${isEn ? "Role" : "職業"}**: ${character.role || "-"}`,
    "",
    character.brief_introduction
      ? `## ${isEn ? "Brief Introduction" : "キャラクター概要"}\n\n${character.brief_introduction}`
      : "",
    "",
    template === "detailed"
      ? [
          modules.background?.background_story
            ? `## ${isEn ? "Background Story" : "背景ストーリー"}\n\n${modules.background.background_story}`
            : "",
          "",
          modules.appearance
            ? [
                `## ${isEn ? "Appearance" : "外見"}`,
                "",
                modules.appearance.body_type
                  ? `- **${isEn ? "Body Type" : "体型"}**: ${modules.appearance.body_type}`
                  : "",
                modules.appearance.hair_color
                  ? `- **${isEn ? "Hair Color" : "髪色"}**: ${modules.appearance.hair_color}`
                  : "",
                modules.appearance.hair_style
                  ? `- **${isEn ? "Hair Style" : "髪型"}**: ${modules.appearance.hair_style}`
                  : "",
                modules.appearance.eye_color
                  ? `- **${isEn ? "Eye Color" : "瞳色"}**: ${modules.appearance.eye_color}`
                  : "",
                modules.appearance.outfit_style
                  ? `- **${isEn ? "Outfit" : "服装"}**: ${modules.appearance.outfit_style}`
                  : "",
                modules.appearance.accessories && modules.appearance.accessories.length > 0
                  ? `- **${isEn ? "Accessories" : "アクセサリー"}**: ${modules.appearance.accessories.join(", ")}`
                  : "",
                modules.appearance.appearance_features &&
                modules.appearance.appearance_features.length > 0
                  ? `- **${isEn ? "Appearance Features" : "外見特徴"}**: ${modules.appearance.appearance_features.join(", ")}`
                  : "",
                modules.appearance.special_features
                  ? `- **${isEn ? "Special Features" : "特徴"}**: ${modules.appearance.special_features}`
                  : "",
                "",
              ]
                .filter(Boolean)
                .join("\n")
            : "",
          modules.personality
            ? [
                `## ${isEn ? "Personality" : "性格"}`,
                "",
                modules.personality.greeting
                  ? `**${isEn ? "Greeting" : "挨拶"}**: ${modules.personality.greeting}`
                  : "",
                "",
                modules.personality.personality_tags && modules.personality.personality_tags.length > 0
                  ? `### ${isEn ? "Traits" : "特徴"}`
                  : "",
                "",
                ...(modules.personality.personality_tags || []).map(
                  (tag: string) => `- ${tag}`
                ),
                "",
              ]
                .filter(Boolean)
                .join("\n")
            : "",
          character.tags && character.tags.length > 0
            ? [
                `## ${isEn ? "Tags" : "タグ"}`,
                "",
                ...character.tags.map((tag: string) => `#${tag}`),
                "",
              ]
                .join("\n")
            : "",
        ].join("\n")
      : "",
    creator
      ? [
          "---",
          "",
          `## ${isEn ? "Creator Information" : "クリエイター情報"}`,
          "",
          `**${isEn ? "Creator" : "クリエイター"}**: ${creator.display_name || "Anonymous"}`,
          `**${isEn ? "Created" : "作成日"}**: ${new Date(character.created_at).toLocaleDateString(
            locale === "en" ? "en-US" : "ja-JP"
          )}`,
          `**${isEn ? "Character UUID" : "キャラクターUUID"}**: ${character.uuid}`,
          "",
        ].join("\n")
      : "",
    "---",
    "",
    `_${isEn ? "Generated by AnividAI" : "AnividAI で生成されました"}_`,
    "",
    `<div style="text-align:left"><img src="${logoUrl}" alt="AnividAI" width="80" /></div>`,
  ]
    .filter(Boolean)
    .join("\n");

  return content;
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
