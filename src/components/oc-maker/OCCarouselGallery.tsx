"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useOCGallery } from "@/lib/hooks/useConfigs";
import { CharacterShowCard } from "./CharacterShowCard";
import type { OCGalleryCharacter } from "@/lib/configs";
import type { OCMakerPage } from "@/types/pages/landing";

interface OCCarouselGalleryProps {
  pageData?: OCMakerPage;
  className?: string;
  onSelectTemplate?: (character: OCGalleryCharacter) => void;
}

export function OCCarouselGallery({
  pageData,
  className,
  onSelectTemplate,
}: OCCarouselGalleryProps) {
  const { characters, loading, error } = useOCGallery();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const renderLoadingState = () => (
    <div className="flex gap-6 overflow-hidden py-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="aspect-[3/4] w-64 flex-shrink-0 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-6 py-4", className)}>
      <div className="flex items-end justify-between px-2">
        <div>
          <h3 className="text-2xl font-bold text-foreground font-display">
            {pageData?.oc_gallery?.title || "OC Gallery"}
          </h3>
          <p className="text-sm lg:text-base text-muted-foreground">
            {pageData?.oc_gallery?.subtitle || "Inspiring character examples"}
          </p>
        </div>
        <a
          href="/community?type=oc"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline transition-all"
        >
          {pageData?.oc_gallery?.view_more || "View more in community"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </a>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={cn(
          "flex gap-8 overflow-x-auto pb-12 pt-4 no-scrollbar cursor-grab active:cursor-grabbing px-4",
          isDragging && "select-none"
        )}
        style={{ scrollSnapType: isDragging ? "none" : "x proximity" }}
      >
        {loading && renderLoadingState()}
        
        {!loading && characters.map((character) => (
          <div
            key={character.uuid}
            className="flex-shrink-0 w-64 transition-all duration-300 hover:scale-105 group"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="relative transform transition-all duration-500 group-hover:-rotate-2 group-hover:-translate-y-2">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <CharacterShowCard
                character={character}
                variant="full"
                pageData={pageData}
                onSelectTemplate={onSelectTemplate}
                className="shadow-[0_10px_30px_rgba(0,0,0,0.15)] group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-border/40"
              />
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-center text-xs text-destructive">{error}</p>}
      
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
