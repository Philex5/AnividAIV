"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArtworkDetailModal } from "@/components/community/detail/ArtworkDetailModal";
import { ArtworkVideoMedia } from "@/components/community/cards/ArtworkVideoMedia";
import { getCommunityPageClient } from "@/services/page-client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVideoPreviewLoad } from "@/hooks/useVideoPreviewLoad";
import { Play } from "lucide-react";
import type { CharacterDetailPage } from "@/types/pages/landing";
import type { ArtworkPreview, ArtworkType } from "@/types/pages/community";
import { getLogoUrl } from "@/lib/asset-loader";
import {
  getGenTypeWhitelist,
  normalizeGenType,
} from "@/configs/gen-type-display";

interface Generation {
  id: number;
  uuid: string;
  type: string;
  image_url?: string;
  thumbnail_desktop?: string;
  thumbnail_mobile?: string;
  thumbnail_detail?: string;
  gen_type?: string;
  style?: string;
  video_url?: string;
  poster_url?: string;
  duration_seconds?: number;
  created_at: Date;
}

interface OCCreationsProps {
  characterUuid: string;
  pageData: CharacterDetailPage;
  locale: string;
  initialCreations?: Record<string, Generation[]>;
}

interface CreationMediaCardProps {
  creation: Generation;
  thumbnailUrl: string | null;
  typeLabel: string;
  onOpen: () => void;
}

function CreationMediaCard({
  creation,
  thumbnailUrl,
  typeLabel,
  onOpen,
}: CreationMediaCardProps) {
  const isVideo = creation.type === "video";
  const hasVideoSource = isVideo && Boolean(creation.video_url);
  const preview = useVideoPreviewLoad({
    enabled: hasVideoSource,
    sources: creation.video_url ? [creation.video_url] : [],
    identity: creation.uuid,
  });

  if (!isVideo && !thumbnailUrl) {
    return null;
  }

  return (
    <div className="break-inside-avoid">
      <div
        className="relative rounded-2xl overflow-hidden bg-muted shadow-none transition-all duration-300 cursor-pointer group"
        onClick={() => {
          if (hasVideoSource) {
            preview.stopPreview();
          }
          onOpen();
        }}
        onMouseEnter={() => {
          if (hasVideoSource) {
            preview.startPreview();
          }
        }}
        onMouseLeave={() => {
          if (hasVideoSource) {
            preview.stopPreview();
          }
        }}
      >
        {isVideo && hasVideoSource ? (
          <ArtworkVideoMedia
            containerRef={preview.containerRef}
            videoRef={preview.videoRef}
            title="Video artwork preview"
            poster={thumbnailUrl || undefined}
            sources={preview.validSources}
            preload={preview.shouldLoadMetadata ? "metadata" : "none"}
            isLoading={preview.isLoading}
            isReady={preview.isReady}
            isPreviewing={preview.isPreviewing}
            errorMessage={preview.errorMessage}
            onMouseEnter={preview.startPreview}
            onMouseLeave={preview.stopPreview}
            onPlayClick={preview.startPreview}
            onRetry={preview.retryLoad}
            durationLabel={
              creation.duration_seconds ? `${creation.duration_seconds}s` : null
            }
          />
        ) : (
          <Image
            src={thumbnailUrl!}
            alt={`${typeLabel} creation`}
            width={400}
            height={400}
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </div>
  );
}

export function OCCreations({
  characterUuid,
  pageData,
  locale,
  initialCreations,
}: OCCreationsProps) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(!initialCreations);
  const [creations, setCreations] = useState<Record<string, Generation[]>>(
    initialCreations || {},
  );
  const [selectedTab, setSelectedTab] = useState("all");

  // 弹窗状态
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(
    null,
  );
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkPreview | null>(
    null,
  );
  const [communityPageData, setCommunityPageData] = useState<any>(null);

  const imageGenTypeWhitelist = useMemo(
    () => new Set(getGenTypeWhitelist("characterDetail", "image")),
    [],
  );
  const videoGenTypeWhitelist = useMemo(
    () => new Set(getGenTypeWhitelist("characterDetail", "video")),
    [],
  );

  const applyGenTypeWhitelist = useCallback(
    (byType: Record<string, Generation[]>) => {
      const next: Record<string, Generation[]> = {};
      for (const [key, items] of Object.entries(byType)) {
        if (key === "image") {
          const filtered = items.filter((item) => {
            const normalized = normalizeGenType(item.gen_type);
            return normalized ? imageGenTypeWhitelist.has(normalized) : false;
          });
          if (filtered.length) next[key] = filtered;
          continue;
        }
        if (key === "video") {
          const filtered = items.filter((item) => {
            const normalized = normalizeGenType(item.gen_type);
            return normalized ? videoGenTypeWhitelist.has(normalized) : false;
          });
          if (filtered.length) next[key] = filtered;
          continue;
        }
        next[key] = items;
      }
      return next;
    },
    [imageGenTypeWhitelist, videoGenTypeWhitelist],
  );

  useEffect(() => {
    if (initialCreations) {
      const filtered = applyGenTypeWhitelist(initialCreations);
      setCreations(filtered);
      setLoading(false);
      return;
    }

    async function fetchCreations() {
      try {
        console.log(
          "[OCCreations] Fetching creations for character:",
          characterUuid,
        );

        const response = await fetch(
          `/api/characters/${characterUuid}/creations`,
        );

        console.log("[OCCreations] Response status:", response.status);

        if (!response.ok) {
          console.error(
            "[OCCreations] Response not ok:",
            response.status,
            response.statusText,
          );
          throw new Error("Failed to fetch creations");
        }

        const data = await response.json();
        console.log("[OCCreations] Received data:", {
          success: data.success,
          hasData: !!data.data,
          byType: data.data?.byType,
          keys: data.data?.byType ? Object.keys(data.data.byType) : [],
        });

        if (data.success && data.data) {
          const filtered = applyGenTypeWhitelist(data.data.byType || {});
          setCreations(filtered);
          console.log("[OCCreations] Set creations:", data.data.byType);
        } else {
          console.warn("[OCCreations] No data in response");
        }
      } catch (error) {
        console.error("[OCCreations] Error fetching creations:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCreations();
  }, [applyGenTypeWhitelist, characterUuid, initialCreations]);


  // 获取 community 页面数据
  useEffect(() => {
    async function fetchCommunityPageData() {
      try {
        const data = await getCommunityPageClient(locale);
        setCommunityPageData(data);
      } catch (error) {
        console.error("Failed to load community page data:", error);
      }
    }

    fetchCommunityPageData();
  }, [locale]);

  useEffect(() => {
    if (selectedTab === "all") return;
    const availableTypes = Object.keys(creations);
    if (availableTypes.includes(selectedTab)) return;
    setSelectedTab("all");
  }, [selectedTab, creations]);

  const types = Object.keys(creations);
  const hasCreations = types.length > 0;

  // 转换 Generation 为 ArtworkPreview
  const convertToArtworkPreview = useCallback(
    (generation: Generation, type: ArtworkType): ArtworkPreview => {
      const imageUrl = generation.image_url || generation.video_url || "";
      return {
        id: generation.uuid,
        type: type,
        title: `${type === "image" ? "Image" : "Video"} Creation`,
        cover_url: imageUrl,
        media_urls: [imageUrl],
        author: {
          id: "system",
          name: "AnividAI",
          avatar: getLogoUrl(),
        },
        stats: {
          likes: 0,
          views: 0,
          comments: 0,
          favorites: 0,
        },
        meta: {
          gen_type: generation.gen_type,
          style: generation.style,
        },
        liked: false,
        favorited: false,
        created_at: generation.created_at?.toString(),
      };
    },
    [],
  );

  // 获取缩略图 URL
  const getThumbnailUrl = (creation: Generation): string | null => {
    // 视频类型优先使用 poster_url，如果没有则返回 null（但仍可能显示视频）
    if (creation.type === "video") {
      const url = creation.poster_url || creation.image_url;
      return url && url.trim() !== "" ? url : null;
    }

    // 图片类型使用缩略图或原图
    const url = isMobile
      ? creation.thumbnail_mobile ||
        creation.thumbnail_desktop ||
        creation.image_url
      : creation.thumbnail_desktop || creation.image_url;

    // Return null if URL is empty or invalid
    return url && url.trim() !== "" ? url : null;
  };

  // 打开详情弹窗
  const handleOpenDetail = useCallback(
    (generation: Generation, type: ArtworkType) => {
      const artwork = convertToArtworkPreview(generation, type);
      setSelectedArtworkId(artwork.id);
      setSelectedArtwork(artwork);
      setDetailOpen(true);
    },
    [convertToArtworkPreview],
  );

  // 关闭详情弹窗
  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedArtworkId(null);
    setSelectedArtwork(null);
  }, []);

  // 更新交互状态
  const updateInteraction = useCallback(
    async (action: "like" | "favorite", id: string, enabled: boolean) => {
      const artworkType = "image"; // 默认类型，实际项目中可能需要从数据中获取

      const response = await fetch(
        `/api/community/artworks/${id}/${action}?type=${artworkType}`,
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

  // 处理点赞
  const handleToggleLike = useCallback(
    async (id: string, target: boolean) => {
      try {
        await updateInteraction("like", id, target);
      } catch (error) {
        console.error("Toggle like failed:", error);
        toast.error(communityPageData?.toasts?.likeFailed || "");
        throw error;
      }
    },
    [updateInteraction, communityPageData],
  );

  // 处理收藏
  const handleToggleFavorite = useCallback(
    async (id: string, target: boolean) => {
      try {
        await updateInteraction("favorite", id, target);
      } catch (error) {
        console.error("Toggle favorite failed:", error);
        toast.error(
          communityPageData?.toasts?.favoriteFailed || "",
        );
        throw error;
      }
    },
    [updateInteraction, communityPageData],
  );

  // 处理分享
  const handleShare = useCallback(
    async (artwork: ArtworkPreview) => {
      try {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const artworkType = artwork.type === "oc" ? "character" : artwork.type;
        const urlPath = `/community?artwork=${artwork.id}&artworkType=${artworkType}`;
        const shareUrl = origin ? `${origin}${urlPath}` : urlPath;
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          toast.success(
            communityPageData?.toasts?.copySuccess || "",
          );
        } else {
          throw new Error("Clipboard not available");
        }
      } catch (error) {
        console.log("Share failed:", error);
        toast.error(
          communityPageData?.toasts?.copyFailed || "",
        );
      }
    },
    [communityPageData],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border-none shadow-none overflow-hidden bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold font-display tracking-tight">
            <h2 className="text-2xl font-bold font-display tracking-tight">
              {pageData.creations?.title || ""}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-square rounded-2xl shadow-none"
              />
            ))}
          </div>
        </CardContent>
      </div>
    );
  }

  if (!hasCreations) {
    return (
      <div className="rounded-2xl border-none shadow-none overflow-hidden bg-muted/20 pt-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold font-display tracking-tight">
            <h2 className="text-2xl font-bold font-display tracking-tight">
              {pageData.creations?.title || ""}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Play className="size-6 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium">
              {pageData.creations?.no_creations || ""}
            </p>
          </div>
        </CardContent>
      </div>
    );
  }

  const allCreations = Object.values(creations).flat();

  return (
    <>
      <div className="rounded-2xl border-none shadow-none overflow-hidden bg-transparent mt-16">
        <CardHeader className="pb-4 px-0">
          <CardTitle className="text-2xl font-bold font-display tracking-tight">
            <h2 className="text-2xl font-bold font-display tracking-tight">
              {pageData.creations?.title || ""}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="w-full"
          >
            <TabsList className="mb-6 h-auto p-1 gap-1 rounded-full border-none shadow-none flex-wrap sm:flex-nowrap justify-start bg-muted/30">
              <TabsTrigger
                value="all"
                className="rounded-full px-5 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
              >
                {pageData.creations?.all || ""}
                <span className="ml-1.5 opacity-60 text-xs">
                  {allCreations.length}
                </span>
              </TabsTrigger>
              {types.map((type) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="rounded-full px-5 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
                >
                  {(pageData.creations as any)?.[type] || type}
                  <span className="ml-1.5 opacity-60 text-xs">
                    {creations[type].length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="max-h-150 lg:max-h-200 overflow-y-auto pr-2 scrollbar-hide">
              <TabsContent
                value="all"
                className="mt-0 focus-visible:outline-none"
              >
                <div className="columns-2 md:columns-4 2xl:columns-5 gap-4 space-y-4">
                  {allCreations.map((creation) => {
                    const thumbnailUrl = getThumbnailUrl(creation);
                    const artworkType: ArtworkType =
                      creation.type === "video" ? "video" : "image";
                    return (
                      <CreationMediaCard
                        key={creation.uuid}
                        creation={creation}
                        thumbnailUrl={thumbnailUrl}
                        typeLabel="Character"
                        onOpen={() => handleOpenDetail(creation, artworkType)}
                      />
                    );
                  })}
                </div>
              </TabsContent>

              {types.map((type) => (
                <TabsContent
                  key={type}
                  value={type}
                  className="mt-0 focus-visible:outline-none"
                >
                  <div className="columns-2 md:columns-4 2xl:columns-5 gap-4 space-y-4">
                    {creations[type].map((creation) => {
                      const thumbnailUrl = getThumbnailUrl(creation);
                      const artworkType: ArtworkType =
                        creation.type === "video" ? "video" : "image";
                      return (
                        <CreationMediaCard
                          key={creation.uuid}
                          creation={creation}
                          thumbnailUrl={thumbnailUrl}
                          typeLabel={type}
                          onOpen={() => handleOpenDetail(creation, artworkType)}
                        />
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </div>

      {/* 详情弹窗 */}
      {communityPageData && (
        <ArtworkDetailModal
          open={detailOpen}
          artworkId={selectedArtworkId}
          listItem={selectedArtwork || undefined}
          onClose={handleCloseDetail}
          onToggleLike={handleToggleLike}
          onToggleFavorite={handleToggleFavorite}
          onShare={handleShare}
          pageData={communityPageData}
        />
      )}
    </>
  );
}
