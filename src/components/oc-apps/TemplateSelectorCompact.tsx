"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ImageIcon,
  CheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/template-utils";
import { processTemplatesResponse } from "@/lib/template-utils";
import { assetLoader } from "@/lib/asset-loader";

interface TemplateSelectorCompactProps {
  selected?: Template | null;
  onSelect: (template: Template) => void;
  title?: string;
  className?: string;
  apiPath?: string; // 自定义API路径，用于支持sticker等不同模板
  pageData?: any; // 页面级翻译配置
}

export function TemplateSelectorCompact({
  selected,
  onSelect,
  title,
  className,
  apiPath = "/api/oc-apps/action-figure/templates",
  pageData,
}: TemplateSelectorCompactProps) {
  const tCommon = useTranslations("common_components.template_selector");
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>();

  // 使用title prop 或国际化配置
  const displayTitle = title || tCommon("title");

  const isWideAspect = (ratio?: string) =>
    ratio === "3:2" || ratio === "4:3";

  // 将 aspect_ratio 字符串转换为 Tailwind CSS 类
  const getAspectRatioClass = (ratio?: string) => {
    switch (ratio) {
      case "3:2":
        return "aspect-[3/2]"; // 横图：更宽
      case "4:3":
        return "aspect-[4/3]";
      case "1:1":
        return "aspect-square";
      case "3:4":
      default:
        return "aspect-[3/4]"; // 竖图：默认
    }
  };

  // 从 pageData 获取翻译值的辅助函数
  const getI18nValue = useCallback((key: string): string | undefined => {
    if (!pageData || !key) return undefined;
    const keys = key.split('.');
    let value: any = pageData;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return undefined;
    }
    return value;
  }, [pageData]);

  // 获取模板的显示名称（支持国际化）
  const getTemplateName = useCallback((template: Template) => {
    if (template.i18n_name_key) {
      const translated = getI18nValue(template.i18n_name_key);
      if (translated) return translated;
    }
    return template.name;
  }, [getI18nValue]);

  // 根据模板比例获取合适的预览容器尺寸（用于触发按钮）
  const getPreviewContainerClass = (ratio?: string) => {
    switch (ratio) {
      case "3:2":
        return "h-28 w-44"; // Tailwind 默认尺寸，避免无效的 w-42
      case "4:3":
        return "h-28 w-36";
      case "1:1":
        return "h-28 w-28";
      case "3:4":
      default:
        return "h-32 w-24"; // 竖图：保持原样
    }
  };

  const getPreviewWrapperClass = (ratio?: string) =>
    cn(
      "relative overflow-hidden rounded-md bg-muted w-full h-full",
      isWideAspect(ratio) ? "aspect-[3/4]" : getAspectRatioClass(ratio)
    );

  const getDropdownPreviewClass = (ratio?: string) =>
    isWideAspect(ratio) ? "aspect-[3/4]" : getAspectRatioClass(ratio);

  const getImageObjectClass = (ratio?: string) =>
    isWideAspect(ratio) ? "object-cover object-center" : "object-cover";

  // 加载模板（带本地缓存）
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        // 根据 apiPath 生成唯一的缓存 key，避免不同模板混用缓存
        const CACHE_KEY = `templates-${apiPath.replace(/[^a-z0-9]/gi, '-')}`;
        const CACHE_TTL = 24 * 60 * 60 * 1000;
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
              if (mounted) {
                // 使用统一的模板数据处理工具
                const templates = processTemplatesResponse(data);
                if (templates.length > 0) {
                  setTemplates(templates);
                } else {
                  console.error('[Templates] Cached templates is empty');
                }
              }
              return;
            }
          } catch {}
        }

        const res = await fetch(apiPath);
        if (!res.ok) throw new Error("Failed to load templates");
        const data = await res.json();
        console.log('[Templates] API response:', data);

        if (mounted) {
          // 使用统一的模板数据处理工具
          const templates = processTemplatesResponse(data);
          console.log('[Templates] Processed templates count:', templates.length);
          if (templates.length > 0) {
            setTemplates(templates);
          } else {
            console.error('[Templates] Processed templates is empty');
          }
        }
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data, timestamp: Date.now() })
        );
      } catch (e) {
        console.error("Load templates failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [apiPath]);

  // 挂载状态管理
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 设置默认选中第一个模板 - 只在客户端挂载后执行
  useEffect(() => {
    if (isMounted && !selected && templates.length > 0) {
      onSelect(templates[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, selected, templates]);

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const margin = 16;
    // 响应式基础宽度：移动端更小，桌面端适中
    const baseWidth = viewportWidth < 640 ? 280 : 340;
    const dropdownWidth = Math.min(
      Math.max(baseWidth, rect.width),
      viewportWidth - margin * 2
    );
    // 水平位置：从触发按钮右侧展开，有8px间距不重叠
    let left = rect.right + 8;
    // 如果右侧空间不足，则从视口左边开始展开
    if (left + dropdownWidth > viewportWidth - margin) {
      left = margin;
    }
    // 垂直位置：向上偏移，让第三排与选择框在同一水平线
    // 估算弹窗高度：3行 * (图片高度 + padding + gap) ≈ 280px
    const estimatedDropdownHeight = 280;
    let top = rect.bottom - estimatedDropdownHeight;
    // 确保弹窗顶部不超出视口
    if (top < margin) {
      top = margin;
    }
    setDropdownStyle({
      position: "fixed",
      left,
      top,
      width: dropdownWidth,
      zIndex: 9999,
    });
  }, []);

  // 点击外部关闭
  useEffect(() => {
    function onDocClick(ev: MouseEvent) {
      const target = ev.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [isOpen]);

  // 打开时更新定位并监听窗口变化
  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    function handleLayoutChange() {
      updateDropdownPosition();
    }
    window.addEventListener("resize", handleLayoutChange);
    window.addEventListener("scroll", handleLayoutChange, true);
    return () => {
      window.removeEventListener("resize", handleLayoutChange);
      window.removeEventListener("scroll", handleLayoutChange, true);
    };
  }, [isOpen, updateDropdownPosition]);

  // 防止 hydration 不匹配，在客户端挂载前不渲染动态内容
  if (!isMounted) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-foreground whitespace-nowrap">
            {displayTitle}
          </h3>
          <Button
            variant="outline"
            className={cn(
              "flex items-center justify-center p-0",
              "h-32 w-24" // 默认竖图尺寸
            )}
            disabled={true}
          >
            <div className="relative overflow-hidden rounded-md bg-muted aspect-[3/4] animate-pulse">
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
              </div>
            </div>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-foreground whitespace-nowrap">
            {displayTitle}
          </h3>
          <Button
            variant="outline"
            className={cn(
              "flex items-center justify-center p-0",
              "h-32 w-24" // 默认竖图尺寸
            )}
            disabled={true}
          >
            <div className="relative overflow-hidden rounded-md bg-muted aspect-[3/4] animate-pulse">
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
              </div>
            </div>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("space-y-2 relative", className)}>
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-medium text-foreground whitespace-nowrap">
          {displayTitle}
        </h3>

        <Button
          ref={triggerRef}
          variant="outline"
          className={cn(
            "flex items-center justify-center p-0",
            getPreviewContainerClass(selected?.aspect_ratio)
          )}
          onClick={() => setIsOpen((v) => !v)}
          disabled={loading}
        >
          {/* 示例预览图 */}
          <div className={getPreviewWrapperClass(selected?.aspect_ratio)}>
            {selected?.thumbnail ? (
              <Image
                src={assetLoader.getImageUrl(selected.thumbnail)}
                alt={getTemplateName(selected)}
                fill
                className={getImageObjectClass(selected?.aspect_ratio)}
                sizes="(max-width: 768px) 144px, 144px"
              />
            ) : selected?.id === "no_preset" ? (
              // No Preset 模板使用纯文本显示
              <div className="w-full h-full flex items-center justify-center bg-muted/50">
                <span className="text-xs font-semibold text-center px-2" style={{ color: "#C07895" }}>
                  {getTemplateName(selected)}
                </span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            {/* 下拉箭头在图片内部右下角 */}
            <div className="absolute bottom-0.5 right-0.5 bg-background/80 rounded p-0.5">
              {isOpen ? (
                <ChevronUpIcon className="w-2.5 h-2.5" />
              ) : (
                <ChevronDownIcon className="w-2.5 h-2.5" />
              )}
            </div>
          </div>
        </Button>
      </div>

      {isOpen &&
        dropdownStyle &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="max-h-[80vh] overflow-y-auto rounded-xl border bg-card p-1.5 shadow-2xl animate-in slide-in-from-right-2 fade-in duration-200"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {templates.map((tpl) => (
                <Card
                  key={tpl.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    selected?.id === tpl.id &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  onClick={() => {
                    onSelect(tpl);
                    setIsOpen(false);
                  }}
                >
                  <CardContent className="p-0">
                    <div
                      className={cn(
                        "relative w-full bg-muted overflow-hidden rounded-t-lg",
                        getDropdownPreviewClass(tpl.aspect_ratio)
                      )}
                    >
                      {tpl.thumbnail ? (
                        <Image
                          src={assetLoader.getImageUrl(tpl.thumbnail)}
                          alt={getTemplateName(tpl)}
                          fill
                          sizes="(max-width: 640px) 33vw, 120px"
                          className={getImageObjectClass(tpl.aspect_ratio)}
                        />
                      ) : tpl.id === "no_preset" ? (
                        // No Preset 模板使用纯文本显示
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <span className="text-xs font-semibold text-center px-2" style={{ color: "#C07895" }}>
                            {getTemplateName(tpl)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                      {selected?.id === tpl.id && (
                        <div className="absolute top-1 right-1 rounded-full bg-primary p-1 text-primary-foreground">
                          <CheckIcon className="h-2 w-2" />
                        </div>
                      )}
                    </div>
                    {/* 模板名称 */}
                    <div className="px-1.5 py-1 bg-card border-t">
                      <p className="text-[10px] sm:text-xs text-center text-foreground truncate leading-tight">
                        {getTemplateName(tpl)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {templates.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {tCommon("no_templates")}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
