"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllConfigs } from "@/lib/hooks/useConfigs";
import type { AnimeGeneratorPage } from "@/types/pages/landing";
import { assetLoader } from "@/lib/asset-loader";

interface StyleOption {
  id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  is_premium?: boolean;
  is_no_presets?: boolean; // 标识为"No Presets"特殊选项
}

interface StyleSelectorCompactProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  pageData: AnimeGeneratorPage;
}

export function StyleSelectorCompact({
  value,
  onChange,
  disabled = false,
  className,
  pageData,
}: StyleSelectorCompactProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const t = useTranslations();
  const tCommon = useTranslations("common_components.style_selector");
  const tParams = useTranslations("parameters");
  const configsData = useAllConfigs();
  const { styles, loading: configsLoading, error: configsError } = configsData;

  // 特殊选项：No Presets
  const noPresetsStyle: StyleOption = {
    id: "no_presets",
    name: tCommon("no_presets"),
    description: tCommon("no_presets_description"),
    is_no_presets: true,
    thumbnail_url: undefined,
  };

  // 转换配置数据为选项
  const styleOptions = useMemo((): StyleOption[] => {
    if (configsLoading || !styles) return [noPresetsStyle];

    // 合并特殊选项和配置选项
    return [
      noPresetsStyle,
      ...styles.map((item) => ({
        id: item.uuid || item.key || "",
        name: t(`${item.i18n_name_key}`),
        description: t(`${item.i18n_name_key}`),
        thumbnail_url: assetLoader.getImageUrl(
          item.config_data?.thumbnail_url || item.thumbnail_url
        ),
        is_premium: item.config_data?.is_premium || false,
        is_no_presets: false,
      })),
    ];
  }, [styles, configsLoading, t, noPresetsStyle]);

  // 挂载状态管理
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 设置默认选中第一个style（跳过特殊选项）- 只在客户端挂载后执行
  useEffect(() => {
    if (isMounted && !value && styleOptions.length > 0) {
      // 跳过第一个特殊选项，选择实际的第一个风格
      const firstRealStyle = styleOptions.find((style) => !style.is_no_presets);
      if (firstRealStyle) {
        onChange(firstRealStyle.id);
      }
    }
  }, [isMounted, value, styleOptions, onChange]);

  // 获取当前选中的样式
  const selectedStyle = styleOptions.find((style) => style.id === value);

  const handleStyleSelect = (styleId: string) => {
    if (!disabled) {
      onChange(styleId);
      setIsExpanded(false);
    }
  };

  const toggleExpanded = () => {
    if (!disabled) {
      setIsExpanded(!isExpanded);
    }
  };

  // 防止 hydration 不匹配，在客户端挂载前不渲染动态内容
  if (!isMounted || configsLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <h3 className="text-sm font-medium">
          {tParams("style")}
        </h3>
        <Button
          variant="outline"
          disabled={true}
          className="w-full justify-between h-10"
        >
          <span className="text-sm text-muted-foreground">
            {!isMounted ? tCommon("loading") : tCommon("loading_styles")}
          </span>
          <ChevronDownIcon className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  // 处理配置加载错误
  if (configsError) {
    return (
      <div className={cn("space-y-2", className)}>
        <h3 className="text-sm font-medium">
          {tParams("style")}
        </h3>
        <Button
          variant="outline"
          disabled={true}
          className="w-full justify-between h-10 text-destructive"
        >
          <span className="text-sm">{tCommon("load_failed")}</span>
          <ChevronDownIcon className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 relative", className)}>
      {/* 选择器按钮 */}
      {selectedStyle ? (
        // 已选择样式的紧凑显示
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium">
              {tParams("style")}:
            </h3>
            <Button
              variant="outline"
              onClick={toggleExpanded}
              disabled={disabled}
              className="flex items-center gap-3 h-12 px-4"
            >
              {/* 样式缩略图 */}
              <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                {selectedStyle.is_no_presets ? (
                  // "No Presets" 特殊显示 - 使用吉祥物粉
                  <div
                    className="w-full h-full flex items-center justify-center bg-muted/50"
                    style={{ color: "#C07895" }}
                  >
                    <span className="text-xs font-semibold">
                      {tCommon("no_presets").slice(0, 2)}
                    </span>
                  </div>
                ) : selectedStyle.thumbnail_url ? (
                  <Image
                    src={assetLoader.getImageUrl(selectedStyle.thumbnail_url)}
                    alt={selectedStyle.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <span className="text-sm truncate max-w-24">
                {selectedStyle.name}
              </span>
              {isExpanded ? (
                <ChevronUpIcon className="w-3 h-3 shrink-0" />
              ) : (
                <ChevronDownIcon className="w-3 h-3 shrink-0" />
              )}
            </Button>
          </div>

          {/* 🔥 新增：No Presets 说明文字 - 与"Style:"左对齐 */}
          {selectedStyle.is_no_presets && (
            <p className="text-xs text-muted-foreground leading-tight pl-0">
              {selectedStyle.description}
            </p>
          )}
        </div>
      ) : (
        // 未选择样式的状态
        <>
          <h3 className="text-sm font-medium">
            {tParams("style")}
          </h3>
          <Button
            variant="outline"
            onClick={toggleExpanded}
            disabled={disabled}
            className="w-full justify-between h-10"
          >
            <span className="text-sm text-muted-foreground">
              {pageData["style-presets"]?.["no-selection"] ||
                "No style selected"}
            </span>
            {isExpanded ? (
              <ChevronUpIcon className="w-3 h-3" />
            ) : (
              <ChevronDownIcon className="w-3 h-3" />
            )}
          </Button>
        </>
      )}

      {/* 展开的样式选择区域 */}
      {isExpanded && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-card border rounded-lg p-3 space-y-2 shadow-lg z-50">
          {/* 网格布局 - 一行4个 */}
          <div className="grid grid-cols-4 gap-2">
            {styleOptions.map((style) => (
              <Card
                key={style.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  disabled && "opacity-50 cursor-not-allowed",
                  value === style.id && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => handleStyleSelect(style.id)}
              >
                <CardContent className="p-0">
                  {/* 缩略图区域 */}
                  <div className="relative h-20 w-full bg-muted rounded-t-lg overflow-hidden">
                    {style.is_no_presets ? (
                      // "No Presets" 特殊显示 - 使用吉祥物粉文字
                      <div
                        className="w-full h-full flex items-center justify-center bg-muted/50"
                        style={{ color: "#C07895" }}
                      >
                        <span className="text-xs font-semibold text-center">
                          {tCommon("no_presets")}
                        </span>
                      </div>
                    ) : style.thumbnail_url ? (
                      <Image
                        src={assetLoader.getImageUrl(style.thumbnail_url)}
                        alt={style.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 20vw, 12vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}

                    {/* 选中状态指示器 */}
                    {value === style.id && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                        <CheckIcon className="h-2 w-2" />
                      </div>
                    )}

                    {/* Premium标识 */}
                    {style.is_premium && (
                      <div className="absolute top-1 left-1">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-amber-100 text-amber-800 px-1 py-0"
                        >
                          Pro
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* 信息区域 */}
                  <div className="px-1 py-0.5">
                    <div className="font-medium text-xs line-clamp-1 text-center">
                      {style.name}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {styleOptions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">{tCommon("no_options")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
