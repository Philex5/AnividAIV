"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toImageUrl } from "@/lib/r2-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Play } from "lucide-react";
import type { AnimeGeneratorPage } from "@/types/pages/landing";

export interface VideoExampleItem {
  uuid: string;
  r2_path: string;
  poster_path?: string;
  alt: string;
  aspect_ratio: string;
  width?: number;
  height?: number;
  title?: string;
  parameters?: Record<string, any>;
  sort_order?: number;
}

interface VideoExamplesWaterfallProps {
  examples: VideoExampleItem[];
  onExampleClick?: (example: VideoExampleItem) => void;
  className?: string;
  pageData: AnimeGeneratorPage;
}

export function VideoExamplesWaterfall({
  examples,
  onExampleClick,
  className,
  pageData,
}: VideoExamplesWaterfallProps) {
  const pickFirstText = (...values: Array<string | null | undefined>) => {
    const found = values.find(
      (value) => typeof value === "string" && value.trim().length > 0
    );
    return found?.trim() || "";
  };

  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedExample, setSelectedExample] = useState<VideoExampleItem | null>(null);

  const sortedExamples = useMemo(
    () => [...examples].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [examples]
  );

  const handlePreview = useCallback((example: VideoExampleItem) => {
    setSelectedExample(example);
    setPreviewOpen(true);
  }, []);

  const handleReuse = useCallback((example: VideoExampleItem) => {
    onExampleClick?.(example);
  }, [onExampleClick]);

  const selectedVideoUrl = useMemo(() => {
    if (!selectedExample?.r2_path) return "";
    return toImageUrl(selectedExample.r2_path);
  }, [selectedExample?.r2_path]);

  const selectedPosterUrl = useMemo(() => {
    if (!selectedExample?.poster_path) return "";
    return toImageUrl(selectedExample.poster_path);
  }, [selectedExample?.poster_path]);

  const selectedTitle = pickFirstText(
    selectedExample?.title,
    selectedExample?.alt,
    pageData?.gallery?.immersive_title,
    pageData?.showcase?.title,
    pageData?.title
  );

  const handleDialogOpenChange = (open: boolean) => {
    setPreviewOpen(open);
    if (!open) {
      setSelectedExample(null);
    }
  };

  const reuseLabel = pickFirstText(
    pageData?.gallery?.reuse,
    pageData?.image_detail?.actions?.reuse,
    pageData?.actions?.recreate,
    pageData?.actions?.use_example,
    pageData?.buttons?.create_video,
    pageData?.create_oc
  );

  const previewLabel = pickFirstText(
    pageData?.gallery?.preview,
    pageData?.showcase?.try_style,
    pageData?.actions?.use_example,
    pageData?.showcase?.title,
    pageData?.title
  );

  const fallbackTitle = pickFirstText(
    pageData?.gallery?.title,
    pageData?.showcase?.title,
    pageData?.title
  );

  const fallbackAspect = pickFirstText(pageData?.controls?.piece, pageData?.videos);

  if (!sortedExamples.length) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        {pageData.gallery?.empty || pageData?.empty_state?.description}
      </div>
    );
  }

  return (
    <>
      <div className={cn("min-h-[60vh] md:h-full overflow-y-auto scrollbar-hide", className)}>
        <div className="columns-2 md:columns-3 lg:columns-3 gap-3 p-2 space-y-3">
          {sortedExamples.map((ex) => (
            <VideoExampleCard
              key={ex.uuid}
              example={ex}
              onPreview={() => handlePreview(ex)}
              onReuse={() => handleReuse(ex)}
              previewLabel={previewLabel}
              reuseLabel={reuseLabel}
              fallbackTitle={fallbackTitle}
              fallbackAspect={fallbackAspect}
            />
          ))}
        </div>
        <style jsx>{`
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
      <Dialog open={previewOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[95vw] max-w-5xl overflow-hidden border border-border/70 bg-background/95 p-0">
          <DialogTitle className="sr-only">{selectedTitle}</DialogTitle>
          <div className="relative aspect-video w-full overflow-hidden bg-muted/50">
            {selectedVideoUrl ? (
              <video
                key={selectedVideoUrl}
                src={selectedVideoUrl}
                poster={selectedPosterUrl || undefined}
                controls
                autoPlay
                loop
                playsInline
                className="h-full w-full object-contain"
                aria-label={selectedTitle}
              >
                <source src={selectedVideoUrl} />
              </video>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                {pageData.gallery?.empty || pageData?.empty_state?.description}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface VideoExampleCardProps {
  example: VideoExampleItem;
  onPreview: () => void;
  onReuse: () => void;
  previewLabel: string;
  reuseLabel: string;
  fallbackTitle: string;
  fallbackAspect: string;
}

function VideoExampleCard({
  example,
  onPreview,
  onReuse,
  previewLabel,
  reuseLabel,
  fallbackTitle,
  fallbackAspect,
}: VideoExampleCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const videoUrl = useMemo(() => toImageUrl(example.r2_path), [example.r2_path]);
  const poster = useMemo(() => toImageUrl(example.poster_path || ""), [example.poster_path]);

  // 判断是否有有效的poster（不为空字符串且不为undefined）
  const hasValidPoster = Boolean(poster);

  // 强制加载视频元数据以显示首帧
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) {
      return;
    }

    const handleLoadedData = () => {
      // Ensure the element is paused at the first frame for a deterministic preview
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* ignore seek errors */
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      handleLoadedData();
    }

    video.addEventListener("loadeddata", handleLoadedData);

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [videoUrl]);

  // 强制浏览器获取视频元数据
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) {
      return;
    }

    // Force the browser to fetch metadata so the first frame can be rendered
    video.load();
  }, [videoUrl]);

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    setIsHovered(true);
    setIsPlaying(true);

    video.play().catch(() => {
      setIsPlaying(false);
    });
  };

  const handleMouseLeave = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      /* ignore seek errors */
    }
    setIsHovered(false);
    setIsPlaying(false);
  }, []);

  const handleReuseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReuse();
  };

  const handleCardClick = () => {
    handleMouseLeave();
    onPreview();
  };

  return (
    <div className="break-inside-avoid mb-3">
      <Card
        className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm transition-all duration-300 hover:border-ring/60 hover:shadow-xl cursor-pointer"
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative w-full overflow-hidden rounded-t-2xl bg-muted">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={hasValidPoster ? poster : undefined}
              preload="metadata"
              muted
              playsInline
              loop={false}
              className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              aria-label={example.alt}
            >
              <source src={videoUrl} />
            </video>
          ) : (
            <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-secondary/20">
              <div className="text-center p-4">
                <div className="text-4xl mb-2">🎬</div>
                <div className="text-xs text-muted-foreground font-medium">
                  {example.title || fallbackTitle}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-1">
                  {example.parameters?.aspect_ratio || example.aspect_ratio || fallbackAspect}
                </div>
              </div>
            </div>
          )}

          {videoUrl && (
            <>
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300",
                  isHovered || isPlaying ? "opacity-0" : "opacity-100"
                )}
              >
                <div className="rounded-full bg-background/90 p-3 shadow-lg">
                  <Play className="h-6 w-6 text-foreground" />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
                <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/90 p-2 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 translate-y-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {previewLabel}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="link"
                    className="h-7 px-1 text-xs font-medium"
                    onClick={handleReuseClick}
                  >
                    {reuseLabel}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
