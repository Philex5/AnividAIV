"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Ban, CheckCircle, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModerationStatus = "normal" | "banned" | "featured";

interface BulkActionBarProps {
  selectedCount: number;
  onSetStatus: (status: ModerationStatus) => Promise<void>;
  onClearSelection: () => void;
  isUpdating?: boolean;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  onSetStatus,
  onClearSelection,
  isUpdating = false,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const handleSetStatus = async (status: ModerationStatus) => {
    await onSetStatus(status);
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between gap-4 rounded-lg border bg-card p-3 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="sm"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>Updating...</>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Set Status
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleSetStatus("normal")}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              <span>Set Normal</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetStatus("banned")}>
              <Ban className="mr-2 h-4 w-4 text-red-500" />
              <span>Set Banned</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetStatus("featured")}>
              <Star className="mr-2 h-4 w-4 text-yellow-500" />
              <span>Set Featured</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
          disabled={isUpdating}
        >
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
