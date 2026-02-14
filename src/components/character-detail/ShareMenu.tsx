"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, Users, Link2, Check, Gift } from "lucide-react";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";
import { useTranslations } from "next-intl";
import type { ShareMenuProps } from "@/types/share";
import { SharePlatform } from "@/types/share";
import {
  shareToPlatform,
  DEFAULT_SHARE_PLATFORMS,
  PLATFORM_CONFIG,
  buildShareImageUrl,
  buildShareUrl,
} from "@/lib/share-utils";
import { cn } from "@/lib/utils";

type ShareRewardStatus = {
  hasReceivedToday: boolean;
  todayStr?: string;
};

const SHARE_REWARD_DAILY_LIMIT = 1;

const getTodayDateStr = () => new Date().toISOString().split("T")[0];

export function ShareMenu({
  content,
  options,
  variant = "menu",
  size = "default",
  className,
  children,
}: ShareMenuProps) {
  const { user, refreshCredits } = useAppContext();
  const t = useTranslations("incentive");
  const tShare = useTranslations("share_menu");
  const tShareTexts = useTranslations("share_texts"); // 新增：获取分享文案翻译
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState<SharePlatform | null>(null);
  const [shareStatus, setShareStatus] = useState<ShareRewardStatus | null>(
    null
  );
  const [supportsWebShare, setSupportsWebShare] = useState(false);

  const userUuid = user?.uuid;

  const refreshShareStatus = useCallback(async () => {
    if (!userUuid) {
      setShareStatus(null);
      return;
    }

    try {
      const res = await fetch("/api/incentive/status");
      const data = await res.json();
      if (data.code === 0) {
        setShareStatus(data.data.share);
      }
    } catch (error) {
      console.error("Failed to fetch share reward status:", error);
    }
  }, [userUuid]);

  useEffect(() => {
    refreshShareStatus();
  }, [refreshShareStatus]);

  useEffect(() => {
    setSupportsWebShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const shareRewardUsed =
    shareStatus?.hasReceivedToday && shareStatus?.todayStr === getTodayDateStr()
      ? 1
      : 0;
  const hasClaimedRewardToday = shareRewardUsed >= SHARE_REWARD_DAILY_LIMIT;

  // 获取启用的平台列表
  const enabledPlatforms = useMemo(() => {
    return options?.platforms || DEFAULT_SHARE_PLATFORMS;
  }, [options?.platforms]);

  // 生成带国际化的分享文案
  const getLocalizedShareText = useCallback((platform: SharePlatform): string => {
    const typeKey = content.type;
    const title = content.title || "";
    const platformKey = platform.toString().toLowerCase();

    // Helper function to get share text with fallback
    const getShareText = (type: string, plat: string): string => {
      try {
        const key = `${type}.${plat}`;
        const text = tShareTexts(key);
        // If the key doesn't exist, tShareTexts will return the key itself
        if (text === key) {
          // Fallback to default
          const defaultKey = `${type}.default`;
          const defaultText = tShareTexts(defaultKey);
          return defaultText === defaultKey ? title || "Check out this awesome content!" : defaultText;
        }
        // Replace {name} placeholder with actual title
        return text.replace("{name}", title);
      } catch {
        return title || "Check out this awesome content!";
      }
    };

    // Use next-intl's function call syntax to access nested translations
    if (typeKey === "character" && title) {
      return getShareText("character", platformKey);
    }
    if (typeKey === "image") {
      return getShareText("image", platformKey);
    }
    if (typeKey === "video") {
      return getShareText("video", platformKey);
    }
    if (typeKey === "world" && title) {
      return getShareText("world", platformKey);
    }

    return title || "Check out this awesome content!";
  }, [content, tShareTexts]);

  const shareContent = useMemo(() => {
    if (content.type !== "character") return content;
    if (content.imageUrl) return content;
    // 默认使用 TCG 模板
    const imageUrl = buildShareImageUrl(content);
    return imageUrl ? { ...content, imageUrl } : content;
  }, [content]);

  const claimReward = async (platform: SharePlatform) => {
    try {
      const res = await fetch("/api/incentive/claim-share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: {
            platform,
            url: buildShareUrl(content),
            title: content.title,
            target_id: content.id,
            target_type: content.type,
          },
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success(t("share_reward_success"));
        refreshCredits();
        setShareStatus({
          hasReceivedToday: true,
          todayStr: getTodayDateStr(),
        });
        return true;
      }
    } catch (error) {
      console.error("Failed to claim share reward:", error);
    }
    return false;
  };

  const handleShare = async (platform: SharePlatform) => {
    setIsLoading(platform);
    try {
      // 使用本地化文案
      const localizedText = getLocalizedShareText(platform);
      const shareContentWithText = { ...shareContent, text: localizedText };

      await shareToPlatform(shareContentWithText, platform);

      // Always try to claim for real SNS shares. Backend handles auth and daily idempotency.
      if (platform !== SharePlatform.LINK && !hasClaimedRewardToday) {
        await claimReward(platform);
      }

      options?.onSuccess?.(platform);
      if (platform === SharePlatform.LINK) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error(`Failed to share to ${platform}:`, error);
      toast.error(
        `Failed to share to ${PLATFORM_CONFIG[platform]?.label || platform}`
      );
      options?.onError?.(
        platform,
        error instanceof Error ? error : new Error("Unknown error")
      );
    } finally {
      setIsLoading(null);
    }
  };

  // 渲染平台图标
  const renderPlatformIcon = (platform: SharePlatform) => {
    switch (platform) {
      case SharePlatform.TWITTER:
        return (
          <svg
            className="h-4 w-4 mr-2"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case SharePlatform.FACEBOOK:
        return (
          <svg
            className="h-4 w-4 mr-2"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 3.667h-3.533v7.98H9.101z" />
          </svg>
        );
      case SharePlatform.REDDIT:
        return (
          <svg
            className="h-4 w-4 mr-2"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
          </svg>
        );
      case SharePlatform.LINK:
        return copied ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Link2 className="h-4 w-4 mr-2" />
        );
      case SharePlatform.WEB_SHARE:
        return <Share2 className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };

  // 渲染默认触发器
  const renderDefaultTrigger = () => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-10 w-10 hover:bg-accent relative group"
      aria-label={tShare("aria.share")}
    >
      <Share2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
      {user && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-tr from-[var(--color-mascot-pink)] to-[var(--color-warm-orange)] items-center justify-center shadow-sm">
            <Gift className="h-2.5 w-2.5 text-white" />
          </span>
        </span>
      )}
    </Button>
  );

  // Button变体渲染
  if (variant === "button") {
    return (
      <Button
        variant="default"
        size={size}
        onClick={() => handleShare(SharePlatform.LINK)}
        className={cn("bg-gradient-to-r from-[var(--color-mascot-pink)] to-[var(--color-warm-orange)] text-white border-none shadow-md hover:shadow-lg transition-all", className)}
        disabled={isLoading !== null}
      >
        <Share2 className="h-4 w-4 mr-2" />
        {children || tShare("button")}
      </Button>
    );
  }

  // Menu变体渲染（默认）
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || renderDefaultTrigger()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-2 rounded-xl shadow-xl glass-panel border-none">
        {enabledPlatforms.map((platform) => {
          const config = PLATFORM_CONFIG[platform];
          if (!config) return null;

          const isCurrentLoading = isLoading === platform;
          const isLinkPlatform = platform === SharePlatform.LINK;
          const label = config.label;

          return (
            <DropdownMenuItem
              key={platform}
              onClick={() => handleShare(platform)}
              disabled={isCurrentLoading}
              className="rounded-lg cursor-pointer py-2.5 hover:bg-primary/10 focus:bg-primary/10 hover:text-primary focus:text-primary transition-colors group"
            >
              <div className="text-primary/80 group-hover:text-primary group-focus:text-primary transition-colors">
                {renderPlatformIcon(platform)}
              </div>
              <span className="font-bold text-sm tracking-tight">
                {isLinkPlatform && copied ? tShare("copied") : label}
              </span>
            </DropdownMenuItem>
          );
        })}
        {user && (
          <>
            <DropdownMenuSeparator className="my-2 opacity-50" />
            <div className="px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10 text-[10px] text-primary flex items-center gap-2.5 font-black uppercase tracking-tighter overflow-hidden relative group/tip">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 -translate-x-full group-hover/tip:translate-x-full transition-transform duration-1000" />
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Gift className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary/60 text-[8px] leading-none mb-0.5">
                  {tShare("daily_bonus")}
                </span>
                {t("share_reward_tip", {
                  count: shareRewardUsed,
                  limit: SHARE_REWARD_DAILY_LIMIT,
                })}
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ShareMenu;
