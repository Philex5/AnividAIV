"use client";

import {
  useMemo,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Bookmark, Eye, Heart, MessageCircle } from "lucide-react";

import { ImageCardMedia } from "@/components/community/cards/ImageCard";
import { OcCardMedia } from "@/components/community/cards/OcCard";
import { VideoCardMedia } from "@/components/community/cards/VideoCard";
import ShareMenu from "@/components/character-detail/ShareMenu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import type { ArtworkPreview, CommunityPage } from "@/types/pages/community";
import type { ShareContent } from "@/types/share";
import { SharePlatform } from "@/types/share";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { assetLoader } from "@/lib/asset-loader";
import { Link } from "@/i18n/navigation";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";

interface ArtworkCardProps {
  artwork: ArtworkPreview;
  onOpen: (artwork: ArtworkPreview) => void;
  onToggleLike: (id: string, next: boolean) => Promise<void> | void;
  onToggleFavorite: (id: string, next: boolean) => Promise<void> | void;
  onShare?: (artwork: ArtworkPreview) => Promise<void>;
  onUseOc?: (artwork: ArtworkPreview) => void;
  pageData: CommunityPage;
  className?: string;
}

export function ArtworkCard({
  artwork,
  onOpen,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onUseOc,
  pageData,
  className,
}: ArtworkCardProps) {
  const viewDetailLabel = pageData?.actions?.viewDetail || "View details";
  const likeLabel = pageData?.aria?.like || "Like artwork";
  const favoriteLabel = pageData?.aria?.favorite || "Favorite artwork";
  const shareLabel = pageData?.aria?.share || "Share artwork";

  const { displayUrl: authorAvatarUrl } = useResolvedImageUrl(
    artwork.author?.avatar,
  );

  // 使用 useRequireAuth Hook 处理认证检查
  const { requireAuth } = useRequireAuth();

  const handleOpen = () => {
    onOpen(artwork);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleOpen();
    }
  };

  // 使用 requireAuth 包装点赞处理函数
  const handleLike = requireAuth(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const next = !Boolean(artwork.liked);
      try {
        await onToggleLike(artwork.id, next);
      } catch {
        /* toast handled upstream */
      }
    }
  );

  // 使用 requireAuth 包装收藏处理函数
  const handleFavorite = requireAuth(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const next = !Boolean(artwork.favorited);
      try {
        await onToggleFavorite(artwork.id, next);
      } catch {
        /* toast handled upstream */
      }
    }
  );

  // 构建分享内容
  const shareContent: ShareContent = {
    type: artwork.type === "oc" ? "character" : (artwork.type as "video" | "image" | "character"),
    id: artwork.id,
    title: artwork.title,
    text: artwork.description || artwork.prompt,
    imageUrl: artwork.cover_url || artwork.media_urls?.[0],
  };

  const handleUseOc = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onUseOc?.(artwork);
  };

  const authorInitials = useMemo(() => {
    const name = artwork.author?.name || "";
    if (!name) return "OC";
    const [first = "", second = ""] = name.split(" ");
    return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase() || "OC";
  }, [artwork.author?.name]);

  const authorId = artwork.author?.id?.trim() || "";

  const membershipLevel = useMemo(() => {
    const level = artwork.author?.membership_level;
    if (!level) return null;
    const normalized = level.trim().toLowerCase();
    if (!normalized || normalized === "free") return null;
    return normalized;
  }, [artwork.author?.membership_level]);

  const membershipDisplayName = useMemo(() => {
    if (!membershipLevel) return null;
    const map: Record<string, string> = {
      pro: "Pro Member",
      basic: "Basic Member",
      plus: "Plus Member",
      premium: "Premium Member",
      vip: "VIP Member",
      enterprise: "Enterprise Member",
    };
    const label =
      map[membershipLevel] ||
      `${membershipLevel.charAt(0).toUpperCase()}${membershipLevel.slice(1)} Member`;
    return `AnividAI ${label}`;
  }, [membershipLevel]);

  const borderGlowClass = useMemo(() => {
    switch (artwork.type) {
      case "oc":
        return "shadow-[0_0_0_2px_hsl(var(--primary)/0.8),0_0_16px_-2px_hsl(var(--primary)/0.5),inset_0_0_0_1px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_0_2px_hsl(var(--primary)),0_0_20px_-1px_hsl(var(--primary)/0.7),inset_0_0_0_1px_hsl(var(--primary)/0.5)]";
      case "video":
        return "shadow-[0_0_0_1px_hsl(var(--secondary)/0.4),0_0_8px_-2px_hsl(var(--secondary)/0.3)] hover:shadow-[0_0_0_1px_hsl(var(--secondary)/0.6),0_0_12px_-2px_hsl(var(--secondary)/0.4)]";
      default:
        return "shadow-[0_0_0_1px_hsl(var(--accent)/0.4),0_0_8px_-2px_hsl(var(--accent)/0.3)] hover:shadow-[0_0_0_1px_hsl(var(--accent)/0.6),0_0_12px_-2px_hsl(var(--accent)/0.4)]";
    }
  }, [artwork.type]);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-0 transition-all duration-300 break-inside-avoid mb-3",
        borderGlowClass,
        className
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={handleCardKeyDown}
        aria-label={viewDetailLabel}
        className="cursor-pointer"
      >
        <div className="relative w-full overflow-hidden rounded-t-xl bg-muted">
          {artwork.type === "image" && <ImageCardMedia artwork={artwork} />}
          {artwork.type === "oc" && (
            <OcCardMedia artwork={artwork} onUseOc={() => onUseOc?.(artwork)} />
          )}
          {artwork.type === "video" && (
            <VideoCardMedia artwork={artwork} />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-3 p-2 sm:p-2.5 bg-card">
          <div className="flex items-center gap-2 sm:gap-1.5 min-w-0 flex-1">
            <Link
              href={authorId ? `/user/${authorId}` : "/community"}
              className="flex items-center gap-2 sm:gap-1.5 min-w-0"
              prefetch={Boolean(authorId)}
            >
              <Avatar className="size-7 sm:size-6 shrink-0">
                {artwork.author?.avatar ? (
                  <AvatarImage
                    src={
                      authorAvatarUrl ||
                      assetLoader.getImageUrl(artwork.author.avatar)
                    }
                    alt={artwork.author.name}
                  />
                ) : null}
                <AvatarFallback className="text-[10px] sm:text-[10px]">
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-sm sm:text-xs font-medium truncate">
                  {artwork.author?.name || "Anon"}
                </span>
                {membershipLevel && membershipDisplayName ? (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center shrink-0">
                          <Image
                            src={assetLoader.getMemberBadgeUrl(membershipLevel)}
                            alt={membershipDisplayName}
                            width={18}
                            height={18}
                            className="h-4 w-4 sm:h-3.5 sm:w-3.5"
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <span>{membershipDisplayName}</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleLike}
              aria-label={likeLabel}
              className={cn(
                "h-8 w-8 sm:h-6 sm:w-6 hover:bg-accent",
                artwork.liked && "text-red-500"
              )}
            >
              <Heart
                className="size-4 sm:size-3.5"
                aria-hidden="true"
                fill={artwork.liked ? "currentColor" : "none"}
              />
            </Button>
            <span className="text-sm sm:text-xs text-muted-foreground min-w-[1.25rem] sm:min-w-[1rem] text-center">
              {artwork.stats.likes}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              aria-label={favoriteLabel}
              className={cn(
                "h-8 w-8 sm:h-6 sm:w-6 hover:bg-accent",
                artwork.favorited && "text-yellow-500"
              )}
            >
              <Bookmark
                className="size-4 sm:size-3.5"
                aria-hidden="true"
                fill={artwork.favorited ? "currentColor" : "none"}
              />
            </Button>

            <ShareMenu
              content={shareContent}
              variant="menu"
              size="sm"
              options={{
                platforms: [
                  SharePlatform.TWITTER,
                  SharePlatform.FACEBOOK,
                  SharePlatform.REDDIT,
                  SharePlatform.LINK,
                ],
              }}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={shareLabel}
                className="h-8 w-8 sm:h-6 sm:w-6 hover:bg-accent"
              >
                <svg
                  className="size-4 sm:size-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </Button>
            </ShareMenu>
          </div>
        </div>
      </div>
    </Card>
  );
}
