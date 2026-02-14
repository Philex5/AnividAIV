"use client"

import { FormEvent } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UnifiedSearchProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  onClear?: () => void
  placeholder?: string
  className?: string
}

export function UnifiedSearch({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = "Search...",
  className,
}: UnifiedSearchProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "group relative flex h-10 w-full items-center md:w-auto",
        className
      )}
    >
      <Search className="absolute left-4 size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden="true" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border-border/40 bg-muted/30 px-10 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-inner transition-all focus-visible:border-primary/50 focus-visible:ring-primary/20 dark:bg-black/40"
      />
      {value ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onClear}
          className="absolute right-2 size-7 shrink-0 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </form>
  )
}
