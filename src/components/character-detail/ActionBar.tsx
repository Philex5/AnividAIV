"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Bookmark, Edit, Trash2, MessageCircle } from "lucide-react";

import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShareMenu } from "./ShareMenu";
import { ExportDropdown } from "./ExportDropdown";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import type { ShareContent } from "@/types/share";
import type { CharacterDetailPage } from "@/types/pages/landing";

interface ActionBarProps {
  characterUuid: string;
  characterName: string;
  isOwner: boolean;
  isEditMode: boolean;
  isPublic: boolean;
  likeCount: number;
  favoriteCount: number;
  userHasLiked: boolean;
  userHasFavorited: boolean;
  locale: string;
  pageData: CharacterDetailPage;
  variant?: "default" | "ghost";
  onExportCard?: () => void;
  onExportLongImage?: () => void;
}

export function ActionBar({
  characterUuid,
  characterName,
  isOwner,
  isEditMode,
  isPublic,
  likeCount: initialLikeCount,
  favoriteCount: initialFavoriteCount,
  userHasLiked: initialHasLiked,
  userHasFavorited: initialHasFavorited,
  locale,
  pageData,
  variant = "default",
  onExportCard,
  onExportLongImage,
}: ActionBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [hasFavorited, setHasFavorited] = useState(initialHasFavorited);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);

  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const { requireAuth } = useRequireAuth();

  const base = useMemo(
    () => (locale && locale !== "en" ? `/${locale}` : ""),
    [locale],
  );

  const actionCopy = pageData.action_bar || {};

  const handleLike = requireAuth(async () => {
    if (isLikeLoading) return;
    setIsLikeLoading(true);
    try {
      const method = hasLiked ? "DELETE" : "POST";
      const response = await fetch(
        `/api/community/artworks/${characterUuid}/like?type=character`,
        { method },
      );
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(
          json?.message ||
            actionCopy.errors?.like_failed ||
            actionCopy.errors?.operation_failed ||
            "",
        );
      }

      setHasLiked(!hasLiked);
      setLikeCount((prev) => (hasLiked ? Math.max(0, prev - 1) : prev + 1));
    } catch (error) {
      console.error("Like operation failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : actionCopy.errors?.operation_failed || "",
      );
    } finally {
      setIsLikeLoading(false);
    }
  });

  const handleFavorite = requireAuth(async () => {
    if (isFavoriteLoading) return;
    setIsFavoriteLoading(true);
    try {
      const method = hasFavorited ? "DELETE" : "POST";
      const response = await fetch(
        `/api/community/artworks/${characterUuid}/favorite?type=character`,
        { method },
      );
      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(
          json?.message ||
            actionCopy.errors?.favorite_failed ||
            actionCopy.errors?.operation_failed ||
            "",
        );
      }

      setHasFavorited(!hasFavorited);
      setFavoriteCount((prev) =>
        hasFavorited ? Math.max(0, prev - 1) : prev + 1,
      );
    } catch (error) {
      console.error("Favorite operation failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : actionCopy.errors?.operation_failed || "",
      );
    } finally {
      setIsFavoriteLoading(false);
    }
  });

  const handleDeleteCharacter = requireAuth(async () => {
    if (isDeleteLoading) return;
    setIsDeleteLoading(true);
    try {
      const response = await fetch(
        `/api/oc-maker/characters/${characterUuid}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(
          json?.message ||
            actionCopy.errors?.delete_failed ||
            actionCopy.errors?.operation_failed ||
            "",
        );
      }

      toast.success(actionCopy.toast?.deleted || "");
      setIsDeleteDialogOpen(false);
      router.push(`${base}/my-characters`);
    } catch (error) {
      console.error("Delete character failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : actionCopy.errors?.operation_failed || "",
      );
    } finally {
      setIsDeleteLoading(false);
    }
  });

  const shareContent: ShareContent = {
    type: "character",
    id: characterUuid,
    title: characterName,
  };

  const handleChat = () => {
    router.push(`${base}/chat/${characterUuid}`);
  };

  const content = (
    <TooltipProvider delayDuration={0}>
      {!isEditMode && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLikeLoading}
                className={`relative rounded-xl h-10 px-4 transition-all hover:bg-destructive/10 ${hasLiked ? "text-destructive" : "text-muted-foreground"}`}
              >
                <Heart
                  className={`h-5 w-5 mr-2 ${hasLiked ? "fill-current" : ""}`}
                />
                <span className="text-sm font-bold">{likeCount}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs uppercase font-bold">
                {actionCopy.labels?.like || ""}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFavorite}
                disabled={isFavoriteLoading}
                className={`relative rounded-xl h-10 px-4 transition-all hover:bg-yellow-500/10 ${hasFavorited ? "text-yellow-500" : "text-muted-foreground"}`}
              >
                <Bookmark
                  className={`h-5 w-5 mr-2 ${hasFavorited ? "fill-current" : ""}`}
                />
                <span className="text-sm font-bold">{favoriteCount}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs uppercase font-bold">
                {actionCopy.labels?.favorite || ""}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleChat}
                className="relative rounded-xl h-10 w-10 p-0 transition-all hover:bg-primary/10 text-muted-foreground"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs uppercase font-bold">
                {actionCopy.labels?.chat || "Chat"}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* TODO: 导出功能待完善后上线
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <ExportDropdown
                  characterUuid={characterUuid}
                  characterName={characterName}
                  isOwner={isOwner}
                  onExportCard={onExportCard}
                  pageData={pageData}
                  locale={locale}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs uppercase font-bold">
                  {actionCopy.labels?.export || ""}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          */}

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <ShareMenu content={shareContent} variant="menu" size="sm" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs uppercase font-bold">
                {actionCopy.labels?.share || ""}
              </p>
            </TooltipContent>
          </Tooltip>
        </>
      )}

      {isOwner && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="relative rounded-xl h-10 w-10 p-0 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs uppercase font-bold">
              {actionCopy.labels?.delete || ""}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );

  if (variant === "ghost") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {content}
        <DeleteDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onDelete={handleDeleteCharacter}
          isLoading={isDeleteLoading}
          characterName={characterName}
          actionCopy={actionCopy}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 w-full overflow-x-auto pb-4">
        <div className="relative flex min-w-full flex-wrap items-center gap-3 rounded-2xl border-2 border-border/50 bg-card/90 backdrop-blur-xl p-3 sm:p-4 shadow-lg overflow-hidden">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          ></div>
          {content}
        </div>
      </div>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDelete={handleDeleteCharacter}
        isLoading={isDeleteLoading}
        characterName={characterName}
        actionCopy={actionCopy}
      />
    </>
  );
}

function DeleteDialog({
  isOpen,
  onOpenChange,
  onDelete,
  isLoading,
  characterName,
  actionCopy,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  isLoading: boolean;
  characterName: string;
  actionCopy: any;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md glass-card sm:rounded-2xl border-none">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {actionCopy.delete_dialog?.title || ""}
          </DialogTitle>
          <DialogDescription>
            {(
              actionCopy.delete_dialog?.description ||
              ""
            )?.replace("{name}", characterName)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Alert>
            <AlertDescription className="text-sm">
              {actionCopy.delete_dialog?.warning || ""}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {actionCopy.buttons?.cancel || ""}
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={isLoading}>
            {isLoading
              ? actionCopy.buttons?.deleting || ""
              : actionCopy.buttons?.confirm_delete || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
