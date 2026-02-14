"use client";

import { useMemo, type CSSProperties } from "react";
import { useTranslations } from "next-intl";

import { ArtworkVideoMedia } from "@/components/community/cards/ArtworkVideoMedia";
import { Badge } from "@/components/ui/badge";
import { useVideoPreviewLoad } from "@/hooks/useVideoPreviewLoad";
import type { ArtworkPreview } from "@/types/pages/community";

interface VideoCardMediaProps {
  artwork: ArtworkPreview;
  className?: string;
}

function formatDuration(seconds?: number): string | null {
  if (!seconds || Number.isNaN(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoCardMedia({ artwork, className }: VideoCardMediaProps) {
  const t = useTranslations("community");

  const durationLabel = useMemo(
    () => formatDuration((artwork.meta as any)?.duration_seconds as number),
    [artwork.meta],
  );
  const resolutionLabel = useMemo(
    () => (artwork.meta as any)?.resolution as string | undefined,
    [artwork.meta],
  );

  const preview = useVideoPreviewLoad({
    enabled: artwork.type === "video",
    sources: artwork.media_urls,
    identity: artwork.id,
  });

  const poster = artwork.cover_url || "";
  const title = artwork.title || "Video artwork";

  const aspectRatio = useMemo(() => {
    if (preview.aspectRatio) {
      return preview.aspectRatio;
    }

    const meta = (artwork.meta ?? {}) as Record<string, unknown>;
    const width = Number(meta.width);
    const height = Number(meta.height);

    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return width / height;
    }

    const resolution = typeof meta.resolution === "string" ? meta.resolution : undefined;
    if (resolution) {
      const match = resolution.match(/(\d+)\s*[xX]\s*(\d+)/);
      if (match) {
        const parsedWidth = Number.parseInt(match[1], 10);
        const parsedHeight = Number.parseInt(match[2], 10);
        if (parsedWidth > 0 && parsedHeight > 0) {
          return parsedWidth / parsedHeight;
        }
      }
    }

    return 16 / 9;
  }, [artwork.meta, preview.aspectRatio]);

  const wrapperStyle = useMemo<CSSProperties>(
    () => ({
      aspectRatio,
    }),
    [aspectRatio],
  );

  return (
    <>
      <ArtworkVideoMedia
        className={className}
        style={wrapperStyle}
        containerRef={preview.containerRef}
        videoRef={preview.videoRef}
        title={title}
        poster={poster || undefined}
        sources={preview.validSources}
        preload={preview.shouldLoadMetadata ? "metadata" : "none"}
        isLoading={preview.isLoading}
        isReady={preview.isReady}
        isPreviewing={preview.isPreviewing}
        errorMessage={preview.errorMessage}
        onMouseEnter={preview.startPreview}
        onMouseLeave={preview.stopPreview}
        onPlayClick={preview.startPreview}
        onRetry={preview.retryLoad}
        playAriaLabel={t("actions.viewDetail")}
      />

      {preview.isReady ? (
        <div className="absolute left-3 top-3 flex items-center gap-2">
          {durationLabel ? (
            <Badge
              variant="secondary"
              className="bg-black/60 text-white backdrop-blur"
            >
              {durationLabel}
            </Badge>
          ) : null}
          {resolutionLabel ? (
            <Badge
              variant="secondary"
              className="bg-black/60 text-white backdrop-blur"
            >
              {resolutionLabel}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
