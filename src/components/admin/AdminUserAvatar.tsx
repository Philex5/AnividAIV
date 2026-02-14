"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";
import { cn } from "@/lib/utils";

interface AdminUserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
  fallbackClassName?: string;
}

function getFallbackText(name?: string | null, email?: string | null): string {
  const normalizedName = (name || "").trim();
  if (normalizedName) {
    const parts = normalizedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return normalizedName.slice(0, 2).toUpperCase();
  }

  const normalizedEmail = (email || "").trim();
  if (normalizedEmail) {
    return normalizedEmail.slice(0, 2).toUpperCase();
  }

  return "U";
}

export default function AdminUserAvatar({
  avatarUrl,
  name,
  email,
  className,
  fallbackClassName,
}: AdminUserAvatarProps) {
  const { displayUrl } = useResolvedImageUrl(avatarUrl || null);
  const fallback = getFallbackText(name, email);
  const alt = name || email || "User avatar";

  return (
    <Avatar className={cn("size-8 border border-border/50", className)}>
      {displayUrl ? <AvatarImage src={displayUrl} alt={alt} /> : null}
      <AvatarFallback className={cn("text-xs", fallbackClassName)}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}
