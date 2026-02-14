"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MainButton,
  LinkingComponentProps,
} from "@/types/components/linking";

/** 变体定义 */
const linkingVariants = cva(
  "linking-component flex items-center justify-center",
  {
    variants: {
      orientation: {
        horizontal: "flex-row gap-2 sm:gap-3",
        vertical: "flex-col gap-2 sm:gap-3",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
);

/** 单个主按钮组件 */
function MainButtonItem({
  button,
  index,
  orientation,
  displayMode = "default",
}: {
  button: MainButton;
  index: number;
  orientation: "horizontal" | "vertical";
  displayMode?: "default" | "icon-only" | "compact";
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const LucideIcon = button.lucideIcon;

  // icon-only 模式渲染
  if (displayMode === "icon-only" && LucideIcon) {
    const iconContent = (
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          asChild={button.type === "single"}
          variant="ghost"
          size="icon"
          className={cn(
            "h-11 w-11 rounded-2xl transition-all duration-300 group",
            "bg-card/40 backdrop-blur-md border-2 border-border/50",
            "hover:bg-secondary/20 hover:border-secondary/50 hover:shadow-[4px_4px_0px_0px_rgba(255,193,7,0.2)]",
            "text-muted-foreground hover:text-secondary",
            button.className
          )}
        >
          {button.type === "single" ? (
            <a
              href={button.href}
              className="inline-flex items-center justify-center"
            >
              <LucideIcon className="h-5 w-5 transition-colors group-hover:text-secondary" />
              <span className="sr-only">{button.label}</span>
            </a>
          ) : (
            <div className="inline-flex items-center justify-center">
              <LucideIcon className="h-5 w-5 transition-colors group-hover:text-secondary" />
              <span className="sr-only">{button.label}</span>
            </div>
          )}
        </Button>
      </motion.div>
    );

    if (button.type === "single") {
      if (button.tooltip) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>{iconContent}</TooltipTrigger>
            <TooltipContent side={orientation === "horizontal" ? "bottom" : "right"}>
              <p className="font-medium">{button.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        );
      }
      return iconContent;
    }

    // 列表按钮的图标模式 (Popover)
    return (
      <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverPrimitive.Trigger asChild>
              {iconContent}
            </PopoverPrimitive.Trigger>
          </TooltipTrigger>
          {button.tooltip && (
            <TooltipContent side={orientation === "horizontal" ? "bottom" : "right"}>
              <p className="font-medium">{button.tooltip}</p>
            </TooltipContent>
          )}
        </Tooltip>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side={orientation === "horizontal" ? "bottom" : "right"}
            align="start"
            sideOffset={8}
            className={cn(
              "z-50 min-w-[200px] overflow-hidden rounded-2xl border-2 border-border/50 bg-card/95 backdrop-blur-xl p-1.5 text-popover-foreground shadow-xl",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
          >
            <div className="flex flex-col gap-1">
              {button.listItems?.map((item, itemIndex) => (
                <a
                  key={itemIndex}
                  href={item.href}
                  className={cn(
                    "group relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-xs font-medium",
                    "text-muted-foreground transition-all duration-200",
                    "hover:bg-secondary/10 hover:text-secondary hover:translate-x-1"
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronDown className="-rotate-90 h-3 w-3 text-secondary" />
                  </div>
                </a>
              ))}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  }

  // default 模式渲染 (Neobrutalism Style)
  const commonButtonClasses = cn(
    "relative h-9 px-4 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200",
    "border-2 border-secondary/40 bg-secondary/10",
    "hover:bg-secondary/20 hover:border-secondary hover:shadow-[4px_4px_0px_0px_rgba(255,193,7,0.3)] hover:text-secondary hover:-translate-y-0.5",
    "active:translate-y-0 active:shadow-none",
    button.className
  );

  if (button.type === "single") {
    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button asChild variant="ghost" className={commonButtonClasses}>
          <a
            href={button.href}
            className="inline-flex items-center justify-center gap-2"
          >
            {LucideIcon && <LucideIcon className="h-4 w-4" />}
            {button.label}
          </a>
        </Button>
      </motion.div>
    );
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="ghost" className={cn(commonButtonClasses, "justify-between gap-3 min-w-[120px]")}>
            <span className="flex items-center gap-2">
              {LucideIcon && <LucideIcon className="h-4 w-4" />}
              {button.label}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                isOpen && "rotate-180"
              )}
            />
          </Button>
        </motion.div>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side={orientation === "horizontal" ? "bottom" : "right"}
          align="start"
          sideOffset={8}
          className={cn(
            "z-50 min-w-[200px] overflow-hidden rounded-2xl border-2 border-border/50 bg-card/95 backdrop-blur-xl p-1.5 text-popover-foreground shadow-xl",
            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          <div className="flex flex-col gap-1">
            {button.listItems?.map((item, itemIndex) => (
              <a
                key={itemIndex}
                href={item.href}
                className={cn(
                  "group relative flex cursor-pointer select-none items-center rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide",
                  "text-muted-foreground transition-all duration-200",
                  "hover:bg-secondary/10 hover:text-secondary hover:translate-x-1"
                )}
              >
                <span className="truncate">{item.label}</span>
                <ChevronDown className="ml-auto -rotate-90 h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all text-secondary" />
              </a>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/** 主组件 */
function LinkingComponent({
  orientation = "horizontal",
  buttons,
  displayMode = "default",
  triggerIcon: TriggerIcon = Sparkles,
  triggerTooltip = "Quick Actions",
  triggerLabel,
  className,
  ...props
}: LinkingComponentProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!buttons || buttons.length === 0) {
    return null;
  }

  // compact 模式：只显示一个主按钮，展开所有
  if (displayMode === "compact") {
    return (
      <TooltipProvider>
        <PopoverPrimitive.Root>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverPrimitive.Trigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size={triggerLabel ? "sm" : "icon"}
                    className={cn(
                      "h-12 w-12 rounded-2xl border-2 border-secondary/50 bg-secondary/10 backdrop-blur-md shadow-[4px_4px_0px_0px_rgba(255,193,7,0.2)]",
                      "text-secondary-foreground transition-all duration-300 hover:bg-secondary/20 hover:shadow-none",
                      triggerLabel && "h-10 w-auto px-4 rounded-xl",
                      className
                    )}
                  >
                    <TriggerIcon className={cn("h-6 w-6 text-secondary", triggerLabel && "h-5 w-5 mr-2 text-current")} />
                    {triggerLabel ? (
                      <span className="text-sm font-bold">{triggerLabel}</span>
                    ) : (
                      <span className="sr-only">{triggerTooltip}</span>
                    )}
                  </Button>
                </motion.div>
              </PopoverPrimitive.Trigger>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold uppercase tracking-wider text-[10px]">{triggerTooltip}</p>
            </TooltipContent>
          </Tooltip>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              side="bottom"
              align="end"
              sideOffset={12}
              className={cn(
                "z-50 min-w-[240px] overflow-hidden rounded-3xl border-2 border-border/50 bg-card/95 backdrop-blur-xl p-2 text-popover-foreground shadow-2xl",
                "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              )}
            >
              <div className="flex flex-col gap-1.5">
                {buttons.map((button, index) => (
                  <div key={index} className="space-y-1">
                    {button.type === "single" ? (
                      <a
                        href={button.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wide",
                          "text-muted-foreground transition-all hover:bg-secondary/10 hover:text-secondary hover:translate-x-1"
                        )}
                      >
                        <div className="p-2 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                          {button.lucideIcon ? <button.lucideIcon className="h-4 w-4 transition-colors group-hover:text-secondary" /> : <Sparkles className="h-4 w-4 transition-colors group-hover:text-secondary" />}
                        </div>
                        <span className="truncate">{button.label}</span>
                      </a>
                    ) : (
                      <div className="space-y-1">
                        <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                          {button.label}
                        </div>
                        {button.listItems?.map((item, itemIndex) => (
                          <a
                            key={itemIndex}
                            href={item.href}
                            className={cn(
                              "group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold",
                              "text-muted-foreground/80 transition-all hover:bg-secondary/5 hover:text-secondary hover:translate-x-1"
                            )}
                          >
                            <div className="w-1 h-1 rounded-full bg-border group-hover:bg-secondary transition-colors ml-2" />
                            <span className="truncate">{item.label}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </TooltipProvider>
    );
  }

  const content = (
    <motion.div
      initial={isMounted ? { opacity: 0, y: 10 } : false}
      animate={isMounted ? { opacity: 1, y: 0 } : false}
      className={cn(
        linkingVariants({ orientation }),
        displayMode !== "icon-only" && "p-2 rounded-[2rem] bg-card/40 backdrop-blur-sm border-2 border-border/30",
        className
      )}
      {...props}
    >
      {buttons.map((button, index) => (
        <MainButtonItem
          key={index}
          button={button}
          index={index}
          orientation={orientation}
          displayMode={displayMode}
        />
      ))}
    </motion.div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      {content}
    </TooltipProvider>
  );
}

export { LinkingComponent, linkingVariants };
