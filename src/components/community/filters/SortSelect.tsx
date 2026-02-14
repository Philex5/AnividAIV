"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { CommunityPage } from "@/types/pages/community"
import { TrendingUp, Clock, Award } from "lucide-react"

type SortValue = "trending" | "newest" | "top"

interface SortSelectProps {
  value: SortValue
  onChange: (value: SortValue) => void
  className?: string
  pageData: CommunityPage
}

export function SortSelect({ value, onChange, className, pageData }: SortSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as SortValue)}
    >
      <SelectTrigger
        className={cn(
          "h-11 min-w-[140px] rounded-full border border-border/40 bg-muted/30 backdrop-blur-md px-5 text-[10px] font-black uppercase tracking-wider text-foreground shadow-inner transition-all hover:bg-muted/50 focus:ring-0 sm:min-w-[160px]",
          className
        )}
        aria-label={pageData.aria.sort}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-2xl border border-border bg-popover p-1 shadow-2xl">
        <SelectItem value="trending" className="rounded-xl focus:bg-muted focus:text-foreground text-[10px] font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            {pageData.sort.trending}
          </div>
        </SelectItem>
        <SelectItem value="newest" className="rounded-xl focus:bg-muted focus:text-foreground text-[10px] font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            {pageData.sort.newest}
          </div>
        </SelectItem>
        <SelectItem value="top" className="rounded-xl focus:bg-muted focus:text-foreground text-[10px] font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Award className="h-3.5 w-3.5" />
            {pageData.sort.top}
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
