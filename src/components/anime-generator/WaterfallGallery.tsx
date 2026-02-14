"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toImageUrl } from "@/lib/r2-utils";
import type { AnimeGeneratorPage } from "@/types/pages/landing";

interface ExampleImage {
  uuid: string;
  r2_path: string;
  alt: string;
  aspect_ratio: string;
  width: number;
  height: number;
  title?: string;
  parameters?: {
    model_id?: string;
    prompt?: string;
    style?: string;
    scene?: string;
    outfit?: string;
    character?: string;
    action?: string;
  };
  sort_order?: number;
}

interface WaterfallGalleryProps {
  examples: ExampleImage[];
  onExampleClick?: (example: ExampleImage) => void;
  className?: string;
  pageData: AnimeGeneratorPage;
}

const INITIAL_LOAD = 20;
const LOAD_MORE_THRESHOLD = 500;

// Distribute images into columns for masonry layout
const distributeImagesIntoColumns = (images: ExampleImage[], columnCount: number) => {
  const columns: ExampleImage[][] = Array.from({ length: columnCount }, () => []);
  
  images.forEach((image, index) => {
    const columnIndex = index % columnCount;
    columns[columnIndex].push(image);
  });
  
  return columns;
};

// PromptTooltip component for hover effect
interface PromptTooltipProps {
  prompt: string;
}

function PromptTooltip({ prompt }: PromptTooltipProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 rounded-b-lg">
      <p className="text-white text-xs leading-relaxed line-clamp-3">
        {prompt}
      </p>
    </div>
  );
}

export function WaterfallGallery({
  examples,
  onExampleClick,
  className,
  pageData
}: WaterfallGalleryProps) {
  const [displayCount, setDisplayCount] = useState(
    examples.length <= INITIAL_LOAD ? examples.length : INITIAL_LOAD
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const enableInfiniteScroll = examples.length > INITIAL_LOAD;

  // 响应式检测
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 640);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Sort examples by sort_order
  const sortedExamples = [...examples].sort((a, b) =>
    (a.sort_order || 0) - (b.sort_order || 0)
  );

  const displayedExamples = sortedExamples.slice(0, displayCount);
  const hasMore = displayCount < examples.length;

  // Calculate column count and distribute images
  const columnCount = isMobile ? 2 : 3;
  const imageColumns = distributeImagesIntoColumns(displayedExamples, columnCount);

  // Load more images
  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // Simulate async loading with timeout
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + INITIAL_LOAD, examples.length));
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore, examples.length]);

  // Infinite scroll handler
  useEffect(() => {
    if (!enableInfiniteScroll || !hasMore) return;

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < LOAD_MORE_THRESHOLD) {
        loadMore();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [enableInfiniteScroll, hasMore, loadMore]);

  // Handle image click
  const handleImageClick = (example: ExampleImage) => {
    if (onExampleClick) {
      onExampleClick(example);
    }
  };

  if (examples.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        {pageData.gallery?.empty || "No examples available"}
      </div>
    );
  }


  // 渲染图片项
  const renderImageItem = (example: ExampleImage) => {
    const imageUrl = toImageUrl(example.r2_path);
    const prompt = example.parameters?.prompt || "";

    return (
      <div
        key={example.uuid}
        className="waterfall-item cursor-pointer group relative mb-3"
        onClick={() => handleImageClick(example)}
      >
        <div className="relative w-full rounded-lg overflow-hidden border border-border bg-card hover:border-ring hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          {/* Image */}
          <img
            src={imageUrl}
            alt={example.alt}
            loading="lazy"
            className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Hover prompt tooltip */}
          {prompt && (
            <PromptTooltip prompt={prompt} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full min-h-0 overflow-y-auto scrollbar-hide",
        className
      )}
    >
      {/* Masonry Columns Container */}
      <div className="masonry-container p-2 flex gap-3">
        {imageColumns.map((column, columnIndex) => (
          <div key={columnIndex} className="masonry-column flex-1 flex flex-col">
            {column.map(example => renderImageItem(example))}
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="text-sm text-muted-foreground">
            Loading more...
          </div>
        </div>
      )}

      {/* Bottom gradient effect */}
      {!hasMore && (
        <div className="relative py-8">
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent to-background pointer-events-none" />
          <div className="text-center text-sm text-muted-foreground">
            ✨
          </div>
        </div>
      )}

      <style jsx>{`
        .masonry-container {
          align-items: flex-start;
        }
        
        .masonry-column {
          overflow: hidden;
        }

        .waterfall-item:hover {
          z-index: 5;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
