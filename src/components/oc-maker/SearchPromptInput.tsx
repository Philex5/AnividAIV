"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useOCMakerContext } from "@/contexts/oc-maker";
import { useMemo } from "react";
import { Search, RefreshCw } from "lucide-react";
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

interface SearchPromptInputProps {
  label?: string;
  placeholder?: string;
  buttonLabel?: string;
  generatingLabel?: string;
  descriptionHelper?: string;
  creditsCost?: number;
  onSubmit: () => void;
  isGenerating?: boolean;
  maxLength?: number;
}

export function SearchPromptInput({
  placeholder,
  buttonLabel,
  generatingLabel,
  creditsCost,
  onSubmit,
  isGenerating = false,
  maxLength = 500,
}: SearchPromptInputProps) {
  const { description, setDescription } = useOCMakerContext();

  const canSubmit = description.trim().length > 0 && !isGenerating;

  return (
    <div className="relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="relative flex-1 group/input">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl blur-sm opacity-0 group-hover/input:opacity-100 transition duration-500"></div>
          <div className="relative flex flex-col rounded-2xl border-2 border-primary/20 bg-background/40 p-0 transition-all group-hover/input:border-primary/40 shadow-[4px_4px_0px_0px_rgba(var(--primary),0.05)]">
            {/* Decorative Corner Mark */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-primary/40" />

            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={placeholder}
              maxLength={maxLength}
              className="min-h-[60px] flex-1 resize-none border-none bg-transparent text-base font-medium focus-visible:ring-0 sm:min-h-[80px] p-3 placeholder:text-muted-foreground/30 leading-relaxed"
              onKeyDown={(event) => {
                if (
                  (event.metaKey || event.ctrlKey) &&
                  event.key.toLowerCase() === "enter" &&
                  canSubmit
                ) {
                  onSubmit();
                }
              }}
            />
          </div>
        </div>

        <Button
          size="lg"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="relative h-[64px] sm:h-auto sm:w-36 rounded-2xl font-black text-xl tracking-tighter uppercase transition-all duration-300 shadow-[6px_6px_0px_0px_rgba(var(--primary),0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 overflow-hidden group/btn"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
          <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent transition-opacity" />

          <span className="relative z-10 flex flex-col items-center gap-0.5 drop-shadow-sm">
            {isGenerating ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span className="leading-none">{buttonLabel}</span>
                {typeof creditsCost === "number" ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold tracking-tight leading-none opacity-90">
                    <img
                      src={getCreamyCharacterUrl("meow_coin")}
                      alt="MC"
                      className="h-3.5 w-3.5"
                    />
                    {creditsCost}
                  </span>
                ) : null}
              </>
            )}
          </span>

          {/* Shine effect */}
          <div className="absolute top-0 -right-4 w-12 h-full bg-white/20 skew-x-[-20deg] group-hover:translate-x-[-250%] transition-transform duration-1000" />
        </Button>
      </div>
    </div>
  );
}
