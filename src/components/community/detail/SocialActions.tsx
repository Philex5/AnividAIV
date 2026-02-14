"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Bookmark, Heart, MoreHorizontal, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SocialActionsProps {
  liked: boolean
  favorited: boolean
  onLike: () => Promise<void> | void
  onFavorite: () => Promise<void> | void
  onShare: () => Promise<void> | void
  onMore?: () => void
  stats?: {
    likes?: number
    favorites?: number
  }
  showCounts?: boolean
}

export function SocialActions({
  liked,
  favorited,
  onLike,
  onFavorite,
  onShare,
  onMore,
  stats,
  showCounts = false,
}: SocialActionsProps) {
  const t = useTranslations("community")
  const [likePending, setLikePending] = useState(false)
  const [favoritePending, setFavoritePending] = useState(false)
  const [sharePending, setSharePending] = useState(false)

  const handleLike = async () => {
    setLikePending(true)
    try {
      await onLike()
    } finally {
      setLikePending(false)
    }
  }

  const handleFavorite = async () => {
    setFavoritePending(true)
    try {
      await onFavorite()
    } finally {
      setFavoritePending(false)
    }
  }

  const handleShare = async () => {
    setSharePending(true)
    try {
      await onShare()
    } finally {
      setSharePending(false)
    }
  }

  const formatCount = (count?: number) => {
    if (count === undefined || count === null) return "0"
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size={showCounts ? "sm" : "icon-sm"}
        onClick={handleLike}
        disabled={likePending}
        aria-label={t("aria.like")}
        className={cn(
          "gap-1.5",
          !showCounts && "h-9 w-9 sm:h-auto sm:w-auto",
          liked && "text-destructive hover:text-destructive"
        )}
      >
        <Heart
          className={cn(
            "size-5 sm:size-4",
            showCounts && "size-4"
          )}
          aria-hidden="true"
          fill={liked ? "currentColor" : "none"}
        />
        {showCounts && stats?.likes !== undefined && (
          <span className="text-sm sm:text-xs font-medium tabular-nums">
            {formatCount(stats.likes)}
          </span>
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size={showCounts ? "sm" : "icon-sm"}
        onClick={handleFavorite}
        disabled={favoritePending}
        aria-label={t("aria.favorite")}
        className={cn(
          "gap-1.5",
          !showCounts && "h-9 w-9 sm:h-auto sm:w-auto",
          favorited && "text-primary hover:text-primary"
        )}
      >
        <Bookmark
          className={cn(
            "size-5 sm:size-4",
            showCounts && "size-4"
          )}
          aria-hidden="true"
          fill={favorited ? "currentColor" : "none"}
        />
        {showCounts && stats?.favorites !== undefined && (
          <span className="text-sm sm:text-xs font-medium tabular-nums">
            {formatCount(stats.favorites)}
          </span>
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleShare}
        disabled={sharePending}
        aria-label={t("aria.share")}
        className="h-9 w-9 sm:h-auto sm:w-auto"
      >
        <Share2 className="size-5 sm:size-4" aria-hidden="true" />
      </Button>
      {onMore && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onMore}
          aria-label={t("aria.more")}
          className="h-9 w-9 sm:h-auto sm:w-auto"
        >
          <MoreHorizontal className="size-5 sm:size-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
