"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { CommentWithUser } from "@/types/comment";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { CommentInput } from "./CommentInput";
import { assetLoader } from "@/lib/asset-loader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";

interface CommentItemProps {
  comment: CommentWithUser;
  currentUserUuid?: string;
  onLike: (uuid: string, liked: boolean) => Promise<void>;
  onDelete: (uuid: string) => Promise<void>;
  onReply: (parentUuid: string, content: string, replyToUserUuid?: string) => Promise<void>;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  currentUserUuid,
  onLike,
  onDelete,
  onReply,
  isReply = false,
}: CommentItemProps) {
  const t = useTranslations("comments");
  const [isLiked, setIsLiked] = useState(comment.is_liked || false);
  const [likeCount, setLikeCount] = useState(comment.like_count ?? 0);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<CommentWithUser[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const { displayUrl: userAvatarUrl } = useResolvedImageUrl(
    comment.user?.avatar_url || null,
  );
  const likeActionInFlight = useRef(false);
  const { requireAuth } = useRequireAuth();

  useEffect(() => {
    setIsLiked(comment.is_liked || false);
    setLikeCount(comment.like_count ?? 0);
  }, [comment.is_liked, comment.like_count, comment.uuid]);

  const handleLike = requireAuth(async () => {
    if (likeActionInFlight.current) {
      return;
    }

    const nextLiked = !isLiked;
    const delta = nextLiked ? 1 : -1;

    likeActionInFlight.current = true;
    setIsProcessingLike(true);
    setIsLiked(nextLiked);
    setLikeCount(prev => Math.max(0, prev + delta));

    try {
      await onLike(comment.uuid, nextLiked);
    } catch (e) {
      setIsLiked(!nextLiked);
      setLikeCount(prev => Math.max(0, prev - delta));
    } finally {
      likeActionInFlight.current = false;
      setIsProcessingLike(false);
    }
  });

  const fetchReplies = async () => {
    if (replies.length > 0 || isLoadingReplies) return;
    
    try {
      setIsLoadingReplies(true);
      const res = await fetch(`/api/comments/${comment.uuid}/replies`);
      const result = await res.json();
      if (result.success) {
        setReplies(result.data);
      }
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const toggleReplies = () => {
    if (!showReplies) {
      fetchReplies();
    }
    setShowReplies(!showReplies);
  };

  if (comment.is_deleted && !isReply) {
    return (
      <div className="py-3 text-sm text-muted-foreground italic">
        {t("deleted")}
      </div>
    );
  }

  if (comment.is_deleted && isReply) return null;

  return (
    <div className={cn("flex flex-col gap-2 py-4", isReply ? "ml-10 border-l pl-4" : "border-b last:border-0")}>
      <div className="flex gap-3">
        <Link
          href={`/user/${comment.user_uuid || ""}`}
          className="shrink-0"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                userAvatarUrl ||
                assetLoader.getImageUrl(comment.user?.avatar_url || "")
              }
            />
            <AvatarFallback>
              {comment.user?.display_name?.slice(0, 2) || t("avatarFallback")}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link
                href={`/user/${comment.user_uuid || ""}`}
                className="text-sm font-medium"
              >
                {comment.user?.display_name || t("anonymous")}
              </Link>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            {currentUserUuid === comment.user_uuid && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(comment.uuid)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-foreground break-words whitespace-pre-wrap">
            {comment.content}
          </p>
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={handleLike}
              disabled={isProcessingLike}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              {likeCount}
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              {t("reply")}
            </button>
          </div>
        </div>
      </div>

      {showReplyInput && (
        <div className="ml-11 mt-2">
          <CommentInput
            placeholder={t("replyPlaceholder", { name: comment.user?.display_name || t("anonymous") })}
            autoFocus
            submitLabel={t("reply")}
            onCancel={() => setShowReplyInput(false)}
            onSubmit={async (content) => {
              await onReply(comment.parent_uuid || comment.uuid, content, comment.user_uuid);
              setShowReplyInput(false);
              // Refresh or optimistic update
              if (!comment.parent_uuid) {
                fetchReplies();
                setShowReplies(true);
              }
            }}
          />
        </div>
      )}

      {!isReply && (
        <>
          {/* This is a bit simplified, usually you'd show a count or first reply */}
          <Button
            variant="ghost"
            size="sm"
            className="w-fit ml-10 h-8 text-xs text-muted-foreground"
            onClick={toggleReplies}
          >
            {showReplies ? (
              <>
                <ChevronUp className="mr-1 h-3 w-3" />
                {t("hideReplies")}
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-3 w-3" />
                {t("viewReplies")}
              </>
            )}
          </Button>

          {showReplies && (
            <div className="space-y-1">
              {isLoadingReplies ? (
                <div className="ml-14 py-2">
                   <div className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                replies.map((reply) => (
                  <CommentItem
                    key={reply.uuid}
                    comment={reply}
                    currentUserUuid={currentUserUuid}
                    onLike={onLike}
                    onDelete={onDelete}
                    onReply={onReply}
                    isReply
                  />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
