"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { assetLoader } from "@/lib/asset-loader";

interface OutfitConfig {
  uuid: string;
  name: string;
  display_name: string;
  prompt_template: string;
  thumbnail_url: string;
  sort_order: number;
}

interface OutfitPresetsProps {
  selectedOutfit: string | null;
  onOutfitSelect: (outfit: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function OutfitPresets({
  selectedOutfit,
  onOutfitSelect,
  disabled = false,
  className = ""
}: OutfitPresetsProps) {
  const t = useTranslations("anime-generator");
  const [outfits, setOutfits] = useState<OutfitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取服饰配置
  useEffect(() => {
    async function fetchOutfits() {
      try {
        setLoading(true);
        const response = await fetch("/api/anime-generation/parameters?type=outfit");
        const data = await response.json();

        if (data.success) {
          setOutfits(data.data.configs);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(t("errors.config-load-failed"));
        console.error("Failed to load outfit config:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOutfits();
  }, []);

  const handleOutfitToggle = (outfitName: string) => {
    if (disabled) return;
    
    // 单选模式：如果点击已选中的服饰则取消选择
    onOutfitSelect(selectedOutfit === outfitName ? null : outfitName);
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("outfit-presets.label")}
        </label>
        <span className="text-xs text-gray-500">
          {t("outfit-presets.optional")}
        </span>
      </div>
      
      {/* 服饰选择网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {outfits.map((outfit) => {
          const isSelected = selectedOutfit === outfit.name;
          
          return (
            <Card
              key={outfit.uuid}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-2 overflow-hidden",
                isSelected 
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                  : "border-gray-200 hover:border-gray-300",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => handleOutfitToggle(outfit.name)}
            >
              <CardContent className="p-0">
                {/* 缩略图 */}
                <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                  {outfit.thumbnail_url ? (
                    <Image
                      src={assetLoader.getImageUrl(outfit.thumbnail_url)}
                      alt={outfit.display_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-2xl">👘</span>
                    </div>
                  )}
                  
                  {/* 选中状态覆盖 */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 服饰名称 */}
                <div className="p-2">
                  <p className="text-xs font-medium text-center truncate" title={outfit.display_name}>
                    {outfit.display_name}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* 提示信息 */}
      {selectedOutfit && (
        <div className="text-xs text-gray-600 dark:text-gray-400 bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
          {t("outfit-presets.selected")}: <span className="font-medium">
            {outfits.find(o => o.name === selectedOutfit)?.display_name}
          </span>
        </div>
      )}
      
      {!selectedOutfit && (
        <p className="text-xs text-gray-500 text-center">
          {t("outfit-presets.no-selection")}
        </p>
      )}
    </div>
  );
}