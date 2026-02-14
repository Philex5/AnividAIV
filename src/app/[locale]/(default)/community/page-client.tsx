"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ArtworkCard } from "@/components/community/ArtworkCard";
import { CardSkeleton } from "@/components/community/cards/CardSkeleton";
import { ArtworkDetailModal } from "@/components/community/detail/ArtworkDetailModal";
import { FiltersBar } from "@/components/community/filters";
import { InfiniteLoader } from "@/components/community/InfiniteLoader";
import { Button } from "@/components/ui/button";
import AppFooter from "@/components/blocks/footer/AppFooter";
import {
  displayTypeToApiParam,
  normalizeToDisplayType,
} from "@/lib/artwork-types";
import type {
  ArtworkPreview,
  ArtworkType,
  CommunityListResponse,
  CommunityPage,
} from "@/types/pages/community";

function distributeToColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    const columnIndex = index % columnCount;
    columns[columnIndex].push(item);
  });
  return columns;
}

type CommunityFilterType = "all" | "oc" | "image" | "video";
type CommunitySortValue = "trending" | "newest" | "top";

const DEFAULT_TYPE: CommunityFilterType = "all";
const DEFAULT_SORT: CommunitySortValue = "trending";

// Get artwork type from item - using unified type conversion
function getArtworkType(item: ArtworkPreview): "image" | "video" | "character" {
  const normalized = normalizeToDisplayType(item.type);
  return displayTypeToApiParam(normalized) as "image" | "video" | "character";
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

function buildListParams(
  filters: {
    type: CommunityFilterType;
    sort: CommunitySortValue;
    q: string;
    genTypes: string[];
  },
  cursor?: string | null,
) {
  const params = new URLSearchParams();
  params.set("type", filters.type);
  params.set("sort", filters.sort);
  if (filters.q) params.set("q", filters.q);
  if (filters.genTypes.length) {
    params.set("gen_types", filters.genTypes.join(","));
  }
  if (cursor) params.set("cursor", cursor);
  params.set("limit", "24");
  return params;
}

function getColumnCount(width: number): number {
  if (width >= 1600) return 5;
  if (width >= 1024) return 4;
  return 2;
}

export default function CommunityPageClient({
  pageData,
  initialList,
  initialFiltersKey,
}: {
  pageData: CommunityPage;
  initialList: CommunityListResponse;
  initialFiltersKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const typeParam = searchParams.get("type");
  const sortParam = searchParams.get("sort");
  const qParam = searchParams.get("q");
  const genTypesParam = searchParams.get("gen_types");
  const detailId = searchParams.get("artwork");
  const detailTypeParam = searchParams.get("artworkType");

  const filters = useMemo(() => {
    const normalizedType: CommunityFilterType =
      typeParam === "oc" || typeParam === "image" || typeParam === "video"
        ? typeParam
        : DEFAULT_TYPE;
    const normalizedSort: CommunitySortValue =
      sortParam === "newest" || sortParam === "top" || sortParam === "trending"
        ? sortParam
        : DEFAULT_SORT;
    const query = qParam ? qParam.slice(0, 100) : "";
    const genTypes = genTypesParam
      ? genTypesParam
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    return {
      type: normalizedType,
      sort: normalizedSort,
      q: query,
      genTypes,
    };
  }, [genTypesParam, qParam, sortParam, typeParam]);

  const [searchValue, setSearchValue] = useState(filters.q);
  useEffect(() => {
    setSearchValue(filters.q);
  }, [filters.q]);

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        type: typeParam || DEFAULT_TYPE,
        sort: sortParam || DEFAULT_SORT,
        q: qParam || "",
        genTypes: genTypesParam || "",
      }),
    [typeParam, sortParam, qParam, genTypesParam],
  );

  const hasServerDataMatch = initialFiltersKey === filtersKey;

  const [items, setItems] = useState<ArtworkPreview[]>(() =>
    hasServerDataMatch ? initialList.items.map(enhanceItem) : [],
  );
  const [nextCursor, setNextCursor] = useState<string | null>(() =>
    hasServerDataMatch ? initialList.nextCursor ?? null : null,
  );
  const [hasMore, setHasMore] = useState(() =>
    hasServerDataMatch ? Boolean(initialList.nextCursor) : false,
  );
  const [isInitialLoading, setIsInitialLoading] = useState(
    !hasServerDataMatch,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [columnCount, setColumnCount] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(Boolean(detailId));

  const detailHistoryRef = useRef(false);
  const loadMoreControllerRef = useRef<AbortController | null>(null);
  const ssrAppliedRef = useRef(false);

  useEffect(() => {
    const updateColumnCount = () => {
      setColumnCount(getColumnCount(window.innerWidth));
    };

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = buildListParams(filters);

    const shouldApplySsrData =
      hasServerDataMatch && reloadKey === 0 && !ssrAppliedRef.current;

    if (shouldApplySsrData) {
      ssrAppliedRef.current = true;
      setItems(initialList.items.map(enhanceItem));
      setNextCursor(initialList.nextCursor ?? null);
      setHasMore(Boolean(initialList.nextCursor));
      setListError(null);
      setLoadMoreError(null);
      setIsInitialLoading(false);
    } else {
      setIsInitialLoading(true);
      setListError(null);
      setLoadMoreError(null);
    }

    const load = async (isBackgroundRefresh: boolean) => {
      try {
        const response = await fetch(
          `/api/community/artworks?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const result = await response.json();
        const data = result.data as CommunityListResponse;
        setItems(data.items.map(enhanceItem));
        setNextCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.log("Community list load failed:", error);
        const message = pageData.states.loadFailed;
        setListError(message);
        if (!isBackgroundRefresh) {
          toast.error(pageData.toasts.loadFailed);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsInitialLoading(false);
        }
      }
    };

    void load(shouldApplySsrData);

    return () => controller.abort();
  }, [
    filters,
    filtersKey,
    hasServerDataMatch,
    initialList,
    pageData.states.loadFailed,
    pageData.toasts.loadFailed,
    reloadKey,
  ]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;

    loadMoreControllerRef.current?.abort();
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;

    setIsLoadingMore(true);
    setLoadMoreError(null);

    const params = buildListParams(filters, nextCursor);

    try {
      const response = await fetch(
        `/api/community/artworks?${params.toString()}`,
        { signal: controller.signal, cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const result = await response.json();
      const data = result.data as CommunityListResponse;
      setItems((prev) => {
        const existing = new Map(prev.map((item) => [item.id, item]));
        data.items.forEach((item) => {
          existing.set(item.id, enhanceItem(item));
        });
        return Array.from(existing.values());
      });
      setNextCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch (error) {
      if (controller.signal.aborted) return;
      console.log("Community load more failed:", error);
      const message = pageData.toasts.loadMoreFailed;
      setLoadMoreError(message);
      toast.error(message);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingMore(false);
        loadMoreControllerRef.current = null;
      }
    }
  }, [filters, hasMore, isLoadingMore, nextCursor, pageData]);

  useEffect(() => {
    return () => {
      loadMoreControllerRef.current?.abort();
    };
  }, []);

  const updateQuery = useCallback(
    (mutator: (params: URLSearchParams) => void, replace = false) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      mutator(nextParams);
      nextParams.delete("cursor");
      const query = nextParams.toString();
      const target = query ? `${pathname}?${query}` : pathname;
      if (replace) {
        router.replace(target);
      } else {
        router.push(target);
      }
    },
    [pathname, router, searchParams],
  );

  const handleTypeChange = useCallback(
    (nextType: CommunityFilterType) => {
      updateQuery((sp) => {
        sp.set("type", nextType);
        sp.delete("gen_types");
        sp.delete("artwork");
        sp.delete("artworkType");
      });
    },
    [updateQuery],
  );

  const handleSortChange = useCallback(
    (nextSort: CommunitySortValue) => {
      updateQuery((sp) => {
        sp.set("sort", nextSort);
        sp.delete("artwork");
        sp.delete("artworkType");
      });
    },
    [updateQuery],
  );

  const handleSearchSubmit = useCallback(() => {
    const trimmed = searchValue.trim();
    updateQuery((sp) => {
      if (trimmed) {
        sp.set("q", trimmed);
      } else {
        sp.delete("q");
      }
      sp.delete("artwork");
      sp.delete("artworkType");
    });
  }, [searchValue, updateQuery]);

  const handleGenTypeChange = useCallback(
    (nextGenTypes: string[]) => {
      updateQuery((sp) => {
        if (nextGenTypes.length) {
          sp.set("gen_types", nextGenTypes.join(","));
        } else {
          sp.delete("gen_types");
        }
        sp.delete("artwork");
        sp.delete("artworkType");
      });
    },
    [updateQuery],
  );

  const handleSearchClear = useCallback(() => {
    setSearchValue("");
    updateQuery((sp) => {
      sp.delete("q");
      sp.delete("artwork");
      sp.delete("artworkType");
    });
  }, [updateQuery]);

  const handleOpenDetail = useCallback(
    (artwork: ArtworkPreview) => {
      setIsDetailOpen(true);
      detailHistoryRef.current = true;
      updateQuery((sp) => {
        sp.set("artwork", artwork.id);
        sp.set("artworkType", getArtworkType(artwork));
      });
    },
    [updateQuery],
  );

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    const currentUrl =
      typeof window !== "undefined"
        ? new URL(window.location.href)
        : new URL(`${pathname}?${searchParams.toString()}`, "https://local.invalid");
    currentUrl.searchParams.delete("artwork");
    currentUrl.searchParams.delete("artworkType");
    const query = currentUrl.searchParams.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    detailHistoryRef.current = false;
    router.replace(target);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    setIsDetailOpen(Boolean(detailId));
    if (!detailId) {
      detailHistoryRef.current = false;
    }
  }, [detailId]);

  const updateInteraction = useCallback(
    async (
      action: "like" | "favorite",
      id: string,
      enabled: boolean,
      item?: ArtworkPreview,
    ) => {
      // 直接使用uuid，不需要解码
      const uuid = id;
      const artworkType = item ? getArtworkType(item) : "image";

      const response = await fetch(
        `/api/community/artworks/${uuid}/${action}?artworkType=${artworkType}`,
        {
          method: enabled ? "POST" : "DELETE",
        },
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    [],
  );

  const handleToggleLike = useCallback(
    async (id: string, target: boolean) => {
      let previousState: { liked: boolean; likes: number } | null = null;
      let currentItem: ArtworkPreview | null = null;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          previousState = {
            liked: Boolean(item.liked),
            likes: item.stats.likes,
          };
          currentItem = item;
          const nextLikes = Math.max(item.stats.likes + (target ? 1 : -1), 0);
          return {
            ...item,
            liked: target,
            stats: { ...item.stats, likes: nextLikes },
          };
        }),
      );

      try {
        await updateInteraction("like", id, target, currentItem || undefined);
      } catch (error) {
        if (previousState) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    liked: previousState?.liked,
                    stats: {
                      ...item.stats,
                      likes: previousState?.likes ?? item.stats.likes,
                    },
                  }
                : item,
            ),
          );
        }
        toast.error(pageData.toasts.likeFailed);
        throw error;
      }
    },
    [pageData, updateInteraction],
  );

  const handleToggleFavorite = useCallback(
    async (id: string, target: boolean) => {
      let previous: boolean | null = null;
      let currentItem: ArtworkPreview | null = null;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          previous = Boolean(item.favorited);
          currentItem = item;
          return { ...item, favorited: target };
        }),
      );

      try {
        await updateInteraction(
          "favorite",
          id,
          target,
          currentItem || undefined,
        );
      } catch (error) {
        if (previous !== null) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, favorited: previous ?? false } : item,
            ),
          );
        }
        toast.error(pageData.toasts.favoriteFailed);
        throw error;
      }
    },
    [pageData, updateInteraction],
  );

  const handleShare = useCallback(
    async (artwork: ArtworkPreview) => {
      try {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        // 修复分享URL路径 - 使用查询参数而不是子路径
        const typeMap: Record<string, string> = {
          image: "image",
          video: "video",
          oc: "character",
        };
        const artworkType = typeMap[artwork.type] || "image";
        const urlPath = `/community?artwork=${artwork.id}&artworkType=${artworkType}`;
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
    [pageData],
  );

  const handleUseOc = useCallback(() => {
    toast.info(pageData.toasts.useOcComingSoon);
  }, [pageData]);

  const handleRetryInitial = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  const normalizedDetailType = useMemo<ArtworkType | null>(() => {
    if (!detailTypeParam) return null;
    if (detailTypeParam === "character") return "character";
    if (detailTypeParam === "image" || detailTypeParam === "video") {
      return detailTypeParam;
    }
    return null;
  }, [detailTypeParam]);

  const fallbackItem = useMemo<ArtworkPreview | undefined>(() => {
    if (!detailId || !normalizedDetailType) return undefined;
    return {
      id: detailId,
      type: normalizedDetailType,
      title: "",
      cover_url: "",
      author: { id: "", name: "", avatar: "" },
      stats: { likes: 0, views: 0, comments: 0, favorites: 0 },
    };
  }, [detailId, normalizedDetailType]);

  const activeItem = useMemo(
    () => items.find((item) => item.id === detailId) ?? fallbackItem,
    [detailId, items, fallbackItem],
  );

  const skeletonCount = 8;
  const effectiveColumnCount = columnCount ?? 4;
  const isColumnReady = columnCount !== null;
  const isEmptyState = !isInitialLoading && !listError && items.length === 0;
  const showSkeletonOnly = !isColumnReady || (isInitialLoading && items.length === 0);
  const imageColumns = useMemo(
    () => distributeToColumns(items, effectiveColumnCount),
    [items, effectiveColumnCount],
  );

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

      <div className="mx-auto flex max-w-480 flex-col gap-4 px-4 pt-2 pb-6">
        <header className="flex flex-col gap-4">
          <FiltersBar
            type={filters.type}
            sort={filters.sort}
            genTypes={filters.genTypes}
            onTypeChange={handleTypeChange}
            onSortChange={handleSortChange}
            onGenTypeChange={handleGenTypeChange}
            pageData={pageData}
          />
        </header>

        {listError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
            <span>{listError}</span>
            <Button type="button" size="sm" onClick={handleRetryInitial}>
              {pageData.states.retry}
            </Button>
          </div>
        ) : (
          <>
            {showSkeletonOnly ? (
              <div className="masonry-container flex gap-3">
                {Array.from({ length: effectiveColumnCount }).map((_, colIdx) => (
                  <div
                    key={colIdx}
                    className="masonry-column flex-1 flex flex-col"
                  >
                    {Array.from({
                      length: Math.ceil(skeletonCount / effectiveColumnCount),
                    }).map((_, idx) => (
                      <CardSkeleton key={idx} />
                    ))}
                  </div>
                ))}
              </div>
            ) : isEmptyState ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
                <span>{pageData.states.noResults}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSearchClear}
                >
                  {pageData.search.clear}
                </Button>
              </div>
            ) : (
              <>
                <div className="masonry-container flex gap-3">
                  {imageColumns.map((column, columnIndex) => (
                    <div
                      key={columnIndex}
                      className="masonry-column flex-1 flex flex-col"
                    >
                      {column.map((item) => (
                        <ArtworkCard
                          key={item.id}
                          artwork={item}
                          onOpen={handleOpenDetail}
                          onToggleLike={handleToggleLike}
                          onToggleFavorite={handleToggleFavorite}
                          onUseOc={handleUseOc}
                          pageData={pageData}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                <InfiniteLoader
                  hasMore={hasMore}
                  isLoading={isLoadingMore}
                  onLoadMore={loadMore}
                  error={loadMoreError}
                  onRetry={() => {
                    setLoadMoreError(null);
                    void loadMore();
                  }}
                />
              </>
            )}
          </>
        )}

        <ArtworkDetailModal
          open={isDetailOpen && Boolean(detailId)}
          artworkId={detailId}
          listItem={activeItem}
          onClose={handleCloseDetail}
          onToggleLike={handleToggleLike}
          onToggleFavorite={handleToggleFavorite}
          pageData={pageData}
        />

        {/* {pageData.contentGuide?.items?.length ? (
          <section className="mx-auto w-full max-w-6xl rounded-2xl border border-border bg-card/40 p-5 md:p-7">
            <h2 className="text-lg font-semibold md:text-xl">
              {pageData.contentGuide.heading}
            </h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {pageData.contentGuide.items.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null} */}

        {/* {pageData.faq?.items?.length ? (
          <section className="mx-auto w-full max-w-6xl rounded-2xl border border-border bg-card/40 p-5 md:p-7">
            <h2 className="text-lg font-semibold md:text-xl">{pageData.faq.heading}</h2>
            <div className="mt-4 space-y-4">
              {pageData.faq.items.map((qa, index) => (
                <article key={`${qa.question}-${index}`} className="rounded-lg border border-border/70 bg-background/70 p-4">
                  <h3 className="text-sm font-semibold md:text-base">{qa.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{qa.answer}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null} */}
      </div>

      <AppFooter />
    </>
  );
}
