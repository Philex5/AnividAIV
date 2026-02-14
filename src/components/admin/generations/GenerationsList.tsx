"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ImagePreviewDialog } from "@/components/anime-generator/ImagePreviewDialog";
import { VideoPreviewDialog } from "@/components/video/VideoPreviewDialog";
import { ArtworkDetailModal } from "@/components/community/detail/ArtworkDetailModal";
import { AdminGenerationCard } from "./AdminGenerationCard";
import { BulkActionBar } from "./BulkActionBar";
import { displayTypeToApiParam, normalizeToDisplayType } from "@/lib/artwork-types";
import { getGenTypeWhitelist, normalizeGenTypes } from "@/configs/gen-type-display";
import type { ArtworkPreview } from "@/types/pages/community";
import type { GenerationListItem } from "@/services/admin-generations";
import type { AnimeGeneratorPage } from "@/types/pages/landing";
import type { CommunityPage } from "@/types/pages/community";

type ModerationStatus = "normal" | "banned" | "featured";
type VisibilityLevel = "public" | "private";
type AdminArtworkPreview = ArtworkPreview & {
  moderation_status: string;
  visibility_level: VisibilityLevel;
};

// Masonry layout helper - same as community page
function distributeToColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    const columnIndex = index % columnCount;
    columns[columnIndex].push(item);
  });
  return columns;
}

interface Filters {
  type: string;
  genType: string;
  userId: string;
  artworkUuid: string;
  dateRange: string;
  moderationStatus: string;
}

function convertToArtworkPreview(item: GenerationListItem): AdminArtworkPreview {
  // Map generation types to artwork types
  let artworkType: "oc" | "image" | "video" = "image";
  const isCharacter = item.type === "character" || item.sub_type === "character";
  if (isCharacter) {
    artworkType = "oc";
  } else if (item.type === "video") {
    artworkType = "video";
  }

  // Use user_name and user_avatar from the API response
  const userName = item.user_name || `User ${item.user_uuid.slice(0, 8)}`;

  // Use actual_gen_type from image/video table for filtering
  // If actual_gen_type is available, use it; otherwise fallback to gen_type
  const genType = item.actual_gen_type || item.gen_type;

  // For OC type, use character_uuid as id
  const artworkId = isCharacter && item.character_uuid ? item.character_uuid : item.uuid;

  return {
    id: artworkId,
    type: artworkType,
    title: item.prompt
      ? item.prompt.slice(0, 50) + (item.prompt.length > 50 ? "..." : "")
      : `${item.type} - ${item.uuid.slice(0, 8)}`,
    cover_url: isCharacter
      ? item.character_avatar_url ||
        item.preview_image_url ||
        item.reference_image_url ||
        ""
      : item.preview_image_url ||
        item.preview_video_poster_url ||
        item.reference_image_url ||
        "",
    prompt: item.prompt,
    created_at: item.created_at,
    author: {
      id: item.user_uuid,
      name: userName,
      avatar: item.user_avatar || "",
    },
    stats: {
      likes: 0,
      views: 0,
      comments: 0,
      favorites: 0,
    },
    liked: false,
    favorited: false,
    tags: [],
    gen_type: genType || undefined,
    meta: {
      model_id: item.model_id,
      status: item.status,
      error_code: item.error_code,
      error_message: item.error_message,
      progress: item.progress,
      credits_cost: item.credits_cost,
      generation_time: item.generation_time,
      preview_image_uuid: item.preview_image_uuid,
      preview_video_uuid: item.preview_video_uuid,
      character_uuid: item.character_uuid,
      // Store artwork_uuid for status update API
      artwork_uuid: item.artwork_uuid,
    },
    moderation_status: (item as any).moderation_status || "normal",
    visibility_level:
      item.visibility_level === "public" ? "public" : "private",
  };
}

interface GenerationsListProps {
  imagePageData: AnimeGeneratorPage;
  videoPageData: AnimeGeneratorPage;
  communityPageData: CommunityPage;
}

export default function GenerationsList({
  imagePageData,
  videoPageData,
  communityPageData,
}: GenerationsListProps) {
  const t = useTranslations("admin.generations");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get detail modal state from URL params (like community page)
  const detailId = searchParams.get("artwork");
  const detailTypeParam = searchParams.get("artworkType");

  const [filters, setFilters] = useState<Filters>({
    type: "all",
    genType: "all",
    userId: "",
    artworkUuid: "",
    dateRange: "30d",
    moderationStatus: "all",
  });
  const [generations, setGenerations] = useState<AdminArtworkPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [columnCount, setColumnCount] = useState(4);

  // Responsive column count
  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      if (width >= 1600) setColumnCount(5);
      else if (width >= 1280) setColumnCount(4);
      else if (width >= 1024) setColumnCount(3);
      else setColumnCount(2);
    };
    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  const loadGenerations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        type: filters.type,
        dateRange: filters.dateRange,
      });

      if (filters.userId) {
        params.set("userId", filters.userId);
      }

      if (filters.genType && filters.genType !== "all") {
        params.set("genType", filters.genType);
      }

      if (filters.artworkUuid) {
        params.set("artworkUuid", filters.artworkUuid);
      }

      if (filters.moderationStatus && filters.moderationStatus !== "all") {
        params.set("moderationStatus", filters.moderationStatus);
      }

      const response = await fetch(`/api/admin/generations?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "Failed to fetch generations");
      }

      setGenerations(result.data.data.map((item: GenerationListItem) => convertToArtworkPreview(item)));
      setPagination(result.data.pagination);

      // Clear selections when data changes
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Failed to load generations:", error);
      setGenerations([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadGenerations();
  }, [loadGenerations]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Reset genType filter when type changes (since genTypes are type-specific)
  useEffect(() => {
    if (filters.type === "all" && filters.genType !== "all") {
      setFilters((prev) => ({ ...prev, genType: "all" }));
    }
  }, [filters.type]);

  // Get artwork type from item - using unified type conversion (like community page)
  const getArtworkType = useCallback((item: ArtworkPreview): "image" | "video" | "character" => {
    const normalized = normalizeToDisplayType(item.type);
    return displayTypeToApiParam(normalized) as "image" | "video" | "character";
  }, []);

  // Update URL query params (like community page)
  const updateQuery = useCallback(
    (mutator: (params: URLSearchParams) => void, replace = false) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      mutator(nextParams);
      const query = nextParams.toString();
      const target = query ? `${pathname}?${query}` : pathname;
      if (replace) {
        router.replace(target);
      } else {
        router.push(target);
      }
    },
    [pathname, router, searchParams]
  );

  // Handle opening detail modal (like community page)
  const handleOpenDetail = useCallback(
    (artwork: AdminArtworkPreview) => {
      const meta = artwork.meta as { preview_image_uuid?: string; preview_video_uuid?: string } | undefined;
      const artworkType = getArtworkType(artwork);

      // For OC type, use character_uuid, otherwise use preview_image_uuid or preview_video_uuid
      let artworkId: string;
      if (artwork.type === "oc") {
        artworkId = artwork.id;
      } else if (artwork.type === "video" && meta?.preview_video_uuid) {
        artworkId = meta.preview_video_uuid;
      } else {
        artworkId = meta?.preview_image_uuid || artwork.id;
      }

      updateQuery((sp) => {
        sp.set("artwork", artworkId);
        sp.set("artworkType", artworkType);
      });
    },
    [updateQuery, getArtworkType]
  );

  // Handle closing detail modal (like community page)
  const handleCloseDetail = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("artwork");
    sp.delete("artworkType");
    const target = sp.toString() ? `${pathname}?${sp}` : pathname;
    router.replace(target);
  }, [pathname, router, searchParams]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectItem = (id: string, selected: boolean) => {
    if (!isSelectMode) return;
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => {
      if (prev) {
        setSelectedItems(new Set());
      }
      return !prev;
    });
  };

  const handleBulkSetStatus = async (status: ModerationStatus) => {
    if (selectedItems.size === 0) return;

    setIsBulkUpdating(true);
    try {
      // Build items list with proper artwork UUIDs
      const itemsList = generations
        .filter((item) => selectedItems.has(item.id))
        .map((item) => {
          const meta = item.meta as { artwork_uuid?: string } | undefined;
          const artworkUuid = meta?.artwork_uuid;

          // Determine type from item
          let artworkType: "image" | "video" | "character";
          if (item.type === "oc") {
            artworkType = "character";
          } else if (item.type === "video") {
            artworkType = "video";
          } else {
            artworkType = "image";
          }

          return {
            artworkUuid,
            artworkType,
          };
        })
        .filter((item) => item.artworkUuid);

      if (itemsList.length === 0) {
        toast.error("No valid items to update (missing artwork UUIDs)");
        return;
      }

      const response = await fetch("/api/admin/generations/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsList,
          status,
        }),
      });

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "Failed to update status");
      }

      toast.success(`Updated ${result.data.totalUpdated} items to status: ${status}`);

      // Reload data and clear selection
      await loadGenerations();
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Failed to bulk update status:", error);
      toast.error("Failed to update status");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const imageColumns = useMemo(
    () => distributeToColumns(generations, columnCount),
    [generations, columnCount]
  );

  // Dynamically collect all unique gen_type values from the data
  const genTypeOptions = useMemo(() => {
    const fromConfig =
      filters.type === "all"
        ? normalizeGenTypes([
            ...getGenTypeWhitelist("admin", "image"),
            ...getGenTypeWhitelist("admin", "video"),
            ...getGenTypeWhitelist("admin", "character"),
          ])
        : normalizeGenTypes(getGenTypeWhitelist("admin", filters.type));

    if (fromConfig.length) return fromConfig;

    // Fallback to dynamic data if config is not defined for this type
    const filteredByType = generations.filter((item) => {
      if (filters.type === "character") return item.type === "oc";
      return item.type === filters.type;
    });

    const uniqueGenTypes = new Set<string>();
    filteredByType.forEach((item) => {
      if (item.gen_type) {
        uniqueGenTypes.add(item.gen_type);
      }
    });

    return Array.from(uniqueGenTypes).sort();
  }, [filters.type, generations]);

  // Get the active item for detail modal (like community page)
  const activeItem = useMemo(
    () => generations.find((item) => {
      const meta = item.meta as { preview_image_uuid?: string; preview_video_uuid?: string } | undefined;
      if (item.type === "oc") return item.id === detailId;
      if (item.type === "video" && meta?.preview_video_uuid) return meta.preview_video_uuid === detailId;
      return meta?.preview_image_uuid === detailId;
    }),
    [detailId, generations]
  );

  return (
    <div className="space-y-4">
      {/* Filters section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Type filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium whitespace-nowrap sm:text-sm">{t("filters.type")}:</span>
                <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
                  <SelectTrigger className="w-[110px] text-xs sm:w-[140px] sm:text-sm">
                    <SelectValue placeholder={t("filters.type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.all_types")}</SelectItem>
                    <SelectItem value="image">{t("filters.image")}</SelectItem>
                    <SelectItem value="video">{t("filters.video")}</SelectItem>
                    <SelectItem value="character">{t("filters.character")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gen type filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium whitespace-nowrap sm:text-sm">{t("filters.gen_type")}:</span>
                <Select value={filters.genType} onValueChange={(value) => handleFilterChange("genType", value)}>
                  <SelectTrigger className="w-[120px] text-xs sm:w-[160px] sm:text-sm">
                    <SelectValue placeholder={t("filters.gen_type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.all_gen_types")}</SelectItem>
                    {genTypeOptions.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Moderation status filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium whitespace-nowrap sm:text-sm">{t("filters.moderation_status")}:</span>
                <Select value={filters.moderationStatus} onValueChange={(value) => handleFilterChange("moderationStatus", value)}>
                  <SelectTrigger className="w-[120px] text-xs sm:w-[140px] sm:text-sm">
                    <SelectValue placeholder={t("filters.moderation_status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.all_moderation_status")}</SelectItem>
                    <SelectItem value="normal">{t("filters.normal")}</SelectItem>
                    <SelectItem value="banned">{t("filters.banned")}</SelectItem>
                    <SelectItem value="featured">{t("filters.featured")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date range filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium whitespace-nowrap sm:text-sm">{t("filters.date_range")}:</span>
                <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange("dateRange", value)}>
                  <SelectTrigger className="w-[140px] text-xs sm:w-[180px] sm:text-sm">
                    <SelectValue placeholder={t("filters.date_range")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">{t("filters.last_7_days")}</SelectItem>
                    <SelectItem value="30d">{t("filters.last_30_days")}</SelectItem>
                    <SelectItem value="90d">{t("filters.last_90_days")}</SelectItem>
                    <SelectItem value="all">{t("filters.all_time")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Select mode button */}
              <div className="flex items-center gap-2">
                <Button
                  variant={isSelectMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleSelectMode}
                  className="text-xs sm:text-sm"
                >
                  {isSelectMode ? t("actions.exit_select_mode") : t("actions.select_mode")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          {/* User ID filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">{t("filters.user_id")}:</span>
            <Input
              placeholder={t("filters.user_uuid_placeholder")}
              value={filters.userId}
              onChange={(e) => handleFilterChange("userId", e.target.value)}
              className="w-[200px]"
            />
          </div>

          {/* Artwork UUID filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">{t("filters.artwork_uuid")}:</span>
            <Input
              placeholder={t("filters.artwork_uuid_placeholder")}
              value={filters.artworkUuid}
              onChange={(e) => handleFilterChange("artworkUuid", e.target.value)}
              className="w-[220px]"
            />
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedItems.size}
        onSetStatus={handleBulkSetStatus}
        onClearSelection={() => setSelectedItems(new Set())}
        isUpdating={isBulkUpdating}
      />

      {/* Generations masonry list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : generations.length > 0 ? (
        <>
          <style jsx>{`
            .masonry-container {
              align-items: flex-start;
            }
            .masonry-column {
              overflow: hidden;
            }
          `}</style>

          <div className="masonry-container flex gap-3">
            {imageColumns.map((column, columnIndex) => (
              <div
                key={columnIndex}
                className="masonry-column flex-1 flex flex-col"
              >
                {column.map((item) => (
                  <AdminGenerationCard
                    key={item.id}
                    artwork={item}
                    selected={isSelectMode && selectedItems.has(item.id)}
                    selectionEnabled={isSelectMode}
                    onSelectChange={(selected) => handleSelectItem(item.id, selected)}
                    onClick={() => {
                      if (isSelectMode) {
                        handleSelectItem(item.id, !selectedItems.has(item.id));
                        return;
                      }
                      handleOpenDetail(item);
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                {t("pagination.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("pagination.page_info", {
                  page: pagination.page,
                  totalPages: pagination.totalPages,
                  total: pagination.total,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                {t("pagination.next")}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          {t("empty.no_generations")}
        </div>
      )}

      {/* Detail modal using URL params (like community page) */}
      <ArtworkDetailModal
        open={Boolean(detailId)}
        artworkId={detailId}
        listItem={activeItem ?? undefined}
        onClose={handleCloseDetail}
        onToggleLike={async () => {}}
        onToggleFavorite={async () => {}}
        pageData={communityPageData}
      />
    </div>
  );
}
