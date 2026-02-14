"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllConfigs } from "@/lib/hooks/useConfigs";

type ParameterType = "style" | "model" | "character" | "scene" | "outfit" | "action" | "other";

interface ParameterOption {
  id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  tags?: string[];
  is_premium?: boolean;
}

interface ParameterExpandableCardProps {
  type: ParameterType;
  isExpanded: boolean;
  currentValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function ParameterExpandableCard({
  type,
  isExpanded,
  currentValue,
  onSelect,
  onClose
}: ParameterExpandableCardProps) {
  const configsData = useAllConfigs();
  const { styles, scenes, outfits, characters, actions } = configsData;

  // Get options based on parameter type
  const options = useMemo((): ParameterOption[] => {
    let sourceData: any[] = [];
    switch (type) {
      case 'style':
        sourceData = styles;
        break;
      case 'scene':
        sourceData = scenes;
        break;
      case 'outfit':
        sourceData = outfits;
        break;
      case 'character':
        sourceData = characters;
        break;
      case 'action':
        sourceData = actions;
        break;
      default:
        return [];
    }

    return sourceData.map(item => ({
      id: item.config_data?.value || item.key || item.id || '',
      name: item.config_data?.name || item.name || '',
      description: item.config_data?.description || item.description,
      tags: item.config_data?.tags || item.tags || [],
      is_premium: item.config_data?.is_premium || false
    }));
  }, [type, styles, scenes, outfits, characters, actions]);

  const handleOptionClick = (optionId: string) => {
    onSelect(optionId);
    onClose();
  };

  if (!isExpanded) return null;

  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 z-10 mt-1",
        "bg-card border border-border rounded-md shadow-lg",
        "animate-in slide-in-from-top-2 duration-200"
      )}
    >
      <div className="max-h-60 overflow-y-auto p-3">
        {options.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {options.map(option => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                className={cn(
                  "relative p-3 rounded-lg border text-left transition-all",
                  "hover:border-ring hover:bg-muted/50",
                  currentValue === option.id
                    ? "border-ring bg-muted/50 shadow-sm"
                    : "border-border",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                )}
              >
                {/* Selection indicator */}
                {currentValue === option.id && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <CheckIcon className="h-3 w-3" />
                    </div>
                  </div>
                )}

                {/* Option content */}
                <div className="space-y-2 pr-8">
                  <div className="font-medium text-sm">
                    {option.name}
                  </div>

                  {option.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {option.description}
                    </div>
                  )}

                  {/* Tags */}
                  {option.tags && option.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {option.tags.slice(0, 3).map((tag, index) => (
                        <Badge
                          key={`${option.id}-tag-${index}`}
                          variant="secondary"
                          className="text-xs px-1 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Premium indicator */}
                  {option.is_premium && (
                    <Badge variant="outline" className="text-xs">
                      Premium
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
            No available options
          </div>
        )}
      </div>
    </div>
  );
}