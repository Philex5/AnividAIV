"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SparklesIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnimeGeneratorPage } from "@/types/pages/landing";

interface PromptInputSectionProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showOptimize?: boolean;
  onOptimize?: (prompt: string) => Promise<string>;
  disabled?: boolean;
  className?: string;
  pageData: AnimeGeneratorPage;
  maxLength?: number;
  minLength?: number;
  showCounter?: boolean;
}

export function PromptInputSection({
  value,
  onChange,
  placeholder,
  showOptimize = true,
  onOptimize,
  disabled = false,
  className,
  pageData,
  maxLength,
  minLength = 1,
  showCounter = true,
}: PromptInputSectionProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const formatMessage = (
    template: string | undefined,
    values: Record<string, number>
  ) => {
    if (!template) return "";
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        return String(values[key]);
      }
      return match;
    });
  };

  // Character counter state
  const currentLength = value.length;
  const isNearLimit = maxLength && currentLength > maxLength * 0.9;
  const isOverLimit = maxLength && currentLength > maxLength;
  const isUnderMin = minLength && currentLength > 0 && currentLength < minLength;
  const counterText = formatMessage(pageData?.prompt?.counter_format, {
    current: currentLength,
    max: maxLength || 0,
    min: minLength || 0,
  });

  const handleOptimize = async () => {
    if (!onOptimize || !value?.trim() || isOptimizing) return;

    setIsOptimizing(true);

    try {
      const optimizedPrompt = await onOptimize(value);

      onChange(optimizedPrompt);

      // If optimization succeeds and content changes, show success hint
      if (optimizedPrompt && optimizedPrompt !== value) {
        console.log("✅ PromptOptimized: content updated successfully");
      }
    } catch (error) {
      console.error("❌ PromptInputSection: optimization failed", error);
      // Show error hint but don't change original content
      if (error instanceof Error) {
        console.warn("⚠️ Optimization failed:", error.message);
      }
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleChange = (newValue: string) => {
    // Optional: truncate if exceeding max length
    // Uncomment the following lines to enable auto-truncation
    // if (maxLength && newValue.length > maxLength) {
    //   newValue = newValue.slice(0, maxLength);
    // }
    onChange(newValue);
  };

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Title with character counter */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {pageData?.prompt?.label || ""}
          </h3>
          {/* Character counter display */}
          {showCounter && counterText && (
            <span
              className={cn(
                "text-xs tabular-nums transition-colors",
                isOverLimit
                  ? "text-destructive font-medium"
                  : isNearLimit
                  ? "text-orange-500"
                  : isUnderMin
                  ? "text-muted-foreground"
                  : "text-muted-foreground"
              )}
            >
              {counterText}
            </span>
          )}
        </div>

        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder || pageData.prompt?.placeholder || ""}
            className={cn(
              "w-full resize-none text-sm px-3 py-2 pr-10 rounded-lg scrollbar-hide",
              "min-h-[120px] sm:min-h-[140px] md:min-h-[160px] lg:min-h-[180px]",
              "focus:ring-2 focus:ring-ring transition-all",
              isOverLimit && "border-destructive focus:ring-destructive",
              isNearLimit && "border-orange-500/50"
            )}
            disabled={disabled}
            maxLength={maxLength}
          />

          {/* Sparkle optimize button */}
          {showOptimize && onOptimize && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOptimize}
                  disabled={disabled || isOptimizing || !value?.trim()}
                  className={cn(
                    "absolute bottom-1 right-1 h-6 w-6 p-0",
                    "hover:bg-muted transition-colors"
                  )}
                >
                  {isOptimizing ? (
                    <Loader2Icon className="h-3 w-3 animate-spin" />
                  ) : (
                    <SparklesIcon className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{pageData.prompt?.optimize || ""}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Error messages */}
        {isOverLimit && (
          <p className="text-xs text-destructive">
            {formatMessage(pageData?.prompt?.counter_too_long, {
              current: currentLength,
              max: maxLength || 0,
              min: minLength || 0,
            })}
          </p>
        )}
        {isUnderMin && (
          <p className="text-xs text-muted-foreground">
            {formatMessage(pageData?.prompt?.counter_too_short, {
              current: currentLength,
              max: maxLength || 0,
              min: minLength || 0,
            })}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
