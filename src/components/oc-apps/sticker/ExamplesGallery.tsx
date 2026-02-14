"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toImageUrl } from "@/lib/r2-utils";

interface ExampleImage {
  uuid: string;
  r2_path: string;
  template_id: string;
  model_id?: string;
  reference_image_url?: string;
  user_prompt?: string;
  mode?: "text_only" | "text_with_reference" | "oc_character";
  alt: string;
}

interface StickerExamplesGalleryProps {
  onExampleClick?: (example: ExampleImage) => void;
  className?: string;
  isNineGrid?: boolean; // 九宫格模式 - 仅显示支持九宫格的示例
}

const INITIAL_LOAD = 20;
const LOAD_MORE_THRESHOLD = 500;

// 分配图片到列（瀑布流布局）
const distributeImagesIntoColumns = (
  images: ExampleImage[],
  columnCount: number
) => {
  const columns: ExampleImage[][] = Array.from(
    { length: columnCount },
    () => []
  );

  images.forEach((image, index) => {
    const columnIndex = index % columnCount;
    columns[columnIndex].push(image);
  });

  return columns;
};

/**
 * StickerExamplesGallery - 贴纸示例画廊
 *
 * 瀑布流展示贴纸示例图片，支持点击复用参数
 *
 * 完全复用 ActionFigureExamplesGallery 的实现
 */
export function StickerExamplesGallery({
  onExampleClick,
  className,
  isNineGrid = false,
}: StickerExamplesGalleryProps) {
  const [examples, setExamples] = useState<ExampleImage[]>([]);
  const [displayCount, setDisplayCount] = useState(INITIAL_LOAD);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 响应式检测
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // 加载示例配置
  useEffect(() => {
    async function loadExamples() {
      try {
        const configModule = await import(
          "@/configs/gallery/sticker-examples.json"
        );
        setExamples((configModule.examples || []) as ExampleImage[]);
      } catch (error) {
        console.error("Failed to load examples:", error);
        toast.error("Failed to load examples");
      }
    }

    loadExamples();
  }, []);

  // 过滤示例：九宫格模式下仅显示 oc_nine_grid 模板的示例
  const filteredExamples = isNineGrid
    ? examples.filter(ex => ex.template_id === "oc_nine_grid")
    : examples;

  const displayedExamples = filteredExamples.slice(0, displayCount);
  const hasMore = displayCount < filteredExamples.length;

  // 计算列数和分配图片
  const columnCount = isMobile ? 1 : 3; // 桌面 3 列，移动端 1 列
  const imageColumns = distributeImagesIntoColumns(
    displayedExamples,
    columnCount
  );

  // 无限滚动加载
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !hasMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);

    if (distanceToBottom < LOAD_MORE_THRESHOLD) {
      setIsLoading(true);
      setTimeout(() => {
        setDisplayCount((prev) => Math.min(prev + 10, filteredExamples.length));
        setIsLoading(false);
      }, 300);
    }
  }, [hasMore, isLoading, filteredExamples.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleImageClick = (example: ExampleImage) => {
    if (onExampleClick) {
      onExampleClick(example);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full overflow-y-auto scrollbar-hide p-6",
        "bg-gradient-to-b from-muted/30 to-muted/60",
        className
      )}
    >
      <div className="flex gap-3">
        {imageColumns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex-1 flex flex-col gap-3">
            {column.map((example) => (
              <div
                key={example.uuid}
                className={cn(
                  "cursor-pointer group relative overflow-hidden rounded-lg bg-card border",
                  "transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
                  onExampleClick && "cursor-pointer"
                )}
                onClick={() => handleImageClick(example)}
              >
                <img
                  src={toImageUrl(example.r2_path)}
                  alt={example.alt}
                  loading="lazy"
                  className="w-full h-auto object-cover"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 加载更多指示器 */}
      {isLoading && (
        <div className="mt-6 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* 底部渐变遮罩（引导登录） */}
      {!onExampleClick && (
        <div className="sticky bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
