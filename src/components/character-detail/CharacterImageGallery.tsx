"use client";

import { useState } from "react";
import { Plus, X, GripVertical, Image as ImageIcon, Layout, Upload, Palette, Settings, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { getCreamyCharacterUrl } from "@/lib/asset-loader";
import { useResolvedImageUrls } from "@/hooks/useResolvedImage";
import { isImageUuid } from "@/lib/image-resolve";
import type { CharacterDetailPage } from "@/types/pages/landing";

export type ImageItem = {
  id: string;
  url: string;
  type: "generation" | "user_upload" | "design_sheet";
  label?: string;
  meta?: Record<string, string>;
};

interface CharacterImageGalleryProps {
  images: ImageItem[];
  primaryImageUuid?: string | null;
  onPrimaryChange?: (nextUuid: string | null) => void;
  primaryBadgeLabel?: string;
  primaryBadgeTooltip?: string;
  primarySetLabel?: string;
  primaryDeleteTitle?: string;
  primaryDeleteConfirm?: string;
  primaryDeleteCancel?: string;
  primaryDeleteAction?: string;
  isEditMode?: boolean;
  onImagesChange?: (images: ImageItem[]) => void;
  onGenerate?: (type: ImageItem["type"]) => void;
  onUpload?: () => void;
  onSelectFromArtworks?: () => void;
  breakdownSheetLabel?: string;
  breakdownSheetHint?: string;
  galleryCopy?: CharacterDetailPage["gallery"];
}

export function CharacterImageGallery({
  images,
  primaryImageUuid,
  onPrimaryChange,
  primaryBadgeLabel,
  primaryBadgeTooltip,
  primarySetLabel,
  primaryDeleteTitle,
  primaryDeleteConfirm,
  primaryDeleteCancel,
  primaryDeleteAction,
  isEditMode: isGeneralEditMode = false,
  onImagesChange,
  onGenerate,
  onUpload,
  onSelectFromArtworks,
  breakdownSheetLabel = "",
  breakdownSheetHint = "",
  galleryCopy,
}: CharacterImageGalleryProps) {
  const galleryText = galleryCopy || {};
  const rearrangingLabel = galleryText.rearranging_label || "";
  const addArchiveLabel = galleryText.add_archive_label || "";
  const uploadLabel = galleryText.add_menu_upload_label || "";
  const uploadHint = galleryText.add_menu_upload_hint || "";
  const fromArtworksLabel = galleryText.add_menu_from_artworks_label || "";
  const fromArtworksHint = galleryText.add_menu_from_artworks_hint || "";
  const breakdownSheetNewLabel = galleryText.breakdown_sheet_new_label || "";
  const settingsLabel = galleryText.settings_label || "";
  const exitSettingsLabel = galleryText.exit_settings_label || "";
  const untitledLabel = galleryText.untitled_label || "";
  const hoverPreviewTitle = galleryText.preview_title || "";
  const hoverPreviewDescription = galleryText.preview_description || "";
  const newStreamLabel = galleryText.new_stream_label || "";
  const imageAlt = galleryText.image_alt || "";
  const previewAlt = galleryText.preview_alt || "";
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [isSettingsMode, setIsSettingsMode] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<ImageItem | null>(null);
  const [isPrimaryDeleteOpen, setIsPrimaryDeleteOpen] = useState(false);
  const { resolvedMap } = useResolvedImageUrls(
    images.map((image) => image.url),
  );

  const getResolvedUrl = (url: string) => {
    const key = url.trim();
    if (!key) return "";
    if (isImageUuid(key)) {
      return resolvedMap[key] || "";
    }
    return key;
  };

  const resolveImageUuid = (image: ImageItem) => {
    const rawValue = image.meta?.image_uuid || image.url;
    if (!rawValue) return null;
    return isImageUuid(rawValue) ? rawValue : null;
  };

  const isPrimaryImage = (image: ImageItem) => {
    if (!primaryImageUuid) return false;
    return resolveImageUuid(image) === primaryImageUuid;
  };

  const canSelectPrimary = (image: ImageItem) =>
    image.type !== "design_sheet" && !!resolveImageUuid(image);

  const handleRemove = (image: ImageItem) => {
    if (isPrimaryImage(image)) {
      setPendingRemoval(image);
      setIsPrimaryDeleteOpen(true);
      return;
    }
    onImagesChange?.(images.filter((img) => img.id !== image.id));
  };

  const renderCardContent = (image: ImageItem, isDragging: boolean = false) => {
    const resolvedUrl = getResolvedUrl(image.url);

    return (
      <>
        {resolvedUrl ? (
          <img
            src={resolvedUrl}
            alt={image.label || imageAlt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/30 text-muted-foreground">
            <ImageIcon className="h-10 w-10 opacity-50" />
          </div>
        )}
        
        {/* Type Badge (edit mode only) */}
        {isGeneralEditMode && (
          <div className="absolute top-3 left-3 z-10">
            <Badge variant="secondary" className="bg-background/60 backdrop-blur-md border-none text-[8px] uppercase tracking-widest px-1.5 py-0.5 font-black">
              {image.label || image.type}
            </Badge>
          </div>
        )}
        {isGeneralEditMode && primaryBadgeLabel && isPrimaryImage(image) && (
          <div className="absolute top-3 right-3 z-10">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-primary/90 text-primary-foreground text-[8px] uppercase tracking-widest px-1.5 py-0.5 font-black">
                    {primaryBadgeLabel}
                  </Badge>
                </TooltipTrigger>
                {primaryBadgeTooltip ? (
                  <TooltipContent side="top">
                    <p className="text-[10px] font-bold">
                      {primaryBadgeTooltip}
                    </p>
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Settings Mode Overlay */}
        {isSettingsMode && (
          <div className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 transition-opacity",
            !isDragging && "opacity-100"
          )}>
            <div className="cursor-grab active:cursor-grabbing p-2 bg-background/20 rounded-full hover:bg-background/40 transition-colors border border-white/20">
              <GripVertical className="w-5 h-5 text-white" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(image);
              }}
              className="p-2 bg-destructive/80 rounded-full hover:bg-destructive transition-colors border border-white/20"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Normal Mode Hover Indicator */}
        {!isSettingsMode && (
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        )}
      </>
    );
  };

  const stackOffset = 30;
  const cardWidth = 240;
  const cardHeight = 330;

  return (
    <div className="space-y-4 relative w-full overflow-visible">
      {/* Header with Settings Toggle */}
      <div className="flex justify-between items-center mb-2 relative">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          {isSettingsMode ? rearrangingLabel : ""}
        </h3>
        {isGeneralEditMode && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isAddSheetOpen ? "default" : "outline"}
                      size="icon"
                      className={cn(
                        "h-7 w-7 rounded-xl transition-all shadow-sm",
                        isAddSheetOpen ? "bg-primary text-primary-foreground" : "bg-background/40 hover:bg-background/60"
                      )}
                      onClick={() => setIsAddSheetOpen(!isAddSheetOpen)}
                    >
                      <Plus className={cn("h-3.5 w-3.5 transition-transform duration-300", isAddSheetOpen && "rotate-45")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-[10px] font-bold uppercase tracking-wider">
                      {addArchiveLabel}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* In-place Slide Down Menu */}
              <AnimatePresence>
                {isAddSheetOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setIsAddSheetOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      className="absolute top-9 right-0 z-50 w-64 p-3 rounded-2xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl"
                    >
                      <div className="space-y-1.5">
                        <button 
                          onClick={() => {
                            onUpload?.();
                            setIsAddSheetOpen(false);
                          }} 
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-primary/5 transition-all group text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{uploadLabel}</span>
                            <span className="text-[9px] text-muted-foreground">{uploadHint}</span>
                          </div>
                        </button>

                        <button 
                          onClick={() => {
                            onSelectFromArtworks?.();
                            setIsAddSheetOpen(false);
                          }} 
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/5 transition-all group text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Palette className="w-4 h-4 text-secondary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{fromArtworksLabel}</span>
                            <span className="text-[9px] text-muted-foreground">{fromArtworksHint}</span>
                          </div>
                        </button>

                        <div className="h-px bg-border/40 my-1" />

                        <button 
                          onClick={() => {
                            onGenerate?.("design_sheet");
                            setIsAddSheetOpen(false);
                          }} 
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent/5 transition-all group text-left relative overflow-visible"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                              <Layout className="w-4 h-4 text-accent" />
                            </div>
                            <div className="flex flex-col pr-1 min-w-0">
                              <span className="text-xs font-bold truncate">{breakdownSheetLabel}</span>
                              <span className="text-[9px] text-muted-foreground leading-tight line-clamp-2">{breakdownSheetHint}</span>
                            </div>
                          </div>
                          <div className="absolute -top-1.5 -right-0.5 pointer-events-none">
                            <span className="text-[9px] font-black italic text-primary uppercase tracking-tighter rotate-12 drop-shadow-[0.5px_0.5px_0px_rgba(255,255,255,1)]">
                              {breakdownSheetNewLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 ml-2">
                            <img src={getCreamyCharacterUrl("meow_coin")} className="w-3 h-3" alt="" />
                            <span className="text-[10px] font-black text-amber-500">30</span>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSettingsMode ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "h-7 w-7 rounded-xl transition-all shadow-sm",
                      isSettingsMode ? "bg-primary text-primary-foreground" : "bg-background/40 hover:bg-background/60"
                    )}
                    onClick={() => setIsSettingsMode(!isSettingsMode)}
                  >
                    <Settings className={cn("h-3.5 w-3.5", isSettingsMode && "animate-spin-slow")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-[10px] font-bold uppercase tracking-wider">
                    {isSettingsMode ? exitSettingsLabel : settingsLabel}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <div className="relative min-h-[350px] w-full mt-2 group overflow-x-auto overflow-y-visible pt-4 pb-4 [&::-webkit-scrollbar]:hidden">
        <div 
          className="relative h-[340px] mx-auto"
          style={{ 
            minWidth: isSettingsMode ? '100%' : `${cardWidth + (Math.max(0, images.length - 1 + (isGeneralEditMode ? 1 : 0)) * stackOffset)}px`,
            maxWidth: isSettingsMode ? '100%' : 'none'
          }}
        >
          {isSettingsMode ? (
            <Reorder.Group
              axis="y"
              values={images}
              onReorder={(newOrder) => onImagesChange?.(newOrder)}
              className="space-y-3"
            >
              <AnimatePresence initial={false}>
                {images.map((image) => {
                  const resolvedUrl = getResolvedUrl(image.url);
                  const imageUuid = resolveImageUuid(image);
                  const isPrimary = Boolean(
                    imageUuid && primaryImageUuid && imageUuid === primaryImageUuid,
                  );
                  const showPrimaryControl =
                    image.type !== "design_sheet" && imageUuid;
                  return (
                    <Reorder.Item
                      key={image.id}
                      value={image}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="relative w-full aspect-[16/5] rounded-2xl overflow-hidden border border-border/40 bg-muted/20 shadow-lg flex group">
                        <div className="w-[30%] h-full">
                          {resolvedUrl ? (
                            <img
                              src={resolvedUrl}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted/30 text-muted-foreground">
                              <ImageIcon className="h-6 w-6 opacity-50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-3 flex items-center justify-between bg-card/60 backdrop-blur-sm">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary mb-0.5">
                              {image.type}
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {image.label || untitledLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {showPrimaryControl && (
                              <>
                                {isPrimary ? (
                                  primaryBadgeLabel ? (
                                    <Badge className="bg-primary/10 text-primary text-[9px] uppercase tracking-widest px-2 py-0.5">
                                      {primaryBadgeLabel}
                                    </Badge>
                                  ) : null
                                ) : primarySetLabel ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[9px] font-bold uppercase tracking-wider"
                                    onClick={() =>
                                      onPrimaryChange?.(imageUuid)
                                    }
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    {primarySetLabel}
                                  </Button>
                                ) : null}
                              </>
                            )}
                            <div className="p-1.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
                              onClick={() => handleRemove(image)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </AnimatePresence>
            </Reorder.Group>
          ) : (
            <div
              className="relative h-full"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {images.map((image, index) => {
                const isHovered = hoveredIndex === index;
                
                return (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, x: 20 * index }}
                    animate={{ 
                      opacity: 1, 
                      x: index * stackOffset,
                      scale: isHovered ? 1.05 : 1,
                      y: isHovered ? -4 : 0,
                      zIndex: isHovered ? 50 : images.length - index,
                      rotate: index % 2 === 0 ? 0.5 : -0.5
                    }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onClick={() => setSelectedImage(image)}
                    className={cn(
                      "absolute top-0 origin-top-left rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border-2 border-white/20 bg-card shadow-xl cursor-pointer group/card transition-shadow duration-500",
                      "hover:shadow-primary/20"
                    )}
                    style={{
                      width: `${cardWidth}px`,
                      height: `${cardHeight}px`,
                    }}
                  >
                    {renderCardContent(image)}
                    
                    {/* Pop-up Preview on Hover */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 shadow-xl pointer-events-none"
                        >
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">
                             {hoverPreviewTitle}
                           </p>
                           <p className="text-[9px] font-bold text-foreground/80 leading-tight">
                             {hoverPreviewDescription}
                           </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {/* Add Placeholder in Stacked Mode */}
              {isGeneralEditMode && images.length < 10 && (
                <motion.div
                  animate={{ 
                    x: images.length * stackOffset,
                    zIndex: 0
                  }}
                  className="absolute top-0 group/add"
                  style={{
                    width: `${cardWidth}px`,
                    height: `${cardHeight}px`,
                  }}
                >
                  <button 
                    onClick={() => setIsAddSheetOpen(true)}
                    className="w-full h-full rounded-[1.5rem] sm:rounded-[2rem] border-2 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover/add:scale-110 transition-transform bg-primary/5">
                      <Plus className="w-5 h-5 text-muted-foreground group-hover/add:text-primary transition-colors" />
                    </div>
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest group-hover/add:text-primary transition-colors">
                      {newStreamLabel}
                    </span>
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={isPrimaryDeleteOpen}
        onOpenChange={(open) => {
          setIsPrimaryDeleteOpen(open);
          if (!open) setPendingRemoval(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogTitle>{primaryDeleteTitle}</DialogTitle>
          <DialogDescription>{primaryDeleteConfirm}</DialogDescription>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsPrimaryDeleteOpen(false);
                setPendingRemoval(null);
              }}
            >
              {primaryDeleteCancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!pendingRemoval) return;
                onImagesChange?.(
                  images.filter((img) => img.id !== pendingRemoval.id),
                );
                setIsPrimaryDeleteOpen(false);
                setPendingRemoval(null);
              }}
            >
              {primaryDeleteAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center">
          <DialogTitle className="sr-only">
            {selectedImage ? selectedImage.label || selectedImage.type : ""}
          </DialogTitle>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full h-full flex items-center justify-center" 
              onClick={() => setSelectedImage(null)}
            >
              <img
                src={getResolvedUrl(selectedImage.url)}
                alt={previewAlt}
                className="max-w-full max-h-[90vh] object-contain rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] border-4 border-white/10"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-3 bg-black/40 hover:bg-black/60 rounded-full transition-colors text-white backdrop-blur-md border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
