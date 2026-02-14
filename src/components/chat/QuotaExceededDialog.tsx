"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Crown, Zap } from "lucide-react";

interface QuotaExceededDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotaData?: {
    monthly_used: number;
    monthly_quota: number;
    reset_at: string;
    membership_level: string;
  };
}

export function QuotaExceededDialog({
  open,
  onOpenChange,
  quotaData,
}: QuotaExceededDialogProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleUpgrade = () => {
    router.push("/pricing");
    onOpenChange(false);
  };

  const getRecommendedPlan = (currentLevel: string) => {
    switch (currentLevel) {
      case "free":
        return {
          name: "Basic",
          price: "$9.99/month",
          quota: "500 AP",
          highlight: false,
        };
      case "basic":
        return {
          name: "Plus",
          price: "$19.99/month",
          quota: "1,500 AP",
          highlight: true,
        };
      case "plus":
        return {
          name: "Pro",
          price: "$39.99/month",
          quota: "5,000 AP",
          highlight: false,
        };
      default:
        return null;
    }
  };

  const recommended = quotaData
    ? getRecommendedPlan(quotaData.membership_level)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Monthly Quota Exceeded</DialogTitle>
          </div>
          <DialogDescription className="space-y-2">
            <p>
              You've used all {quotaData?.monthly_quota || 0} AP this month.
              Your quota will reset on{" "}
              {quotaData?.reset_at
                ? formatDate(quotaData.reset_at)
                : "next month"}.
            </p>
            {recommended && (
              <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-sm">
                    Recommended Plan
                  </span>
                  {recommended.highlight && (
                    <Badge variant="default" className="text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{recommended.name}</span>
                    <span className="font-bold">{recommended.price}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {recommended.quota} per month
                  </div>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {recommended && (
            <Button onClick={handleUpgrade} className="w-full">
              Upgrade to {recommended.name}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Wait for quota reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
