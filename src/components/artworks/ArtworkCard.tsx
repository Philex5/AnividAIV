"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { useAppContext } from "@/contexts/app";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VisibilityToggle } from "@/components/ui/visibility-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ArtworkListItem } from "@/types/pages/my-artworks";
import { cn } from "@/lib/utils";
import { Heart, Bookmark, Lock, Globe } from "lucide-react";
import { assetLoader } from "@/lib/asset-loader";
import { useVideoPreviewLoad } from "@/hooks/useVideoPreviewLoad";
import { ArtworkVideoMedia } from "@/components/community/cards/ArtworkVideoMedia";

interface ArtworkCardProps {
  artwork: ArtworkListItem;
  onClick: () => void;
  onToggleLike?: (uuid: string, next: boolean) => Promise<void> | void;
  onToggleFavorite?: (uuid: string, next: boolean) => Promise<void> | void;
  onToggleVisibility?: (uuid: string) => Promise<void> | void;
  className?: string;
  pageData?: any;
}

export function ArtworkCard({
  artwork,
  onClick,
  onToggleLike,
  onToggleFavorite,
  onToggleVisibility,
  className,
  pageData,
}: ArtworkCardProps) {
  const proRequiredText =
    pageData?.artworks?.user?.pro_required || "Pro plan required";
  const isVideo = artwork.type === "video";
  const hasVideoSource = isVideo && Boolean(artwork.video_url);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const { user: appUser, isLoadingUser } = useAppContext();

  const videoPreview = useVideoPreviewLoad({
    enabled: hasVideoSource,
    sources: artwork.video_url ? [artwork.video_url] : [],
    identity: artwork.uuid,
  });

  // 使用useMemo计算用户是否为Pro会员，避免重复计算和时序问题
  const isUserSubscribed = useMemo(() => {
    // 如果正在加载用户信息，不显示任何状态（避免误判为非会员）
    if (isLoadingUser || !appUser) return false;
    if (!appUser.is_sub) return false;
    if (!appUser.sub_expired_at) return false;
    return new Date(appUser.sub_expired_at) > new Date();
  }, [appUser, isLoadingUser]);

  const handleCardClick = useCallback(() => {
    videoPreview.stopPreview();
    onClick();
  }, [videoPreview, onClick]);

  // Like button handler
  const handleLike = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const next = !Boolean(artwork.liked);
      try {
        await onToggleLike?.(artwork.uuid, next);
      } catch (error) {
        // Toast handled upstream
      }
    },
    [artwork.uuid, artwork.liked, onToggleLike],
  );

  // Favorite button handler
  const handleFavorite = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const next = !Boolean(artwork.favorited);
      try {
        await onToggleFavorite?.(artwork.uuid, next);
      } catch (error) {
        // Toast handled upstream
      }
    },
    [artwork.uuid, artwork.favorited, onToggleFavorite],
  );

  // Visibility toggle handler
  const handleToggleVisibility = useCallback(async () => {
    if (!isUserSubscribed) {
      return;
    }
    try {
      await onToggleVisibility?.(artwork.uuid);
    } catch (error) {
      // Toast handled upstream
    }
  }, [artwork.uuid, onToggleVisibility, isUserSubscribed]);

  useEffect(() => {
    setAspectRatio(null);
  }, [artwork.uuid]);

  const aspectStyle = useMemo<CSSProperties>(() => {
    if (isVideo) {
      const videoAspectRatio = videoPreview.aspectRatio;
      if (
        videoAspectRatio &&
        Number.isFinite(videoAspectRatio) &&
        videoAspectRatio > 0
      ) {
        return { aspectRatio: videoAspectRatio };
      }

      return { aspectRatio: 16 / 9 };
    }

    if (
      !isVideo &&
      aspectRatio &&
      Number.isFinite(aspectRatio) &&
      aspectRatio > 0
    ) {
      return { aspectRatio };
    }

    return {};
  }, [aspectRatio, isVideo, videoPreview.aspectRatio]);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-0 transition-all duration-300 break-inside-avoid mb-3",
        className,
      )}
      onMouseEnter={videoPreview.startPreview}
      onMouseLeave={videoPreview.stopPreview}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        className="cursor-pointer"
      >
        <div
          className="relative w-full overflow-hidden rounded-t-xl bg-muted"
          style={aspectStyle}
        >
          {isVideo && hasVideoSource ? (
            <ArtworkVideoMedia
              className="h-full"
              containerRef={videoPreview.containerRef}
              videoRef={videoPreview.videoRef}
              title="Video artwork preview"
              poster={
                assetLoader.getImageUrl(artwork.thumbnail_url) || undefined
              }
              sources={videoPreview.validSources}
              preload={videoPreview.shouldLoadMetadata ? "metadata" : "none"}
              isLoading={videoPreview.isLoading}
              isReady={videoPreview.isReady}
              isPreviewing={videoPreview.isPreviewing}
              errorMessage={videoPreview.errorMessage}
              onMouseEnter={videoPreview.startPreview}
              onMouseLeave={videoPreview.stopPreview}
              onPlayClick={videoPreview.startPreview}
              onRetry={videoPreview.retryLoad}
            />
          ) : artwork.thumbnail_url ? (
            <img
              src={assetLoader.getImageUrl(artwork.thumbnail_url)}
              alt="Artwork"
              className="block h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onLoad={(e) => {
                try {
                  const img = e.currentTarget;
                  if ((img as any).naturalWidth && (img as any).naturalHeight) {
                    const width = (img as any).naturalWidth as number;
                    const height = (img as any).naturalHeight as number;
                    if (width > 0 && height > 0) {
                      setAspectRatio(width / height);
                    }
                  }
                } catch {}
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}

          {/* Video play button */}
          {/* Video duration badge */}
          {isVideo && artwork.duration_seconds && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 right-2 bg-black/70 text-white hover:bg-black/70"
            >
              {artwork.duration_seconds}s
            </Badge>
          )}

          {/* Generation type badge */}
          {artwork.gen_type && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center rounded-full bg-muted/60 text-foreground text-xs px-2 py-0.5 border border-border/50">
                {artwork.gen_type.replace(/_/g, " ")}
              </span>
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 p-1 bg-card">
          {/* Left side buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleLike}
              aria-label="Like this artwork"
              className={cn(
                "h-6 w-6 sm:h-6 sm:w-6 hover:bg-accent",
                artwork.liked && "text-red-400",
              )}
            >
              <Heart
                className="size-3 sm:size-3"
                aria-hidden="true"
                fill={artwork.liked ? "currentColor" : "none"}
              />
            </Button>
            <span className="text-xs sm:text-xs text-muted-foreground min-w-[1rem] sm:min-w-[1rem] text-center tabular-nums font-medium">
              {artwork.like_count}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              aria-label="Favorite this artwork"
              className={cn(
                "h-6 w-6 sm:h-6 sm:w-6 hover:bg-accent",
                artwork.favorited && "text-yellow-400",
              )}
            >
              <Bookmark
                className="size-3 sm:size-3"
                aria-hidden="true"
                fill={artwork.favorited ? "currentColor" : "none"}
              />
            </Button>
            <span className="text-xs sm:text-xs text-muted-foreground min-w-[1rem] sm:min-w-[1rem] text-center tabular-nums font-medium">
              {artwork.favorite_count}
            </span>
          </div>

          {/* Right side visibility toggle */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "py-0.5",
                    isLoadingUser
                      ? "cursor-wait opacity-70"
                      : !isUserSubscribed
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isUserSubscribed) {
                      handleToggleVisibility();
                    }
                  }}
                >
                  {isLoadingUser ? (
                    // 加载状态显示占位符
                    <div className="w-12 h-5 flex items-center justify-center">
                      <div className="w-3 h-3 border border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    </div>
                  ) : (
                    <VisibilityToggle
                      checked={artwork.visibility_level === "public"}
                      onCheckedChange={
                        isUserSubscribed ? handleToggleVisibility : undefined
                      }
                      checkedIcon={
                        <Globe className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 text-foreground" />
                      }
                      uncheckedIcon={
                        <Lock className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 text-foreground" />
                      }
                      disabled={!isUserSubscribed}
                    />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span>
                  {isLoadingUser
                    ? "Loading..."
                    : !isUserSubscribed
                      ? proRequiredText
                      : artwork.visibility_level === "public"
                        ? pageData?.image_detail?.visibility?.make_private ||
                          "Make Private"
                        : pageData?.image_detail?.visibility?.make_public ||
                          "Show in Community"}
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
}
