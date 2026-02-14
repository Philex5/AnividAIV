"use client";

import { cn } from "@/lib/utils";

interface GeneratedPromptDisplayProps {
  title: string;
  subtitle?: string;
  prompt: string;
  placeholder?: string;
  className?: string;
}

export function GeneratedPromptDisplay({
  title,
  subtitle,
  prompt,
  placeholder = "",
  className,
}: GeneratedPromptDisplayProps) {
  const hasPrompt = prompt.trim().length > 0;

  return (
    <div className={cn("flex h-full flex-col rounded-3xl border bg-card/70 p-6 shadow-lg", className)}>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border bg-background/80 p-4">
        <p
          className={cn(
            "whitespace-pre-wrap text-sm leading-relaxed text-foreground",
            !hasPrompt && "text-muted-foreground"
          )}
        >
          {hasPrompt ? prompt : placeholder}
        </p>
      </div>
    </div>
  );
}
