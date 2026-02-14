"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Crop, ZoomIn, ZoomOut, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onConfirm: (imageUuid: string) => Promise<void>;
  title?: string;
  copy?: {
    crop_from_fullbody?: string;
    crop_cancel?: string;
    crop_save?: string;
    crop_image_alt?: string;
    crop_load_failed?: string;
    crop_still_loading?: string;
    crop_canvas_failed?: string;
    crop_blob_failed?: string;
    crop_upload_failed?: string;
    crop_upload_uuid_required?: string;
    crop_failed?: string;
  };
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageUrl,
  onConfirm,
  title,
  copy,
}: AvatarCropDialogProps) {
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 5;
  const WHEEL_SENSITIVITY = 0.0015;
  const [isImageReady, setIsImageReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageMetrics, setImageMetrics] = useState<{
    naturalWidth: number;
    naturalHeight: number;
    baseScale: number;
    baseWidth: number;
    baseHeight: number;
    containerSize: number;
  } | null>(null);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clampOffset = useCallback(
    (next: { x: number; y: number }, nextZoom?: number) => {
      if (!imageMetrics) return next;
      const zoomValue =
        typeof nextZoom === "number" && !Number.isNaN(nextZoom) ? nextZoom : zoom;

      const { baseWidth, baseHeight, containerSize } = imageMetrics;
      const currentWidth = baseWidth * zoomValue;
      const currentHeight = baseHeight * zoomValue;

      const limitX = Math.max(0, (currentWidth - containerSize) / 2);
      const limitY = Math.max(0, (currentHeight - containerSize) / 2);

      return {
        x: Math.min(limitX, Math.max(-limitX, next.x)),
        y: Math.min(limitY, Math.max(-limitY, next.y)),
      };
    },
    [imageMetrics, zoom],
  );

  const clampZoom = useCallback(
    (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)),
    [MAX_ZOOM, MIN_ZOOM],
  );

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    if (!containerRef.current) return;

    imageRef.current = img;
    previewImageRef.current = img;

    const containerSize = containerRef.current.clientWidth;
    if (!containerSize) return;

    const { naturalWidth, naturalHeight } = img;
    if (!naturalWidth || !naturalHeight) return;

    const isLandscape = naturalWidth >= naturalHeight;
    img.style.height = isLandscape ? "100%" : "auto";
    img.style.width = isLandscape ? "auto" : "100%";

    const baseScale = isLandscape
      ? containerSize / naturalHeight
      : containerSize / naturalWidth;

    const baseWidth = naturalWidth * baseScale;
    const baseHeight = naturalHeight * baseScale;

    setImageMetrics({
      naturalWidth,
      naturalHeight,
      baseScale,
      baseWidth,
      baseHeight,
      containerSize,
    });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    setIsImageReady(true);
  }, []);

  const handleImageError = useCallback(() => {
    imageRef.current = null;
    setImageMetrics(null);
    setIsImageReady(false);
    toast.error(copy?.crop_load_failed || "");
  }, []);

  // Reset state when opening or when the source image changes
  useEffect(() => {
    if (!open || !imageUrl) {
      imageRef.current = null;
      previewImageRef.current = null;
      setIsImageReady(false);
      setImageMetrics(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
      return;
    }

    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    setIsImageReady(false);

    const previewImg = previewImageRef.current;
    if (previewImg?.complete) {
      handleImageLoad(previewImg);
    }
  }, [open, imageUrl, handleImageLoad]);

  const getPoint = useCallback((event: MouseEvent | TouchEvent) => {
    if ("touches" in event) {
      const primaryTouch = event.touches[0] ?? event.changedTouches?.[0];
      return {
        x: primaryTouch?.clientX ?? 0,
        y: primaryTouch?.clientY ?? 0,
      };
    }
    return { x: event.clientX, y: event.clientY };
  }, []);

  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (!isImageReady) return;
    event.preventDefault();
    const native = event.nativeEvent;
    const point = "touches" in native
      ? {
          x: native.touches[0]?.clientX ?? 0,
          y: native.touches[0]?.clientY ?? 0,
        }
      : { x: native.clientX, y: native.clientY };
    dragStateRef.current = {
      startX: point.x,
      startY: point.y,
      originX: offset.x,
      originY: offset.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!dragStateRef.current) return;
      event.preventDefault();
      const { startX, startY, originX, originY } = dragStateRef.current;
      const point = getPoint(event);
      const next = {
        x: originX + (point.x - startX),
        y: originY + (point.y - startY),
      };
      setOffset(clampOffset(next));
    },
    [clampOffset, getPoint],
  );

  const handleMouseUp = useCallback(() => {
    dragStateRef.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      const touchMoveOptions: AddEventListenerOptions = { passive: false };
      const moveListener = (event: MouseEvent | TouchEvent) =>
        handlePointerMove(event);
      const upListener = () => handleMouseUp();

      window.addEventListener("mousemove", moveListener);
      window.addEventListener("mouseup", upListener);
      window.addEventListener("touchmove", moveListener, touchMoveOptions);
      window.addEventListener("touchend", upListener);
      window.addEventListener("touchcancel", upListener);

      return () => {
        window.removeEventListener("mousemove", moveListener);
        window.removeEventListener("mouseup", upListener);
        window.removeEventListener("touchmove", moveListener, touchMoveOptions);
        window.removeEventListener("touchend", upListener);
        window.removeEventListener("touchcancel", upListener);
      };
    }
    return undefined;
  }, [handleMouseUp, handlePointerMove, isDragging]);

  useEffect(() => {
    if (!open) {
      dragStateRef.current = null;
      setIsDragging(false);
    }
  }, [open]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!isImageReady) return;
      event.preventDefault();
      const delta = event.deltaY;
      setZoom((current) => {
        const next = clampZoom(current - delta * WHEEL_SENSITIVITY);
        setOffset((offsetValue) => clampOffset(offsetValue, next));
        return next;
      });
    },
    [clampOffset, clampZoom, isImageReady, WHEEL_SENSITIVITY],
  );

  const handleCrop = async () => {
    if (
      !isImageReady ||
      !imageRef.current ||
      !canvasRef.current ||
      !containerRef.current ||
      !imageMetrics
    ) {
      toast.error(copy?.crop_still_loading || "");
      return;
    }

    const img = imageRef.current;

    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(copy?.crop_canvas_failed || "");

      const outputSize = 512;
      canvas.width = outputSize;
      canvas.height = outputSize;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, outputSize, outputSize);
      
      const { baseWidth, baseHeight, containerSize } = imageMetrics;
      const viewportScale = outputSize / containerSize;
      const radians = (rotation * Math.PI) / 180;

      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.scale(viewportScale, viewportScale);
      ctx.translate(offset.x, offset.y);
      ctx.rotate(radians);
      ctx.scale(zoom, zoom);
      ctx.drawImage(
        img,
        -baseWidth / 2,
        -baseHeight / 2,
        baseWidth,
        baseHeight,
      );

      // Convert to Blob
      const blob = await new Promise<Blob | null>((resolve) => 
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
      );

      if (!blob) throw new Error(copy?.crop_blob_failed || "");

      // Upload the cropped image
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");
      formData.append("type", "oc-avatar");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || copy?.crop_upload_failed || "");
      }
      const uploadUuid = uploadData.upload_uuid as string | null;
      if (!uploadUuid) {
        throw new Error(copy?.crop_upload_uuid_required || "");
      }
      await onConfirm(uploadUuid);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Cropping failed:", error);
      toast.error(error.message || copy?.crop_failed || "");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden glass-card sm:rounded-2xl border-none">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-display font-bold tracking-tight">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Crop className="h-4 w-4 text-primary" />
            </div>
            {title || copy?.crop_from_fullbody || ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-5">
          {/* Viewport Container */}
          <div 
            ref={containerRef}
            className="relative aspect-square w-full max-w-[260px] mx-auto rounded-2xl border-4 border-primary/10 bg-black/5 shadow-inner overflow-hidden cursor-move touch-none group"
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            onWheel={handleWheel}
          >
            {imageUrl && (
              <div 
                className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                }}
              >
                {!isImageReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                  </div>
                )}
                <img
                  ref={previewImageRef}
                  src={imageUrl}
                  alt={copy?.crop_image_alt || ""}
                  crossOrigin="anonymous"
                  className="max-w-none select-none pointer-events-none"
                  draggable={false}
                  onLoad={(e) => {
                    handleImageLoad(e.currentTarget);
                  }}
                  onError={handleImageError}
                />
              </div>
            )}
            
            {/* Overlay Guide - Circular hole matching the full container size for WYSIWYG */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="w-full h-full rounded-full border-2 border-primary/40 ring-[400px] ring-black/50"></div>
            </div>
            
            {/* Animated Grid on hover */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 flex">
                <div className="flex-1 border-r border-white/10"></div>
                <div className="flex-1 border-r border-white/10"></div>
                <div className="flex-1"></div>
              </div>
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 border-b border-white/10"></div>
                <div className="flex-1 border-b border-white/10"></div>
                <div className="flex-1"></div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4 px-2">
            <div className="flex items-center gap-4">
              <div className="bg-muted/30 p-1.5 rounded-full">
                <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Slider
                value={[zoom]}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                onValueChange={([value]) => {
                  const nextZoom = clampZoom(Number(value) || 1);
                  setOffset((current) => clampOffset(current, nextZoom));
                  setZoom(nextZoom);
                }}
                className="flex-1"
              />
              <div className="bg-muted/30 p-1.5 rounded-full">
                <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-muted/30 p-1.5 rounded-full">
                <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Slider
                value={[rotation]}
                min={0}
                max={360}
                step={1}
                onValueChange={([v]) => setRotation(v)}
                className="flex-1"
              />
              <span className="text-[10px] font-bold font-mono text-muted-foreground w-10 text-right bg-muted/30 px-2 py-0.5 rounded-md">{rotation}°</span>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="p-5 pt-0 flex-row items-center gap-3">
          <Button 
            variant="ghost" 
            shape="pill" 
            size="sm"
            onClick={() => onOpenChange(false)} 
            disabled={isProcessing}
            className="flex-1 sm:flex-none"
          >
            {copy?.crop_cancel || ""}
          </Button>
          <Button 
            shape="pill" 
            size="sm"
            onClick={handleCrop} 
            disabled={isProcessing} 
            className="flex-1 gap-2 shadow-lg shadow-primary/20 h-10"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crop className="h-4 w-4" />
            )}
            <span className="font-bold">{copy?.crop_save || ""}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
