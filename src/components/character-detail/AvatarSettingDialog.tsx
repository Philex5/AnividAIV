"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wand2, Crop, Upload, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CharacterDetailPage } from "@/types/pages/landing";
import { ReferenceImageUpload } from "@/components/anime-generator/ReferenceImageUpload";
import { toast } from "sonner";

interface AvatarSettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileImageUrl?: string | null;
  onGenerateAI: () => Promise<void>;
  onCrop: () => void;
  onUpload: (imageUrl: string) => Promise<void>;
  pageData: CharacterDetailPage;
  isGenerating?: boolean;
  isCropPreparing?: boolean;
}

export function AvatarSettingDialog({
  open,
  onOpenChange,
  profileImageUrl,
  onGenerateAI,
  onCrop,
  onUpload,
  pageData,
  isGenerating = false,
  isCropPreparing = false,
}: AvatarSettingDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const copy = pageData?.portrait_generation;

  const hasProfileImage = !!profileImageUrl;

  const handleUploadChange = useCallback(async (urls: string[]) => {
    if (urls.length > 0) {
      setIsUploading(true);
      try {
        await onUpload(urls[0]);
        onOpenChange(false);
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error(copy?.avatar_update_failed || "");
      } finally {
        setIsUploading(false);
      }
    }
  }, [onUpload, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {copy?.avatar_setting_title || ""}
          </DialogTitle>
          <DialogDescription>
            {copy?.avatar_setting_description || ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* AI Generation Option */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className={cn(
                "w-full h-auto py-4 flex flex-col items-center gap-2 rounded-2xl transition-all hover:border-primary/50 hover:bg-primary/5",
                !hasProfileImage && "opacity-50 grayscale cursor-not-allowed"
              )}
              onClick={onGenerateAI}
              disabled={!hasProfileImage || isGenerating}
            >
              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Sparkles className="h-5 w-5 text-primary" />
                )}
                <span className="font-bold">
                  {copy?.generate_from_fullbody || ""}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-normal">
                {copy?.generate_from_fullbody_desc || ""}
              </p>
            </Button>
            {!hasProfileImage && (
              <p className="text-[10px] text-destructive text-center">
                {copy?.profile_required_for_avatar || ""}
              </p>
            )}
          </div>

          {/* Crop Option */}
          <Button
            variant="outline"
            className={cn(
              "w-full h-auto py-4 flex flex-col items-center gap-2 rounded-2xl transition-all hover:border-primary/50 hover:bg-primary/5",
              (!hasProfileImage || isCropPreparing) && "opacity-50 cursor-not-allowed"
            )}
            onClick={onCrop}
            disabled={!hasProfileImage || isCropPreparing}
          >
            <div className="flex items-center gap-2">
              {isCropPreparing ? (
                <Loader2 className="h-5 w-5 animate-spin text-secondary" />
              ) : (
                <Crop className="h-5 w-5 text-secondary" />
              )}
              <span className="font-bold">
                {copy?.crop_from_fullbody || ""}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-normal">
              {copy?.crop_from_fullbody_desc || ""}
            </p>
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/20"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="bg-background px-2 text-muted-foreground/40">
                {copy?.or_label || ""}
              </span>
            </div>
          </div>

          {/* Upload Option */}
          <div className="bg-muted/30 rounded-2xl p-4 border border-dashed border-border/60">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{copy?.upload_label || ""}</span>
              </div>
              <ReferenceImageUpload
                pageData={pageData as any}
                onChange={handleUploadChange}
                maxImages={1}
                showTitle={false}
                disabled={isUploading}
                className="w-full flex justify-center"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isGenerating || isUploading}>
            {pageData.action_bar?.buttons?.cancel || ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
