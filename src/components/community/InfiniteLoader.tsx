"use client"

import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface InfiniteLoaderProps {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  error?: string | null
  onRetry?: () => void
  className?: string
}

export function InfiniteLoader({
  hasMore,
  isLoading,
  onLoadMore,
  error,
  onRetry,
  className,
}: InfiniteLoaderProps) {
  const t = useTranslations("community")
  const intersectionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hasMore || isLoading) return
    const target = intersectionRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onLoadMore()
          }
        })
      },
      {
        rootMargin: "400px 0px",
        threshold: 0.1,
      }
    )

    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [hasMore, isLoading, onLoadMore])

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 py-6 text-sm text-muted-foreground",
          className
        )}
      >
        <span>{error}</span>
        {onRetry ? (
          <Button type="button" size="sm" onClick={onRetry}>
            {t("states.retry")}
          </Button>
        ) : null}
      </div>
    )
  }

  if (!hasMore && !isLoading) {
    return null
  }

  return (
    <div
      ref={intersectionRef}
      className={cn(
        "flex w-full items-center justify-center py-6 text-sm text-muted-foreground",
        className
      )}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {t("states.loadingMore")}
        </span>
      ) : null}
    </div>
  )
}
