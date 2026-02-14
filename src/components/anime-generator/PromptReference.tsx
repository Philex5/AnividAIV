"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  ChevronUpIcon, 
  PaletteIcon, 
  ShirtIcon, 
  ImageIcon 
} from "lucide-react";
import { useStyles, useScenes, useOutfits } from "@/lib/hooks/useConfigs";

// 主分类数据
const MAIN_CATEGORIES = [
  { id: 'style', name: 'Style', icon: PaletteIcon },
  { id: 'outfit', name: 'Outfit', icon: ShirtIcon },
  { id: 'scene', name: 'Scene', icon: ImageIcon }
];

interface PromptReferenceProps {
  onParameterSelect?: (parameter: string) => void;
  className?: string;
}

export function PromptReference({ onParameterSelect, className }: PromptReferenceProps) {
  const [activeMainCategory, setActiveMainCategory] = useState('style');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 获取各种参数配置
  const { styles, isLoading: stylesLoading, error: stylesError } = useStyles(true); // 获取精选风格
  const { scenes, isLoading: scenesLoading, error: scenesError } = useScenes(true); // 获取精选场景
  const { outfits, isLoading: outfitsLoading, error: outfitsError } = useOutfits(true); // 获取精选服饰
  
  const loading = stylesLoading || scenesLoading || outfitsLoading;
  const error = stylesError || scenesError || outfitsError;
  
  const handleParameterClick = (parameter: string) => {
    onParameterSelect?.(parameter);
  };

  // 获取当前激活分类的参数
  const getCurrentCategoryConfigs = () => {
    switch (activeMainCategory) {
      case 'style':
        return styles;
      case 'scene':
        return scenes;
      case 'outfit':
        return outfits;
      default:
        return [];
    }
  };

  // 简化场景分类，直接使用所有场景数据
  const sceneCategories = { "Scenes": scenes };

  return (
    <Card className={cn("prompt-reference", className)}>
      <CardContent className="p-4">
        {/* 标题区域 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Prompt Reference</h3>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <ChevronUpIcon className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isCollapsed && "rotate-180"
            )} />
          </button>
        </div>

        {!isCollapsed && (
          <>
            {/* 主分类标签导航 */}
            <div className="flex gap-1 mb-4">
              {MAIN_CATEGORIES.map((category) => (
                <div key={category.id} className="flex-1">
                  <button
                    onClick={() => setActiveMainCategory(category.id)}
                    className={cn(
                      "w-full flex flex-col items-center gap-1 py-3 px-2 text-sm transition-all",
                      activeMainCategory === category.id
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <category.icon className="w-4 h-4" />
                    <span className="font-medium">{category.name}</span>
                  </button>
                  {activeMainCategory === category.id && (
                    <div className="h-0.5 bg-primary mt-1 rounded-full"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Scene分类的具体内容 */}
            {activeMainCategory === 'scene' && (
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">Loading scenes...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive text-sm">Error loading scenes: {error}</p>
                  </div>
                ) : Object.keys(sceneCategories).length > 0 ? (
                  Object.entries(sceneCategories).map(([categoryName, configs]) => (
                    <div key={categoryName}>
                      <h4 className="text-sm font-medium text-foreground mb-3">{categoryName}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {configs.map((config) => (
                          <button
                            key={config.key}
                            onClick={() => handleParameterClick(config.prompt_value || config.key)}
                            className="px-3 py-2 text-sm text-left bg-muted text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                          >
                            {config.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No scene configurations found</p>
                  </div>
                )}
              </div>
            )}

            {/* 其他分类内容 */}
            {activeMainCategory !== 'scene' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">Loading...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive text-sm">Error: {error}</p>
                  </div>
                ) : getCurrentCategoryConfigs().length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {getCurrentCategoryConfigs()
                      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                      .map((config) => (
                        <button
                          key={config.key}
                          onClick={() => handleParameterClick(config.prompt_value || config.key)}
                          className="px-3 py-2 text-sm text-left bg-muted text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          {config.name}
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">
                      No {MAIN_CATEGORIES.find(cat => cat.id === activeMainCategory)?.name.toLowerCase()} configurations found
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}