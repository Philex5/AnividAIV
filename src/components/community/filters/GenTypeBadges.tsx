"use client"

import { cn } from "@/lib/utils"
import { getGenTypeWhitelist } from "@/configs/gen-type-display"
import type { CommunityPage } from "@/types/pages/community"

type CommunityFilterType = "all" | "oc" | "image" | "video"

interface GenTypeBadgesProps {
  type: CommunityFilterType
  value: string[]
  onChange: (next: string[]) => void
  pageData: CommunityPage
  className?: string
}

export function GenTypeBadges({
  type,
  value,
  onChange,
  pageData,
  className,
}: GenTypeBadgesProps) {
  // OC and All types do not show gen type filters
  if (type === "all" || type === "oc") return null

  const options = getGenTypeWhitelist("community", type)
  if (options.length === 0) return null

  const handleToggle = (code: string) => {
    const exists = value.includes(code)
    const next = exists ? value.filter((item) => item !== code) : [...value, code]
    onChange(next)
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
        {pageData.genTypes.title}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((code) => {
          const active = value.includes(code)
          const label = pageData.genTypes.options[code]

          return (
            <button
              key={code}
              type="button"
              aria-pressed={active}
              onClick={() => handleToggle(code)}
              className={cn(
                "inline-flex items-center rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                active
                  ? "bg-card border border-border text-primary shadow-md scale-105"
                  : "bg-muted/50 text-muted-foreground hover:bg-card hover:text-primary"
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
