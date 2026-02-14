"use client"

import { useEffect, useState } from "react"

import type { ArtworkPreview } from "@/types/pages/community"
import { cn } from "@/lib/utils"

interface ImageCardProps {
  artwork: ArtworkPreview
  className?: string
}

export function ImageCardMedia({ artwork, className }: ImageCardProps) {
  const cover = artwork.cover_url || artwork.media_urls?.[0] || ""
  const alt = artwork.title || "Artwork"
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)

  useEffect(() => {
    if (!cover) {
      setAspectRatio(null)
      return
    }

    const img = new Image()
    img.src = cover
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight)
      }
    }
  }, [cover])

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        className
      )}
      style={{ aspectRatio: aspectRatio ?? 4 / 5 }}
    >
      {cover ? (
        <img
          src={cover}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex w-full aspect-[4/5] items-center justify-center text-xs text-muted-foreground">
          {alt}
        </div>
      )}
    </div>
  )
}
