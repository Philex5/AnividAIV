"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAllConfigs } from "@/lib/hooks/useConfigs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AnimeGeneratorPage } from "@/types/pages/landing";
import {
  getModelIconUrl,
  getCreamyCharacterUrl,
  getMemberBadgeUrl,
  assetLoader,
} from "@/lib/asset-loader";
import { useAppContext } from "@/contexts/app";
import type { AIModelBadge } from "@/lib/configs";

interface ModelSelectorWithIconProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  pageData: AnimeGeneratorPage;
  modelType?: string;
}

export function ModelSelectorWithIcon({
  value,
  onChange,
  disabled = false,
  className,
  pageData,
  modelType,
}: ModelSelectorWithIconProps) {
  const t = useTranslations();
  const tCommon = useTranslations("common_components.model_selector");
  const configsData = useAllConfigs();
  const {
    models: allModels,
    loading: configsLoading,
    error: configsError,
  } = configsData;
  const { user } = useAppContext();
  const selectContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectContainerWidth, setSelectContainerWidth] = useState(0);

  useEffect(() => {
    const element = selectContainerRef.current;
    if (!element) return;

    setSelectContainerWidth(element.clientWidth);

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width ?? 0;
      setSelectContainerWidth(nextWidth);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [configsLoading, configsError]);

  // 根据modelType过滤模型（所有用户都能看到所有模型，但Premium模型对Free用户置灰）
  const models = useMemo(() => {
    if (!allModels) return allModels;
    return allModels.filter((model) => {
      // 根据 modelType 进行过滤：
      // - modelType 为 text2img 时，显示 text2img 和 img2img 类型的模型
      // - modelType 为 img2img 时，只显示 img2img 类型的模型
      if (modelType) {
        if (modelType === "text2img") {
          return (
            model.model_type === "text2img" || model.model_type === "img2img"
          );
        } else if (modelType === "img2img") {
          return model.model_type === "img2img";
        }
        // 其他 modelType 使用精确匹配
        return model.model_type === modelType;
      }
      return true;
    });
  }, [allModels, modelType]);

  // 获取模型的显示名称（优先使用国际化翻译）
  const getModelDisplayName = (model: any) => {
    if (model.i18n_name_key) {
      const translatedName = t(model.i18n_name_key);
      // 如果翻译存在且不等于键名本身，使用翻译
      if (translatedName && translatedName !== model.i18n_name_key) {
        return translatedName;
      }
    }
    // 回退到原始名称
    return model.name || model.model_id;
  };

  // 获取模型的显示描述（优先使用国际化翻译）
  const getModelDisplayDescription = (model: any) => {
    if (model.i18n_description_key) {
      const translatedDesc = t(model.i18n_description_key);
      // 如果翻译存在且不等于键名本身，使用翻译
      if (translatedDesc && translatedDesc !== model.i18n_description_key) {
        return translatedDesc;
      }
    }
    // 回退到原始描述或名称
    return model.description || model.name || model.model_id;
  };

  // 检查模型是否为高级模型
  const isPremiumModel = (model: any) => {
    return model.is_premium === true;
  };

  // 检查用户是否为免费用户
  const isFreeUser = (user: any) => {
    return !user?.is_sub && !user?.is_premium;
  };

  const getModelBadges = (model: any): AIModelBadge[] => {
    if (!Array.isArray(model?.badges)) {
      return [];
    }
    return model.badges.filter(
      (badge: AIModelBadge) =>
        Boolean(badge?.text) &&
        Boolean(badge?.bgColor) &&
        Boolean(badge?.textColor) &&
        Boolean(badge?.borderColor)
    );
  };

  const shouldShowModelBadges = (model: any) => {
    const badges = getModelBadges(model);
    if (badges.length === 0) return false;

    // 基于实际可用宽度动态显示：宽度足够时小屏也展示 badge
    const baseMinWidth = 185;
    const badgeWidthBudget = 44;
    const minWidth = baseMinWidth + badges.length * badgeWidthBudget;
    return selectContainerWidth >= minWidth;
  };

  const getBadgePriority = (text: string) => {
    const upper = text.toUpperCase();
    if (upper === "50%OFF") return 0;
    if (upper === "4K") return 1;
    if (upper === "2K") return 2;
    return 99;
  };

  const getVisibleModelBadges = (model: any) => {
    const badges = getModelBadges(model);
    if (badges.length === 0) {
      return { badges: [], compact: false };
    }

    if (shouldShowModelBadges(model)) {
      return { badges, compact: false };
    }

    // 中等宽度下展示一个高优先级 badge，尽量保留关键信息（如折扣）
    const minCompactWidth = 205;
    if (selectContainerWidth < minCompactWidth) {
      return { badges: [], compact: false };
    }

    const sorted = [...badges].sort(
      (a, b) => getBadgePriority(a.text) - getBadgePriority(b.text)
    );
    return { badges: sorted.slice(0, 1), compact: true };
  };

  // 获取当前选中的模型
  const selectedModel = useMemo(() => {
    if (configsLoading || !models) return undefined;
    return models.find((model) => model.model_id === value);
  }, [models, value, configsLoading]);

  // 如果配置正在加载，显示loading状态
  if (configsLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium text-foreground whitespace-nowrap">
            {pageData.controls?.model || "Model"}
          </Label>
          <div className="flex-1" ref={selectContainerRef}>
            <Select disabled={true}>
              <SelectTrigger className="w-full h-auto py-2">
                <SelectValue placeholder={tCommon("loading")} />
              </SelectTrigger>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  // 如果配置加载失败，显示错误状态
  if (configsError) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium text-foreground whitespace-nowrap">
            {pageData.controls?.model || "Model"}
          </Label>
          <div className="flex-1" ref={selectContainerRef}>
            <Select disabled={true}>
              <SelectTrigger className="w-full h-auto py-2 text-destructive">
                <SelectValue placeholder={tCommon("load_failed")} />
              </SelectTrigger>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <TooltipProvider>
        {/* 标签和选择框在同一行 */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium text-foreground whitespace-nowrap">
            {pageData.controls?.model || "Model"}
          </Label>

          {/* 使用 Radix UI Select */}
          <div className="flex-1" ref={selectContainerRef}>
            <Select
              value={value}
              onValueChange={(nextValue) => {
                const nextModel = models?.find(
                  (model) => model.model_id === nextValue
                );
                if (!nextModel) return;
                if (isPremiumModel(nextModel) && isFreeUser(user)) {
                  return;
                }
                onChange(nextValue);
              }}
              disabled={disabled || configsLoading}
            >
              <SelectTrigger className="w-full h-auto py-2">
                <SelectValue className="flex-1 min-w-0">
                  {selectedModel && (
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 w-full pr-1 max-sm:gap-1.5">
                      {/* 模型图标 */}
                      <div className="w-6 h-6 rounded bg-muted border overflow-hidden shrink-0 max-sm:w-5 max-sm:h-5">
                        {selectedModel.thumbnail_url ? (
                          <Image
                            src={assetLoader.getImageUrl(
                              selectedModel.thumbnail_url
                            )}
                            alt={selectedModel.name}
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs font-mono text-muted-foreground max-sm:text-[10px]">
                              {tCommon("ai_placeholder")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 模型名 */}
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate max-sm:text-xs">
                          {getModelDisplayName(selectedModel)}
                        </span>

                        {/* 高级模型图标 - 放在模型名右侧，贴着模型名（仅免费用户可见） */}
                        {isPremiumModel(selectedModel) && isFreeUser(user) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Image
                                src={getMemberBadgeUrl("sub_only")}
                                alt="Premium"
                                width={16}
                                height={16}
                                className="w-4 h-4 shrink-0 max-sm:w-3 max-sm:h-3"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("user.premium_model_tooltip")}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      {/* Credits 消耗 */}
                      <div className="flex items-center gap-1 shrink-0 justify-self-end max-sm:gap-0.5">
                        <Image
                          src={getCreamyCharacterUrl("meow_coin")}
                          alt={tCommon("credits")}
                          width={14}
                          height={14}
                          className="w-3.5 h-3.5 max-sm:w-3 max-sm:h-3"
                        />
                        <span className="text-xs font-medium text-foreground max-sm:text-[10px]">
                          {modelType === "text2video"
                            ? `${selectedModel.credits_per_generation}+`
                            : selectedModel.credits_per_generation}
                        </span>
                      </div>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>

              <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                {models.map((model) => {
                  // 检查是否为高级模型且用户为免费用户
                  const isModelDisabled =
                    isPremiumModel(model) && isFreeUser(user);

                  return (
                    <SelectItem
                      key={model.model_id}
                      value={model.model_id}
                      onSelect={(e) => {
                        if (isModelDisabled) {
                          e.preventDefault();
                        }
                      }}
                      className={cn(
                        "py-2",
                        isModelDisabled && "opacity-50 cursor-default select-none"
                      )}
                    >
                      <div className="w-[calc(var(--radix-select-trigger-width)-2.75rem)] max-w-full min-w-0">
                        {/* 第一行：模型图标、标题和MC图标 */}
                        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 w-full">
                          {/* 模型图标 */}
                          <div className="w-6 h-6 rounded bg-muted border overflow-hidden shrink-0">
                            {model.thumbnail_url ? (
                              <Image
                                src={assetLoader.getImageUrl(model.thumbnail_url)}
                                alt={model.name}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {tCommon("ai_placeholder")}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 模型名和高级模型图标 */}
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className={cn(
                                "text-sm font-medium truncate",
                                isModelDisabled && "text-muted-foreground"
                              )}
                            >
                              {getModelDisplayName(model)}
                            </span>

                            {/* 高级模型图标（仅免费用户可见） */}
                            {isPremiumModel(model) && isFreeUser(user) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Image
                                    src={getMemberBadgeUrl("sub_only")}
                                    alt="Premium"
                                    width={16}
                                    height={16}
                                    className="w-4 h-4 shrink-0"
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("user.premium_model_tooltip")}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* Badge - 小屏隐藏，避免挤压布局 */}
                          {(() => {
                            const visible = getVisibleModelBadges(model);
                            if (visible.badges.length === 0) return null;

                            return (
                              <div className="flex items-center gap-1 shrink-0">
                                {visible.badges.map((badge, index) => (
                                  <span
                                    key={`${model.model_id}-badge-${badge.text}-${index}`}
                                    className={cn(
                                      "inline-flex items-center rounded-full border font-semibold leading-none",
                                      visible.compact
                                        ? "px-1 py-0.5 text-[9px]"
                                        : "px-1.5 py-0.5 text-[10px]"
                                    )}
                                    style={{
                                      backgroundColor: badge.bgColor,
                                      color: badge.textColor,
                                      borderColor: badge.borderColor,
                                    }}
                                  >
                                    {badge.text}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}

                          {/* MC图标和积分 */}
                          <div className="flex items-center gap-1 shrink-0 justify-self-end">
                            <Image
                              src={getCreamyCharacterUrl("meow_coin")}
                              alt={tCommon("credits")}
                              width={14}
                              height={14}
                              className="w-3.5 h-3.5"
                            />
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isModelDisabled && "text-muted-foreground"
                              )}
                            >
                              {modelType === "text2video"
                                ? `${model.credits_per_generation}+`
                                : model.credits_per_generation}
                            </span>
                          </div>
                        </div>

                        {/* 第二行：模型描述 - 仅在有描述且不等于模型名时显示 */}
                        {(() => {
                          const description = getModelDisplayDescription(model);
                          return (
                            description &&
                            description !== getModelDisplayName(model) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="mt-1 ml-8 max-sm:ml-8">
                                    <span
                                      className={cn(
                                        "text-xs text-muted-foreground/70 block truncate",
                                        isModelDisabled && "text-muted-foreground/50"
                                      )}
                                    >
                                      {description}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="max-w-sm bg-popover text-popover-foreground border shadow-lg max-sm:max-w-[200px]"
                                >
                                  <p className="text-sm">{description}</p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          );
                        })()}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
