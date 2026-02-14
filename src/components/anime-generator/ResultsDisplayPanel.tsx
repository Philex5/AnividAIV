"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResultsDisplayPanelProps {
  children: ReactNode;
  className?: string;
}

export function ResultsDisplayPanel({ 
  children, 
  className 
}: ResultsDisplayPanelProps) {
  return (
    <div className={cn(
      "rounded-[var(--radius-lg)]",
      "h-full min-h-0 p-3 bg-transparent",
      "flex flex-col",
      className
    )}>
      {children}
    </div>
  );
}
