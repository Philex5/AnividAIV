"use client";

import { type CSSProperties } from "react";
import { Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ArtworkVideoMediaProps {
  className?: string;
  style?: CSSProperties;
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  title: string;
  poster?: string;
  sources: string[];
  preload: "none" | "metadata";
  isLoading: boolean;
  isReady: boolean;
  isPreviewing: boolean;
  errorMessage: string | null;
  durationLabel?: string | null;
  playAriaLabel?: string;
  noSourceText?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onPlayClick?: () => void;
  onRetry?: () => void;
  videoClassName?: string;
  fallbackClassName?: string;
  showPlayButton?: boolean;
}

export function ArtworkVideoMedia({
  className,
  style,
  containerRef,
  videoRef,
  title,
  poster,
  sources,
  preload,
  isLoading,
  isReady,
  isPreviewing,
  errorMessage,
  durationLabel,
  playAriaLabel = "Play video",
  noSourceText = "No video source",
  onMouseEnter,
  onMouseLeave,
  onPlayClick,
  onRetry,
  videoClassName,
  fallbackClassName,
  showPlayButton = true,
}: ArtworkVideoMediaProps) {
  return (
    <div
      ref={containerRef}
      className={cn("relative w-full overflow-hidden bg-muted", className)}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {sources.length > 0 ? (
        <video
          ref={videoRef}
          className={cn(
            "block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
            isReady || Boolean(poster) ? "opacity-100" : "opacity-0",
            videoClassName,
          )}
          poster={poster || undefined}
          preload={preload}
          muted
          playsInline
          disablePictureInPicture
          aria-label={title}
        >
          {sources.map((source, index) => (
            <source key={`${source}-${index}`} src={source} />
          ))}
        </video>
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground",
            fallbackClassName,
          )}
        >
          {noSourceText}
        </div>
      )}

      {!errorMessage && !poster && !isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <Play className="size-7 opacity-70" />
        </div>
      )}

      {(isLoading || errorMessage) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/65">
          {errorMessage ? (
            <div className="flex flex-col items-center gap-2 px-3 text-center">
              <span className="text-xs text-muted-foreground">{errorMessage}</span>
              {onRetry ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px]"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRetry();
                  }}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>
      )}

      {showPlayButton && !isPreviewing && !errorMessage && isReady && onPlayClick ? (
        <Button
          type="button"
          variant="secondary"
          size="icon-lg"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-80 shadow-lg transition-opacity duration-300 hover:opacity-100"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPlayClick();
          }}
          aria-label={playAriaLabel}
        >
          <Play className="size-6" />
        </Button>
      ) : null}

      {durationLabel ? (
        <Badge
          variant="secondary"
          className="absolute bottom-3 right-3 bg-black/70 text-white hover:bg-black/70"
        >
          {durationLabel}
        </Badge>
      ) : null}
    </div>
  );
}
