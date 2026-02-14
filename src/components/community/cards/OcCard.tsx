"use client"

import { Badge } from "@/components/ui/badge"
import type { ArtworkPreview } from "@/types/pages/community"
import { cn } from "@/lib/utils"

interface OcCardMediaProps {
  artwork: ArtworkPreview
  className?: string
  onUseOc?: () => void
}

export function OcCardMedia({
  artwork,
  className,
  onUseOc,
}: OcCardMediaProps) {
  const cover = artwork.cover_url || artwork.media_urls?.[0] || ""
  const alt = artwork.title || "OC artwork"
  const characterName = artwork.characters?.[0]?.name || artwork.title || "Unknown OC"

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        className
      )}
      style={{ aspectRatio: "5 / 7" }}
    >
      {cover ? (
        <img
          src={cover}
          alt={alt}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex w-full aspect-[5/7] items-center justify-center text-xs text-muted-foreground">
          {alt}
        </div>
      )}

      <Badge className="absolute left-3 top-3 bg-black/60 backdrop-blur text-white px-2 py-0.5 text-xs font-medium shadow-sm">
        OC
      </Badge>

      {/* Character Name Overlay - bottom left */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-3">
        <h3 className="text-white font-bold text-sm sm:text-base truncate">
          {characterName}
        </h3>
      </div>
    </div>
  )
}
