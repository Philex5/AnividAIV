import { ImageResponse } from "next/og";
import { auth } from "@/auth";
import { findCharacterByUuid } from "@/models/character";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { parseCharacterModules } from "@/types/oc";
import { toImageUrl, getR2Url } from "@/lib/r2-utils";
import { OGCardTemplate } from "@/components/og/OGCardTemplates";
import { findworldByUuid } from "@/models/oc-world";
import { newStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || "en";
    const force = searchParams.get("force") === "true";

    // 缓存路径
    const cacheKey = `og/character/${uuid}-${locale}.png`;
    const storage = newStorage();

    // 检查缓存 (除非强制刷新)
    if (!force) {
      try {
        const objects = await storage.listObjects({ prefix: cacheKey });
        if (objects.includes(cacheKey)) {
          return Response.redirect(getR2Url(cacheKey), 302);
        }
      } catch (err) {
        console.warn("Failed to check OG cache:", err);
      }
    }

    // 加载国际化配置
    let t;
    try {
      // 在 Next.js 中动态导入 JSON 有时不需要 .default，取决于配置
      const messages = await import(`@/i18n/pages/oc-share-card/${locale}.json`);
      t = messages.default || messages;
    } catch (e) {
      console.warn(`Failed to load OG messages for ${locale}, falling back to en:`, e);
      const messages = await import(`@/i18n/pages/oc-share-card/en.json`);
      t = messages.default || messages;
    }

    if (!t || !t.stats) {
      console.error("OG translations (t) is invalid:", t);
      // 提供一个极简兜底，防止渲染崩溃
      t = {
        labels: { world: "World", age: "Age", skills: "Skills", biography: "Biography" },
        stats: { strength: "STR", intelligence: "INT", agility: "AGI", stamina: "STA", luck: "LUK", charm: "CHA" }
      };
    }

    const character = await findCharacterByUuid(uuid);

    if (!character) {
      return new Response("Character not found", { status: 404 });
    }

    const modules = parseCharacterModules(character.modules);
    
    // 获取世界信息
    let world = null;
    const worldUuid = character.world_uuid || (character as any).worldUuid;
    
    if (worldUuid) {
      try {
        world = await findworldByUuid(worldUuid);
      } catch (err) {
        console.error(`OG: Failed to fetch world for UUID ${worldUuid}:`, err);
      }
    }

    // 获取主题色
    // 优先级：角色模块自定义颜色 -> 世界观主色 -> 默认紫色
    let themeColor = modules.appearance?.theme_color || "#8b5cf6";
    if (!modules.appearance?.theme_color && world?.theme_colors && typeof world.theme_colors === "object") {
      const colors = world.theme_colors as Record<string, string>;
      themeColor = colors.primary || Object.values(colors)[0] || themeColor;
    }

    // 权限检查
    if (character.visibility_level !== "public") {
      const session = await auth();
      const isOwner = session?.user?.uuid === character.user_uuid;
      
      if (!isOwner) {
        return new Response("Character not found", { status: 404 });
      }
    }

    // 获取角色立绘图片
    let profileImageUrl: string | undefined;
    const targetImageUuid = character.profile_generation_image_uuid || character.avatar_generation_image_uuid;

    if (targetImageUuid) {
      try {
        const imageObj = await findGenerationImageByUuid(targetImageUuid);
        if (imageObj) {
          const path = imageObj.thumbnail_detail || imageObj.image_url;
          profileImageUrl = toImageUrl(path);
        }
      } catch (err) {
        console.error("Failed to fetch target image for OG:", err);
      }
    }

    const fallbackProfile = createProfileFallback(character.name, themeColor);
    
    // 获取存储域名和当前请求域名
    const storageDomain = process.env.NEXT_PUBLIC_STORAGE_DOMAIN || process.env.STORAGE_DOMAIN || "https://artworks.anividai.com";
    const origin = new URL(request.url).origin;

    // 准备图标路径
    const gender = (character.gender || "").toLowerCase().trim();
    let genderIconName = "transgender.svg";
    if (gender === "male" || gender === "m") genderIconName = "male.svg";
    else if (gender === "female" || gender === "f") genderIconName = "female.svg";
    const genderIconUrl = `${storageDomain}/assets/imgs/icons/gender/${genderIconName}`;

    const { default: speciesConfig } = await import("@/configs/characters/species.json");
    const speciesKey = (character.species || "human").toLowerCase().trim().replace(/ /g, "_");
    const speciesInfo = speciesConfig.items.find((item: any) => item.key === speciesKey) || speciesConfig.items[0];
    const rawSpeciesIconUrl = speciesInfo.icon_url;
    const speciesIconUrl = rawSpeciesIconUrl.startsWith("http") 
      ? rawSpeciesIconUrl 
      : `${storageDomain}${rawSpeciesIconUrl.startsWith("/") ? "" : "/"}${rawSpeciesIconUrl}`;

    // 并行转换为 Base64，且统一转换为 PNG 格式以适配 Satori
    const [portraitBase64, genderBase64, speciesBase64] = await Promise.all([
      fetchAndConvertToPngBase64(profileImageUrl || "", origin),
      fetchAndConvertToPngBase64(genderIconUrl, origin),
      fetchAndConvertToPngBase64(speciesIconUrl, origin)
    ]);

    const resolvedProfile = portraitBase64 || fallbackProfile;

    // 使用模板组件生成卡片
    const cardElement = OGCardTemplate({
      character,
      modules,
      world,
      avatarUrl: resolvedProfile,
      profileImageUrl: resolvedProfile,
      template: "tcg",
      themeColor,
      t,
      storageDomain,
      genderIconData: genderBase64 || undefined,
      speciesIconData: speciesBase64 || undefined,
    });

    const response = new ImageResponse(cardElement, {
      width: 1200,
      height: 630,
    });

    // 缓存到 R2
    try {
      const buffer = await response.clone().arrayBuffer();
      // 使用后台任务上传，不阻塞响应
      storage.uploadFile({
        body: new Uint8Array(buffer),
        key: cacheKey,
        contentType: "image/png",
      }).catch(err => console.error("OG cache upload failed:", err));
    } catch (err) {
      console.error("Failed to prepare OG cache:", err);
    }

    return response;
  } catch (error: any) {
    console.error("OG generation failed:", error);
    return new Response("Failed to generate OG image", { status: 500 });
  }
}

async function fetchAndConvertToPngBase64(url: string, origin: string): Promise<string | null> {
  if (!url) return null;

  // Data URLs 已经是处理过的，直接返回
  if (url.startsWith("data:")) return url;

  // 如果是相对路径，补全 origin
  const absoluteUrl = url.startsWith("/") ? `${origin}${url}` : url;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(absoluteUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`OG Image Fetch Error [${response.status}] for: ${absoluteUrl}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const arrayBuffer = await response.arrayBuffer();

    // Cloudflare Workers (Edge runtime) 环境兼容处理
    // 直接转换为 Base64，让 Satori 处理图片格式
    // Satori 支持: PNG, JPEG, WebP, SVG, GIF (仅第一帧)
    const uint8Array = new Uint8Array(arrayBuffer);
    let base64String = "";

    // 在 Edge runtime 中使用 TextDecoder 处理二进制数据
    try {
      // 使用 btoa 转换（Edge runtime 支持）
      const binaryString = Array.from(uint8Array, (byte) => String.fromCharCode(byte)).join("");
      base64String = btoa(binaryString);
    } catch (e) {
      // 如果 btoa 失败，尝试 Buffer 方式（兼容性回退）
      if (typeof Buffer !== "undefined") {
        base64String = Buffer.from(uint8Array).toString("base64");
      } else {
        throw e;
      }
    }

    // 根据原始内容类型确定 MIME 类型，默认使用 PNG
    let mimeType = "image/png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      mimeType = "image/jpeg";
    } else if (contentType.includes("webp")) {
      mimeType = "image/webp";
    } else if (contentType.includes("gif")) {
      mimeType = "image/gif";
    }

    const dataUrl = `data:${mimeType};base64,${base64String}`;

    console.log(`OG Image Success (${mimeType}): ${absoluteUrl.substring(0, 80)}... (Size: ${Math.round(dataUrl.length / 1024)}KB)`);
    return dataUrl;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error(`OG Image Timeout (6s): ${absoluteUrl}`);
    } else {
      console.error(`OG Image Processing Failed: ${absoluteUrl}`, error);
    }
    return null;
  }
}

function createProfileFallback(name: string, themeColor: string): string {
  const initial = (name || "C").trim().charAt(0).toUpperCase() || "C";
  const bg = themeColor || "#8b5cf6";
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="120" fill="${bg}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="700" fill="#FFFFFF">
    ${initial}
  </text>
</svg>`;
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
