"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllConfigs } from "@/lib/hooks/useConfigs";

interface TagOption {
  key: string;
  label?: string;
  value?: string;
}

interface InlineTagSelectorProps {
  type: "scene" | "outfit" | "action";
  onSelect: (value: string) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export function InlineTagSelector({
  type,
  onSelect,
  disabled = false,
  className,
  title
}: InlineTagSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCount, setShowCount] = useState(6); // 默认显示6个
  
  const configsData = useAllConfigs();
  const { scenes, outfits, actions } = configsData;
  
  // 根据类型获取选项
  const getOptions = (): TagOption[] => {
    switch (type) {
      case "scene":
        return scenes.map(item => ({
          key: item.name || item.key || '',
          label: item.name || item.key || '',
          value: item.uuid || item.key || ''
        }));
      case "outfit":
        return outfits.map(item => ({
          key: item.name || item.key || '',
          label: item.name || item.key || '',
          value: item.uuid || item.key || ''
        }));
      case "action":
        return actions.map(item => ({
          key: item.name || item.key || '',
          label: item.name || item.key || '',
          value: item.uuid || item.key || ''
        }));
      default:
        return [];
    }
  };

  const options = getOptions();
  const visibleOptions = isExpanded ? options : options.slice(0, showCount);
  const hasMore = options.length > showCount;

  const handleTagClick = (option: TagOption) => {
    if (disabled) return;
    onSelect(option.key);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (options.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* 标题 */}
      {title && (
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h4>
      )}
      
      {/* 标签网格 */}
      <div className="flex flex-wrap gap-1.5">
        {visibleOptions.map((option) => (
          <Badge
            key={option.key}
            variant="outline"
            className={cn(
              "cursor-pointer text-xs px-2 py-1 transition-all hover:scale-105",
              "hover:bg-primary hover:text-primary-foreground hover:border-primary",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleTagClick(option)}
          >
            {option.label || option.key}
          </Badge>
        ))}
        
        {/* 展开/收起按钮 */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="h-3 w-3 mr-1" />
                Less
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-3 w-3 mr-1" />
                +{options.length - showCount} more
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}