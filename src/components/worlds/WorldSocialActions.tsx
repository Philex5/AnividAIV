"use client";

import { useState } from "react";
import { Bookmark, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ShareMenu from "@/components/character-detail/ShareMenu";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import type { ShareContent } from "@/types/share";

interface WorldSocialActionsProps {
  worldUuid: string;
  worldName: string;
  isPublic: boolean;
  likeCount?: number | null;
  favoriteCount?: number | null;
  liked?: boolean;
  favorited?: boolean;
  size?: "sm" | "md";
  translations?: any;
  themeColor?: string;
}

export function WorldSocialActions({
  worldUuid,
  worldName,
  isPublic,
  likeCount = 0,
  favoriteCount = 0,
  liked = false,
  favorited = false,
  size = "md",
  translations,
  themeColor,
}: WorldSocialActionsProps) {
  const { isAuthenticated, requireAuth, redirectToSignIn } = useRequireAuth();
  const labels = translations?.actions?.labels || {};
  const errors = translations?.actions?.errors || {};

  const [hasLiked, setHasLiked] = useState(Boolean(liked));
  const [hasFavorited, setHasFavorited] = useState(Boolean(favorited));
  const [likeCountState, setLikeCountState] = useState(Number(likeCount || 0));
  const [favoriteCountState, setFavoriteCountState] = useState(Number(favoriteCount || 0));
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  const sharedButtonClasses = cn(
    "relative rounded-xl transition-all duration-300 active:scale-95 bg-transparent hover:bg-[var(--hover-bg)] shadow-none",
    size === "sm" ? "h-9 px-3 text-xs" : "h-10 px-4 text-sm"
  );

  const handleLike = requireAuth(async () => {
    if (!isPublic || isLikeLoading) return;
    setIsLikeLoading(true);
    try {
      const method = hasLiked ? "DELETE" : "POST";
      const response = await fetch(`/api/worlds/${worldUuid}/like`, { method });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(
          json?.message || errors.like_failed || errors.operation_failed || ""
        );
      }
      setHasLiked(!hasLiked);
      setLikeCountState((prev) => (hasLiked ? Math.max(0, prev - 1) : prev + 1));
    } catch (error) {
      console.error("Like world failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : errors.operation_failed || ""
      );
    } finally {
      setIsLikeLoading(false);
    }
  });

  const handleFavorite = requireAuth(async () => {
    if (!isPublic || isFavoriteLoading) return;
    setIsFavoriteLoading(true);
    try {
      const method = hasFavorited ? "DELETE" : "POST";
      const response = await fetch(`/api/worlds/${worldUuid}/favorite`, { method });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(
          json?.message || errors.favorite_failed || errors.operation_failed || ""
        );
      }
      setHasFavorited(!hasFavorited);
      setFavoriteCountState((prev) =>
        hasFavorited ? Math.max(0, prev - 1) : prev + 1
      );
    } catch (error) {
      console.error("Favorite world failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : errors.operation_failed || ""
      );
    } finally {
      setIsFavoriteLoading(false);
    }
  });

  const trackShare = async () => {
    if (!isAuthenticated || !isPublic) return;
    try {
      const response = await fetch(`/api/worlds/${worldUuid}/share`, {
        method: "POST",
      });
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(
          json?.message || errors.share_failed || errors.operation_failed || ""
        );
      }
    } catch (error) {
      console.error("Share world failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : errors.operation_failed || ""
      );
    }
  };

  const shareContent: ShareContent = {
    type: "world",
    id: worldUuid,
    title: worldName,
  };

  if (!isPublic) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleLike}
        disabled={isLikeLoading}
        aria-label={labels.like || ""}
        className={cn(
          sharedButtonClasses,
          hasLiked ? "text-destructive bg-destructive/5" : "text-muted-foreground hover:text-destructive"
        )}
        style={{ "--hover-bg": "rgba(239, 68, 68, 0.05)" } as any}
      >
        <Heart className={cn(size === "sm" ? "h-4 w-4" : "h-5 w-5", "mr-2", hasLiked && "fill-current")} />
        <span className="font-bold tabular-nums">{likeCountState}</span>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleFavorite}
        disabled={isFavoriteLoading}
        aria-label={labels.favorite || ""}
        className={cn(
          sharedButtonClasses,
          hasFavorited ? "text-yellow-500 bg-yellow-500/5" : "text-muted-foreground hover:text-yellow-500"
        )}
        style={{ "--hover-bg": "rgba(234, 179, 8, 0.05)" } as any}
      >
        <Bookmark className={cn(size === "sm" ? "h-4 w-4" : "h-5 w-5", "mr-2", hasFavorited && "fill-current")} />
        <span className="font-bold tabular-nums">{favoriteCountState}</span>
      </Button>

      {isAuthenticated ? (
        <ShareMenu
          content={shareContent}
          variant="menu"
          size="icon-sm"
          className={cn(
            "rounded-xl",
            size === "sm" ? "h-9 w-9" : "h-10 w-10"
          )}
          options={{
            onSuccess: trackShare,
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={labels.share || ""}
            className={cn(
              "rounded-xl text-muted-foreground transition-all duration-300",
              size === "sm" ? "h-9 w-9" : "h-10 w-10",
              sharedButtonClasses
            )}
            style={{ 
              "--hover-bg": `${themeColor}15`,
              "--hover-text": themeColor 
            } as any}
          >
            <Share2 
              className={cn(
                size === "sm" ? "h-4 w-4" : "h-5 w-5",
                "transition-colors group-hover:text-[var(--hover-text)]"
              )} 
            />
          </Button>
        </ShareMenu>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => redirectToSignIn()}
          aria-label={labels.share || ""}
          className={cn(
            "rounded-xl text-muted-foreground transition-all duration-300",
            size === "sm" ? "h-9 w-9" : "h-10 w-10",
            sharedButtonClasses
          )}
          style={{ 
            "--hover-bg": `${themeColor}15`,
            "--hover-text": themeColor 
          } as any}
        >
          <Share2 
            className={cn(
              size === "sm" ? "h-4 w-4" : "h-5 w-5",
              "transition-colors hover:text-[var(--hover-text)]"
            )} 
          />
        </Button>
      )}
    </div>
  );
}
