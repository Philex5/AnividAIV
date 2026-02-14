"use client";

import { Link } from "@/i18n/navigation";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";
import { cn } from "@/lib/utils";

interface PromotionSidebarCardProps {
  enabled?: boolean;
  image?: string;
  text?: string;
  link?: string;
  className?: string;
}

function isExternalLink(link: string) {
  return /^https?:\/\//i.test(link);
}

export default function PromotionSidebarCard({
  enabled = true,
  image,
  text,
  link,
  className,
}: PromotionSidebarCardProps) {
  const safeText = (text || "").trim();
  const safeLink = (link || "").trim();
  const { displayUrl } = useResolvedImageUrl(image);

  if (!enabled || !safeText || !safeLink) {
    return null;
  }

  const external = isExternalLink(safeLink);

  return (
    <Link
      href={safeLink as any}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-primary/20 bg-muted/30 p-4",
        className,
      )}
    >
      {displayUrl ? (
        <img
          src={displayUrl}
          alt="Promotion background"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : null}

      <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/65 to-background/35" />

      <div className="relative z-10">
        <p className="line-clamp-3 text-sm font-semibold leading-relaxed text-foreground">
          {safeText}
        </p>
      </div>
    </Link>
  );
}
