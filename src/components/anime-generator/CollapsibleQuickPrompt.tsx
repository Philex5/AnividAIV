"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  HelpCircleIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InlineTagSelector } from "./InlineTagSelector";
import type { AnimeGeneratorPage } from "@/types/pages/landing";

interface CollapsibleQuickPromptProps {
  onSelect: (value: string) => void;
  disabled?: boolean;
  className?: string;
  pageData: AnimeGeneratorPage;
}

export function CollapsibleQuickPrompt({
  onSelect,
  disabled = false,
  className,
  pageData
}: CollapsibleQuickPromptProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("space-y-2", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">
              {pageData["quick-prompt"]?.title || "Quick Prompt"}
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-3 w-3 text-muted-foreground cursor-help">
                  <HelpCircleIcon className="h-3 w-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{pageData["quick-prompt"]?.help || "Click tags to add to your prompt"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              disabled={disabled}
            >
              {isOpen ? (
                <>
                  <ChevronUpIcon className="h-3 w-3 mr-1" />
                  {pageData["quick-prompt"]?.collapse || "Collapse"}
                </>
              ) : (
                <>
                  <ChevronDownIcon className="h-3 w-3 mr-1" />
                  {pageData["quick-prompt"]?.expand || "Expand"}
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-3">
          <div className="pt-1">
            <InlineTagSelector
              type="scene"
              title="Scene"
              onSelect={onSelect}
              disabled={disabled}
            />
          </div>
          <InlineTagSelector
            type="outfit"
            title="Outfit"
            onSelect={onSelect}
            disabled={disabled}
          />
          <InlineTagSelector
            type="action"
            title="Action"
            onSelect={onSelect}
            disabled={disabled}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}