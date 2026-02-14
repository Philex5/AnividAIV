"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ImageCardMedia } from "@/components/community/cards/ImageCard";
import { OcCardMedia } from "@/components/community/cards/OcCard";
import { Play, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AdminUserAvatar from "@/components/admin/AdminUserAvatar";
import type { ArtworkPreview } from "@/types/pages/community";

interface AdminGenerationCardProps {
  artwork: ArtworkPreview & {
    moderation_status?: string;
    visibility_level?: "public" | "private";
  };
  selected: boolean;
  selectionEnabled: boolean;
  onSelectChange: (selected: boolean) => void;
  onClick: () => void;
}

function getModerationStatusBadge(status?: string) {
  switch (status) {
    case "banned":
      return <Badge variant="destructive" className="text-xs">Banned</Badge>;
    case "featured":
      return <Badge variant="default" className="text-xs bg-yellow-500 text-white">Featured</Badge>;
    case "normal":
    default:
      return <Badge variant="outline" className="text-xs">Normal</Badge>;
  }
}

function getVisibilityLevelBadge(visibilityLevel?: "public" | "private") {
  if (visibilityLevel === "public") {
    return <Badge variant="secondary" className="text-xs">Public</Badge>;
  }

  return <Badge variant="outline" className="text-xs">Private</Badge>;
}

// Get display UUID based on artwork type
function getDisplayUuid(artwork: ArtworkPreview & { moderation_status?: string }): string {
  const meta = artwork.meta as {
    preview_image_uuid?: string;
    preview_video_uuid?: string;
    artwork_uuid?: string;
  } | undefined;

  // Prefer artwork_uuid (the actual image/video UUID for status updates)
  if (meta?.artwork_uuid) {
    return meta.artwork_uuid;
  }
  // Fallback to preview UUIDs
  if (artwork.type === "video" && meta?.preview_video_uuid) {
    return meta.preview_video_uuid;
  }
  if (meta?.preview_image_uuid) {
    return meta.preview_image_uuid;
  }
  // Final fallback to id (character_uuid or generation uuid)
  return artwork.id;
}

// Truncate UUID for display
function truncateUuid(uuid: string): string {
  if (!uuid) return "";
  if (uuid.length <= 16) return uuid;
  return `${uuid.slice(0, 8)}...${uuid.slice(-4)}`;
}

export function AdminGenerationCard({
  artwork,
  selected,
  selectionEnabled,
  onSelectChange,
  onClick,
}: AdminGenerationCardProps) {
  const displayUuid = getDisplayUuid(artwork);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent triggering card click when clicking checkbox or avatar
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    if ((e.target as HTMLElement).closest('.avatar-clickable')) {
      return;
    }
    onClick();
  };

  const handleCheckboxChange = (checked: boolean) => {
    onSelectChange(checked);
  };

  const handleAvatarClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (artwork.author?.id) {
      try {
        await navigator.clipboard.writeText(artwork.author.id);
        toast.success("User UUID copied");
      } catch {
        toast.error("Failed to copy user UUID");
      }
    }
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-0 transition-all duration-300 break-inside-avoid mb-3 cursor-pointer",
        selectionEnabled && selected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={handleClick}
    >
      {/* Checkbox overlay - top left */}
      {selectionEnabled && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            className="bg-background/80 backdrop-blur-sm border-2"
          />
        </div>
      )}

      {/* Moderation status and visibility badges - top right */}
      <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
        {getModerationStatusBadge(artwork.moderation_status)}
        {getVisibilityLevelBadge(artwork.visibility_level)}
      </div>

      {/* Media section */}
      <div className="relative w-full overflow-hidden rounded-t-xl bg-muted">
        {artwork.type === "image" && <ImageCardMedia artwork={artwork} />}
        {artwork.type === "oc" && <OcCardMedia artwork={artwork} />}
        {artwork.type === "video" && (
          <div className="relative w-full">
            <ImageCardMedia artwork={artwork} />
            {/* Play icon overlay for video */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="rounded-full bg-white/90 p-3 shadow-lg">
                <Play className="h-6 w-6 text-gray-900 fill-gray-900" />
              </div>
            </div>
          </div>
        )}

        {/* gen_type badge - positioned below checkbox */}
        {artwork.gen_type && (
          <div
            className={cn(
              "absolute top-2 z-10",
              selectionEnabled ? "left-12" : "left-2"
            )}
          >
            <span className="inline-flex items-center rounded-full bg-muted/90 text-foreground text-xs px-3 py-1 border border-border/60 shadow-sm">
              {artwork.gen_type.replace(/_/g, " ")}
            </span>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-3 space-y-2">
        {/* UUID Display */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm font-mono truncate" title={displayUuid}>
            {truncateUuid(displayUuid)}
          </p>
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await navigator.clipboard.writeText(displayUuid);
                toast.success("UUID copied");
              } catch {
                toast.error("Failed to copy UUID");
              }
            }}
            className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
            title="Copy UUID"
          >
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>

        {/* Bottom: Date and User Avatar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {new Date(artwork.created_at as any).toLocaleDateString()}
          </span>
          {artwork.author && (
            <div
              className="avatar-clickable flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
              onClick={handleAvatarClick}
              title={`Click to copy user UUID: ${artwork.author.id}`}
            >
              <AdminUserAvatar
                avatarUrl={artwork.author.avatar}
                name={artwork.author.name}
                className="size-5"
                fallbackClassName="text-[9px]"
              />
              <span className="truncate max-w-[80px]">
                {artwork.author.name || "Unknown"}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
