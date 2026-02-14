"use client";

import { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuthorBrief } from "@/types/pages/community";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";

interface AuthorBarProps {
  author?: AuthorBrief;
  actions?: ReactNode;
  scrolled?: boolean;
  className?: string;
}

export function AuthorBar({
  author,
  actions,
  scrolled,
  className,
}: AuthorBarProps) {
  const initials =
    (author?.name || "")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "OC";
  const { displayUrl: authorAvatarUrl } = useResolvedImageUrl(author?.avatar);

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur transition-shadow",
        scrolled ? "shadow-sm" : "",
        className
      )}
    >
      <Link
        href={`/user/${author?.id || ""}`}
        className="flex items-center gap-3"
      >
        <Avatar className="size-10">
          {author?.avatar ? (
            <AvatarImage src={authorAvatarUrl || author.avatar} alt={author.name} />
          ) : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold leading-none">{author?.name || "Anon"}</p>
        </div>
      </Link>
      {actions}
    </div>
  );
}
