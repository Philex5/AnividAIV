"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2Icon,
  CheckCircle2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ArtworkListItem } from "@/types/pages/my-artworks";

interface ArtworkGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedImages?: string[];
  onConfirm: (imageUrls: string[]) => void;
  onConfirmItems?: (items: ArtworkListItem[]) => void;
  maxSelect?: number;
  onAuthError?: () => void;
  valueField?: "thumbnail_url" | "uuid";
}

export function ArtworkGalleryDialog({
  open,
  onOpenChange,
  selectedImages,
  onConfirm,
  onConfirmItems,
  maxSelect = 5,
  onAuthError,
  valueField = "thumbnail_url",
}: ArtworkGalleryDialogProps) {
  const t = useTranslations("artworkGallery");
  const [artworks, setArtworks] = useState<ArtworkListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedValues, setSelectedValues] = useState<string[]>(
    () => selectedImages ?? [],
  );
  const [selectedItemsByValue, setSelectedItemsByValue] = useState<
    Record<string, ArtworkListItem>
  >({});
  const totalPerPage = 20;

  // Fetch artworks when dialog opens or page changes
  useEffect(() => {
    if (!open) return;

    const fetchArtworks = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/artworks?type=image&tab=mine&page=${currentPage}&limit=${totalPerPage}`
        );

        if (response.status === 401) {
          onOpenChange(false);
          onAuthError?.();
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch artworks");
        }

        const data = await response.json();

        if (data.success) {
          setArtworks(data.data.artworks || []);
          setTotalPages(data.data.pagination?.totalPages || 1);
        } else {
          throw new Error(data.error || "Failed to fetch artworks");
        }
      } catch (error) {
        console.error("Failed to fetch artworks:", error);
        setArtworks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArtworks();
  }, [open, currentPage, onOpenChange, onAuthError]);

  // Reset selected images when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedValues(selectedImages ?? []);
      setSelectedItemsByValue({});
    }
  }, [open, selectedImages]);

  useEffect(() => {
    if (!open || artworks.length === 0) return;
    setSelectedItemsByValue((prev) => {
      const next: Record<string, ArtworkListItem> = {};
      selectedValues.forEach((value) => {
        if (prev[value]) next[value] = prev[value];
      });
      artworks.forEach((artwork) => {
        const key = valueField === "uuid" ? artwork.uuid : artwork.thumbnail_url;
        if (selectedValues.includes(key)) {
          next[key] = artwork;
        }
      });
      return next;
    });
  }, [artworks, open, selectedValues, valueField]);

  const handleImageSelect = useCallback(
    (artwork: ArtworkListItem) => {
      const key = valueField === "uuid" ? artwork.uuid : artwork.thumbnail_url;
      setSelectedValues((prev) => {
        const isSelected = prev.includes(key);

        if (isSelected) {
          // Deselect
          setSelectedItemsByValue((current) => {
            const next = { ...current };
            delete next[key];
            return next;
          });
          return prev.filter((value) => value !== key);
        } else {
          // Select (if under limit)
          if (prev.length >= maxSelect) {
            return prev;
          }
          setSelectedItemsByValue((current) => ({
            ...current,
            [key]: artwork,
          }));
          return [...prev, key];
        }
      });
    },
    [maxSelect, valueField]
  );

  const handleConfirm = useCallback(() => {
    onConfirm(selectedValues);
    if (onConfirmItems) {
      const items = selectedValues
        .map((value) => selectedItemsByValue[value])
        .filter((item): item is ArtworkListItem => Boolean(item));
      onConfirmItems(items);
    }
    onOpenChange(false);
  }, [selectedValues, onConfirm, onConfirmItems, onOpenChange, selectedItemsByValue]);

  const handleClose = useCallback(() => {
    setSelectedValues(selectedImages ?? []);
    setSelectedItemsByValue({});
    onOpenChange(false);
  }, [selectedImages, onOpenChange]);

  const selectedCount = selectedValues.length;

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) handleClose();
    },
    [handleClose],
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col glass-card sm:rounded-2xl border-none p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-display font-bold tracking-tight">{t("title")}</DialogTitle>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
                <Loader2Icon className="w-10 h-10 animate-spin text-primary relative z-10" />
              </div>
              <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading your artworks...</p>
            </div>
          ) : artworks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center animate-fade-in">
              <p className="text-sm text-muted-foreground bg-muted/30 px-6 py-3 rounded-full">{t("empty")}</p>
            </div>
          ) : (
            <>
              {/* Image Grid */}
              <div className="flex-1 overflow-auto px-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {artworks.map((artwork) => {
                    const key = valueField === "uuid" ? artwork.uuid : artwork.thumbnail_url;
                    const isSelected = selectedValues.includes(key);

                    return (
                      <div
                        key={artwork.uuid}
                        className={cn(
                          "relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group",
                          isSelected
                            ? "ring-4 ring-primary shadow-xl scale-[1.02] z-10"
                            : "ring-1 ring-border/50 hover:ring-primary/40 hover:scale-[1.01]"
                        )}
                        onClick={() => handleImageSelect(artwork)}
                      >
                        <Image
                          src={artwork.thumbnail_url}
                          alt={`Artwork ${artwork.uuid}`}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                        />

                        {/* Selection Indicator */}
                        <div className={cn(
                          "absolute inset-0 bg-black/20 transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )} />
                        
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center animate-dialogue-appear">
                            <div className="bg-primary text-primary-foreground rounded-full p-2 shadow-2xl">
                              <CheckCircle2Icon className="w-8 h-8 stroke-[2.5px]" />
                            </div>
                          </div>
                        )}

                        {/* Gen Type Badge */}
                        {artwork.gen_type && (
                          <div className="absolute bottom-2 left-2 z-20">
                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-background/80 backdrop-blur-md rounded-full shadow-sm">
                              {artwork.gen_type}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-6 border-t border-border/40 mx-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    shape="pill"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="hover:bg-primary/10"
                  >
                    {t("pagination.previous")}
                  </Button>

                  <span className="text-xs font-bold font-mono bg-muted/30 px-3 py-1 rounded-full text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    shape="pill"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="hover:bg-primary/10"
                  >
                    {t("pagination.next")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-4 flex-row items-center gap-6 border-t border-border/40">
          {/* Selected Images Preview (Left Side) */}
          <div className="hidden sm:flex items-center gap-4 flex-1">
            {selectedCount > 0 ? (
              <>
                <div className="flex -space-x-3">
                  {selectedValues.slice(0, 4).map((value, index) => {
                    const previewUrl =
                      valueField === "uuid"
                        ? selectedItemsByValue[value]?.thumbnail_url || ""
                        : value;
                    return (
                    <div
                      key={value}
                      className="w-10 h-10 rounded-xl overflow-hidden border-2 border-background shadow-lg relative z-0 hover:z-10 transition-all hover:scale-110"
                    >
                      {previewUrl ? (
                        <Image
                          src={previewUrl}
                          alt={`Selected ${index + 1}`}
                          width={40}
                          height={40}
                          className="object-cover h-full w-full"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>
                  )})}
                  {selectedCount > 4 && (
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border-2 border-background text-[10px] font-bold shadow-lg">
                      +{selectedCount - 4}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-emphasis">
                    {selectedCount} / {maxSelect} Selected
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Items selected from your gallery
                  </span>
                </div>
              </>
            ) : (
              <span className="text-xs font-medium text-muted-foreground bg-muted/20 px-4 py-2 rounded-full border border-border/20">
                {t("noSelection")}
              </span>
            )}
          </div>

          {/* Action Buttons (Right Side) */}
          <div className="flex gap-3 flex-1 sm:flex-none">
            <Button 
              variant="ghost" 
              shape="pill" 
              onClick={handleClose}
              className="flex-1 sm:flex-none"
            >
              {t("cancel")}
            </Button>
            <Button 
              shape="pill" 
              size="lg"
              onClick={handleConfirm} 
              disabled={selectedCount === 0}
              className="flex-1 sm:min-w-[120px] shadow-lg shadow-primary/20"
            >
              {t("confirm")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
