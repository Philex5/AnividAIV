"use client";

import { Progress } from "@/components/ui/progress";

interface ChatProgressBarProps {
  rounds: number;
  maxRounds: number;
  tokens: number;
  maxTokens: number;
  texts?: {
    conversationRounds?: string;
    tokensUsed?: string;
  };
  className?: string;
}

export function ChatProgressBar({
  rounds,
  maxRounds,
  tokens,
  maxTokens,
  texts = {},
  className
}: ChatProgressBarProps) {
  const tokensProgress = Math.min((tokens / maxTokens) * 100, 100);
  const tokensPercent = Math.round(tokensProgress);

  return (
    <div className={`flex items-center gap-4 ${className || ""}`}>
      {/* Rounds Counter - No Progress Bar */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {rounds}/{maxRounds}
        </span>
      </div>

      {/* Tokens Progress - Only Progress Bar + Percentage */}
      <div className="flex-1 max-w-[200px]">
        <div className="flex items-center gap-2">
          <Progress value={tokensProgress} className="h-1 flex-1" />
          <span className="text-xs text-muted-foreground min-w-[40px] text-right">
            {tokensPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
