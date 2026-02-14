"use client";

import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface Category {
  id: string;
  label: string;
  icon: string;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
}

export function CategoryTabs({ 
  categories, 
  activeCategory, 
  onCategoryChange,
  className = ""
}: CategoryTabsProps) {
  const t = useTranslations("anime-generator.parameters");

  return (
    <div className={cn("category-tabs mb-6", className)}>
      {/* 桌面端：图标 + Tooltip */}
      <div className="hidden sm:flex space-x-2">
        {categories.map((category) => (
          <Tooltip key={category.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-xl font-medium transition-all",
                  activeCategory === category.id
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-2 border-purple-300 dark:border-purple-600 shadow-lg shadow-purple-500/20"
                    : "text-muted-foreground hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/10 border-2 border-transparent"
                )}
              >
                <CategoryIcon 
                  name={category.id as "character" | "style" | "action" | "outfit" | "scene"} 
                  size={20}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {t(category.id)}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* 移动端：图标 + 文字，可滚动 */}
      <div className="sm:hidden overflow-x-auto">
        <div className="flex space-x-3 px-1 pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all whitespace-nowrap shrink-0 min-w-[64px]",
                activeCategory === category.id
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 shadow-md shadow-purple-500/20"
                  : "text-muted-foreground hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/10"
              )}
            >
              <CategoryIcon 
                name={category.id as "character" | "style" | "action" | "outfit" | "scene"} 
                size={18}
              />
              <span className="text-xs font-medium">{t(category.id)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}