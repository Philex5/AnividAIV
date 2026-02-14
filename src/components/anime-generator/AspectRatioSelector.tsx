"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AspectRatioConfig {
  uuid: string;
  name: string;
  display_name: string;
  config_data: {
    width: number;
    height: number;
    ratio: string;
  } | null;
  thumbnail_url: string;
  sort_order: number;
}

interface AspectRatioSelectorProps {
  selectedRatio: string | null;
  onRatioSelect: (ratio: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AspectRatioSelector({
  selectedRatio,
  onRatioSelect,
  disabled = false,
  className = ""
}: AspectRatioSelectorProps) {
  const t = useTranslations("anime-generator");
  const [ratios, setRatios] = useState<AspectRatioConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取长宽比配置
  useEffect(() => {
    async function fetchRatios() {
      try {
        setLoading(true);
        const response = await fetch("/api/anime-generation/parameters?type=aspect_ratio");
        const data = await response.json();

        if (data.success) {
          const configs = data.data.configs.map((config: any) => ({
            ...config,
            config_data: config.config_data ? JSON.parse(config.config_data) : null
          }));
          setRatios(configs);
          
          // 如果没有选中的比例，默认选择1:1
          if (!selectedRatio && configs.length > 0) {
            const defaultRatio = configs.find((r: any) => r.name === "1:1") || configs[0];
            onRatioSelect(defaultRatio.name);
          }
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(t("errors.config-load-failed"));
        console.error("Failed to load aspect ratio config:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRatios();
  }, [selectedRatio, onRatioSelect]);

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Skeleton className="h-4 w-20" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
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
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("aspect-ratio-selector.label")}
      </label>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ratios.map((ratio) => {
          const isSelected = selectedRatio === ratio.name;
          const ratioData = ratio.config_data;
          
          return (
            <Card
              key={ratio.uuid}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-2",
                isSelected 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                  : "border-gray-200 hover:border-gray-300",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !disabled && onRatioSelect(ratio.name)}
            >
              <CardContent className="p-3">
                <div className="flex flex-col items-center space-y-2">
                  {/* 比例预览框 */}
                  <div className="relative bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                    {ratioData && (
                      <div 
                        className="bg-gradient-to-br from-blue-400 to-purple-500"
                        style={{
                          width: Math.min(ratioData.width / 20, 48),
                          height: Math.min(ratioData.height / 20, 48),
                          minWidth: 24,
                          minHeight: 24
                        }}
                      />
                    )}
                  </div>
                  
                  {/* 比例名称 */}
                  <div className="text-center">
                    <p className="text-sm font-medium">{ratio.display_name}</p>
                    {ratioData && (
                      <p className="text-xs text-gray-500">
                        {ratioData.width}×{ratioData.height}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* 选中比例的详细信息 */}
      {selectedRatio && (
        <div className="text-xs text-gray-500 mt-2">
          {(() => {
            const selected = ratios.find(r => r.name === selectedRatio);
            if (selected?.config_data) {
              return `${t("aspect-ratio-selector.selected")}: ${selected.config_data.width}×${selected.config_data.height}px`;
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
}