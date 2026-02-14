"use client";

import { useMemo } from "react";

import type { ArtworkDetail, CommunityPage } from "@/types/pages/community";

interface VideoDetailPanelProps {
  detail: ArtworkDetail;
  pageData: CommunityPage;
}

function formatDuration(seconds?: number): string | null {
  if (!seconds || Number.isNaN(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoDetailPanel({ detail, pageData }: VideoDetailPanelProps) {
  const duration = useMemo(
    () => formatDuration((detail.meta as any)?.duration_seconds as number),
    [detail.meta]
  );
  const resolution = useMemo(
    () => (detail.meta as any)?.resolution as string | undefined,
    [detail.meta]
  );

  return (
    <div className="flex flex-col gap-4">
      {detail.description && (
        <div className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">
            {pageData.detail.description}
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">
            {detail.description}
          </p>
        </div>
      )}

      {(duration || resolution) && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {duration && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {pageData.detail.meta.duration}
              </p>
              <p className="font-medium text-foreground">
                {pageData.labels.duration.replace("{count}", duration)}
              </p>
            </div>
          )}
          {resolution && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {pageData.detail.meta.resolution}
              </p>
              <p className="font-medium text-foreground">
                {pageData.labels.resolution.replace("{value}", resolution)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
