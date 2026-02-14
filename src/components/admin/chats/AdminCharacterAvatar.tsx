"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";

function getFallbackText(name?: string | null): string {
  const normalizedName = (name || "").trim();
  if (!normalizedName) {
    return "C";
  }
  return normalizedName.slice(0, 1).toUpperCase();
}

export default function AdminCharacterAvatar({
  avatarUrl,
  name,
  className = "h-8 w-8 border border-border/60",
  fallbackClassName = "text-[10px]",
}: {
  avatarUrl?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const { displayUrl } = useResolvedImageUrl(avatarUrl || null);

  return (
    <Avatar className={className}>
      {displayUrl ? <AvatarImage src={displayUrl} alt={name || "Character avatar"} /> : null}
      <AvatarFallback className={fallbackClassName}>{getFallbackText(name)}</AvatarFallback>
    </Avatar>
  );
}

