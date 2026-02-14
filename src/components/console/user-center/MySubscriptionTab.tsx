"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { RiVipCrownLine, RiLoader2Line, RiErrorWarningLine } from "react-icons/ri";
import CancelSubscriptionDialog from "./CancelSubscriptionDialog";
import { toast } from "sonner";
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

interface Subscription {
  order_no: string;
  sub_id: string | null;
  plan_type: string;
  interval: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  amount: number;
  currency: string;
  credits: number;
  sub_times: number;
  created_at: string;
  paid_at: string | null;
}

interface Membership {
  current_level: string;
  is_sub: boolean;
  expired_at: string | null;
  plan_type: string;
  billing_cycle?: string;
  config: {
    level: string;
    display_name: string;
    monthly_credits: number;
    yearly_credits: number;
  };
}

interface SubscriptionData {
  currentSubscription: Subscription | null;
  subscriptionHistory: Subscription[];
  membership: Membership;
}

type ApiError = Error & {
  status?: number;
  retryable?: boolean;
  code?: string;
};

export default function MySubscriptionTab({
  userUuid,
  pageData,
}: {
  userUuid: string;
  pageData: any;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
  const [canceling, setCanceling] = useState(false);

  // 取消订阅对话框状态
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, [userUuid]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/subscriptions", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch subscription data");
      }

      setSubscriptionData(data.data);
    } catch (err: any) {
      console.error("Fetch subscription failed:", err);
      setError(err.message || "Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  // v5.1优化：打开取消订阅对话框（移除退款预览）
  const handleOpenCancelDialog = async () => {
    if (!subscriptionData?.currentSubscription?.sub_id) {
      setError("No active subscription found");
      return;
    }

    try {
      setCancelDialogOpen(true);
      setError(null);
      // v5.1不再需要获取退款预览，直接显示取消确认
    } catch (err: any) {
      console.error("Open cancel dialog failed:", err);
      setError(err.message || "Failed to open cancel dialog");
      toast.error("Failed to open cancel dialog");
    }
  };

  // v5.1优化：确认取消订阅（调用 /api/subscriptions/cancel）
  const handleConfirmCancellation = async () => {
    if (!subscriptionData?.currentSubscription?.sub_id) {
      setError("No active subscription found");
      return;
    }

    try {
      setCanceling(true);
      setError(null);

      const payload = {
        sub_id: subscriptionData.currentSubscription.sub_id,
        reason: "User requested cancellation",
      };

      let attempt = 0;
      const maxAttempts = 2;

      while (attempt < maxAttempts) {
        try {
          // v5.1调用 /api/subscriptions/cancel（period_end方式）
          const response = await fetch("/api/subscriptions/cancel", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (!response.ok) {
            const apiError = new Error(data.error || "Failed to cancel subscription") as ApiError;
            apiError.status = response.status;
            apiError.retryable = Boolean(data.retryable);
            apiError.code = data.code;
            throw apiError;
          }

          break;
        } catch (apiErr: any) {
          const isRetryable = apiErr?.retryable || apiErr?.status === 503;
          const isLastAttempt = attempt === maxAttempts - 1;

          if (!isRetryable || isLastAttempt) {
            throw apiErr;
          }

          // 仅重试一次，避免重复请求放大问题
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempt += 1;
        }
      }

      // 关闭对话框
      setCancelDialogOpen(false);

      // 刷新订阅数据
      await fetchSubscriptionData();
    } catch (err: any) {
      console.error("Cancel subscription failed:", err);
      const errorMessage = err.message || "Failed to cancel subscription";
      const isRetryable = err?.retryable || err?.status === 503;

      if (isRetryable) {
        toast.error("Temporary connection issue with Stripe. Please retry shortly.");
        return;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-8">
        <div className="flex items-center justify-center py-8">
          <RiLoader2Line className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-lg font-medium text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-3xl p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <RiErrorWarningLine className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={fetchSubscriptionData} variant="outline" className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const currentSubscription = subscriptionData?.currentSubscription;
  const membership = subscriptionData?.membership;

  // 判断用户是否为 free 用户（无活跃订阅）
  const isFreeUser =
    !currentSubscription ||
    currentSubscription.status === "canceled" ||
    membership?.current_level === "free" ||
    !membership?.is_sub;

  return (
    <div className="glass-card rounded-3xl p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <RiVipCrownLine className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">My Subscription</h2>
      </div>

      <div className="space-y-6">
        {isFreeUser ? (
          /* 无订阅状态 - 包括 free 用户和有订阅历史但已过期的用户 */
          <div className="text-center py-12 space-y-6">
            <div className="relative inline-block">
              <RiVipCrownLine className="h-20 w-20 mx-auto text-muted-foreground/30" />
              <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-bold">You haven't subscribed yet</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upgrade to a paid plan to unlock premium features, get monthly credits, and experience the full power of AnividAI.
              </p>
            </div>
            <Link href="/pricing">
              <Button size="lg" className="gap-2 rounded-full font-bold px-8 shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
                <RiVipCrownLine className="h-5 w-5" />
                View Pricing Plans
              </Button>
            </Link>
          </div>
        ) : currentSubscription ? (
          <div className="space-y-6">
            {/* 检查订阅是否已结束（仅对已取消的订阅） */}
            {currentSubscription.status === "canceled" &&
            currentSubscription.current_period_end &&
            new Date(currentSubscription.current_period_end) < new Date() ? (
              /* 订阅已结束，显示无订阅状态 */
              <div className="text-center py-12 space-y-6">
                <RiVipCrownLine className="h-20 w-20 mx-auto text-muted-foreground/30" />
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-xl font-bold">Your subscription has ended</h3>
                  <p className="text-muted-foreground">
                    Your subscription ended on{" "}
                    <span className="font-bold text-foreground">
                      {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                    </span>.
                  </p>
                </div>
                <Link href="/pricing">
                  <Button size="lg" className="gap-2 rounded-full font-bold px-8 shadow-lg transition-all">
                    <RiVipCrownLine className="h-5 w-5" />
                    Renew Subscription
                  </Button>
                </Link>
              </div>
            ) : (
              /* 订阅未结束，显示订阅信息 */
              <div className="space-y-8">
                {/* 当前订阅信息卡片 */}
                <div className="p-8 bg-primary/5 border border-primary/10 rounded-3xl space-y-6 relative overflow-hidden group transition-all hover:bg-primary/[0.08]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                          {membership?.config.display_name || "Pro"} Plan
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            className={`px-3 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-widest ${
                              currentSubscription.status === "active" || currentSubscription.status === "paid"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {currentSubscription.status === "active" || currentSubscription.status === "paid"
                              ? "Active"
                              : currentSubscription.status === "pending_cancel"
                                ? "Expiring Soon"
                                : "Inactive"}
                          </Badge>
                          {currentSubscription.interval === "year" && (
                            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 font-bold uppercase text-[10px] px-3 py-0.5 rounded-full">
                              Annual
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {(currentSubscription.status === "paid" || currentSubscription.status === "active") && (
                      <Button
                        onClick={handleOpenCancelDialog}
                        variant="outline"
                        className="border-destructive/30 text-destructive/60 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all rounded-full font-medium px-6"
                        disabled={canceling}
                      >
                        cancel
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-primary/10">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Billing Cycle</p>
                      <p className="text-base sm:text-lg font-bold text-foreground">
                        {currentSubscription.interval === "year" ? "Yearly" : "Monthly"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Amount</p>
                      <p className="text-base sm:text-lg font-bold text-foreground">
                        ${(currentSubscription.amount / 100).toFixed(2)}{" "}
                        <span className="text-xs sm:text-sm font-medium opacity-60 uppercase">{currentSubscription.currency}</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Monthly Credits</p>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-base sm:text-lg font-bold text-foreground flex items-center gap-1.5">
                          {currentSubscription.interval === "year"
                            ? (currentSubscription.credits / 12).toLocaleString()
                            : currentSubscription.credits.toLocaleString()}
                          <img src={getCreamyCharacterUrl("meow_coin")} className="w-4 h-4" alt="MC" />
                        </p>
                        {currentSubscription.interval === "year" && (
                          <p className="text-[10px] text-muted-foreground/70 font-medium">
                            {pageData?.orders?.monthly_credits_hint}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Next Billing Date</p>
                      <p className="text-base sm:text-lg font-bold text-foreground">
                        {currentSubscription.current_period_end
                          ? new Date(currentSubscription.current_period_end).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {currentSubscription.status === "pending_cancel" && (
                    <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 relative z-10">
                      <RiErrorWarningLine className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                        Your subscription will end at the current billing period (
                        {currentSubscription.current_period_end
                          ? new Date(currentSubscription.current_period_end).toLocaleDateString()
                          : "TBD"}
                        ). You will lose premium benefits after this date.
                      </p>
                    </div>
                  )}
                </div>

                <CancelSubscriptionDialog
                  open={cancelDialogOpen}
                  onOpenChange={setCancelDialogOpen}
                  subscription={currentSubscription}
                  onConfirm={handleConfirmCancellation}
                  isProcessing={canceling}
                  t={pageData?.subscription?.cancel_dialog}
                />

                {/* 订阅历史 - 采用更精简的设计 */}
                {subscriptionData?.subscriptionHistory &&
                  subscriptionData.subscriptionHistory.length > 1 && (
                    <div className="space-y-4 pt-8">
                      <h4 className="text-base sm:text-lg font-bold tracking-tight px-2">Subscription History</h4>
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {subscriptionData.subscriptionHistory.map((sub) => (
                          <div
                            key={sub.order_no}
                            className="p-4 rounded-2xl border border-border/40 hover:bg-muted/30 transition-colors flex justify-between items-center"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm sm:text-base font-bold">
                                  {sub.plan_type.toUpperCase()} Plan
                                </p>
                                <span className="text-xs font-bold text-primary flex items-center gap-1">
                                  {sub.credits.toLocaleString()}
                                  <img src={getCreamyCharacterUrl("meow_coin")} className="w-3 h-3" alt="MC" />
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {sub.interval === "year" ? "Yearly" : "Monthly"}
                                <span className="mx-2 opacity-30">|</span>
                                {new Date(sub.paid_at || sub.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase ${
                                sub.status === "paid" || sub.status === "active"
                                  ? "border-primary/30 text-primary bg-primary/5"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {sub.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
