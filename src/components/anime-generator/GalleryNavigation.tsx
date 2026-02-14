"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface GalleryCategory {
  id: string;
  name: string;
  count: number;
  icon?: string;
}

interface GalleryNavigationProps {
  categories: GalleryCategory[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  totalCount: number;
  className?: string;
}

export function GalleryNavigation({
  categories,
  selectedCategory,
  onCategorySelect,
  totalCount,
  className = ""
}: GalleryNavigationProps) {
  const t = useTranslations("anime-generator");

  // 添加"全部"分类
  const allCategories = useMemo(() => [
    {
      id: "all",
      name: t("gallery-nav.all"),
      count: totalCount,
      icon: "🎨"
    },
    ...categories
  ], [categories, totalCount, t]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* 分类标题 */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg">{t("gallery-nav.browse-gallery")}</h3>
        <Badge variant="secondary" className="text-sm">
          {totalCount} {t("gallery-nav.images")}
        </Badge>
      </div>

      {/* 分类导航 */}
      <ScrollArea className="w-full">
        <div className="flex space-x-2 pb-2">
          {allCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => onCategorySelect(category.id)}
              className={cn(
                "flex-shrink-0 flex items-center space-x-2 transition-all duration-200",
                selectedCategory === category.id
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-card hover:bg-accent border text-card-foreground"
              )}
            >
              {category.icon && (
                <span className="text-sm">{category.icon}</span>
              )}
              <span className="text-sm font-medium">
                {category.name}
              </span>
              <Badge
                variant={selectedCategory === category.id ? "secondary" : "outline"}
                className={cn(
                  "text-xs",
                  selectedCategory === category.id
                    ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                    : "bg-muted text-muted-foreground border-border"
                )}
              >
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* 分类描述 */}
      {selectedCategory !== "all" && (
        <div className="text-sm text-muted-foreground">
          {t("gallery-nav.showing-category", {
            category: allCategories.find(c => c.id === selectedCategory)?.name || "",
            count: allCategories.find(c => c.id === selectedCategory)?.count || 0
          })}
        </div>
      )}
    </div>
  );
}