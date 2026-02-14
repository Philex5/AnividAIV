"use client";

import { Button } from "@/components/ui/button";
import {
  DownloadIcon,
  HeartIcon,
  EditIcon,
  ShareIcon,
  CopyIcon,
  Loader2Icon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ActionPanelProps {
  selectedImages: string[];
  onDownload: (imageIds: string[]) => void;
  onFavorite: (imageIds: string[]) => void;
  onEdit: (imageId: string) => void;
  onShare: (imageIds: string[]) => void;
  onCopyParams: (imageId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function ActionPanel({
  selectedImages,
  onDownload,
  onFavorite,
  onEdit,
  onShare,
  onCopyParams,
  disabled = false,
  loading = false,
  className
}: ActionPanelProps) {
  const t = useTranslations('anime-generator.action_panel');
  const hasSelection = selectedImages.length > 0;
  const isSingleSelection = selectedImages.length === 1;
  const isMultipleSelection = selectedImages.length > 1;

  const handleDownload = () => {
    if (hasSelection && !disabled && !loading) {
      onDownload(selectedImages);
    }
  };

  const handleFavorite = () => {
    if (hasSelection && !disabled && !loading) {
      onFavorite(selectedImages);
    }
  };

  const handleEdit = () => {
    if (isSingleSelection && !disabled && !loading) {
      onEdit(selectedImages[0]);
    }
  };

  const handleShare = () => {
    if (hasSelection && !disabled && !loading) {
      onShare(selectedImages);
    }
  };

  const handleCopyParams = () => {
    if (isSingleSelection && !disabled && !loading) {
      onCopyParams(selectedImages[0]);
    }
  };

  const buttonDisabled = disabled || loading || !hasSelection;

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-2 pt-4 border-t border-border",
      className
    )}>
      {/* Download button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={buttonDisabled}
        className="gap-2"
      >
        {loading ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          <DownloadIcon className="h-4 w-4" />
        )}
        {t('download')}
        {isMultipleSelection && ` (${selectedImages.length})`}
      </Button>

      {/* Favorite button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleFavorite}
        disabled={buttonDisabled}
        className="gap-2"
      >
        <HeartIcon className="h-4 w-4" />
        {t('favorite')}
        {isMultipleSelection && ` (${selectedImages.length})`}
      </Button>

      {/* Edit button - only for single selection */}
      {isSingleSelection && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleEdit}
          disabled={buttonDisabled}
          className="gap-2"
        >
          <EditIcon className="h-4 w-4" />
          {t('edit')}
        </Button>
      )}

      {/* Share button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={buttonDisabled}
        className="gap-2"
      >
        <ShareIcon className="h-4 w-4" />
        {t('share')}
        {isMultipleSelection && ` (${selectedImages.length})`}
      </Button>

      {/* Copy params button - only for single selection */}
      {isSingleSelection && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyParams}
          disabled={buttonDisabled}
          className="gap-2"
        >
          <CopyIcon className="h-4 w-4" />
          {t('copy_params')}
        </Button>
      )}

      {/* Selection count indicator */}
      {hasSelection && (
        <div className="ml-auto text-sm text-muted-foreground">
          {t('selected_count', { count: selectedImages.length })}
        </div>
      )}
    </div>
  );
}