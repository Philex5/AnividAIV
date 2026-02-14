"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { Lock, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface VisibilityToggleProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  checkedIcon?: React.ReactNode
  uncheckedIcon?: React.ReactNode
}

const VisibilityToggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  VisibilityToggleProps
>(({ className, checkedIcon, uncheckedIcon, ...props }, ref) => {
  const isChecked = props.checked

  return (
    <SwitchPrimitives.Root
      className={cn(
        "relative inline-flex h-5 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        isChecked ? "data-[state=checked]:bg-primary" : "data-[state=unchecked]:bg-muted",
        className
      )}
      {...props}
      ref={ref}
    >
      {/* 背景图标容器 */}
      <div className="absolute inset-0 flex items-center">
        <div
          className={cn(
            "flex items-center justify-center w-4 h-4 transition-opacity duration-200",
            isChecked ? "opacity-100" : "opacity-0"
          )}
          style={{ marginLeft: "6px" }}
        >
          {checkedIcon || <Globe className="w-3 h-3 text-foreground" />}
        </div>
        <div
          className={cn(
            "flex items-center justify-center w-4 h-4 transition-opacity duration-200 ml-auto",
            !isChecked ? "opacity-100" : "opacity-0"
          )}
          style={{ marginRight: "6px" }}
        >
          {uncheckedIcon || <Lock className="w-3 h-3 text-foreground" />}
        </div>
      </div>

      {/* 滑动-thumb */}
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 z-10",
          isChecked ? "translate-x-[28px]" : "translate-x-0"
        )}
      />
    </SwitchPrimitives.Root>
  )
})

VisibilityToggle.displayName = SwitchPrimitives.Root.displayName

export { VisibilityToggle }
