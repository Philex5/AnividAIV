"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface RevenueTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function RevenueTabs({ activeTab, onTabChange }: RevenueTabsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Time Range: </span>
      <ToggleGroup type="single" value={activeTab} onValueChange={onTabChange}>
        <ToggleGroupItem value="current">Current</ToggleGroupItem>
        <ToggleGroupItem value="all">All Time</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
