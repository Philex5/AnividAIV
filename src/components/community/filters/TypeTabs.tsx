"use client"

import { FilterTabs } from "@/components/ui/filter-tabs"
import { cn } from "@/lib/utils"
import type { CommunityPage } from "@/types/pages/community"

type CommunityFilterType = "all" | "oc" | "image" | "video"

interface TypeTabsProps {
  value: CommunityFilterType
  onChange: (value: CommunityFilterType) => void
  className?: string
  pageData: CommunityPage
}

export function TypeTabs({ value, onChange, className, pageData }: TypeTabsProps) {
  const typeItems: Array<{
    value: CommunityFilterType
    label: string
  }> = [
    { value: "all", label: pageData.tabs.all },
    { value: "oc", label: pageData.tabs.oc },
    { value: "image", label: pageData.tabs.image },
    { value: "video", label: pageData.tabs.video },
  ]

  return (
    <FilterTabs
      value={value}
      onValueChange={(val) => onChange(val as CommunityFilterType)}
      items={typeItems}
      className={cn("w-full sm:w-auto", className)}
    />
  )
}
