"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import MessageBubble from "./MessageBubble";
import { toImageUrl } from "@/lib/r2-utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ModelSelector } from "./ModelSelector";
import { ChatQuotaBadge } from "./ChatQuotaBadge";

interface Message {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  is_streaming?: boolean;
}

interface MessageListProps {
  messages: Message[];
  characterAvatar?: string;
  characterName?: string;
  userAvatar?: string | null;
  isLoading?: boolean;
  isGenerating?: boolean;
  emptyMessage?: string;
  onMessageSent?: () => void;
  modelSelector?: {
    availableModels: string[];
    currentModel: "base" | "premium";
    onModelChange: (model: "base" | "premium") => void;
    disabled?: boolean;
    userLevel?: string;
    texts?: {
      selectModel?: string;
      base?: string;
      premium?: string;
      baseBadge?: string;
      premiumBadge?: string;
      locked?: string;
      upgradeRequired?: string;
    };
  };
  quotaTexts?: {
    monthlyQuota?: string;
    remaining?: string;
    resetsOn?: string;
  };
}

// Helper to check if two dates are more than 5 minutes apart
function shouldShowTimestamp(prev?: string, current?: string): boolean {
  if (!prev || !current) return false;
  const prevTime = new Date(prev).getTime();
  const currentTime = new Date(current).getTime();
  const diff = currentTime - prevTime;
  return diff > 5 * 60 * 1000; // 5 minutes
}

// Format timestamp for divider
function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return `Today ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } else if (isYesterday) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

function MessageListContent({
  messages,
  characterAvatar,
  characterName,
  userAvatar,
  isLoading = false,
  isGenerating = false,
  emptyMessage = "No messages yet. Start the conversation!",
  onMessageSent,
  modelSelector,
  quotaTexts,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);

  // Memoize the onClick handler to prevent unnecessary re-renders of ChatQuotaBadge
  const handleQuotaDialogClick = useCallback(() => {
    setShowQuotaDialog(true);
  }, []);

  // Auto-scroll to bottom when new messages arrive or when streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isGenerating]);

  // Determine if character data is still loading
  const isCharacterLoading = isLoading && (!characterName || !characterAvatar);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0 sticky top-0 z-10 bg-transparent backdrop-blur-md border-b h-16">
        <div className="flex items-center justify-between gap-2 px-4 h-full">
          <div className="flex items-center gap-2">
            {characterAvatar ? (
              <Avatar className="w-10 h-10 border-2 border-primary/20">
                <AvatarImage
                  src={toImageUrl(characterAvatar)}
                  alt={characterName || "Character"}
                />
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {characterName?.charAt(0).toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                {isCharacterLoading ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  (characterName?.charAt(0).toUpperCase() || "C")
                )}
              </div>
            )}
            <div className="font-semibold text-base">
              {isCharacterLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span>Loading character...</span>
                </span>
              ) : (
                characterName || "Unknown Character"
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ChatQuotaBadge
              texts={quotaTexts}
              refreshTrigger={onMessageSent}
              onClick={handleQuotaDialogClick}
            />
            <ModelSelector
              availableModels={modelSelector?.availableModels || ["base"]}
              currentModel={modelSelector?.currentModel || "base"}
              onModelChange={modelSelector?.onModelChange || (() => {})}
              disabled={modelSelector?.disabled || true}
              userLevel={modelSelector?.userLevel || "free"}
              texts={modelSelector?.texts || {}}
            />
          </div>
        </div>
      </div>

        {/* Skeleton Loading */}
        <div className="flex-1 min-h-0 overflow-y-auto sidebar-scrollbar px-3 py-4 lg:px-1 md:py-5 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar skeleton */}
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
              {/* Message skeleton */}
              <div className={`flex flex-col gap-1 max-w-[75%] md:max-w-[70%] ${i % 2 === 0 ? "items-end" : "items-start"}`}>
                <div className={`h-16 rounded-2xl bg-muted animate-pulse ${i % 2 === 0 ? "w-48" : "w-64"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0 sticky top-0 z-10 bg-transparent backdrop-blur-md border-b h-16">
        <div className="flex items-center justify-between gap-2 px-4 h-full">
          <div className="flex items-center gap-2">
            {characterAvatar ? (
              <Avatar className="w-10 h-10 border-2 border-primary/20">
                <AvatarImage
                  src={toImageUrl(characterAvatar)}
                  alt={characterName || "Character"}
                />
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                  {characterName?.charAt(0).toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                {isCharacterLoading ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  (characterName?.charAt(0).toUpperCase() || "C")
                )}
              </div>
            )}
            <div className="font-semibold text-base">
              {isCharacterLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span>Loading character...</span>
                </span>
              ) : (
                characterName || "Unknown Character"
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ChatQuotaBadge
              texts={quotaTexts}
              refreshTrigger={onMessageSent}
              onClick={handleQuotaDialogClick}
            />
            <ModelSelector
              availableModels={modelSelector?.availableModels || ["base"]}
              currentModel={modelSelector?.currentModel || "base"}
              onModelChange={modelSelector?.onModelChange || (() => {})}
              disabled={modelSelector?.disabled || false}
              userLevel={modelSelector?.userLevel || "free"}
              texts={modelSelector?.texts || {}}
            />
          </div>
        </div>
      </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground max-w-md px-4 text-sm md:text-base">
            {emptyMessage}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
    <div className="flex-shrink-0 sticky top-0 z-10 bg-transparent backdrop-blur-md border-b h-16">
      <div className="flex items-center justify-between gap-2 px-4 h-full">
        <div className="flex items-center gap-2">
          {characterAvatar ? (
            <Avatar className="w-10 h-10 border-2 border-primary/20">
              <AvatarImage
                src={toImageUrl(characterAvatar)}
                alt={characterName || "Character"}
              />
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {characterName?.charAt(0).toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
              {characterName?.charAt(0).toUpperCase() || "C"}
            </div>
          )}
          <div className="font-semibold text-base">
            {characterName || "Loading..."}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChatQuotaBadge
            texts={quotaTexts}
            refreshTrigger={onMessageSent}
            onClick={handleQuotaDialogClick}
          />
          <ModelSelector
            availableModels={modelSelector?.availableModels || ["base"]}
            currentModel={modelSelector?.currentModel || "base"}
            onModelChange={modelSelector?.onModelChange || (() => {})}
            disabled={modelSelector?.disabled || false}
            userLevel={modelSelector?.userLevel || "free"}
            texts={modelSelector?.texts || {}}
          />
        </div>
      </div>
    </div>

      {/* Messages Container */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto sidebar-scrollbar px-3 py-4 lg:px-1 md:py-5">
        {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : undefined;
        const showTimeDivider = shouldShowTimestamp(
          prevMessage?.created_at,
          message.created_at
        );

        return (
          <div key={index}>
            {/* Time divider */}
            {showTimeDivider && message.created_at && (
              <div className="flex items-center justify-center my-6">
                <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {formatTimestamp(message.created_at)}
                </div>
              </div>
            )}

            {/* Message bubble */}
            <MessageBubble
              role={message.role}
              content={message.content}
              avatar={message.role === "assistant" ? characterAvatar : undefined}
              userAvatar={userAvatar || undefined}
              characterName={characterName}
              createdAt={message.created_at}
              isStreaming={message.is_streaming}
            />
          </div>
        );
      })}

        {/* Invisible scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default function MessageList(props: MessageListProps) {
  return <MessageListContent {...props} />;
}
