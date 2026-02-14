"use client";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

interface Preset {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  prompt?: string;
}

interface PresetGridProps {
  category: string;
  presets: Preset[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function PresetGrid({ 
  category,
  presets, 
  selectedValue, 
  onValueChange,
  className = ""
}: PresetGridProps) {
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const handleImageLoad = (presetId: string) => {
    setLoadedImages(prev => ({ ...prev, [presetId]: true }));
  };

  return (
    <div className={cn("preset-grid grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6", className)}>
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onValueChange(preset.id)}
          className={cn(
            "preset-card group relative p-4 rounded-xl border-2 transition-all hover:shadow-lg",
            selectedValue === preset.id
              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-purple-500/20"
              : "border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-600 hover:shadow-purple-500/10"
          )}
        >
          {/* 缩略图 */}
          <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg mb-3 overflow-hidden relative">
            {preset.thumbnail ? (
              <>
                <img 
                  src={preset.thumbnail} 
                  alt={preset.name}
                  className={cn(
                    "w-full h-full object-cover transition-opacity",
                    loadedImages[preset.id] ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => handleImageLoad(preset.id)}
                />
                {!loadedImages[preset.id] && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-2xl">{getIconForCategory(category)}</span>
              </div>
            )}
          </div>
          
          {/* 标签 */}
          <div className="text-center">
            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {preset.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {preset.description}
            </p>
          </div>

          {/* 选中指示器 */}
          {selectedValue === preset.id && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
              <CheckIcon className="w-3 h-3 text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function getIconForCategory(category: string): string {
  const icons: Record<string, string> = {
    character: "👤",
    style: "🎨", 
    action: "⚡",
    outfit: "👗",
    scene: "🏞️"
  };
  return icons[category] || "📷";
}