"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";

interface PromotionBannerProps {
  enabled?: boolean;
  icon?: string;
  text?: string;
  link?: string;
  storageKey: string;
  className?: string;
  compact?: boolean;
  centered?: boolean;
}

function isExternalLink(link: string) {
  return /^https?:\/\//i.test(link);
}

function isIconUrlLike(value: string) {
  return (
    /^(https?:\/\/|\/|data:|blob:)/i.test(value) ||
    /[/.].+\.(png|jpe?g|webp|svg|gif|avif)$/i.test(value)
  );
}

function isPlainTextIcon(value: string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/.test(value);
}

export default function PromotionBanner({
  enabled = true,
  icon,
  text,
  link,
  storageKey,
  className,
  compact = false,
  centered = false,
}: PromotionBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [shouldMarquee, setShouldMarquee] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const value = localStorage.getItem(storageKey);
    setDismissed(value === "1");
  }, [storageKey]);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current || !textRef.current) {
        setShouldMarquee(false);
        return;
      }
      const isSmallScreen = window.matchMedia("(max-width: 640px)").matches;
      setShouldMarquee(
        isSmallScreen &&
          textRef.current.scrollWidth > containerRef.current.clientWidth,
      );
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [text]);

  const safeText = useMemo(() => (text || "").trim(), [text]);
  const safeLink = useMemo(() => (link || "").trim(), [link]);
  const safeIcon = useMemo(() => (icon || "").trim(), [icon]);
  const iconLooksLikeUrl = useMemo(
    () => !!safeIcon && isIconUrlLike(safeIcon),
    [safeIcon],
  );
  const iconIsPlainText = useMemo(
    () => !!safeIcon && isPlainTextIcon(safeIcon),
    [safeIcon],
  );
  const { displayUrl: iconImageUrl } = useResolvedImageUrl(
    iconLooksLikeUrl ? safeIcon : "",
  );

  if (!enabled || !safeText || !safeLink || dismissed) {
    return null;
  }

  const external = isExternalLink(safeLink);

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 border border-primary/20 bg-primary/10 text-foreground backdrop-blur-sm",
        compact ? "rounded-full px-2 py-1" : "w-full px-4 py-2",
        className,
      )}
    >
      <Link
        href={safeLink as any}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer noopener" : undefined}
        className={cn(
          "min-w-0 flex-1 overflow-hidden",
          centered ? "flex justify-center" : "",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            centered ? "justify-center text-center" : "",
          )}
        >
          {safeIcon ? (
            iconLooksLikeUrl && iconImageUrl ? (
              <img
                src={iconImageUrl}
                alt="Promotion icon"
                className="h-4 w-4 shrink-0 rounded-sm object-cover"
              />
            ) : iconIsPlainText ? (
              <span className="shrink-0 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary sm:text-[11px]">
                {safeIcon}
              </span>
            ) : (
              <span className="shrink-0 text-xs sm:text-sm leading-none">
                {safeIcon}
              </span>
            )
          ) : null}
          <div ref={containerRef} className="min-w-0 overflow-hidden">
            <span
              ref={textRef}
              className={cn(
                "block whitespace-nowrap text-[11px] sm:text-xs md:text-sm",
                shouldMarquee ? "animate-[promo-marquee_10s_linear_infinite]" : "",
              )}
            >
              {safeText}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        className="shrink-0 rounded-full p-1 text-foreground/70 transition-colors hover:bg-primary/15 hover:text-foreground"
        aria-label="Dismiss promotion"
        onClick={() => {
          localStorage.setItem(storageKey, "1");
          setDismissed(true);
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
