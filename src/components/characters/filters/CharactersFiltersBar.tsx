"use client"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TrendingUp, Clock, Award, X } from "lucide-react"
import type { CharactersPage } from "@/types/pages/characters"

type SortValue = "latest" | "trending" | "top"

interface CharactersFiltersBarProps {
  className?: string
  sort: SortValue
  style?: string | null
  species?: string | null
  gender?: "male" | "female" | "other" | null
  role?: string | null
  world?: string | null
  onSortChange: (value: SortValue) => void
  onStyleChange: (value: string | null) => void
  onSpeciesChange: (value: string | null) => void
  onGenderChange: (value: "male" | "female" | "other" | null) => void
  onRoleChange: (value: string | null) => void
  onWorldChange: (value: string | null) => void
  onClearAll: () => void
  pageData: CharactersPage
  styles?: Array<{ key: string; name: string }>
  speciesOptions?: Array<{ key: string; name: string }>
  roles?: Array<{ key: string; name: string }>
  worlds?: Array<{ uuid: string; name: string }>
}

export function CharactersFiltersBar({
  className,
  sort,
  style,
  species,
  gender,
  role,
  world,
  onSortChange,
  onStyleChange,
  onSpeciesChange,
  onGenderChange,
  onRoleChange,
  onWorldChange,
  onClearAll,
  pageData,
  styles = [],
  speciesOptions = [],
  roles: rolesList = [],
  worlds: worldsList = [],
}: CharactersFiltersBarProps) {
  const hasActiveFilters = style || species || gender || role || world

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Filters and Sort - Single Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* Clear Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 shrink-0"
          >
            <X className="h-3 w-3" />
            {pageData.filters.clear}
          </button>
        )}

        {/* Style Filter */}
        {styles.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60 whitespace-nowrap">
              {pageData.filters.style}:
            </span>
            <Select
              value={style ?? "all"}
              onValueChange={(v) => onStyleChange(v === "all" ? null : v)}
            >
              <SelectTrigger className="h-8 min-w-[100px] max-w-[140px] rounded-lg border border-border/40 bg-muted/30 px-2.5 text-[10px] font-medium uppercase tracking-wide text-foreground shadow-sm hover:bg-muted/50 focus:ring-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-lg max-h-[240px]">
                <SelectItem value="all" className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                  All
                </SelectItem>
                {styles.map((s) => (
                  <SelectItem key={s.key} value={s.key} className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Species Filter */}
        {speciesOptions.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60 whitespace-nowrap">
              {pageData.filters.species}:
            </span>
            <Select
              value={species ?? "all"}
              onValueChange={(v) => onSpeciesChange(v === "all" ? null : v)}
            >
              <SelectTrigger className="h-8 min-w-[100px] max-w-[140px] rounded-lg border border-border/40 bg-muted/30 px-2.5 text-[10px] font-medium uppercase tracking-wide text-foreground shadow-sm hover:bg-muted/50 focus:ring-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-lg max-h-[240px]">
                <SelectItem value="all" className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                  All
                </SelectItem>
                {speciesOptions.map((s) => (
                  <SelectItem key={s.key} value={s.key} className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Gender Filter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60 whitespace-nowrap">
            {pageData.filters.gender}:
          </span>
          <Select
            value={gender ?? "all"}
            onValueChange={(v) => onGenderChange(v === "all" ? null : v as "male" | "female" | "other")}
          >
            <SelectTrigger className="h-8 min-w-[90px] max-w-[120px] rounded-lg border border-border/40 bg-muted/30 px-2.5 text-[10px] font-medium uppercase tracking-wide text-foreground shadow-sm hover:bg-muted/50 focus:ring-0">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-lg">
              <SelectItem value="all" className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                {pageData.filters.gender_all}
              </SelectItem>
              <SelectItem value="male" className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                {pageData.filters.gender_male}
              </SelectItem>
              <SelectItem value="female" className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                {pageData.filters.gender_female}
              </SelectItem>
              <SelectItem value="other" className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                {pageData.filters.gender_other}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Role Filter */}
        {rolesList.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60 whitespace-nowrap">
              {pageData.filters.role}:
            </span>
            <Select
              value={role ?? "all"}
              onValueChange={(v) => onRoleChange(v === "all" ? null : v)}
            >
              <SelectTrigger className="h-8 min-w-[100px] max-w-[140px] rounded-lg border border-border/40 bg-muted/30 px-2.5 text-[10px] font-medium uppercase tracking-wide text-foreground shadow-sm hover:bg-muted/50 focus:ring-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-lg max-h-[240px]">
                <SelectItem value="all" className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                  All
                </SelectItem>
                {rolesList.map((r) => (
                  <SelectItem key={r.key} value={r.key} className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* World Filter */}
        {worldsList.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60 whitespace-nowrap">
              {pageData.filters.world}:
            </span>
            <Select
              value={world ?? "all"}
              onValueChange={(v) => onWorldChange(v === "all" ? null : v)}
            >
              <SelectTrigger className="h-8 min-w-[100px] max-w-[140px] rounded-lg border border-border/40 bg-muted/30 px-2.5 text-[10px] font-medium uppercase tracking-wide text-foreground shadow-sm hover:bg-muted/50 focus:ring-0">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-lg max-h-[240px]">
                <SelectItem value="all" className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                  All
                </SelectItem>
                {worldsList.map((w) => (
                  <SelectItem key={w.uuid} value={w.uuid} className="rounded-lg text-[10px] font-medium uppercase tracking-wide">
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-[8px]" />

        {/* Sort Dropdown */}
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortValue)}>
          <SelectTrigger
            className="h-9 min-w-[130px] shrink-0 rounded-lg border border-border/40 bg-muted/30 px-3 text-[10px] font-black uppercase tracking-wider text-foreground shadow-sm transition-all hover:bg-muted/50 focus:ring-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border border-border bg-popover p-1 shadow-lg">
            <SelectItem value="latest" className="rounded-lg focus:bg-muted focus:text-foreground text-[10px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                {pageData.sort.latest}
              </div>
            </SelectItem>
            <SelectItem value="trending" className="rounded-lg focus:bg-muted focus:text-foreground text-[10px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                {pageData.sort.trending}
              </div>
            </SelectItem>
            <SelectItem value="top" className="rounded-lg focus:bg-muted focus:text-foreground text-[10px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Award className="h-3.5 w-3.5" />
                {pageData.sort.top}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
