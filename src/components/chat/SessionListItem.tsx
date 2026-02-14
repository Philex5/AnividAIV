"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Trash2 } from "lucide-react";
import { toImageUrl } from "@/lib/r2-utils";
import { useLocale } from "next-intl";
import { toast } from "sonner";

interface SessionListItemProps {
  sessionId: string;
  characterUuid: string;
  characterName: string;
  characterAvatar: string | null;
  title: string | null;
  messageCount: number;
  updatedAt: string | null;
  isActive: boolean;
  onDelete?: (sessionId: string) => void;
  texts: {
    delete?: string;
    deleteConfirmTitle?: string;
    deleteConfirmMessage?: string;
    deleteConfirmButton?: string;
    deleteCancelButton?: string;
    deleted?: string;
    msgs?: string;
  };
}

export function SessionListItem({
  sessionId,
  characterUuid,
  characterName,
  characterAvatar,
  title,
  messageCount,
  updatedAt,
  isActive,
  onDelete,
  texts,
}: SessionListItemProps) {
  const router = useRouter();
  const locale = useLocale();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const displayName = title || characterName;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/delete`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (json.success) {
        // Show success toast
        toast.success(texts.deleted || "Conversation deleted");

        // Notify parent component
        onDelete?.(sessionId);

        // If the deleted session was active, redirect to chat home
        if (isActive) {
          router.push("/chat");
        }
      } else {
        toast.error(json.error || "Failed to delete conversation");
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete conversation");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setIsMenuOpen(false);
    }
  };

  // Prevent menu click from triggering link navigation
  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      <li>
        <div className="group relative">
          <Link
            href={`/chat/${characterUuid}?session_id=${sessionId}`}
            className={`
              block px-3 py-2 rounded-lg transition-all duration-200 relative
              hover:bg-background/80 hover:shadow-sm
              ${
                isActive
                  ? "bg-background shadow-sm border-l-2 border-primary"
                  : "border-l-2 border-transparent"
              }
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              {characterAvatar ? (
                <img
                  src={toImageUrl(characterAvatar)}
                  alt={characterName}
                  className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  {characterName?.charAt(0).toUpperCase() || "C"}
                </div>
              )}
              <div
                className={`text-sm font-medium line-clamp-1 flex-1 min-w-0 ${
                  isActive ? "text-primary" : "text-foreground"
                }`}
              >
                {displayName}
              </div>

              {/* Three-dot menu - only show on hover for desktop, always visible on mobile */}
              <div
                className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isActive ? "opacity-100" : ""} lg:opacity-0 lg:group-hover:opacity-100`}
                onClick={handleMenuClick}
              >
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1 rounded hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label="More options"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    side="right"
                    className="w-32 min-w-[8rem]"
                  >
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(e) => {
                        e.preventDefault();
                        setShowDeleteDialog(true);
                      }}
                      className="cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {texts.delete || "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 ml-8">
              <span>{messageCount || 0} {texts.msgs || "msgs"}</span>
              {updatedAt && (
                <>
                  <span>·</span>
                  <span>
                    {new Date(updatedAt).toLocaleDateString(locale)}
                  </span>
                </>
              )}
            </div>
          </Link>
        </div>
      </li>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {texts.deleteConfirmTitle || "Delete Conversation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {texts.deleteConfirmMessage ||
                "Are you sure you want to delete this conversation? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {texts.deleteCancelButton || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting
                ? "Deleting..."
                : (texts.deleteConfirmButton || "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
