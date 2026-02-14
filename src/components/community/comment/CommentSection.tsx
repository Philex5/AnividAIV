"use client";

import { useEffect, useState, useCallback } from "react";
import { CommentWithUser } from "@/types/comment";
import { CommentInput } from "./CommentInput";
import { CommentItem } from "./CommentItem";
import { useAppContext } from "@/contexts/app";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface CommentSectionProps {
  artId: string;
  artType: "image" | "video" | "character" | "user" | "world";
  commentCount?: number;
}

const COMMENTS_PER_PAGE = 20;

export function CommentSection({ artId, artType, commentCount }: CommentSectionProps) {
  const t = useTranslations("comments");
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(commentCount ?? 0);
  const { user } = useAppContext();

  useEffect(() => {
    if (typeof commentCount === "number") {
      setTotalCount(commentCount);
    }
  }, [commentCount]);

  const hasCommentCountProp = typeof commentCount === "number";

  const fetchComments = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/comments?art_id=${artId}&art_type=${artType}&page=${pageNum}&limit=${COMMENTS_PER_PAGE}`);
      const result = await res.json();
      
      if (result.success) {
        const fetchedComments: CommentWithUser[] = Array.isArray(result.data) ? result.data : [];
        if (append) {
          setComments(prev => [...prev, ...fetchedComments]);
        } else {
          setComments(fetchedComments);
        }

        const responseTotal =
          typeof result.total === "number"
            ? result.total
            : typeof result.totalCount === "number"
              ? result.totalCount
              : typeof result.meta?.total === "number"
                ? result.meta.total
                : typeof result.pagination?.total === "number"
                  ? result.pagination.total
                  : undefined;

        setTotalCount(prev => {
          if (typeof responseTotal === "number" && !Number.isNaN(responseTotal)) {
            return responseTotal;
          }

          if (append) {
            return hasCommentCountProp ? prev : prev + fetchedComments.length;
          }

          return Math.max(prev, fetchedComments.length);
        });

        setHasMore(fetchedComments.length === COMMENTS_PER_PAGE);
      }
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setIsLoading(false);
    }
  }, [artId, artType, hasCommentCountProp]);

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  const handlePostComment = async (content: string) => {
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ art_id: artId, art_type: artType, content }),
      });
      const result = await res.json();
      if (result.success) {
        // Optimistic update or just refetch
        setComments(prev => [result.data, ...prev]);
        setTotalCount(prev => prev + 1);
        toast.success(t("toasts.posted"));
      } else {
        toast.error(result.error || t("toasts.postFailed"));
      }
    } catch (error) {
      toast.error(t("toasts.postFailed"));
    }
  };

  const handlePostReply = async (parentUuid: string, content: string, replyToUserUuid?: string) => {
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          art_id: artId,
          art_type: artType,
          content,
          parent_uuid: parentUuid,
          reply_to_user_uuid: replyToUserUuid
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(t("toasts.replied"));
        setTotalCount(prev => prev + 1);
        // Reply logic is handled within CommentItem for fetching replies
      } else {
        toast.error(result.error || t("toasts.replyFailed"));
      }
    } catch (error) {
      toast.error(t("toasts.replyFailed"));
    }
  };

  const handleLikeComment = async (uuid: string, liked: boolean) => {
    try {
      const method = liked ? "POST" : "DELETE";
      const res = await fetch(`/api/comments/${uuid}/like`, { method });
      if (!res.ok) throw new Error();
    } catch (error) {
      toast.error(t("toasts.actionFailed"));
      throw error; // Rethrow to allow component to handle rollback or state
    }
  };

  const handleDeleteComment = async (uuid: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    try {
      const res = await fetch(`/api/comments/${uuid}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        setComments(prev => prev.map(c => c.uuid === uuid ? { ...c, is_deleted: true } : c));
        setTotalCount(prev => Math.max(0, prev - 1));
        toast.success(t("toasts.deleted"));
      }
    } catch (error) {
      toast.error(t("toasts.deleteFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b pb-2">
        <MessageSquare className="h-5 w-5" />
        <h2 className="font-semibold">{t("title", { count: totalCount })}</h2>
      </div>

      <CommentInput onSubmit={handlePostComment} />

      <div className="space-y-1">
        {comments.map((comment) => (
          <CommentItem
            key={comment.uuid}
            comment={comment}
            currentUserUuid={user?.uuid}
            onLike={handleLikeComment}
            onDelete={handleDeleteComment}
            onReply={handlePostReply}
          />
        ))}

        {isLoading && page === 1 && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && comments.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            {t("noComments")}
          </div>
        )}

        {hasMore && !isLoading && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => {
                const next = page + 1;
                setPage(next);
                fetchComments(next, true);
              }}
              className="text-sm text-primary hover:underline"
            >
              {t("loadMore")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
