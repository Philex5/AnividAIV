"use client";
import { useState, useEffect, KeyboardEvent } from "react";
import { Progress } from "@/components/ui/progress";
import { ChatQuotaDisplay } from "./ChatQuotaDisplay";
import { QuotaExceededDialog } from "./QuotaExceededDialog";
import { useChatQuotaContext } from "@/contexts/ChatQuotaContext";
import { getCreamyCharacterUrl, getCreamyDecorationUrl } from "@/lib/asset-loader";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  maxLength?: number;
  placeholder?: string;
  sendButtonText?: string;
  costHint?: string;
  userCredits?: number;
  creditsRequired?: number;
  insufficientCreditsMessage?: string;
  rechargeUrl?: string;
  useQuotaSystem?: boolean;
  progressData?: {
    rounds: number;
    maxRounds: number;
    tokens: number;
    maxTokens: number;
  };
  progressTexts?: {
    conversationRounds?: string;
    tokens?: string;
  };
}

export default function ChatInput({
  onSend,
  disabled = false,
  isGenerating = false,
  maxLength = 2000,
  placeholder = "Type your message...",
  sendButtonText = "Send",
  costHint = "1 message will cost 1 AP",
  userCredits,
  creditsRequired = 1,
  insufficientCreditsMessage = "Insufficient credits",
  rechargeUrl = "/pricing",
  progressData,
  progressTexts = {},
  useQuotaSystem = true, // New flag to enable quota system
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [hasEnoughCredits, setHasEnoughCredits] = useState(true);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);

  const { data: quotaData } = useChatQuotaContext();

  useEffect(() => {
    if (userCredits !== undefined && !useQuotaSystem) {
      setHasEnoughCredits(userCredits >= creditsRequired);
    } else if (useQuotaSystem && quotaData) {
      // Pro用户享受无限畅聊，不显示配额不足
      const isUnlimited = quotaData.quota.is_unlimited || quotaData.quota.membership_level === 'pro';
      const hasQuota = isUnlimited || quotaData.quota.monthly_used < quotaData.quota.monthly_quota;
      setHasEnoughCredits(hasQuota);
    }
  }, [userCredits, creditsRequired, quotaData, useQuotaSystem]);

  const handleSend = () => {
    if (!input.trim() || disabled || isGenerating || !hasEnoughCredits) {
      // Show quota dialog if quota is exceeded
      if (
        useQuotaSystem &&
        quotaData &&
        quotaData.quota.monthly_used >= quotaData.quota.monthly_quota
      ) {
        setShowQuotaDialog(true);
      }
      return;
    }
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSendDisabled =
    disabled || isGenerating || !input.trim() || !hasEnoughCredits;

  return (
    <div className="flex-shrink-0 border-t bg-transparent backdrop-blur-md relative overflow-hidden pb-safe">
      {/* Creamy decorations */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <img
          src={getCreamyDecorationUrl("pad")}
          alt=""
          className="absolute bottom-2 right-4 w-8 h-8"
        />
      </div>

      <div className="relative z-10 px-4 py-3 lg:px-1 md:py-4">
        <div className="flex items-center gap-3">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= maxLength) {
                  setInput(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled || isGenerating}
              placeholder={placeholder}
              className="w-full min-h-[44px] max-h-[160px] px-4 py-3 pr-12 border-2 border-border rounded-2xl resize-none bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
              rows={1}
              style={{
                height: "auto",
                minHeight: "44px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
              }}
            />
            {/* Character count */}
            {input.length > maxLength * 0.8 && (
              <div className="absolute bottom-3 right-4 text-xs text-muted-foreground bg-background/90 px-2 py-0.5 rounded-full">
                {input.length}/{maxLength}
              </div>
            )}
          </div>

          {/* Send Button with gradient and shine effect */}
          <button
            onClick={handleSend}
            disabled={isSendDisabled}
            className="group flex items-center justify-center gap-2 px-4 py-3 min-w-[44px] h-[44px] bg-gradient-to-r from-[#FF9800] to-[#FFC107] text-white font-medium rounded-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden"
            title={sendButtonText}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />

            {isGenerating ? (
              <span className="animate-pulse relative z-10">⋯</span>
            ) : (
              <>
                <svg
                  className="w-5 h-5 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                <span className="hidden md:inline relative z-10">
                  {sendButtonText}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Cost hint and credits - refined pill design */}
        {/* 对于Free用户：左右对齐，对于Pro用户：进度条单独右对齐 */}
        {!(quotaData?.quota.is_unlimited || quotaData?.quota.membership_level === 'pro') ? (
          <div className="mt-0 flex items-center justify-between gap-2 flex-wrap">
            {/* Free用户显示cost hint */}
            <div
              className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs transition-colors ${
                hasEnoughCredits
                  ? "bg-muted/60 text-muted-foreground"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {hasEnoughCredits ? (
                <>
                  <span>{costHint}</span>
                  <img
                    src={getCreamyCharacterUrl("ap")}
                    alt="MC"
                    className="w-5 h-5 object-contain"
                  />
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="font-medium">
                    {insufficientCreditsMessage}. Need {creditsRequired} MC.{" "}
                    <a
                      href={rechargeUrl}
                      className="underline hover:no-underline"
                    >
                      Recharge
                    </a>
                  </span>
                </>
              )}
            </div>

            {/* Progress Bar - Free用户也显示但靠右 */}
            {progressData && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {progressTexts.conversationRounds || "对话轮数"}:{" "}
                  {progressData.rounds}/{progressData.maxRounds}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {progressTexts.tokens || "Tokens"}:
                  </span>
                  <div className="w-32">
                    <Progress
                      value={(progressData.tokens / progressData.maxTokens) * 100}
                      className="h-1"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground min-w-[35px] text-right">
                    {Math.round(
                      (progressData.tokens / progressData.maxTokens) * 100
                    )}
                    %
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-0 flex items-end justify-end gap-2 flex-wrap">
            {/* Pro用户不显示cost hint，进度条单独右对齐 */}
            {progressData && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {progressTexts.conversationRounds || "对话轮数"}:{" "}
                  {progressData.rounds}/{progressData.maxRounds}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {progressTexts.tokens || "Tokens"}:
                  </span>
                  <div className="w-32">
                    <Progress
                      value={(progressData.tokens / progressData.maxTokens) * 100}
                      className="h-1"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground min-w-[35px] text-right">
                    {Math.round(
                      (progressData.tokens / progressData.maxTokens) * 100
                    )}
                    %
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
