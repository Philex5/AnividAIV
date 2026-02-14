"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ShareMenu from "@/components/character-detail/ShareMenu";
import { LinkingComponent } from "@/components/ui/linking";
import { animeGenerationConfig } from "@/components/ui/linking.config";
import { toast } from "sonner";
import { Loader2, Download, RefreshCw, Copy, Plus, Trash2 } from "lucide-react";
import { useAllConfigs } from "@/lib/hooks/useConfigs";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/contexts/app";
import Link from "next/link";
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

interface GenerationSummary {
  uuid: string;
  prompt: string;
  model_id: string;
  style_preset: string | null;
  counts: number;
  status: string;
  credits_cost: number;
  reference_image_url: string | null;
  visibility_level: string | null;
  created_at: string | null;
  character_uuids?: string | null;
}

interface ImageDetailResponse {
  uuid: string;
  image_url: string;
  thumbnail_desktop: string | null;
  thumbnail_mobile: string | null;
  thumbnail_detail: string | null;
  created_at: string | null;
  visibility_level: "public" | "private";
  style: string | null;
  generation_params: string | null;
  final_prompt: string | null;
  original_prompt: string | null;
  model_id: string | null;
  reference_image_url: string | null;
  generation_time: number | null;
  gen_type?: string | null;
  generation: GenerationSummary;
  characters: CharacterSummary[];
}

interface ImagePreviewDialogProps {
  open: boolean;
  generationImageUuid: string | null;
  onOpenChange: (open: boolean) => void;
  pageData: AnimeGeneratorPage;
  onReuseParameters?: (imageUuid: string) => Promise<void> | void;
  onCreateNew?: () => void;
  canDelete?: boolean;
}

export function ImagePreviewDialog({
  open,
  generationImageUuid,
  onOpenChange,
  pageData,
  onReuseParameters,
  onCreateNew,
  canDelete = true,
}: ImagePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageDetail, setImageDetail] = useState<ImageDetailResponse | null>(
    null
  );
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isReusing, setIsReusing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { user: appUser, isLoadingUser } = useAppContext();

  // 使用useMemo计算用户是否为Pro会员
  const isUserSubscribed = useMemo(() => {
    if (isLoadingUser || !appUser) return false;
    if (!appUser.is_sub) return false;
    if (!appUser.sub_expired_at) return false;
    return new Date(appUser.sub_expired_at) > new Date();
  }, [appUser, isLoadingUser]);

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

  const modelName = useMemo(() => {
    if (!imageDetail?.generation?.model_id || modelsLoading) {
      return imageDetail?.generation?.model_id || "";
    }
    const matched = models.find(
      (model) => model.model_id === imageDetail?.generation?.model_id
    );
    return matched ? matched.name : imageDetail?.generation?.model_id || "";
  }, [imageDetail?.generation?.model_id, models, modelsLoading]);

  const styleLabel = useMemo(() => {
    const rawStyle = imageDetail?.style || "";
    if (!rawStyle) return "";
    return getStyleDisplayName(rawStyle);
  }, [imageDetail?.style, getStyleDisplayName]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setImageDetail(null);
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    let abort = false;

    const fetchImageDetail = async () => {
      if (!generationImageUuid || !open) {
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/generation/image/${generationImageUuid}`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        const payload = getApiPayload<ImageDetailResponse>(result);
        if (!payload?.uuid) {
          throw new Error("Invalid response payload");
        }
        if (!abort) {
          setImageDetail(payload);
        }
      } catch (err) {
        console.error("[ImagePreviewDialog] Failed to load image:", err);
        if (!abort) {
          setError(pageData.image_detail?.error ?? "");
        }
      } finally {
        if (!abort) {
          setIsLoading(false);
        }
      }
    };

    void fetchImageDetail();

    return () => {
      abort = true;
    };
  }, [generationImageUuid, open, pageData.image_detail?.error]);

  const handleCopyPrompt = useCallback(async () => {
    if (!imageDetail?.original_prompt) return;
    try {
      await navigator.clipboard.writeText(imageDetail.original_prompt);
      const successMessage = pageData.image_detail?.prompt?.copied;
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch {
      const errorMessage = pageData.image_detail?.prompt?.failed;
      if (errorMessage) {
        toast.error(errorMessage);
      }
    }
  }, [imageDetail?.generation?.prompt, pageData.image_detail?.prompt]);

  const handleDownload = useCallback(() => {
    if (!imageDetail?.uuid) return;
    try {
      const link = document.createElement("a");
      link.href = `/api/download/image/${imageDetail.uuid}`;
      link.download = `anime-${imageDetail.uuid}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("[ImagePreviewDialog] Download failed:", err);
      const errorMessage = pageData.image_detail?.actions?.download_error;
      if (errorMessage) {
        toast.error(errorMessage);
      }
    }
  }, [imageDetail?.uuid, pageData.image_detail?.actions?.download_error]);

  const handleVisibilityUpdate = useCallback(
    async (nextLevel: "public" | "private") => {
      if (!imageDetail || imageDetail.visibility_level === nextLevel) {
        return;
      }
      setIsUpdatingVisibility(true);
      try {
        const response = await fetch(
          `/api/community/artworks/${imageDetail.uuid}/visibility?type=image`,
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
        const nextVisibility = payload.visibility_level || nextLevel;
        setImageDetail((prev) =>
          prev
            ? {
                ...prev,
                visibility_level: nextVisibility,
                generation: {
                  ...prev.generation,
                  visibility_level: nextVisibility,
                },
              }
            : prev
        );
        const successMessage = pageData.image_detail?.visibility_toast?.success;
        if (successMessage) {
          toast.success(successMessage);
        }
      } catch (err) {
        console.error("[ImagePreviewDialog] Visibility update failed:", err);
        const errorMessage = pageData.image_detail?.visibility_toast?.error;
        if (errorMessage) {
          toast.error(errorMessage);
        }
      } finally {
        setIsUpdatingVisibility(false);
      }
    },
    [
      imageDetail,
      pageData.image_detail?.visibility_toast?.error,
      pageData.image_detail?.visibility_toast?.success,
    ]
  );

  const handleReuse = useCallback(() => {
    if (!imageDetail?.uuid || !imageDetail?.gen_type) return;

    try {
      setIsReusing(true);
      const generatorUrl = getGeneratorUrl(imageDetail.gen_type);
      const targetUrl = `/${locale}${generatorUrl}?gen_image_id=${imageDetail.uuid}`;

      handleClose(false);
      router.push(targetUrl);
    } catch (err) {
      console.error("[ImagePreviewDialog] Reuse failed:", err);
      toast.error("Failed to navigate to generator");
    } finally {
      setIsReusing(false);
    }
  }, [imageDetail, locale, router]);

  const handleDelete = useCallback(async () => {
    if (!imageDetail?.uuid) return;
    const confirmText =
      (pageData as any)?.image_detail?.actions?.delete_confirm ||
      "Delete this image? This action cannot be undone.";
    const confirmed =
      typeof window !== "undefined" && window.confirm(confirmText);
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const resp = await fetch(`/api/generation/image/${imageDetail.uuid}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const successMessage =
        (pageData as any)?.image_detail?.actions?.delete_success ||
        "Image deleted successfully";
      toast.success(successMessage);
      handleClose(false);
    } catch (err) {
      console.error("[ImagePreviewDialog] Delete failed:", err);
      const errorMessage =
        (pageData as any)?.image_detail?.actions?.delete_failed ||
        "Failed to delete image";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [imageDetail?.uuid, pageData]);

  const characters = useMemo<CharacterSummary[]>(
    () => imageDetail?.characters ?? [],
    [imageDetail?.characters]
  );
  const shareCharacter = characters[0] ?? null;

  const createdAtText = useMemo(
    () => formatDisplayDate(imageDetail?.created_at ?? null),
    [imageDetail?.created_at]
  );

  const promptText = imageDetail?.original_prompt;

  const visibilityOptions = useMemo(
    () => [
      {
        value: "public" as const,
        label: pageData.image_detail?.visibility?.public ?? "Public",
      },
      {
        value: "private" as const,
        label: pageData.image_detail?.visibility?.private ?? "Private",
      },
    ],
    [
      pageData.image_detail?.visibility?.private,
      pageData.image_detail?.visibility?.public,
    ]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[88vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0 lg:max-w-[900px]">
        <DialogTitle className="sr-only">
          {pageData.image_detail?.title ?? ""}
        </DialogTitle>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* 图片展示区 */}
          <div className="relative flex min-h-[200px] sm:min-h-[240px] md:min-h-[280px] min-w-0 w-full items-center justify-center bg-muted/40 p-2 sm:p-3 lg:min-h-0 lg:flex-1 lg:w-1/2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span>{pageData.image_detail?.loading ?? ""}</span>
              </div>
            ) : error ? (
              <div className="text-center text-sm text-destructive">
                {error}
              </div>
            ) : imageDetail ? (
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                  <img
                    src={
                      imageDetail.thumbnail_detail ||
                      imageDetail.thumbnail_desktop ||
                      imageDetail.image_url
                    }
                    alt={promptText || pageData.image_detail?.title || ""}
                    className="h-auto max-h-full w-full rounded-lg border object-contain"
                  />
                </div>
                {/* 联动链接组件 - 独立底部区域 */}
                {imageDetail.uuid && (
                  <div className="flex-shrink-0 px-2 sm:px-3 pb-3 pt-1.5 mb-1">
                    <LinkingComponent
                      {...animeGenerationConfig(
                        imageDetail.uuid,
                        imageDetail.image_url
                      )}
                      className="mb-1"
                    />
                  </div>
                )}
                {/* gen_type badge - 位于图片右上角 */}
                {imageDetail.gen_type && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center rounded-full bg-muted/60 text-foreground text-xs px-2 py-0.5 border border-border/50">
                      {imageDetail.gen_type.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                {pageData.image_detail?.empty?.description ?? ""}
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
                  aria-label={pageData.image_detail?.create_new ?? "Create new"}
                >
                  <Plus aria-hidden="true" className="h-5 w-5" />
                  <span className="sr-only">
                    {pageData.image_detail?.create_new ?? ""}
                  </span>
                </Button>

                {/* 构建图片分享内容 */}
                {imageDetail?.uuid && (
                  <div className="relative z-[100001]">
                    <ShareMenu
                      content={{
                        type: "image",
                        id: imageDetail.uuid,
                        title:
                          imageDetail.generation?.prompt ||
                          "Generated Image",
                        text: imageDetail.original_prompt || undefined,
                        imageUrl:
                          imageDetail.thumbnail_detail ||
                          imageDetail.thumbnail_desktop ||
                          imageDetail.image_url,
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
                )}
              </div>

              <div className="flex items-center">
                <div
                  className={cn(
                    "inline-flex items-center rounded-full bg-muted p-1 shadow-inner",
                    !imageDetail ? "opacity-60" : ""
                  )}
                >
                  {visibilityOptions.map((option) => {
                    const isActive =
                      imageDetail?.visibility_level === option.value;
                    const isDisabled = isLoadingUser || !isUserSubscribed || isUpdatingVisibility || !imageDetail || isActive;
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
                            !imageDetail ||
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
                        imageDetail?.visibility_level !== option.value ? (
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
                    {pageData.image_detail?.model?.label ?? ""}
                  </p>
                  <p className="text-base font-medium text-foreground">
                    {modelName}
                  </p>
                </div>
                {styleLabel && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">
                      {pageData.image_detail?.meta?.style ?? "STYLE"}
                    </p>
                    <p className="text-base font-medium text-foreground">
                      {styleLabel}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">
                  {pageData.image_detail?.oc?.label ?? ""}
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
                                pageData.image_detail?.oc?.label ||
                                ""
                              }
                            />
                          ) : (
                            <AvatarFallback>
                              {(
                                character.name ||
                                pageData.image_detail?.oc?.label ||
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
                    {pageData.image_detail?.oc?.none ?? ""}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase text-muted-foreground">
                  {pageData.image_detail?.meta?.created_at ?? ""}
                </p>
                <p>{createdAtText || "—"}</p>
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {pageData.image_detail?.prompt?.label ?? ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyPrompt}
                    disabled={!promptText}
                    aria-label={
                      pageData.image_detail?.prompt?.copy ?? "Copy prompt"
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    disabled={!imageDetail?.image_url}
                    aria-label={
                      pageData.image_detail?.actions?.download ??
                      "Download image"
                    }
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 max-h-48 overflow-auto text-sm leading-relaxed">
                {promptText}
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="font-normal"
                  onClick={handleReuse}
                  disabled={isReusing || !imageDetail || !imageDetail.gen_type}
                >
                  {isReusing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {pageData.image_detail?.actions?.reuse ?? ""}
                </Button>
              </div>

              {canDelete && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleDelete}
                  disabled={isDeleting || !imageDetail}
                  aria-label={
                    pageData.image_detail?.actions?.delete ?? "Delete"
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
