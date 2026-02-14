"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UploadIcon,
  XIcon,
  Loader2Icon,
  ImageIcon,
  CameraIcon,
  ImagesIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnimeGeneratorPage } from "@/types/pages/landing";
import { ArtworkGalleryDialog } from "./ArtworkGalleryDialog";
import { useTranslations } from "next-intl";
import { useResolvedImageUrls } from "@/hooks/useResolvedImage";
import { isImageUuid } from "@/lib/image-resolve";

interface ReferenceImageUploadProps {
  value?: string[] | null;
  onChange: (imageUrls: string[]) => void;
  disabled?: boolean;
  disabledReason?: string; // 新增:禁用原因,用于Tooltip
  className?: string;
  pageData: AnimeGeneratorPage;
  maxImages?: number;
  onAuthError?: () => void;
  tUpload?: string;
  showTitle?: boolean; // 新增:控制是否显示标题
  uploadType?: string;
  preferUploadUuid?: boolean;
  galleryValueField?: "thumbnail_url" | "uuid";
  previewVariant?: "thumb" | "cover";
  coverHeightClassName?: string;
}

export function ReferenceImageUpload({
  value = [],
  onChange,
  disabled = false,
  disabledReason,
  className,
  pageData,
  maxImages = 5,
  onAuthError,
  tUpload,
  showTitle = true,
  uploadType = "reference",
  preferUploadUuid = false,
  galleryValueField = "thumbnail_url",
  previewVariant = "thumb",
  coverHeightClassName = "h-24",
}: ReferenceImageUploadProps) {
  const t = useTranslations("artworkGallery");
  const tCommon = useTranslations("common_components.reference_upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGalleryDialog, setShowGalleryDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当前图片列表 - 使用useMemo稳定引用
  const currentImages = useMemo(() => value || [], [value]);
  const hasImages = currentImages.length > 0;
  const maxImagesNum = Number(maxImages);
  const isSingleMode = maxImagesNum === 1;
  const canAddMore = currentImages.length < maxImagesNum;
  const canClickUpload = isSingleMode ? true : canAddMore;
  const { resolvedMap } = useResolvedImageUrls(currentImages, "auto");
  const coverImageValue = currentImages[0];
  const coverImageUrl = coverImageValue
    ? (resolvedMap[coverImageValue] ||
      (isImageUuid(coverImageValue) ? "" : coverImageValue))
    : "";

  // 支持的图片格式
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  // 验证文件
  const validateFile = useCallback((file: File): string | null => {
    if (!supportedFormats.includes(file.type)) {
      return pageData.reference?.["error-format"] || "Unsupported image format";
    }
    if (file.size > maxFileSize) {
      return pageData.reference?.["error-size"] || "Image size exceeds 10MB limit";
    }
    return null;
  }, [pageData]);

  // 上传文件
  const uploadFile = useCallback(async (file: File) => {
    if (!canClickUpload) {
      setError(tCommon("max_images", { max: maxImagesNum }));
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      let responseData: any = null;
      try {
        responseData = await response.json();
      } catch (error) {
        console.warn("Failed to parse upload response:", error);
      }

      if (response.status === 401) {
        onAuthError?.();
        throw new Error(
          (responseData && typeof responseData.error === "string"
            ? responseData.error
            : "User not authenticated")
        );
      }

      if (!response.ok) {
        throw new Error(
          (responseData && typeof responseData.error === "string"
            ? responseData.error
            : 'Upload failed')
        );
      }

      const data = responseData;

      if (data && data.success) {
        const nextValue =
          preferUploadUuid && data.upload_uuid ? data.upload_uuid : data.url;
        
        if (isSingleMode) {
          onChange([nextValue]);
        } else {
          onChange([...currentImages, nextValue]);
        }
        setError(null); // 清除之前的错误
      } else {
        throw new Error(
          (data && typeof data.error === "string"
            ? data.error
            : 'Upload failed')
        );
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      
      // 根据错误类型显示不同的错误消息
      let errorMessage = pageData.reference?.["error-upload"] || "Upload failed, please try again";
      
      const normalizedMessage = typeof error.message === "string" ? error.message.toLowerCase() : "";

      if (
        normalizedMessage.includes("not authenticated") ||
        normalizedMessage.includes("unauthorized") ||
        normalizedMessage.includes("401")
      ) {
        const authMessage =
          pageData.reference?.["error-auth"] ||
          (pageData as any)?.tool?.loginRequiredForUpload ||
          "Please log in to upload images";
        errorMessage = authMessage;
      } else if (error.message?.includes('file format')) {
        errorMessage = pageData.reference?.["error-format"] || "Unsupported file format";
      } else if (error.message?.includes('file size')) {
        errorMessage = pageData.reference?.["error-size"] || "File size too large";
      } else if (error.message?.includes('Invalid file name')) {
        errorMessage = pageData.reference?.["error-filename"] || "Invalid file name";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [onChange, pageData, currentImages, canClickUpload, maxImagesNum, onAuthError, tCommon, uploadType, preferUploadUuid, isSingleMode]);

  // 处理文件选择
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    await uploadFile(file);
  }, [validateFile, uploadFile]);

  // 点击上传
  const handleClick = useCallback(() => {
    if (disabled || !canClickUpload) return;
    fileInputRef.current?.click();
  }, [disabled, canClickUpload]);

  const handleCoverClick = useCallback(() => {
    if (disabled || isUploading) return;
    if (isSingleMode && hasImages) return;
    handleClick();
  }, [disabled, isUploading, isSingleMode, hasImages, handleClick]);

  // 点击画廊按钮
  const handleGalleryClick = useCallback(() => {
    if (disabled) return;
    setShowGalleryDialog(true);
  }, [disabled]);

  // 画廊确认选择
  const handleGalleryConfirm = useCallback((imageUrls: string[]) => {
    onChange(imageUrls);
    setError(null);
    setShowGalleryDialog(false);
  }, [onChange]);

  // 拖拽处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && canClickUpload) {
      setIsDragOver(true);
    }
  }, [disabled, canClickUpload]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled || !canClickUpload) return;
    
    const files = e.dataTransfer.files;
    await handleFileSelect(files);
  }, [disabled, canClickUpload, handleFileSelect]);

  // 移除图片
  const handleRemove = useCallback((index: number) => {
    if (disabled) return;
    const newImages = currentImages.filter((_, i) => i !== index);
    onChange(newImages);
    setError(null);
  }, [disabled, onChange, currentImages]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* 标题 - 相机按钮和画廊按钮紧贴标题 */}
      <div className="flex items-center gap-2">
        {showTitle && (
          <h3 className={cn(
            "text-sm font-medium",
            disabled && disabledReason && "text-muted-foreground"
          )}>
            {tCommon("title")}
          </h3>
        )}

        {/* 相机按钮 - 上传图片 */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClick}
                  disabled={disabled || !canClickUpload || isUploading}
                  className={cn(
                    "flex items-center gap-1 h-7 px-2 text-xs",
                    disabled && disabledReason && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isUploading ? (
                    <Loader2Icon className="w-3 h-3 animate-spin" />
                  ) : (
                    <CameraIcon className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {disabled && disabledReason ? (
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">{disabledReason}</p>
              </TooltipContent>
            ) : (
              <TooltipContent side="top">
                <p className="text-sm">{tUpload || t("tooltip.upload")}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* 画廊按钮 - 从已有图片选择 */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGalleryClick}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-1 h-7 px-2 text-xs",
                    disabled && disabledReason && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ImagesIcon className="w-3 h-3" />
                </Button>
              </div>
            </TooltipTrigger>
            {disabled && disabledReason ? (
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">{disabledReason}</p>
              </TooltipContent>
            ) : (
              <TooltipContent side="top">
                <p className="text-sm">{t("tooltip.gallery")}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {hasImages && (
          <Badge variant="outline" className="text-xs">
            {currentImages.length}/{maxImagesNum}
          </Badge>
        )}
      </div>

      {previewVariant === "cover" && (
        <button
          type="button"
          onClick={handleCoverClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          disabled={disabled || isUploading}
          className={cn(
            "relative w-full rounded-lg border border-dashed border-border/70 bg-background/30 overflow-hidden",
            coverHeightClassName,
            (disabled || isUploading || (isSingleMode && hasImages)) &&
              "cursor-default",
            !disabled &&
              !isUploading &&
              !(isSingleMode && hasImages) &&
              "cursor-pointer hover:bg-background/50 transition-colors",
            isDragOver && "border-primary/70 bg-primary/5",
          )}
        >
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt="Reference image"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 360px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              {isUploading ? (
                <Loader2Icon className="h-5 w-5 animate-spin" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </div>
          )}
        </button>
      )}

      {/* 图片显示区域 - 仅在有图片时显示 */}
      {previewVariant === "thumb" && hasImages && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* 已上传的图片缩略图 */}
          {currentImages.map((imageUrl, index) => {
            const resolvedUrl =
              resolvedMap[imageUrl] ||
              (isImageUuid(imageUrl) ? "" : imageUrl);
            return (
            <div key={index} className="relative group">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted border">
                {resolvedUrl ? (
                  <Image
                    src={resolvedUrl}
                    alt={`Reference ${index + 1}`}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
              {!disabled && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRemove(index)}
                  className="absolute -top-1 -right-1 w-4 h-4 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XIcon className="w-2 h-2" />
                </Button>
              )}
            </div>
          )})}
        </div>
      )}


      {/* 错误提示 */}
      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}

      {/* 艺术作品画廊弹窗 */}
      <ArtworkGalleryDialog
        open={showGalleryDialog}
        onOpenChange={setShowGalleryDialog}
        selectedImages={currentImages}
        onConfirm={handleGalleryConfirm}
        maxSelect={maxImages}
        onAuthError={onAuthError}
        valueField={galleryValueField}
      />
    </div>
  );
}
