"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ShareMenu from "@/components/character-detail/ShareMenu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Download, RefreshCw, Trash2, Copy, Plus } from "lucide-react";
import { useAllConfigs } from "@/lib/hooks/useConfigs";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppContext } from "@/contexts/app";
import type { AnimeGeneratorPage } from "@/types/pages/landing";
import type { ShareContent } from "@/types/share";
import { SharePlatform } from "@/types/share";
import { cn } from "@/lib/utils";
import { getGeneratorUrl } from "@/lib/generation-type-validator";

const getApiPayload = <T,>(result: unknown): T | null => {
  if (!result || typeof result !== "object") {
    return null;
  }

  const maybeResult = result as {
    code?: number;
    success?: boolean;
    data?: T;
  };

  if (typeof maybeResult.code === "number") {
    return maybeResult.code === 0 && maybeResult.data
      ? maybeResult.data
      : null;
  }

  if (typeof maybeResult.success === "boolean") {
    return maybeResult.success && maybeResult.data ? maybeResult.data : null;
  }

  return maybeResult.data ?? null;
};

function formatDisplayDate(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (input: number) => input.toString().padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface CharacterSummary {
  uuid: string;
  name: string | null;
  avatar_url: string | null;
  visibility_level: string | null;
  user_uuid: string | null;
}

interface VideoVariant {
  quality: "720p" | "1080p" | "source";
  video_url: string;
  mime_type?: string;
}

interface GenerationSummary {
  uuid: string;
  prompt: string;
  model_id: string;
  style_preset: string | null;
  duration_seconds: number | null;
  resolution: "720p" | "1080p" | null;
  visibility_level: string | null;
  created_at: string | null;
}

interface VideoDetailResponse {
  uuid: string;
  poster_url: string | null;
  variants: VideoVariant[];
  created_at: string | null;
  visibility_level: "public" | "private";
  duration_seconds: number | null;
  resolution: string | null;
  ratio: string | null;
  style: string | null;
  final_prompt: string | null;
  original_prompt: string | null;
  gen_type?: string | null;
  generation: GenerationSummary;
  characters: CharacterSummary[];
}

interface VideoPreviewDialogProps {
  open: boolean;
  generationVideoUuid: string | null;
  onOpenChange: (open: boolean) => void;
  pageData: AnimeGeneratorPage;
  onReuseParameters?: (videoUuid: string) => Promise<void> | void;
  onCreateNew?: () => void;
  canDelete?: boolean;
}

export function VideoPreviewDialog({
  open,
  generationVideoUuid,
  onOpenChange,
  pageData,
  onReuseParameters,
  onCreateNew,
  canDelete = true,
}: VideoPreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoDetail, setVideoDetail] = useState<VideoDetailResponse | null>(
    null
  );
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isReusing, setIsReusing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeQuality, setActiveQuality] = useState<
    "1080p" | "720p" | "source"
  >("1080p");

  const { user: appUser, isLoadingUser } = useAppContext();

  // 使用useMemo计算用户是否为Pro会员
  const isUserSubscribed = useMemo(() => {
    if (isLoadingUser || !appUser) return false;
    if (!appUser.is_sub) return false;
    if (!appUser.sub_expired_at) return false;
    return new Date(appUser.sub_expired_at) > new Date();
  }, [appUser, isLoadingUser]);

  const videoRef = useRef<HTMLVideoElement>(null);

  const { models, styles, loading: modelsLoading } = useAllConfigs();
  const tAnimeStyles = useTranslations("");
  const t = useTranslations("");
  const locale = useLocale();
  const router = useRouter();

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

  // 获取模型名称
  const modelName = useMemo(() => {
    if (!videoDetail?.generation?.model_id || modelsLoading) {
      return videoDetail?.generation?.model_id || "";
    }
    const matched = models.find(
      (model) => model.model_id === videoDetail?.generation?.model_id
    );
    return matched ? matched.name : videoDetail?.generation?.model_id || "";
  }, [videoDetail?.generation?.model_id, models, modelsLoading]);

  // 选择最佳清晰度
  const pickVariant = useCallback(
    (variants: VideoVariant[], preferredQuality: string) => {
      if (!variants.length) return null;

      // 优先选择指定清晰度
      let variant = variants.find((v) => v.quality === preferredQuality);
      if (variant) return variant;

      // 回退策略：1080p -> 720p -> source
      const fallbackOrder = ["1080p", "720p", "source"];
      for (const quality of fallbackOrder) {
        variant = variants.find((v) => v.quality === quality);
        if (variant) return variant;
      }

      return variants[0];
    },
    []
  );

  const currentVariant = useMemo(() => {
    if (!videoDetail?.variants) return null;
    return pickVariant(videoDetail.variants, activeQuality);
  }, [videoDetail?.variants, activeQuality, pickVariant]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setVideoDetail(null);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    let abort = false;

    const fetchVideoDetail = async () => {
      if (!generationVideoUuid || !open) {
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/generation/video/${generationVideoUuid}`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        const payload = getApiPayload<VideoDetailResponse>(result);
        if (!payload?.uuid) {
          throw new Error("Invalid response payload");
        }
        if (!abort) {
          const data = payload;
          setVideoDetail(data);

          // 设置初始清晰度为最高可用
          if (data.variants.length > 0) {
            const bestQuality =
              pickVariant(data.variants, "1080p")?.quality ||
              data.variants[0].quality;
            setActiveQuality(bestQuality as "1080p" | "720p" | "source");
          }
        }
      } catch (err) {
        console.error("[VideoPreviewDialog] Failed to load video:", err);
        if (!abort) {
          setError(pageData.video_detail?.error ?? "Failed to load video");
        }
      } finally {
        if (!abort) {
          setIsLoading(false);
        }
      }
    };

    void fetchVideoDetail();

    return () => {
      abort = true;
    };
  }, [generationVideoUuid, open, pageData.video_detail?.error, pickVariant]);

  // 切换清晰度时保持播放时间
  useEffect(() => {
    if (videoRef.current && currentVariant) {
      const currentTime = videoRef.current.currentTime;
      const wasPaused = videoRef.current.paused;

      // 设置新的视频源
      videoRef.current.src = currentVariant.video_url;
      videoRef.current.currentTime = currentTime;

      if (!wasPaused) {
        videoRef.current.play().catch(() => {
          // 忽略自动播放失败
        });
      }
    }
  }, [currentVariant]);

  const handleCopyPrompt = useCallback(async () => {
    const promptText =
      videoDetail?.generation?.prompt ||
      videoDetail?.final_prompt ||
      videoDetail?.original_prompt;
    if (!promptText) return;

    try {
      await navigator.clipboard.writeText(promptText);
      const successMessage = pageData.video_detail?.prompt?.copied;
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch {
      const errorMessage = pageData.video_detail?.prompt?.failed;
      if (errorMessage) {
        toast.error(errorMessage);
      }
    }
  }, [videoDetail, pageData.video_detail?.prompt]);

  const handleDownload = useCallback(async () => {
    if (!currentVariant?.video_url) return;

    try {
      const response = await fetch(currentVariant.video_url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // 从mime_type推断扩展名
      const ext = currentVariant.mime_type?.includes("webm") ? "webm" : "mp4";
      link.download = `anime-${videoDetail?.uuid}-${activeQuality}.${ext}`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[VideoPreviewDialog] Download failed:", err);
      const errorMessage = pageData.video_detail?.actions?.download_error;
      if (errorMessage) {
        toast.error(errorMessage);
      }
    }
  }, [
    currentVariant,
    videoDetail?.uuid,
    activeQuality,
    pageData.video_detail?.actions,
  ]);

  const handleVisibilityUpdate = useCallback(
    async (nextLevel: "public" | "private") => {
      // 仍在加载用户信息时，不允许操作
      if (isLoadingUser) {
        return;
      }
      if (!isUserSubscribed) {
        return;
      }
      if (!videoDetail || videoDetail.visibility_level === nextLevel) {
        return;
      }
      setIsUpdatingVisibility(true);
      try {
        const response = await fetch(
          `/api/community/artworks/${videoDetail.uuid}/visibility?type=video`,
          {
            method: "PUT",
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        const payload = getApiPayload<{
          success?: boolean;
          visibility_level?: "public" | "private";
        }>(result);
        if (!payload) {
          throw new Error("Invalid response payload");
        }
        const updatedVisibility = payload.visibility_level || nextLevel;
        setVideoDetail((prev) =>
          prev
            ? {
                ...prev,
                visibility_level: updatedVisibility,
                generation: {
                  ...prev.generation,
                  visibility_level: updatedVisibility,
                },
              }
            : prev
        );
        const successMessage = pageData.video_detail?.visibility_toast?.success;
        if (successMessage) {
          toast.success(successMessage);
        }
      } catch (err) {
        console.error("[VideoPreviewDialog] Visibility update failed:", err);
        const errorMessage = pageData.video_detail?.visibility_toast?.error;
        if (errorMessage) {
          toast.error(errorMessage);
        }
      } finally {
        setIsUpdatingVisibility(false);
      }
    },
    [
      videoDetail,
      isUserSubscribed,
      isLoadingUser,
      pageData.video_detail?.visibility_toast?.error,
      pageData.video_detail?.visibility_toast?.success,
    ]
  );

  const handleReuse = useCallback(() => {
    if (!videoDetail?.uuid || !videoDetail?.gen_type) return;

    try {
      setIsReusing(true);
      const generatorUrl = getGeneratorUrl(videoDetail.gen_type);
      const targetUrl = `/${locale}${generatorUrl}?gen_video_id=${videoDetail.uuid}`;

      handleClose(false);
      router.push(targetUrl);
    } catch (err) {
      console.error("[VideoPreviewDialog] Reuse failed:", err);
      toast.error("Failed to navigate to generator");
    } finally {
      setIsReusing(false);
    }
  }, [videoDetail, locale, router]);

  const handleDelete = useCallback(async () => {
    if (!videoDetail?.uuid) return;
    const confirmText =
      (pageData as any)?.video_detail?.actions?.delete_confirm ||
      "Delete this video? This action cannot be undone.";
    const confirmed =
      typeof window !== "undefined" && window.confirm(confirmText);
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const resp = await fetch(`/api/generation/video/${videoDetail.uuid}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const successMessage =
        (pageData as any)?.video_detail?.actions?.delete_success ||
        "Video deleted successfully";
      toast.success(successMessage);
      handleClose(false);
    } catch (err) {
      console.error("[VideoPreviewDialog] Delete failed:", err);
      const errorMessage =
        (pageData as any)?.video_detail?.actions?.delete_failed ||
        "Failed to delete video";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [videoDetail?.uuid, pageData]);

  const characters = useMemo<CharacterSummary[]>(
    () => videoDetail?.characters ?? [],
    [videoDetail?.characters]
  );
  const shareCharacter = characters[0] ?? null;

  const createdAtText = useMemo(
    () => formatDisplayDate(videoDetail?.created_at ?? null),
    [videoDetail?.created_at]
  );

  const promptText =
    videoDetail?.generation?.prompt ||
    videoDetail?.final_prompt ||
    videoDetail?.original_prompt;

  const styleLabel = useMemo(() => {
    const rawStyle =
      videoDetail?.style || videoDetail?.generation?.style_preset || "";
    return rawStyle ? getStyleDisplayName(rawStyle) : "";
  }, [
    videoDetail?.style,
    videoDetail?.generation?.style_preset,
    getStyleDisplayName,
  ]);

  const visibilityOptions = useMemo(
    () => [
      {
        value: "public" as const,
        label: pageData.video_detail?.visibility?.public ?? "Public",
      },
      {
        value: "private" as const,
        label: pageData.video_detail?.visibility?.private ?? "Private",
      },
    ],
    [
      pageData.video_detail?.visibility?.private,
      pageData.video_detail?.visibility?.public,
    ]
  );

  // 可用清晰度选项
  const qualityOptions = useMemo(() => {
    if (!videoDetail?.variants) return [];
    return videoDetail.variants.map((v) => ({
      value: v.quality,
      label: pageData.video_detail?.quality?.[`q${v.quality}`] || v.quality,
    }));
  }, [videoDetail?.variants, pageData.video_detail?.quality]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[88vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0 lg:max-w-[900px]">
        <DialogTitle className="sr-only">
          {pageData.video_detail?.title ?? ""}
        </DialogTitle>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* 视频展示区 */}
          <div className="relative flex min-h-[200px] sm:min-h-[240px] md:min-h-[280px] min-w-0 w-full items-center justify-center bg-muted/40 p-2 sm:p-3 lg:min-h-0 lg:flex-1 lg:w-1/2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span>{pageData.video_detail?.loading ?? ""}</span>
              </div>
            ) : error ? (
              <div className="text-center text-sm text-destructive">
                {error}
              </div>
            ) : videoDetail && currentVariant ? (
              <div className="relative flex h-full w-full min-h-0 flex-col items-center gap-3">
                <div className="relative flex w-full min-h-0 flex-1 items-center justify-center">
                  <video
                    ref={videoRef}
                    key={currentVariant.video_url}
                    src={currentVariant.video_url}
                    poster={videoDetail.poster_url ?? undefined}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-auto max-h-full w-full rounded-lg border object-contain"
                  />

                  {/* gen_type badge - 位于视频右上角 */}
                  {videoDetail.gen_type && (
                    <div className="absolute right-2 top-2">
                      <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                        {videoDetail.gen_type.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* 清晰度切换 */}
                {qualityOptions.length > 1 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      {pageData.video_detail?.quality?.label || "Quality"}:
                    </span>
                    <Select
                      value={activeQuality}
                      onValueChange={(value) => setActiveQuality(value as any)}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {qualityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                {pageData.video_detail?.empty?.description ?? ""}
              </div>
            )}
          </div>

          {/* 信息与操作区 */}
          <div className="w-full min-h-0 flex-1 space-y-6 overflow-y-auto border-t p-6 lg:max-h-full lg:w-1/2 lg:flex-none lg:border-t-0 lg:border-l">
            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => {
                    onCreateNew?.();
                    handleClose(false);
                  }}
                  disabled={!onCreateNew}
                  aria-label={pageData.video_detail?.create_new ?? "Create new"}
                >
                  <Plus aria-hidden="true" className="h-5 w-5" />
                  <span className="sr-only">
                    {pageData.video_detail?.create_new ?? ""}
                  </span>
                </Button>

                {/* 构建视频分享内容 */}
                {videoDetail?.uuid ? (
                  <div className="relative z-[100001]">
                    <ShareMenu
                      content={{
                        type: "video",
                        id: videoDetail.uuid,
                        title:
                          videoDetail.generation?.prompt || "Generated Video",
                        text:
                          videoDetail.original_prompt || videoDetail.final_prompt || undefined,
                        imageUrl: videoDetail.poster_url ?? undefined,
                      }}
                      variant="menu"
                      size="sm"
                      options={{
                        platforms: [
                          SharePlatform.TWITTER,
                          SharePlatform.FACEBOOK,
                          SharePlatform.REDDIT,
                          SharePlatform.LINK,
                        ],
                      }}
                    />
                  </div>
                ) : (
                  <Button variant="outline" disabled>
                    {pageData.video_detail?.share ?? ""}
                  </Button>
                )}
              </div>

              <div className="flex items-center">
                <div
                  className={cn(
                    "inline-flex items-center rounded-full bg-muted p-1 shadow-inner",
                    !videoDetail ? "opacity-60" : ""
                  )}
                >
                  {visibilityOptions.map((option) => {
                    const isActive =
                      videoDetail?.visibility_level === option.value;
                    const isDisabled = isLoadingUser || !isUserSubscribed || isUpdatingVisibility || !videoDetail || isActive;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          "relative flex min-w-[96px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                          isActive
                            ? "bg-background text-foreground shadow-sm"
                            : isDisabled
                            ? "text-muted-foreground/50 cursor-not-allowed"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        aria-pressed={isActive}
                        aria-disabled={isDisabled}
                        title={isLoadingUser ? "Loading..." : !isUserSubscribed ? t("user.pro_required") : ""}
                        onClick={() => {
                          if (
                            isLoadingUser ||
                            !videoDetail ||
                            isUpdatingVisibility ||
                            isActive ||
                            !isUserSubscribed
                          ) {
                            return;
                          }
                          void handleVisibilityUpdate(option.value);
                        }}
                        disabled={isDisabled}
                      >
                        {isUpdatingVisibility &&
                        !isActive &&
                        videoDetail?.visibility_level !== option.value ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 元信息 */}
            <div className="space-y-4 text-sm">
              {/* Model 和 Style 参数 - 同一排显示 */}
              <div className={styleLabel ? "grid grid-cols-2 gap-4" : ""}>
                <div className="space-y-2">
                  <p className="text-xs uppercase text-muted-foreground">
                    {pageData.video_detail?.model?.label ?? ""}
                  </p>
                  <p className="text-base font-medium text-foreground">
                    {modelName}
                  </p>
                </div>
                {styleLabel && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">
                      {pageData.video_detail?.meta?.style ?? "STYLE"}
                    </p>
                    <p className="text-base font-medium text-foreground">
                      {styleLabel}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">
                  {pageData.video_detail?.oc?.label ?? ""}
                </p>
                {characters.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {characters.map((character) => (
                      <Link
                        key={character.uuid}
                        href={`/${locale}/characters/${character.uuid}`}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="size-10 border">
                          {character.avatar_url ? (
                            <AvatarImage
                              src={character.avatar_url}
                              alt={
                                character.name ||
                                pageData.video_detail?.oc?.label ||
                                ""
                              }
                            />
                          ) : (
                            <AvatarFallback>
                              {(
                                character.name ||
                                pageData.video_detail?.oc?.label ||
                                ""
                              ).slice(0, 2)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    {pageData.video_detail?.oc?.none ?? ""}
                  </span>
                )}
              </div>

              {/* 视频特有信息 */}
              {videoDetail?.duration_seconds && (
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">
                    {pageData.video_detail?.meta?.duration ?? "Duration"}
                  </p>
                  <p>{videoDetail.duration_seconds}s</p>
                </div>
              )}

              {videoDetail?.resolution && (
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">
                    {pageData.video_detail?.meta?.resolution ?? "Resolution"}
                  </p>
                  <p>{videoDetail.resolution}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs uppercase text-muted-foreground">
                  {pageData.video_detail?.meta?.created_at ?? ""}
                </p>
                <p>{createdAtText || "—"}</p>
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {pageData.video_detail?.prompt?.label ?? ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyPrompt}
                    disabled={!promptText}
                    aria-label={
                      pageData.video_detail?.prompt?.copy ?? "Copy prompt"
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    disabled={!currentVariant?.video_url}
                    aria-label={
                      pageData.video_detail?.actions?.download ??
                      "Download video"
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 max-h-48 overflow-auto text-sm leading-relaxed">
                {promptText || (
                  <span className="text-muted-foreground">
                    {pageData.video_detail?.empty?.description ?? ""}
                  </span>
                )}
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="font-normal"
                  onClick={handleReuse}
                  disabled={isReusing || !videoDetail || !videoDetail.gen_type}
                >
                  {isReusing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {pageData.video_detail?.actions?.reuse ?? ""}
                </Button>
              </div>

              {canDelete && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleDelete}
                  disabled={isDeleting || !videoDetail}
                  aria-label={
                    (pageData as any)?.video_detail?.actions?.delete ?? "Delete"
                  }
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
