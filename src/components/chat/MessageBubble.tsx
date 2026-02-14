"use client";
import { toImageUrl } from "@/lib/r2-utils";
import ThinkingAnimation from "./ThinkingAnimation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  avatar?: string;
  userAvatar?: string;
  characterName?: string;
  createdAt?: string;
  isStreaming?: boolean;
}

export default function MessageBubble({
  role,
  content,
  avatar,
  userAvatar,
  characterName,
  createdAt,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const { displayUrl: userAvatarUrl } = useResolvedImageUrl(userAvatar || null);

  return (
    <div className={`flex gap-2 mb-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0 border border-border shadow-sm">
          <AvatarImage
            src={avatar ? toImageUrl(avatar) : undefined}
            alt={characterName || "Character"}
          />
          <AvatarFallback className="bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            {characterName?.charAt(0).toUpperCase() || "C"}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={`flex flex-col gap-1 max-w-[75%] md:max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Message Bubble */}
        <div
          className={`px-3 py-2 rounded-2xl break-words shadow-sm ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          }`}
        >
          {isStreaming && !content ? (
            // Show cute paw animation when AI is thinking (no content yet)
            <ThinkingAnimation />
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {content}
              {isStreaming && content && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse align-middle rounded-sm">
                  ▊
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {createdAt && !isStreaming && (
          <div className="text-xs text-muted-foreground px-1">
            {new Date(createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0 border border-border shadow-sm">
          <AvatarImage
            src={userAvatarUrl || undefined}
            alt="User"
          />
          <AvatarFallback className="bg-primary border border-primary/20 text-xs font-semibold text-primary-foreground">
            U
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
