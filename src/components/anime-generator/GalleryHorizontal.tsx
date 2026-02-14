"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnimeGeneratorPage } from "@/types/pages/landing";
import { assetLoader } from "@/lib/asset-loader";

interface ExampleImage {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  title: string;
  parameters: {
    style?: string;
    scene?: string;
    outfit?: string;
    character?: string;
    action?: string;
  };
  tags?: string[];
}

interface GalleryHorizontalProps {
  examples: ExampleImage[];
  onExampleClick: (example: ExampleImage) => void;
  className?: string;
  pageData: AnimeGeneratorPage;
}

export function GalleryHorizontal({
  examples,
  onExampleClick,
  className,
  pageData
}: GalleryHorizontalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll state
  const checkScrollState = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScrollState();
    const scrollElement = scrollRef.current;
    
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollState);
      return () => scrollElement.removeEventListener('scroll', checkScrollState);
    }
  }, [examples]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = 320; // Approximate width of 2 items
    const newScrollLeft = scrollRef.current.scrollLeft + 
      (direction === 'left' ? -scrollAmount : scrollAmount);
    
    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleExampleClick = (example: ExampleImage) => {
    onExampleClick(example);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Gallery container */}
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 rounded-full shadow-lg bg-background/80 backdrop-blur-sm"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 rounded-full shadow-lg bg-background/80 backdrop-blur-sm"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        )}

        {/* Horizontal scroll container */}
        <div
          ref={scrollRef}
          className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {examples.map(example => (
            <div
              key={example.id}
              onClick={() => handleExampleClick(example)}
              className={cn(
                "flex-none w-32 sm:w-36 lg:w-40 bg-card rounded-lg border border-border overflow-hidden",
                "cursor-pointer transition-all hover:shadow-lg hover:border-ring",
                "group"
              )}
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden">
                <img
                  src={assetLoader.getImageUrl(example.thumbnail_url || example.image_url)}
                  alt={example.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className="p-2 sm:p-3 space-y-1 sm:space-y-2">
                <h4 className="text-sm font-medium line-clamp-1 text-foreground">
                  {example.title}
                </h4>

                {/* Parameter tags */}
                <div className="flex flex-wrap gap-1">
                  {example.parameters.style && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      {example.parameters.style}
                    </Badge>
                  )}
                  {example.parameters.scene && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      {example.parameters.scene}
                    </Badge>
                  )}
                </div>

                {/* Additional tags */}
                {example.tags && example.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {example.tags.slice(0, 2).map(tag => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className="text-xs px-1 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {examples.length === 0 && (
            <div className="flex items-center justify-center w-full h-32 text-muted-foreground">
              {pageData.gallery?.empty || "No examples available"}
            </div>
          )}
        </div>
      </div>

      {/* Usage hint */}
      <div className="text-xs text-muted-foreground text-center">
        💡 {pageData.gallery?.hint || "Click on any example to apply its style"}
      </div>
    </div>
  );
}