"use client";

import { useChatQuotaContext } from "@/contexts/ChatQuotaContext";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

export function ChatQuotaDisplay() {
  const { data: quotaData, loading, error, refetch } = useChatQuotaContext();

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-20">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading quota...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !quotaData) {
    return (
      <Card className="w-full border-destructive">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-destructive">
              Failed to load quota
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { quota, stats } = quotaData;

  // Pro会员享受无限畅聊
  const isUnlimited = quota.is_unlimited || quota.membership_level === 'pro';

  const percentage = !isUnlimited
    ? Math.min(
        (quota.monthly_used / quota.monthly_quota) * 100,
        100
      )
    : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getMembershipBadgeColor = (level: string) => {
    switch (level) {
      case "pro":
        return "bg-gradient-to-r from-purple-500 to-pink-500";
      case "plus":
        return "bg-gradient-to-r from-blue-500 to-cyan-500";
      case "basic":
        return "bg-gradient-to-r from-green-500 to-emerald-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
        {/* Header with membership level */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Chat Quota</span>
            <Badge
              variant="secondary"
              className={`${getMembershipBadgeColor(
                quota.membership_level
              )} text-white`}
            >
              {quota.membership_level.toUpperCase()}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar or Unlimited badge */}
        {isUnlimited ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 dark:border-primary/30">
              <div className="flex items-center gap-2">
                <img
                  src={getCreamyCharacterUrl("ap")}
                  alt="AP"
                  className="w-6 h-6 object-contain"
                />
                <span className="text-lg font-semibold text-primary">
                  Unlimited Chat
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {quota.monthly_used} / {quota.monthly_quota} AP used
              </span>
              <span className="font-medium">{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold">
              {quota.monthly_remaining}
            </div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{stats.today_used}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              {stats.total_used}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Reset date */}
        {!isUnlimited && quota.reset_at && (
          <div className="text-center pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              Resets on {formatDate(quota.reset_at)}
            </span>
          </div>
        )}

        {isUnlimited && (
          <div className="text-center pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              ✨ Pro Member Benefits
            </span>
          </div>
        )}

        {/* Low quota warning */}
        {percentage > 80 && (
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-900">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ You're running low on chat quota. Consider upgrading your
              plan.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
