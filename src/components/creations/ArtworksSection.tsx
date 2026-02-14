"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Loader2, ImageIcon, AlertCircle } from "lucide-react";
import { ArtworkCard as MineArtworkCard } from "@/components/artworks/ArtworkCard";
import { ArtworkCard as CommunityArtworkCard } from "@/components/community/ArtworkCard";
import { ArtworksPagination } from "@/components/artworks/ArtworksPagination";
import { ArtworkDetailModal as CommunityArtworkDetailModal } from "@/components/community/detail/ArtworkDetailModal";
import { ImagePreviewDialog } from "@/components/anime-generator/ImagePreviewDialog";
import { VideoPreviewDialog } from "@/components/video/VideoPreviewDialog";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Button } from "@/components/ui/button";
import type {
  ArtworkListItem,
  ArtworksResponse,
  PaginationInfo,
} from "@/types/pages/my-artworks";
import type { ArtworkPreview } from "@/types/pages/community";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TabState {
  artworks: ArtworkListItem[];
  pagination: PaginationInfo;
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
}

interface ArtworksSectionProps {
  pageData: any;
  translations: any;
  initialArtworks: ArtworksResponse;
}

type ArtworkMainTab = "mine" | "favorites";
type ArtworkTypeTab = "all" | "image" | "video" | "audio";

export function ArtworksSection({
  pageData,
  translations,
  initialArtworks,
}: ArtworksSectionProps) {
  const router = useRouter();

  const [mainTab, setMainTab] = useState<ArtworkMainTab>("mine");
  const [typeTab, setTypeTab] = useState<ArtworkTypeTab>("all");

  // Preview dialog state
  const [selectedImageUuid, setSelectedImageUuid] = useState<string | null>(null);
  const [selectedVideoUuid, setSelectedVideoUuid] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [selectedCommunityItem, setSelectedCommunityItem] =
    useState<ArtworkPreview | null>(null);

  // Tab state storage
  const [tabStates, setTabStates] = useState<Record<string, TabState>>(() => ({
    "mine-all": {
      artworks: initialArtworks.artworks,
      pagination: initialArtworks.pagination,
      isLoading: false,
      error: null,
      hasFetched: true,
    },
  }));

  // Generate tab key
  const getTabKey = useCallback((main: ArtworkMainTab, type: ArtworkTypeTab) => {
    return `${main}-${type}`;
  }, []);

  const currentTabKey = useMemo(
    () => getTabKey(mainTab, typeTab),
    [mainTab, typeTab, getTabKey]
  );

  const currentTabState = tabStates[currentTabKey] || {
    artworks: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: false,
    error: null,
    hasFetched: false,
  };

  // Fetch artworks
  const fetchArtworks = useCallback(
    async (page: number = 1, force: boolean = false) => {
      const key = currentTabKey;

      // Don't refetch if already loading
      if (!force && tabStates[key]?.isLoading) {
        return;
      }

      // Set loading state
      setTabStates((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] || {
            artworks: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            },
            error: null,
            hasFetched: false,
          }),
          isLoading: true,
          error: null,
        },
      }));

      try {
        const params = new URLSearchParams({
          type: typeTab,
          tab: mainTab,
          page: page.toString(),
          limit: "20",
        });

        const response = await fetch(`/api/artworks?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch artworks");
        }

        const result = await response.json();

        if (!result.success || !result.data) {
          throw new Error("Invalid response");
        }

        setTabStates((prev) => ({
          ...prev,
          [key]: {
            artworks: result.data.artworks,
            pagination: result.data.pagination,
            isLoading: false,
            error: null,
            hasFetched: true,
          },
        }));
      } catch (error) {
        console.error("Failed to fetch artworks:", error);
        setTabStates((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || {
              artworks: [],
              pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              },
              hasFetched: false,
            }),
            isLoading: false,
            error:
              mainTab === "favorites"
                ? translations.errors?.favorites || "Failed to load favorites"
                : translations.errors?.mine || "Failed to load your artworks",
          },
        }));
      }
    },
    [currentTabKey, typeTab, mainTab, tabStates, translations]
  );

  // Load data when tab changes
  useEffect(() => {
    const state = tabStates[currentTabKey];
    if (!state?.hasFetched) {
      fetchArtworks(1, true);
    }
  }, [currentTabKey]);

  // Handle card click
  const handleCardClick = (artwork: ArtworkListItem) => {
    if (mainTab === "favorites") {
      // Use community detail modal for favorites
      setSelectedCommunityId(artwork.uuid);
      setIsPreviewOpen(true);
      return;
    }
    if (artwork.type === "image") {
      setSelectedImageUuid(artwork.uuid);
      setSelectedVideoUuid(null);
    } else {
      setSelectedVideoUuid(artwork.uuid);
      setSelectedImageUuid(null);
    }
    setIsPreviewOpen(true);
  };

  // Handle preview close
  const handlePreviewClose = (open: boolean) => {
    setIsPreviewOpen(open);
    if (!open) {
      setSelectedImageUuid(null);
      setSelectedVideoUuid(null);
      setSelectedCommunityId(null);
      setSelectedCommunityItem(null);
    }
  };

  // Handle reuse parameters
  const handleReuseParameters = useCallback(
    async (imageUuid: string) => {
      if (!imageUuid) return;

      const targetPath = "/en/ai-action-figure-generator";
      const url = new URL(targetPath, window.location.origin);
      url.searchParams.set("gen_image_id", imageUuid);
      router.push(url.pathname + url.search, { scroll: false });
    },
    [router]
  );

  // Handle create new
  const handleCreateNew = useCallback(() => {
    router.push("/en/ai-action-figure-generator", { scroll: false });
  }, [router]);

  // Handle like toggle
  const handleToggleLike = useCallback(
    async (uuid: string, next: boolean) => {
      try {
        const artwork = currentTabState.artworks.find((a) => a.uuid === uuid);
        if (!artwork) return;

        const artType = artwork.type === "image" ? "image" : "video";

        const response = await fetch(
          `/api/community/artworks/${uuid}/like?type=${artType}`,
          {
            method: next ? "POST" : "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to toggle like");
        }

        // Update local state
        setTabStates((prev) => ({
          ...prev,
          [currentTabKey]: {
            ...prev[currentTabKey],
            artworks: prev[currentTabKey].artworks.map((art) =>
              art.uuid === uuid
                ? {
                    ...art,
                    liked: next,
                    like_count: next
                      ? (art.like_count || 0) + 1
                      : Math.max(0, (art.like_count || 0) - 1),
                  }
                : art
            ),
          },
        }));
      } catch (error) {
        console.error("Failed to toggle like:", error);
      }
    },
    [currentTabKey, currentTabState.artworks]
  );

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(
    async (uuid: string, next: boolean) => {
      try {
        const artwork = currentTabState.artworks.find((a) => a.uuid === uuid);
        if (!artwork) return;

        const artType = artwork.type === "image" ? "image" : "video";

        const response = await fetch(
          `/api/community/artworks/${uuid}/favorite?type=${artType}`,
          {
            method: next ? "POST" : "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to toggle favorite");
        }

        // Update local state
        setTabStates((prev) => ({
          ...prev,
          [currentTabKey]: {
            ...prev[currentTabKey],
            artworks: prev[currentTabKey].artworks.map((art) =>
              art.uuid === uuid
                ? {
                    ...art,
                    favorited: next,
                    favorite_count: next
                      ? (art.favorite_count || 0) + 1
                      : Math.max(0, (art.favorite_count || 0) - 1),
                  }
                : art
            ),
          },
        }));
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
      }
    },
    [currentTabKey, currentTabState.artworks]
  );

  // Handle visibility toggle
  const handleToggleVisibility = useCallback(
    async (uuid: string) => {
      try {
        const artwork = currentTabState.artworks.find((a) => a.uuid === uuid);
        if (!artwork) return;

        const artType = artwork.type === "image" ? "image" : "video";

        const response = await fetch(
          `/api/community/artworks/${uuid}/visibility?type=${artType}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to toggle visibility");
        }

        const result = await response.json();

        // Update local state
        setTabStates((prev) => ({
          ...prev,
          [currentTabKey]: {
            ...prev[currentTabKey],
            artworks: prev[currentTabKey].artworks.map((art) =>
              art.uuid === uuid
                ? {
                    ...art,
                    visibility_level: result.data.visibility_level,
                  }
                : art
            ),
          },
        }));
      } catch (error) {
        console.error("Failed to toggle visibility:", error);
      }
    },
    [currentTabKey, currentTabState.artworks]
  );

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchArtworks(page, true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Render loading state
  const renderLoadingState = () => {
    const loadingText =
      mainTab === "favorites"
        ? translations.loading?.favorites || "Loading your favorites..."
        : translations.loading?.mine || "Loading your artworks...";

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
        <p className="mt-4 text-muted-foreground">{loadingText}</p>
      </div>
    );
  };

  // Render error state
  const renderErrorState = () => {
    const errorTitle = translations.errors?.title || "Something went wrong";
    const retryLabel =
      translations.errors?.retry || translations.buttons?.try_again || "Retry";

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="mb-2 text-xl font-semibold">{errorTitle}</h3>
        <p className="mb-6 text-muted-foreground max-w-md">
          {currentTabState.error}
        </p>
        <Button onClick={() => fetchArtworks(currentTabState.pagination.page, true)}>
          {retryLabel}
        </Button>
      </div>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    const title =
      mainTab === "favorites"
        ? translations.empty?.favorites_title || "No favorites yet"
        : translations.empty?.mine_title || "No artworks yet";

    const description =
      mainTab === "favorites"
        ? translations.empty?.favorites_description ||
          "Explore the community and favorite artworks you love"
        : translations.empty?.mine_description ||
          "Start creating amazing anime art with our AI tools";

    const ctaText =
      mainTab === "favorites"
        ? translations.empty?.favorites_cta || "Browse Community"
        : translations.empty?.mine_cta || "Create Artwork";

    const ctaHref =
      mainTab === "favorites" ? "/community" : "/en/ai-action-figure-generator";

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ImageIcon className="mb-4 h-16 w-16 text-muted-foreground" />
        <h3 className="mb-2 text-xl font-semibold">{title}</h3>
        <p className="mb-6 text-muted-foreground max-w-md">{description}</p>
        <Button asChild>
          <Link href={ctaHref}>{ctaText}</Link>
        </Button>
      </div>
    );
  };

  const mainTabItems: Array<{ value: ArtworkMainTab; label: string }> = [
    { value: "mine", label: translations.tabs?.mine || "My Artworks" },
    { value: "favorites", label: translations.tabs?.favorites || "Favorites" },
  ];

  const typeTabItems: Array<{ value: ArtworkTypeTab; label: string }> = [
    { value: "all", label: translations.tabs?.all || "All" },
    { value: "image", label: translations.tabs?.images || "Images" },
    { value: "video", label: translations.tabs?.videos || "Videos" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-col gap-4">
        {/* Tab Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <FilterTabs
            value={mainTab}
            onValueChange={(val) => setMainTab(val as ArtworkMainTab)}
            items={mainTabItems}
          />
        </div>

        {/* Type selector */}
        <div className="flex justify-start">
          <FilterTabs
            value={typeTab}
            onValueChange={(val) => setTypeTab(val as ArtworkTypeTab)}
            items={typeTabItems}
          />
        </div>
      </div>

      {/* Content */}
      {currentTabState.isLoading && currentTabState.artworks.length === 0 ? (
        renderLoadingState()
      ) : currentTabState.error ? (
        renderErrorState()
      ) : currentTabState.artworks.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Artworks Masonry (Waterfall) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
            {currentTabState.artworks.map((artwork) => {
              if (mainTab === "favorites") {
                const preview: ArtworkPreview = {
                  id: artwork.uuid,
                  type: artwork.type === "image" ? "image" : "video",
                  title: artwork.title || "",
                  cover_url: artwork.thumbnail_url,
                  author: {
                    id: artwork.author?.id || "",
                    name: artwork.author?.name || "",
                    avatar: artwork.author?.avatar || "",
                    membership_level: artwork.author?.membership_level,
                    membership_display_name:
                      artwork.author?.membership_display_name,
                  },
                  stats: {
                    likes: artwork.like_count || 0,
                    views: 0,
                    comments: 0,
                    favorites: artwork.favorite_count || 0,
                  },
                  liked: artwork.liked,
                  favorited: artwork.favorited,
                  gen_type: artwork.gen_type || undefined,
                  model_id: artwork.model_id,
                  created_at: artwork.created_at,
                };
                return (
                  <div key={artwork.uuid}>
                    <CommunityArtworkCard
                      artwork={preview}
                      onOpen={() => {
                        setSelectedCommunityItem(preview);
                        handleCardClick(artwork);
                      }}
                      onToggleLike={handleToggleLike}
                      onToggleFavorite={handleToggleFavorite}
                      pageData={pageData}
                    />
                  </div>
                );
              }
              return (
                <div key={artwork.uuid}>
                  <MineArtworkCard
                    artwork={artwork}
                    onClick={() => handleCardClick(artwork)}
                    onToggleLike={handleToggleLike}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleVisibility={handleToggleVisibility}
                    pageData={pageData}
                  />
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {currentTabState.pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <ArtworksPagination
                pagination={currentTabState.pagination}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {/* Preview Dialogs */}
      {selectedImageUuid && mainTab === "mine" && (
        <ImagePreviewDialog
          open={isPreviewOpen && selectedImageUuid !== null}
          generationImageUuid={selectedImageUuid}
          onOpenChange={handlePreviewClose}
          pageData={pageData}
          canDelete={true}
          onReuseParameters={handleReuseParameters}
          onCreateNew={handleCreateNew}
        />
      )}

      {selectedVideoUuid && mainTab === "mine" && (
        <VideoPreviewDialog
          open={isPreviewOpen && selectedVideoUuid !== null}
          generationVideoUuid={selectedVideoUuid}
          onOpenChange={handlePreviewClose}
          pageData={pageData}
          canDelete={true}
        />
      )}

      {/* Favorites detail (community) */}
      {selectedCommunityId && mainTab === "favorites" && (
        <CommunityArtworkDetailModal
          open={isPreviewOpen}
          artworkId={selectedCommunityId}
          listItem={selectedCommunityItem || undefined}
          onClose={() => handlePreviewClose(false)}
          onToggleLike={handleToggleLike}
          onToggleFavorite={handleToggleFavorite}
          pageData={pageData}
        />
      )}
    </div>
  );
}
