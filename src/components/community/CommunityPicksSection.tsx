"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { ArtworkCard } from "@/components/community/ArtworkCard";
import { ArtworkDetailModal } from "@/components/community/detail/ArtworkDetailModal";
import type {
  ArtworkPreview,
  ArtworkType,
  CommunityPage,
} from "@/types/pages/community";

function distributeToColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    const columnIndex = columnCount > 0 ? index % columnCount : 0;
    columns[columnIndex].push(item);
  });
  return columns;
}

function enhanceItem(item: ArtworkPreview): ArtworkPreview {
  return {
    ...item,
    liked: Boolean(item.liked),
    favorited: Boolean(item.favorited),
    stats: {
      ...item.stats,
    },
  };
}

function getArtworkType(item: ArtworkPreview | null | undefined): ArtworkType | "character" {
  if (!item) return "image";
  if (item.type === "oc") return "oc";
  if (item.type === "image" || item.type === "video") {
    return item.type;
  }
  return "image";
}

interface CommunityPicksSectionProps {
  items: ArtworkPreview[];
  pageData: CommunityPage;
}

export function CommunityPicksSection({
  items,
  pageData,
}: CommunityPicksSectionProps) {
  const [artworks, setArtworks] = useState<ArtworkPreview[]>(
    items.map(enhanceItem)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<ArtworkPreview | null>(null);
  const [columnCount, setColumnCount] = useState<number>(3);

  useEffect(() => {
    setArtworks(items.map(enhanceItem));
  }, [items]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedSnapshot(null);
      return;
    }
    const current = artworks.find((item) => item.id === selectedId);
    if (current) {
      setSelectedSnapshot(current);
      return;
    }
    const fallback = items.find((item) => item.id === selectedId);
    if (fallback) {
      setSelectedSnapshot(enhanceItem(fallback));
    }
  }, [artworks, items, selectedId]);

  const activeItem = useMemo(() => {
    if (!selectedId) return null;
    return artworks.find((item) => item.id === selectedId) ?? selectedSnapshot;
  }, [artworks, selectedId, selectedSnapshot]);

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      if (width >= 1600) setColumnCount(5); // 大屏幕 5列
      else if (width >= 1024) setColumnCount(4); // 中屏幕 (13-14寸) 4列
      else setColumnCount(2); // 移动端 2列
    };

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  const columns = useMemo(
    () => distributeToColumns(artworks, columnCount),
    [artworks, columnCount]
  );

  const handleOpenDetail = useCallback((artwork: ArtworkPreview) => {
    setSelectedId(artwork.id);
    setSelectedSnapshot(artwork);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null);
    setSelectedSnapshot(null);
  }, []);

  const updateInteraction = useCallback(
    async (
      action: "like" | "favorite",
      id: string,
      enabled: boolean,
      item?: ArtworkPreview
    ) => {
      const targetItem = item ?? activeItem ?? selectedSnapshot;
      const artworkType = getArtworkType(targetItem) as ArtworkType | "character";
      const response = await fetch(
        `/api/community/artworks/${id}/${action}?type=${artworkType === "oc" ? "character" : artworkType}`,
        {
          method: enabled ? "POST" : "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    [activeItem, selectedSnapshot]
  );

  const handleToggleLike = useCallback(
    async (id: string, target: boolean) => {
      let previousState: { liked: boolean; likes: number } | null = null;
      let originalItem: ArtworkPreview | null = null;

      setArtworks((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          previousState = {
            liked: Boolean(item.liked),
            likes: item.stats.likes,
          };
          originalItem = item;
          const nextLikes = Math.max(item.stats.likes + (target ? 1 : -1), 0);
          return {
            ...item,
            liked: target,
            stats: { ...item.stats, likes: nextLikes },
          };
        })
      );

      try {
        await updateInteraction("like", id, target, originalItem ?? undefined);
      } catch (error) {
        setArtworks((prev) =>
          prev.map((item) => {
            if (item.id !== id || !previousState) return item;
            return {
              ...item,
              liked: previousState.liked,
              stats: {
                ...item.stats,
                likes: previousState.likes,
              },
            };
          })
        );
        toast.error(pageData.toasts.likeFailed);
        throw error;
      }
    },
    [pageData.toasts.likeFailed, updateInteraction]
  );

  const handleToggleFavorite = useCallback(
    async (id: string, target: boolean) => {
      let previous: boolean | null = null;
      let originalItem: ArtworkPreview | null = null;

      setArtworks((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          previous = Boolean(item.favorited);
          originalItem = item;
          return {
            ...item,
            favorited: target,
          };
        })
      );

      try {
        await updateInteraction(
          "favorite",
          id,
          target,
          originalItem ?? undefined
        );
      } catch (error) {
        setArtworks((prev) =>
          prev.map((item) =>
            item.id === id && previous !== null
              ? { ...item, favorited: previous }
              : item
          )
        );
        toast.error(pageData.toasts.favoriteFailed);
        throw error;
      }
    },
    [pageData.toasts.favoriteFailed, updateInteraction]
  );

  const handleShare = useCallback(
    async (artwork: ArtworkPreview) => {
      try {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const urlPath = `/community/${artwork.type}/${artwork.id}`;
        const shareUrl = origin ? `${origin}${urlPath}` : urlPath;
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          toast.success(pageData.toasts.copySuccess);
        } else {
          throw new Error("Clipboard not available");
        }
      } catch (error) {
        console.log("Share failed:", error);
        toast.error(pageData.toasts.copyFailed);
      }
    },
    [pageData]
  );

  const handleUseOc = useCallback(() => {
    toast.info(pageData.toasts.useOcComingSoon);
  }, [pageData.toasts.useOcComingSoon]);

  return (
    <>
      <style jsx>{`
        .masonry-container {
          align-items: flex-start;
        }

        .masonry-column {
          overflow: hidden;
        }
      `}</style>

      <div className="masonry-container flex gap-3 flex-wrap md:flex-nowrap">
        {columns.map((column, idx) => (
          <div
            key={idx}
            className="masonry-column flex-1 min-w-[220px] flex flex-col gap-0"
          >
            {column.map((item) => (
              <ArtworkCard
                key={item.id}
                artwork={item}
                onOpen={handleOpenDetail}
                onToggleLike={handleToggleLike}
                onToggleFavorite={handleToggleFavorite}
                onShare={handleShare}
                onUseOc={handleUseOc}
                pageData={pageData}
              />
            ))}
          </div>
        ))}
      </div>

      <ArtworkDetailModal
        open={Boolean(selectedId)}
        artworkId={selectedId}
        listItem={activeItem ?? undefined}
        onClose={handleCloseDetail}
        onToggleLike={handleToggleLike}
        onToggleFavorite={handleToggleFavorite}
        onShare={handleShare}
        pageData={pageData}
      />
    </>
  );
}
