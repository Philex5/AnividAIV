"use client";

import { Lock, Unlock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { SlotMachineDisplay } from "./SlotMachineDisplay";
import { PromptItem } from "./types";
import { cn } from "@/lib/utils";

interface PromptDimensionCardProps {
  label: string;
  value: PromptItem | null;
  isLocked: boolean;
  onLockToggle: () => void;
  isAnimating: boolean;
  animationToken: number;
  items: PromptItem[];
  lockTooltip?: string;
  unlockTooltip?: string;
  disabled?: boolean;
}

export function PromptDimensionCard({
  label,
  value,
  isLocked,
  onLockToggle,
  isAnimating,
  animationToken,
  items,
  lockTooltip,
  unlockTooltip,
  disabled = false,
}: PromptDimensionCardProps) {
  const lockLabel = lockTooltip || "Lock this dimension";
  const unlockLabel = unlockTooltip || "Unlock to regenerate";

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card/80 p-3 lg:p-4 shadow-sm transition-all",
        isLocked ? "border-primary" : "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onLockToggle}
                aria-label={isLocked ? unlockLabel : lockLabel}
                disabled={disabled || isAnimating}
              >
                {isLocked ? (
                  <Lock className="h-4 w-4 text-primary" />
                ) : (
                  <Unlock className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isLocked ? unlockLabel : lockLabel}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="mt-2 lg:mt-3 min-h-12 lg:min-h-16">
        <SlotMachineDisplay
          value={value}
          isAnimating={isAnimating}
          animationToken={animationToken}
          items={items}
          placeholder="—"
          className="min-h-6"
        />
      </div>
    </div>
  );
}
