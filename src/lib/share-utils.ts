/**
 * 分享功能工具函数
 */

import { toast } from "sonner";
import type {
  ShareContent,
  IShareService,
  CommunityShareParams,
  CharacterShareParams,
} from "@/types/share";
import { SharePlatform } from "@/types/share";
import { displayTypeToApiParam } from "@/lib/artwork-types";

/**
 * 获取当前页面Origin
 */
function getOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

/**
 * 生成分享文案
 * @param content 分享内容
 * @param platform 目标平台
 * @returns 分享文案
 */
export function generateShareText(
  content: ShareContent,
  platform: SharePlatform
): string {
  const title = content.title || "";

  // 如果用户自定义了文案,优先使用
  if (content.text) {
    return content.text;
  }

  // 尝试从国际化配置获取文案
  if (typeof window !== "undefined") {
    try {
      const locale = (window as any).__NEXT_DATA__?.locale || "en";
      // 这里需要从i18n获取文案,暂时返回默认文案
      // 实际使用时应该在组件层通过useTranslations获取
    } catch (error) {
      console.warn("Failed to get locale for share text:", error);
    }
  }

  // 根据平台和内容类型生成默认文案
  const platformKey = platform.toString().toLowerCase();
  const typeKey = content.type;

  // Character 类型
  if (typeKey === "character" && title) {
    switch (platform) {
      case SharePlatform.TWITTER:
        return `Just created an amazing OC "${title}" on AnividAI! 🎨✨ Check it out:`;
      case SharePlatform.FACEBOOK:
        return `Check out my original character "${title}" created with AnividAI! 🎨`;
      case SharePlatform.REDDIT:
        return `I made an original character "${title}" using AnividAI. What do you think?`;
      default:
        return `I created an OC "${title}" on AnividAI! Come and see:`;
    }
  }

  // Image 类型
  if (typeKey === "image") {
    switch (platform) {
      case SharePlatform.TWITTER:
        return "Generated this awesome anime art on AnividAI! 🎨✨";
      case SharePlatform.FACEBOOK:
        return "Check out this anime artwork I created with AnividAI!";
      case SharePlatform.REDDIT:
        return "Created this anime art using AnividAI. Thoughts?";
      default:
        return "Check out this artwork I created on AnividAI!";
    }
  }

  // Video 类型
  if (typeKey === "video") {
    switch (platform) {
      case SharePlatform.TWITTER:
        return "Just made an anime video on AnividAI! 🎬✨ Take a look:";
      case SharePlatform.FACEBOOK:
        return "Check out this anime video I created with AnividAI! 🎬";
      case SharePlatform.REDDIT:
        return "Created an anime video using AnividAI. What do you think?";
      default:
        return "I created an anime video on AnividAI! Come watch:";
    }
  }

  // World 类型
  if (typeKey === "world" && title) {
    switch (platform) {
      case SharePlatform.TWITTER:
        return `Built an anime world "${title}" on AnividAI! 🌍✨ Explore it here:`;
      case SharePlatform.FACEBOOK:
        return `Check out the anime world "${title}" I created with AnividAI! 🌍`;
      case SharePlatform.REDDIT:
        return `I built a world called "${title}" using AnividAI. What do you think?`;
      default:
        return `I created a world "${title}" on AnividAI! Come explore:`;
    }
  }

  // 默认文案
  return title || "Check out this awesome content!";
}

/**
 * 构建社区分享URL
 * @param content 分享内容
 * @returns 社区页面URL
 */
export function buildCommunityShareUrl(content: ShareContent): string {
  const origin = getOrigin();
  // ShareContent already uses API types (character instead of oc)
  const artworkType = content.type;

  // 格式：/community?artwork=xxx&artworkType=image
  // Note: We use artworkType to avoid confusion with the filter 'type' parameter
  const urlPath = `/community?artwork=${content.id}&artworkType=${artworkType}`;
  return origin ? `${origin}${urlPath}` : urlPath;
}

/**
 * 构建角色分享URL
 * @param characterUuid 角色UUID
 * @returns 角色详情页URL
 */
export function buildCharacterShareUrl(characterUuid: string): string {
  const origin = getOrigin();
  const urlPath = `/characters/${characterUuid}`;
  return origin ? `${origin}${urlPath}` : urlPath;
}

/**
 * 构建世界观分享URL
 * @param worldUuid 世界观UUID
 * @returns 世界观详情页URL
 */
export function buildWorldShareUrl(worldUuid: string): string {
  const origin = getOrigin();
  const urlPath = `/worlds/${worldUuid}`;
  return origin ? `${origin}${urlPath}` : urlPath;
}

/**
 * 根据内容类型构建对应的分享URL
 * @param content 分享内容
 * @returns 分享URL
 */
export function buildShareUrl(content: ShareContent): string {
  if (content.type === "character") {
    return buildCharacterShareUrl(content.id);
  }
  if (content.type === "world") {
    return buildWorldShareUrl(content.id);
  }
  // image 和 video 都使用社区链接
  return buildCommunityShareUrl(content);
}

/**
 * 构建Twitter分享URL
 * @param content 分享内容
 * @returns Twitter Intent URL
 */
function buildTwitterUrl(content: ShareContent): string {
  const shareUrl = encodeURIComponent(buildShareUrl(content));
  const text = encodeURIComponent(generateShareText(content, SharePlatform.TWITTER));
  return `https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`;
}

/**
 * 构建Facebook分享URL
 * @param content 分享内容
 * @returns Facebook Share URL
 */
function buildFacebookUrl(content: ShareContent): string {
  const shareUrl = encodeURIComponent(buildShareUrl(content));
  return `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
}

/**
 * 构建Reddit分享URL
 * @param content 分享内容
 * @returns Reddit Submit URL
 */
function buildRedditUrl(content: ShareContent): string {
  const shareUrl = encodeURIComponent(buildShareUrl(content));
  const title = encodeURIComponent(generateShareText(content, SharePlatform.REDDIT));
  return `https://www.reddit.com/submit?url=${shareUrl}&title=${title}`;
}

/**
 * 构建分享图片URL（用于分享卡片）
 * @param content 分享内容
 * @returns 分享图片URL
 */
export function buildShareImageUrl(content: ShareContent): string | undefined {
  if (content.imageUrl) return content.imageUrl;
  if (content.type !== "character") return undefined;
  const origin = getOrigin();
  const urlPath = `/api/og/character/${content.id}`;
  return origin ? `${origin}${urlPath}` : urlPath;
}

async function buildShareImageFile(imageUrl: string): Promise<File | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch share image: ${response.status}`);
    }
    const blob = await response.blob();
    const fileType = blob.type || "image/png";
    const extension =
      fileType === "image/jpeg"
        ? "jpg"
        : fileType === "image/webp"
          ? "webp"
          : "png";
    return new File([blob], `share-card.${extension}`, { type: fileType });
  } catch (error) {
    console.error("Failed to build share image file:", error);
    return null;
  }
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<void>
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // 降级方案：使用textarea
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    throw new Error("Failed to copy to clipboard");
  }
}

/**
 * 分享到指定平台
 * @param content 分享内容
 * @param platform 目标平台
 * @returns Promise<void>
 */
export async function shareToPlatform(
  content: ShareContent,
  platform: SharePlatform
): Promise<void> {
  try {
    switch (platform) {
      case SharePlatform.TWITTER:
        window.open(buildTwitterUrl(content), "_blank", "noopener,noreferrer");
        break;

      case SharePlatform.FACEBOOK:
        window.open(buildFacebookUrl(content), "_blank", "noopener,noreferrer");
        break;

      case SharePlatform.REDDIT:
        window.open(buildRedditUrl(content), "_blank", "noopener,noreferrer");
        break;

      case SharePlatform.LINK: {
        const url = buildShareUrl(content);
        await copyToClipboard(url);
        toast.success("Link copied to clipboard!");
        break;
      }

      case SharePlatform.WEB_SHARE:
        if (navigator.share) {
          const shareUrl = buildShareUrl(content);
          const shareData: ShareData = {
            title: content.title,
            text: generateShareText(content, platform),
            url: shareUrl,
          };
          const imageUrl = buildShareImageUrl(content);
          if (imageUrl) {
            const file = await buildShareImageFile(imageUrl);
            if (file && navigator.canShare?.({ files: [file] })) {
              shareData.files = [file];
            }
          }
          await navigator.share(shareData);
        } else {
          // 如果不支持Web Share API，回退到复制链接
          const url = buildShareUrl(content);
          await copyToClipboard(url);
          toast.success("Link copied to clipboard!");
        }
        break;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error(`Failed to share to ${platform}:`, error);
    throw error;
  }
}

/**
 * 分享到多个平台
 * @param content 分享内容
 * @param platforms 平台列表
 * @returns Promise<void>
 */
export async function shareToMultiple(
  content: ShareContent,
  platforms: SharePlatform[]
): Promise<void> {
  await Promise.all(
    platforms.map((platform) => shareToPlatform(content, platform))
  );
}

/**
 * 默认启用的分享平台
 */
export const DEFAULT_SHARE_PLATFORMS: SharePlatform[] = [
  SharePlatform.TWITTER,
  SharePlatform.FACEBOOK,
  SharePlatform.REDDIT,
  SharePlatform.LINK,
];

/**
 * 平台显示配置
 */
export const PLATFORM_CONFIG: Record<
  SharePlatform,
  { label: string; icon?: string }
> = {
  [SharePlatform.TWITTER]: {
    label: "Share to X",
    icon: "X",
  },
  [SharePlatform.FACEBOOK]: {
    label: "Share to Facebook",
    icon: "facebook",
  },
  [SharePlatform.REDDIT]: {
    label: "Share to Reddit",
    icon: "reddit",
  },
  [SharePlatform.LINK]: {
    label: "Copy Link",
    icon: "link",
  },
  [SharePlatform.COMMUNITY]: {
    label: "Share to Community",
    icon: "users",
  },
  [SharePlatform.LINKEDIN]: {
    label: "Share to LinkedIn",
    icon: "linkedin",
  },
  [SharePlatform.TELEGRAM]: {
    label: "Share to Telegram",
    icon: "send",
  },
  [SharePlatform.WEB_SHARE]: {
    label: "Share",
    icon: "share-2",
  },
};

/**
 * 分享服务实例
 */
export const shareService: IShareService = {
  share: shareToPlatform,
  shareMultiple: shareToMultiple,
  buildShareUrl,
  copyToClipboard,
};

export default shareService;
