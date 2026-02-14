"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface CardSkeletonProps {
  className?: string
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  const randomHeight = Math.floor(Math.random() * 150) + 250
  
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card break-inside-avoid mb-3",
        className
      )}
    >
      <Skeleton className="w-full rounded-t-xl" style={{ height: `${randomHeight}px` }} />
      <div className="flex items-center justify-between gap-2 p-2">
        <div className="flex items-center gap-1.5 flex-1">
          <Skeleton className="size-6 rounded-full shrink-0" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Skeleton className="size-6" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="size-6" />
          <Skeleton className="size-6" />
        </div>
      </div>
    </div>
  )
}
