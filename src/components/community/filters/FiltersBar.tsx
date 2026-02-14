"use client"

import { GenTypeBadges } from "@/components/community/filters/GenTypeBadges"
import { SortSelect } from "@/components/community/filters/SortSelect"
import { TypeTabs } from "@/components/community/filters/TypeTabs"
import { cn } from "@/lib/utils"
import type { CommunityPage } from "@/types/pages/community"

type CommunityFilterType = "all" | "oc" | "image" | "video"
type CommunitySortValue = "trending" | "newest" | "top"

interface FiltersBarProps {
  className?: string
  type: CommunityFilterType
  sort: CommunitySortValue
  genTypes: string[]
  onTypeChange: (value: CommunityFilterType) => void
  onSortChange: (value: CommunitySortValue) => void
  onGenTypeChange: (value: string[]) => void
  pageData: CommunityPage
}

export function FiltersBar({
  className,
  type,
  sort,
  onTypeChange,
  onSortChange,
  onGenTypeChange,
  genTypes,
  pageData,
}: FiltersBarProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TypeTabs
          value={type}
          onChange={onTypeChange}
          pageData={pageData}
          className="w-full sm:w-auto"
        />
        <SortSelect
          value={sort}
          onChange={onSortChange}
          pageData={pageData}
          className="w-full sm:w-auto"
        />
      </div>
      <GenTypeBadges
        type={type}
        value={genTypes}
        onChange={onGenTypeChange}
        pageData={pageData}
        className="flex-wrap"
      />
    </div>
  )
}
