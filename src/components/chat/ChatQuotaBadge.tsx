"use client";

import { useEffect, useRef } from "react";
import { useChatQuotaContext } from "@/contexts/ChatQuotaContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

interface ChatQuotaBadgeProps {
  onClick?: () => void;
  refreshTrigger?: any;
  texts?: {
    monthlyQuota?: string;
    remaining?: string;
    resetsOn?: string;
  };
}

export function ChatQuotaBadge({ onClick, refreshTrigger, texts = {} }: ChatQuotaBadgeProps) {
  const { data: quotaData, loading, error, refetch, hasFetched } = useChatQuotaContext();
  const badgeId = useRef(`badge-${Math.random().toString(36).substr(2, 9)}`);

  // Auto-refetch quota when refreshTrigger changes
  useEffect(() => {
    console.log(`[ChatQuotaBadge ${badgeId.current}] refreshTrigger changed:`, refreshTrigger, `hasFetched: ${hasFetched}`);
    if (refreshTrigger && hasFetched) {
      console.log(`[ChatQuotaBadge ${badgeId.current}] Triggering refetch`);
      refetch();
    }
  }, [refreshTrigger, hasFetched, refetch]);

  // Don't show anything if we haven't fetched yet and not loading
  if (!hasFetched && !loading) {
    return null;
  }

  // Show loading state as placeholder instead of null
  if (loading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="h-9 px-3 gap-2 font-normal opacity-70"
      >
        <img
          src={getCreamyCharacterUrl("ap")}
          alt="AP"
          className="w-5 h-5 object-contain"
        />
        <span className="text-sm font-medium">...</span>
      </Button>
    );
  }

  if (error || !quotaData) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="h-9 px-3 gap-2 font-normal opacity-50"
      >
        <img
          src={getCreamyCharacterUrl("ap")}
          alt="AP"
          className="w-5 h-5 object-contain"
        />
        <span className="text-sm font-medium">-</span>
      </Button>
    );
  }

  const { quota } = quotaData;

  // Pro会员享受无限畅聊
  const isUnlimited = quota.is_unlimited || quota.membership_level === 'pro';

  const percentage = !isUnlimited
    ? Math.min(
        (quota.monthly_used / quota.monthly_quota) * 100,
        100
      )
    : 0;

  const isLowQuota = !isUnlimited && percentage > 80;

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // Pro会员无限畅聊的显示
  if (isUnlimited) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClick}
              className="h-9 px-3 gap-2 font-normal hover:bg-accent"
            >
              <img
                src={getCreamyCharacterUrl("ap")}
                alt="AP"
                className="w-7 h-7 object-contain"
              />
              <span className="text-lg font-semibold text-primary">
                ∞
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs border bg-popover text-popover-foreground shadow-md">
            <div className="space-y-2 p-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-semibold text-primary">
                  Unlimited Chat
                </span>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Pro Member Benefits
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className={`h-9 px-3 gap-2 font-normal hover:bg-accent ${
              isLowQuota ? "animate-pulse text-destructive" : ""
            }`}
          >
            <img
              src={getCreamyCharacterUrl("ap")}
              alt="AP"
              className="w-5 h-5 object-contain"
            />
            <span className="text-sm font-medium">
              {formatNumber(quota.monthly_remaining)}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs border bg-popover text-popover-foreground shadow-md">
          <div className="space-y-2 p-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                {texts.monthlyQuota || "Monthly Quota"}
              </span>
              <span className="text-xs font-medium text-foreground">
                {quota.monthly_used}/{quota.monthly_quota} {texts.remaining || "AP"}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  isLowQuota ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {texts.resetsOn || "Resets on"}{" "}
              {quota.reset_at
                ? new Date(quota.reset_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "N/A"}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
