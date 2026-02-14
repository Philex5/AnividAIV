"use client"

import { UnifiedSearch } from "@/components/ui/unified-search"
import type { CommunityPage } from "@/types/pages/community"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  className?: string
  pageData: CommunityPage
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  className,
  pageData,
}: SearchBarProps) {
  return (
    <UnifiedSearch
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      onClear={onClear}
      placeholder={pageData.search.placeholder}
      className={className}
    />
  )
}
