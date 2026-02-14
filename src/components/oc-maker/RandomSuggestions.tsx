"use client";

import { Button } from "@/components/ui/button";
import { useOCMakerContext } from "@/contexts/oc-maker";
import { Sparkles, RefreshCw } from "lucide-react";

interface RandomSuggestionsProps {
  label?: string;
  refreshLabel?: string;
  manualDescription?: string;
  manualButton?: string;
  suggestions: string[];
  onManualCreate: () => void;
  onRefresh: () => void;
  onSuggestionSelect?: (value: string) => void;
}

export function RandomSuggestions({
  label,
  refreshLabel,
  suggestions,
  onRefresh,
  onSuggestionSelect,
}: RandomSuggestionsProps) {
  const { applySuggestion } = useOCMakerContext();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
          <Sparkles className="h-3 w-3 text-primary/60" />
          {label}
        </div>
        {refreshLabel && (
          <button
            type="button"
            onClick={onRefresh}
            className="group flex items-center gap-1 text-[10px] font-medium text-muted-foreground/50 transition-colors hover:text-primary"
          >
            <RefreshCw className="h-2.5 w-2.5 transition-transform group-hover:rotate-180 duration-500" />
            {refreshLabel}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="group relative rounded-xl border-2 border-border/40 bg-background/40 px-3 py-1.5 text-[11px] font-bold text-muted-foreground/80 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:translate-y-0 active:scale-95"
            onClick={() => {
              applySuggestion(suggestion);
              onSuggestionSelect?.(suggestion);
            }}
          >
            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 rounded-[10px] blur-md transition-all duration-300" />
            <span className="relative block truncate max-w-[280px] sm:max-w-[400px] tracking-tight">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
