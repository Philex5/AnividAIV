"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface FilterTabsProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  items: Array<{
    value: T
    label: string
    icon?: ReactNode
  }>
  className?: string
  variant?: "glass" | "default"
}

export function FilterTabs<T extends string>({
  value,
  onValueChange,
  items,
  className,
  variant = "glass",
}: FilterTabsProps<T>) {
  return (
    <Tabs
      value={value}
      onValueChange={(val) => onValueChange(val as T)}
      className={cn("w-full md:w-auto", className)}
    >
      <TabsList 
        className={cn(
          "h-11 w-full justify-start gap-1 p-1 md:w-auto",
          variant === "glass" 
            ? "rounded-full border border-border/40 bg-muted/30 backdrop-blur-md shadow-inner"
            : "rounded-lg bg-muted/50",
          className
        )}
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className={cn(
              "rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-wider transition-all",
              "data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-lg dark:data-[state=active]:bg-card",
              "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-primary/60",
              item.icon && "flex items-center gap-2"
            )}
          >
            {item.icon}
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
