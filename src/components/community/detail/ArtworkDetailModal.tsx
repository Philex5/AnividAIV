"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Loader2, Copy, Heart, Bookmark } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

import { OcDetailContent } from "@/components/community/detail/OcDetailContent";
import ShareMenu from "@/components/character-detail/ShareMenu";
import { CommentSection } from "@/components/community/comment/CommentSection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAllConfigs } from "@/lib/hooks/useConfigs";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import type {
  ArtworkCharacter,
  ArtworkDetail,
  ArtworkPreview,
  ArtworkType,
  CommunityPage,
} from "@/types/pages/community";
import type { ShareContent } from "@/types/share";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { displayTypeToApiParam } from "@/lib/artwork-types";
import { assetLoader } from "@/lib/asset-loader";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";

export interface ArtworkDetailModalProps {
  open: boolean;
  artworkId: string | null;
  listItem?: ArtworkPreview;
  onClose: () => void;
  onToggleLike: (id: string, target: boolean) => Promise<void>;
  onToggleFavorite: (id: string, target: boolean) => Promise<void>;
  onShare?: (artwork: ArtworkPreview) => Promise<void>;
  pageData: CommunityPage;
}

function convertPreviewToDetail(
  preview: ArtworkPreview | undefined | null
): ArtworkDetail | null {
  if (!preview) return null;
  return {
    ...preview,
    description: preview.description ?? "",
    prompt: preview.prompt ?? "",
  };
}

// Parse artwork ID to get type and UUID (now directly from uuid)
function parseArtworkId(
  id: string,
  listItem?: ArtworkPreview
): { sourceUuid: string; artworkType: "image" | "video" | "character" } | null {
  // If we have a listItem, we can get the type from it
  if (listItem?.type) {
    // Use the new unified type conversion utility
    const normalizedType = normalizeDisplayType(listItem.type);
    const artworkType = displayTypeToApiParam(normalizedType);
    return {
      sourceUuid: id,
      artworkType: artworkType as "image" | "video" | "character",
    };
  }

  // Fallback: try to infer from the context or use default
  return {
    sourceUuid: id,
    artworkType: "image", // default fallback
  };
}

// Normalize display type to ensure consistency
function normalizeDisplayType(type: string): "image" | "video" | "oc" {
  const normalized = type.toLowerCase().trim();
  if (normalized === "image" || normalized === "video" || normalized === "oc") {
    return normalized;
  }
  return "image"; // default fallback
}

export function ArtworkDetailModal({
  open,
  artworkId,
  listItem,
  onClose,
  onToggleLike,
  onToggleFavorite,
  onShare,
  pageData,
}: ArtworkDetailModalProps) {
  const [detail, setDetail] = useState<ArtworkDetail | null>(() =>
    convertPreviewToDetail(listItem)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { models, styles, loading: modelsLoading } = useAllConfigs();
  const tAnimeStyles = useTranslations("");
  const locale = useLocale();
  const authorAvatarInput =
    detail?.author?.avatar ?? listItem?.author?.avatar ?? "";
  const { displayUrl: authorAvatarUrl } = useResolvedImageUrl(
    authorAvatarInput,
  );

  // 使用 useRequireAuth Hook 处理认证检查
  const { requireAuth } = useRequireAuth();

  // 获取样式的显示名称（优先使用国际化翻译）
  const getStyleDisplayName = useCallback(
    (styleKey: string) => {
      if (!styles || modelsLoading) return styleKey;

      const style = styles.find(
        (s) => s.uuid === styleKey || s.key === styleKey
      );
      if (style?.i18n_name_key) {
        const translatedName = tAnimeStyles(style.i18n_name_key);
        if (translatedName && translatedName !== style.i18n_name_key) {
          return translatedName;
        }
      }
      return style?.name || styleKey;
    },
    [styles, modelsLoading, tAnimeStyles]
  );

  useEffect(() => {
    if (!open || !artworkId) {
      setDetail(null);
      setError(null);
      return;
    }

    const fallbackDetail = convertPreviewToDetail(listItem);
    if (fallbackDetail) {
      setDetail((prev) =>
        !prev || prev.id !== fallbackDetail.id ? fallbackDetail : prev
      );
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const loadDetail = async () => {
      try {
        // Parse the ID to get UUID and type directly
        const parsed = parseArtworkId(artworkId, listItem);
        if (!parsed) {
          throw new Error("Invalid artwork ID");
        }

        const { sourceUuid, artworkType } = parsed;

        const response = await fetch(
          `/api/community/artworks/${sourceUuid}?artworkType=${artworkType}`,
          {
            method: "GET",
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const result = (await response.json()) as {
          code: number;
          data?: ArtworkDetail;
        };
        if (result.code !== 0 || !result.data) {
          throw new Error("Invalid artwork detail response");
        }
        const data = result.data;
        setDetail(() => ({
          ...data,
          liked: listItem?.liked ?? data.liked ?? false,
          favorited: listItem?.favorited ?? data.favorited ?? false,
          stats: listItem ? { ...listItem.stats } : { ...data.stats },
        }));
      } catch (err) {
        if (controller.signal.aborted) return;
        console.log("Artwork detail load failed:", err);
        setError(
          (pageData as any)?.states?.loadFailed || "Failed to load artwork"
        );
        toast.error(
          (pageData as any)?.toasts?.detailFailed ||
            "Failed to load artwork details"
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      controller.abort();
    };
  }, [open, artworkId, listItem, pageData]);

  useEffect(() => {
    if (!detail || !listItem || detail.id !== listItem.id) return;
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            stats: { ...listItem.stats },
            liked: listItem.liked,
            favorited: listItem.favorited,
          }
        : prev
    );
  }, [
    detail?.id,
    listItem?.id,
    listItem?.stats.likes,
    listItem?.stats.views,
    listItem?.stats.comments,
    listItem?.liked,
    listItem?.favorited,
  ]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // 使用 requireAuth 包装点赞处理函数
  const handleLike = requireAuth(async () => {
    if (!detail) return;
    const next = !Boolean(detail.liked);
    try {
      await onToggleLike(detail.id, next);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              liked: next,
              stats: {
                ...prev.stats,
                likes: Math.max(prev.stats.likes + (next ? 1 : -1), 0),
              },
            }
          : prev
      );
    } catch (err) {
      console.log("Toggle like failed:", err);
    }
  });

  // 使用 requireAuth 包装收藏处理函数
  const handleFavorite = requireAuth(async () => {
    if (!detail) return;
    const next = !Boolean(detail.favorited);
    try {
      await onToggleFavorite(detail.id, next);
      setDetail((prev) => (prev ? { ...prev, favorited: next } : prev));
    } catch (err) {
      console.log("Toggle favorite failed:", err);
    }
  });

  const type: ArtworkType | undefined = detail?.type ?? listItem?.type;

  // 构建分享内容
  const shareContent: ShareContent | null = (() => {
    const source = detail ?? listItem;
    if (!source) return null;

    // Convert display type to API type for sharing
    const typeMap: Record<string, "image" | "video" | "character"> = {
      image: "image",
      video: "video",
      oc: "character",
    };
    const apiType = typeMap[source.type] || "image";

    return {
      type: apiType,
      id: source.id,
      title: source.title,
      text: source.description || source.prompt,
      imageUrl: source.cover_url || source.media_urls?.[0],
    };
  })();

  const modelDisplay = useMemo(() => {
    const modelId = detail?.model_id || listItem?.model_id || "";
    if (modelsLoading || !modelId) {
      return detail?.model_name || listItem?.model_name || modelId || "—";
    }
    const matched = models.find((model) => model.model_id === modelId);
    return matched ? matched.name : detail?.model_name || modelId || "—";
  }, [
    detail?.model_id,
    detail?.model_name,
    listItem?.model_id,
    listItem?.model_name,
    models,
    modelsLoading,
  ]);

  const membershipInfo = useMemo(() => {
    const rawLevel =
      detail?.author?.membership_level ??
      listItem?.author?.membership_level ??
      ((detail?.meta as any)?.author_membership_level as string | undefined);

    const normalizedLevel = rawLevel?.trim().toLowerCase();
    if (!normalizedLevel || normalizedLevel === "free") {
      return {
        level: null as string | null,
        displayName: null as string | null,
      };
    }

    const explicitDisplay =
      detail?.author?.membership_display_name ??
      listItem?.author?.membership_display_name ??
      ((detail?.meta as any)?.author_membership_display_name as
        | string
        | undefined) ??
      null;

    if (explicitDisplay) {
      return { level: normalizedLevel, displayName: explicitDisplay };
    }

    const displayMap: Record<string, string> = {
      pro: "Pro Member",
      basic: "Basic Member",
      plus: "Plus Member",
      premium: "Premium Member",
      vip: "VIP Member",
      enterprise: "Enterprise Member",
    };
    const label =
      displayMap[normalizedLevel] ||
      `${normalizedLevel.charAt(0).toUpperCase()}${normalizedLevel.slice(1)} Member`;
    return { level: normalizedLevel, displayName: `AnividAI ${label}` };
  }, [
    detail?.author?.membership_display_name,
    detail?.author?.membership_level,
    detail?.meta,
    listItem?.author?.membership_display_name,
    listItem?.author?.membership_level,
  ]);

  const membershipBadge = useMemo(() => {
    if (!membershipInfo.level || !membershipInfo.displayName) return null;
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center shrink-0">
              <Image
                src={assetLoader.getMemberBadgeUrl(membershipInfo.level)}
                alt={membershipInfo.displayName}
                width={20}
                height={20}
                className="h-5 w-5 sm:h-4 sm:w-4"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <span>{membershipInfo.displayName}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }, [membershipInfo.displayName, membershipInfo.level]);

  const characters = useMemo<ArtworkCharacter[]>(() => {
    const source =
      detail?.characters ||
      listItem?.characters ||
      ((detail?.meta as any)?.characters as ArtworkCharacter[] | undefined);
    if (!Array.isArray(source)) return [];
    return source
      .map((item) => {
        if (!item) return null;
        return {
          uuid: item.uuid ?? "",
          name: item.name ?? "",
          avatar_url: item.avatar_url ?? "",
        };
      })
      .filter((item): item is ArtworkCharacter =>
        Boolean(item?.uuid || item?.name || item?.avatar_url)
      );
  }, [detail?.characters, detail?.meta, listItem?.characters]);

  const createdAtDisplay =
    detail?.created_at ||
    listItem?.created_at ||
    (detail?.meta as any)?.created_at ||
    "—";

  // 使用 original_prompt，优先级: original_prompt > prompt > final_prompt
  const promptDisplay =
    detail?.original_prompt ||
    detail?.prompt ||
    listItem?.original_prompt ||
    listItem?.prompt ||
    detail?.final_prompt ||
    listItem?.final_prompt ||
    "";

  const mediaUrl =
    detail?.media_urls?.[0] ??
    listItem?.media_urls?.[0] ??
    detail?.cover_url ??
    listItem?.cover_url;

  const renderMedia = (): ReactNode => {
    if (isLoading && !mediaUrl) {
      return (
        <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>
            {pageData.detail?.loading ||
              pageData.states?.loading ||
              "Loading..."}
          </span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-sm text-destructive">{error}</div>
      );
    }

    if (type === "video") {
      return (
        <video
          controls
          poster={detail?.cover_url || listItem?.cover_url || undefined}
          className="h-full w-full max-h-full max-w-full rounded-lg border object-contain"
        >
          {(detail?.media_urls ?? listItem?.media_urls ?? []).map((src) => (
            <source key={src} src={src} />
          ))}
        </video>
      );
    }

    if (mediaUrl) {
      return (
        <img
          src={assetLoader.getImageUrl(mediaUrl)}
          alt={detail?.title || listItem?.title || "Artwork"}
          className="h-full w-full max-h-full max-w-full rounded-lg border object-contain"
        />
      );
    }

    return (
      <div className="text-center text-sm text-muted-foreground">
        {pageData.detail?.empty?.description ||
          pageData.states?.noResults ||
          "No media available"}
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="flex max-h-[92vh] sm:max-h-[88vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0 lg:max-w-[900px] lg:flex-row"
        onInteractOutside={() => {
          handleClose();
        }}
        onEscapeKeyDown={() => {
          handleClose();
        }}
      >
        <DialogTitle className="sr-only">
          {detail?.title || listItem?.title || ""}
        </DialogTitle>

        {/* 图片展示区 */}
        <div className="relative flex h-[45vh] sm:h-[50vh] md:h-[55vh] min-w-0 w-full bg-muted/40 p-2 sm:p-3 lg:min-h-0 lg:h-auto lg:flex-1 lg:w-1/2 lg:items-center lg:justify-center">
          <div className="relative w-full h-full flex flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
              {renderMedia()}
            </div>

            {/* gen_type badge - 位于媒体展示区右上角 */}
            {(detail?.gen_type || listItem?.gen_type) && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
                <span className="inline-flex items-center rounded-full bg-muted/90 text-foreground text-xs px-3 py-1 border border-border/60 shadow-sm">
                  {(detail?.gen_type || listItem?.gen_type || "").replace(
                    /_/g,
                    " "
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 信息与操作区 */}
        <div className="w-full flex-1 space-y-3 sm:space-y-4 lg:space-y-6 overflow-y-auto border-t p-4 sm:p-5 lg:min-h-0 lg:max-h-full lg:w-1/2 lg:flex-none lg:border-t-0 lg:border-l">
          {/* OC类型专属布局 */}
          {type === "oc" ? (
            <>
              {/* 顶部：作者信息 + 社交按钮 */}
              <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href={`/${locale}/user/${detail?.author?.id ?? listItem?.author?.id ?? ""}`}
                    className="flex items-center gap-2 sm:gap-3"
                  >
                    <Avatar className="size-9 sm:size-10 border">
                      {(detail?.author?.avatar ?? listItem?.author?.avatar) ? (
                        <AvatarImage
                          src={
                            authorAvatarUrl ||
                            assetLoader.getImageUrl(
                              detail?.author?.avatar ?? listItem?.author?.avatar
                            )
                          }
                          alt={
                            detail?.author?.name ?? listItem?.author?.name ?? ""
                          }
                        />
                      ) : null}
                      <AvatarFallback>
                        {(detail?.author?.name ?? listItem?.author?.name ?? "")
                          .split(" ")
                          .filter(Boolean)
                          .map((part) => part[0]?.toUpperCase())
                          .join("")
                          .slice(0, 2) || "AN"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold leading-none">
                          {detail?.author?.name ?? listItem?.author?.name ?? ""}
                        </p>
                        {/* 会员Badge - 在用户名右侧 */}
                        {membershipBadge}
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleLike}
                    aria-label="Like"
                    className={cn(
                      "h-9 w-9 sm:h-8 sm:w-8 hover:bg-accent",
                      (detail?.liked ?? listItem?.liked) ? "text-red-500" : ""
                    )}
                  >
                    <Heart
                      className="h-5 w-5 sm:h-5 sm:w-5"
                      aria-hidden="true"
                      fill={
                        (detail?.liked ?? listItem?.liked)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </Button>
                  <span className="text-sm sm:text-xs text-muted-foreground min-w-[1.25rem] sm:min-w-[1rem] text-center">
                    {detail?.stats.likes ?? listItem?.stats.likes}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleFavorite}
                    aria-label="Favorite"
                    className={cn(
                      "h-9 w-9 sm:h-8 sm:w-8 hover:bg-accent",
                      (detail?.favorited ?? listItem?.favorited)
                        ? "text-yellow-500"
                        : ""
                    )}
                  >
                    <Bookmark
                      className="h-5 w-5 sm:h-5 sm:w-5"
                      aria-hidden="true"
                      fill={
                        (detail?.favorited ?? listItem?.favorited)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </Button>

                  {shareContent && (
                    <div className="relative z-[100001]">
                      <ShareMenu
                        content={shareContent}
                        variant="menu"
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* OC详情内容 */}
              <OcDetailContent
                detail={detail}
                listItem={listItem}
                onClose={handleClose}
                pageData={pageData}
              />

              {/* Comments Section */}
              {artworkId && (
                <div className="mt-8 border-t pt-6">
                  <CommentSection
                    artId={artworkId}
                    artType={
                      (listItem?.type === "oc" || type === "oc")
                        ? "character"
                        : (type === "video" ? "video" : "image")
                    }
                    commentCount={detail?.stats.comments ?? listItem?.stats.comments ?? 0}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* 非OC类型保持原有布局 */}
              {/* 顶部：作者信息 + 社交按钮 */}
              <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href={`/${locale}/user/${detail?.author?.id ?? listItem?.author?.id ?? ""}`}
                    className="flex items-center gap-2 sm:gap-3"
                  >
                    <Avatar className="size-9 sm:size-10 border">
                      {(detail?.author?.avatar ?? listItem?.author?.avatar) ? (
                        <AvatarImage
                          src={
                            authorAvatarUrl ||
                            assetLoader.getImageUrl(
                              detail?.author?.avatar ?? listItem?.author?.avatar
                            )
                          }
                          alt={
                            detail?.author?.name ?? listItem?.author?.name ?? ""
                          }
                        />
                      ) : null}
                      <AvatarFallback>
                        {(detail?.author?.name ?? listItem?.author?.name ?? "")
                          .split(" ")
                          .filter(Boolean)
                          .map((part) => part[0]?.toUpperCase())
                          .join("")
                          .slice(0, 2) || "AN"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold leading-none">
                          {detail?.author?.name ?? listItem?.author?.name ?? ""}
                        </p>
                        {/* 会员Badge - 在用户名右侧 */}
                        {membershipBadge}
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleLike}
                    aria-label="Like"
                    className={cn(
                      "h-9 w-9 sm:h-8 sm:w-8 hover:bg-accent",
                      (detail?.liked ?? listItem?.liked) ? "text-red-500" : ""
                    )}
                  >
                    <Heart
                      className="h-5 w-5 sm:h-5 sm:w-5"
                      aria-hidden="true"
                      fill={
                        (detail?.liked ?? listItem?.liked)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </Button>
                  <span className="text-sm sm:text-xs text-muted-foreground min-w-[1.25rem] sm:min-w-[1rem] text-center">
                    {detail?.stats.likes ?? listItem?.stats.likes}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleFavorite}
                    aria-label="Favorite"
                    className={cn(
                      "h-9 w-9 sm:h-8 sm:w-8 hover:bg-accent",
                      (detail?.favorited ?? listItem?.favorited)
                        ? "text-yellow-500"
                        : ""
                    )}
                  >
                    <Bookmark
                      className="h-5 w-5 sm:h-5 sm:w-5"
                      aria-hidden="true"
                      fill={
                        (detail?.favorited ?? listItem?.favorited)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </Button>

                  {shareContent && (
                    <div className="relative z-[100001]">
                      <ShareMenu
                        content={shareContent}
                        variant="menu"
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 元信息 */}
              <div className="space-y-2 sm:space-y-3 text-sm">
                {/* 模型和 Style 参数 - 同一排显示 */}
                {(() => {
                  const stylePreset =
                    (detail?.meta as any)?.style_preset ||
                    (listItem?.meta as any)?.style_preset ||
                    "";
                  const styleDisplayName = getStyleDisplayName(stylePreset);
                  const showStyle =
                    stylePreset &&
                    styleDisplayName &&
                    styleDisplayName !== stylePreset;

                  return (
                    <div className={showStyle ? "grid grid-cols-2 gap-4" : ""}>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">
                          {(pageData as any)?.detail?.meta?.model ||
                            (pageData as any)?.meta?.model ||
                            "MODEL"}
                        </p>
                        <p className="text-base font-medium text-foreground">
                          {modelDisplay}
                        </p>
                      </div>
                      {showStyle && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase text-muted-foreground">
                            {(pageData as any)?.detail?.meta?.style ||
                              (pageData as any)?.meta?.style ||
                              "STYLE"}
                          </p>
                          <p className="text-base font-medium text-foreground">
                            {styleDisplayName}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* OC 角色 */}
                {characters.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">
                      {(pageData as any)?.detail?.meta?.characters ||
                        (pageData as any)?.meta?.characters ||
                        "OC"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {characters.map((char, idx) => (
                        <Link
                          key={char.uuid || idx}
                          href={`/${locale}/characters/${char.uuid}`}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="size-9 sm:size-10 border">
                            {char.avatar_url ? (
                              <AvatarImage
                                src={assetLoader.getImageUrl(char.avatar_url)}
                                alt={char.name}
                              />
                            ) : (
                              <AvatarFallback>
                                {(char.name || "OC").slice(0, 2)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 创建时间 */}
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">
                    {(pageData as any)?.detail?.meta?.created_at ||
                      (pageData as any)?.labels?.created_at ||
                      "CREATED AT"}
                  </p>
                  <p>{createdAtDisplay}</p>
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base sm:text-sm font-semibold">
                    {(pageData as any)?.detail?.prompt ||
                      (pageData as any)?.labels?.prompt ||
                      "PROMPT"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!promptDisplay) return;
                        try {
                          await navigator.clipboard.writeText(promptDisplay);
                          toast.success(
                            (pageData as any)?.toasts?.copySuccess ||
                              "Copied to clipboard"
                          );
                        } catch {
                          toast.error(
                            (pageData as any)?.toasts?.copyFailed ||
                              "Failed to copy"
                          );
                        }
                      }}
                      disabled={!promptDisplay}
                      aria-label="Copy prompt"
                      className="h-9 w-9 sm:h-8 sm:w-8"
                    >
                      <Copy className="h-5 w-5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 sm:p-4 max-h-48 overflow-auto text-sm leading-relaxed">
                  {promptDisplay || (
                    <span className="text-muted-foreground">
                      {(pageData as any)?.detail?.empty?.description ||
                        pageData.states?.noResults ||
                        "No prompt available"}
                    </span>
                  )}
                </div>

                {/* Comments Section */}
                {artworkId && (
                  <div className="mt-8 border-t pt-6">
                    <CommentSection
                      artId={artworkId}
                      artType={type === "video" ? "video" : "image"}
                      commentCount={detail?.stats.comments ?? listItem?.stats.comments ?? 0}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
