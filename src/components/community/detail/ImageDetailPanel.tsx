"use client";

import type { ArtworkDetail, CommunityPage } from "@/types/pages/community";

interface ImageDetailPanelProps {
  detail: ArtworkDetail;
  pageData: CommunityPage;
}

export function ImageDetailPanel({ detail, pageData }: ImageDetailPanelProps) {
  if (!detail.description) return null;
  
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase text-muted-foreground">
        {pageData.detail.description}
      </p>
      <p className="text-sm leading-relaxed text-foreground/80">
        {detail.description}
      </p>
    </div>
  );
}
