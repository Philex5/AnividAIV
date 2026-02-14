"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicCharactersFromDB } from "@/lib/hooks/useConfigs";
import { CharacterShowCard } from "@/components/oc-maker/CharacterShowCard";
import type { OCGalleryCharacter } from "@/lib/configs";
import { useRouter } from "next/navigation";

interface ChatOCCarouselGalleryProps {
  pageData?: any;
  className?: string;
}

export function ChatOCCarouselGallery({
  pageData,
  className,
}: ChatOCCarouselGalleryProps) {
  // 从数据库获取公开角色（而不是配置文件）
  const { characters, loading, error } = usePublicCharactersFromDB();
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // 随机选择 5 个 public 的 OC
  const displayedCharacters = useMemo(() => {
    if (!characters || characters.length === 0) return [];

    // 过滤出完整的角色：需要有立绘、姓名和简介
    const validCharacters = characters.filter((char) => {
      const hasProfileImage = !!char.profile_url && char.profile_url.trim() !== "";
      const hasName = !!char.name && char.name.trim() !== "";
      const hasDescription = !!char.brief_description && char.brief_description.trim() !== "";
      return hasProfileImage && hasName && hasDescription;
    });

    // 随机打乱数组
    const shuffled = validCharacters.sort(() => Math.random() - 0.5);

    // 返回前 5 个
    return shuffled.slice(0, Math.min(5, shuffled.length));
  }, [characters]);

  const hasCharacters = displayedCharacters.length > 0;

  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 桌面端显示数量
  const getVisibleCount = () => {
    if (typeof window === "undefined") return 3;
    if (window.innerWidth < 640) return 1;
    return 3;
  };

  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      setVisibleCount(getVisibleCount());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 自动轮播
  useEffect(() => {
    if (!hasCharacters || displayedCharacters.length <= visibleCount) return;

    const interval = setInterval(() => {
      setSelectedIndex((prev) => {
        const maxIndex = displayedCharacters.length - visibleCount;
        const newIndex = prev >= maxIndex ? 0 : prev + 1;

        // 滚动到新位置
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const cardWidth = 300 + 24;
          container.scrollTo({
            left: newIndex * cardWidth,
            behavior: "smooth",
          });
        }

        return newIndex;
      });
    }, 4000); // 每 4 秒轮播一次

    return () => clearInterval(interval);
  }, [hasCharacters, displayedCharacters.length, visibleCount]);

  // 滚动到指定位置
  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const cardWidth = 300 + 24;
    const targetScrollLeft = index * cardWidth;

    container.scrollTo({
      left: targetScrollLeft,
      behavior: "smooth",
    });
  };

  const handlePrevious = () => {
    if (!hasCharacters) return;
    const newIndex =
      selectedIndex <= 0
        ? displayedCharacters.length - visibleCount
        : selectedIndex - 1;
    setSelectedIndex(newIndex);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    if (!hasCharacters) return;
    const maxIndex = displayedCharacters.length - visibleCount;
    const newIndex = selectedIndex >= maxIndex ? 0 : selectedIndex + 1;
    setSelectedIndex(newIndex);
    scrollToIndex(newIndex);
  };

  // 处理滚动事件，更新当前索引
  const handleScroll = () => {
    if (!scrollContainerRef.current || visibleCount <= 1) return;

    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = 300 + 24;
    const newIndex = Math.round(scrollLeft / cardWidth);

    if (newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);
    }
  };

  // Touch event handlers for swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!hasCharacters || !touchStartX.current || !touchEndX.current) {
      return;
    }

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && hasCharacters) {
      handleNext();
    }
    if (isRightSwipe && hasCharacters) {
      handlePrevious();
    }
  };

  // 处理角色点击
  const handleCharacterClick = (character: any) => {
    const characterUuid = character.uuid;
    if (!characterUuid) {
      console.error("Character UUID is missing", character);
      return;
    }
    // 从当前路径中提取 locale
    const currentPath = window.location.pathname;
    const localeMatch = currentPath.match(/^\/([a-z]{2})\//);
    const locale = localeMatch ? localeMatch[1] : "en";
    router.push(`/${locale}/characters/${characterUuid}`);
  };

  // 处理选择模板（显示 Chat 和 View 按钮）
  const handleSelectTemplate = (character: any) => {
    const characterUuid = character.uuid;
    if (!characterUuid) {
      console.error("Character UUID is missing", character);
      return;
    }
    // 从当前路径中提取 locale
    const currentPath = window.location.pathname;
    const localeMatch = currentPath.match(/^\/([a-z]{2})\//);
    const locale = localeMatch ? localeMatch[1] : "en";
    // 可以在这里添加逻辑，例如显示聊天或跳转到详情页
    router.push(`/${locale}/characters/${characterUuid}`);
  };

  const renderLoadingState = () => (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
      <div className="h-48 w-40 animate-pulse rounded-2xl bg-muted" />
      <p className="text-sm text-muted-foreground">
        {pageData?.oc_gallery?.loading || "Loading characters..."}
      </p>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
        <ChevronRight className="h-5 w-5 rotate-90" />
      </div>
      <p className="text-sm text-muted-foreground">
        {pageData?.oc_gallery?.empty || "No characters found"}
      </p>
    </div>
  );

  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground">
            {pageData?.oc_gallery?.title || "Featured Characters"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {pageData?.oc_gallery?.subtitle ||
              "Discover amazing characters from our community"}
          </p>
        </div>
      </div>

      <div className="relative w-full">
        <div
          className="relative rounded-2xl border border-border bg-card/50 p-4 md:p-6 w-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {loading && renderLoadingState()}
          {!loading && !hasCharacters && renderEmptyState()}

          {!loading && hasCharacters && (
            <>
              {/* Previous button - desktop only */}
              {displayedCharacters.length > visibleCount && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  aria-label="Previous"
                  className="absolute left-2 top-1/2 z-40 -translate-y-1/2 p-3 bg-background/90 backdrop-blur-sm rounded-full hover:bg-background transition-all duration-300 hidden md:flex"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
              )}

              {/* Character cards */}
              <div
                ref={scrollContainerRef}
                className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                onScroll={handleScroll}
              >
                {displayedCharacters.map((character, index) => (
                  <div
                    key={character.uuid}
                    className="flex-none w-[280px] sm:w-[300px] snap-center"
                  >
                    <CharacterShowCard
                      character={character}
                      variant="full"
                      pageData={pageData}
                      onSelectTemplate={() => handleSelectTemplate(character)}
                    />
                  </div>
                ))}
              </div>

              {/* Next button - desktop only */}
              {displayedCharacters.length > visibleCount && (
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next"
                  className="absolute right-2 top-1/2 z-40 -translate-y-1/2 p-3 bg-background/90 backdrop-blur-sm rounded-full hover:bg-background transition-all duration-300 hidden md:flex"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
              )}

              {/* Mobile navigation controls */}
              <div className="flex items-center justify-center gap-3 md:hidden mt-4">
                <button
                  type="button"
                  onClick={handlePrevious}
                  aria-label="Previous"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden xs:inline">Previous</span>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary active:scale-95"
                >
                  <span className="hidden xs:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
