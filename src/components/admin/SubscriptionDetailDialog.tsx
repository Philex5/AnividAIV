"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RiLoader2Line, RiRefund2Line, RiCalendarLine, RiUser3Line } from "react-icons/ri";

interface Subscription {
  order_no: string;
  user_email: string;
  user_uuid: string;
  product_id: string | null;
  product_name: string | null;
  interval: string | null;
  status: string;
  amount: number;
  currency: string;
  credits: number;
  sub_id: string | null;
  sub_period_start: number | null;
  sub_period_end: number | null;
  sub_times: number | null;
  created_at: string;
  paid_at: string | null;
  user_display_name: string | null;
}

interface RefundPreview {
  interval: "year" | "month";
  plan_type: string;
  current_period_end: string;
  total_paid: number;
  activated_months?: number;
  unactivated_months?: number;
  refund_amount?: number;
  monthly_amount?: number;
}

interface SubscriptionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
}

export default function SubscriptionDetailDialog({
  open,
  onOpenChange,
  subscription,
}: SubscriptionDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [refundPreview, setRefundPreview] = useState<RefundPreview | null>(null);

  useEffect(() => {
    if (open && subscription?.sub_id && subscription.interval === "year") {
      fetchRefundPreview();
    }
  }, [open, subscription]);

  const fetchRefundPreview = async () => {
    if (!subscription?.sub_id) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/subscriptions/refund-preview?sub_id=${subscription.sub_id}`
      );
      const data = await response.json();

      if (response.ok) {
        setRefundPreview(data);
      }
    } catch (err) {
      console.error("Failed to fetch refund preview:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) return null;

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (timestamp: number | string | null) => {
    if (!timestamp) return "N/A";
    const date = typeof timestamp === "number" ? new Date(timestamp * 1000) : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanType = (productId: string | null) => {
    if (!productId) return "Unknown";
    if (productId.includes("basic")) return "Basic";
    if (productId.includes("plus")) return "Plus";
    if (productId.includes("pro")) return "Pro";
    return "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      paid: "default",            // 活跃订阅
      active: "default",          // 活跃订阅（新状态）
      pending_cancel: "secondary", // 待取消
      canceled: "destructive",    // 已取消
      expired: "destructive",     // 已过期
      created: "secondary",       // 已创建
    };
    return <Badge variant={variants[status] || "secondary"}>{status.toUpperCase()}</Badge>;
  };

  const isYearly = subscription.interval === "year";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Subscription Details</DialogTitle>
          <DialogDescription>
            Complete information about this subscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Information */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <RiUser3Line className="w-4 h-4" />
              User Information
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="font-medium">{subscription.user_email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Display Name</p>
                <p className="font-medium">{subscription.user_display_name || "N/A"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">User UUID</p>
                <p className="font-mono text-sm">{subscription.user_uuid}</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Subscription Information */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <RiCalendarLine className="w-4 h-4" />
              Subscription Information
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Plan</p>
                <Badge variant="outline" className="font-semibold">
                  {getPlanType(subscription.product_id)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Interval</p>
                <p className="font-medium">
                  {subscription.interval === "year" ? "Yearly" : "Monthly"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                {getStatusBadge(subscription.status)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Renewal Count</p>
                <p className="font-medium">{subscription.sub_times || 0} times</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <p className="font-semibold text-lg">
                  {formatCurrency(subscription.amount)} {subscription.currency.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Credits</p>
                <p className="font-semibold text-lg">
                  {subscription.credits.toLocaleString()} MC
                </p>
              </div>
              {subscription.sub_period_start && subscription.sub_period_end && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Period Start</p>
                    <p className="font-medium">{formatDate(subscription.sub_period_start)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Period End</p>
                    <p className="font-medium">{formatDate(subscription.sub_period_end)}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created At</p>
                <p className="font-medium">{formatDate(subscription.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Paid At</p>
                <p className="font-medium">{formatDate(subscription.paid_at)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Order Number</p>
                <p className="font-mono text-sm">{subscription.order_no}</p>
              </div>
              {subscription.sub_id && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Stripe Subscription ID</p>
                  <p className="font-mono text-sm">{subscription.sub_id}</p>
                </div>
              )}
            </div>
          </section>

          {/* Refund Information (Annual Only) */}
          {isYearly && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                  <RiRefund2Line className="w-4 h-4" />
                  Refund Information (If Canceled)
                </h3>

                {loading ? (
                  <div className="flex items-center justify-center py-8 bg-muted/30 rounded-lg">
                    <RiLoader2Line className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading refund details...
                    </span>
                  </div>
                ) : refundPreview ? (
                  <div className="border-2 border-primary/20 rounded-lg p-4 space-y-4 bg-muted/10">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-background rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Activated Months</p>
                        <p className="text-2xl font-bold text-destructive">
                          {refundPreview.activated_months}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Non-refundable</p>
                      </div>
                      <div className="bg-background rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Remaining Months</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {refundPreview.unactivated_months}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Refundable</p>
                      </div>
                      <div className="bg-background rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Monthly Rate</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(refundPreview.monthly_amount || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Per month</p>
                      </div>
                    </div>

                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-2">Refund Calculation</p>
                      <div className="font-mono text-sm space-y-1">
                        <p>
                          {formatCurrency(refundPreview.total_paid)} × (
                          {refundPreview.unactivated_months} / 12)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          = {formatCurrency(refundPreview.refund_amount || 0)}
                        </p>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium">Potential Refund Amount:</span>
                        <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(refundPreview.refund_amount || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
                      <p className="font-semibold mb-1">Note:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          Credits for months {(refundPreview.activated_months || 0) + 1}-12 will be
                          voided
                        </li>
                        <li>Refunds are processed to the original payment method</li>
                        <li>Processing time: 5-10 business days</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                    Unable to load refund information
                  </div>
                )}
              </section>
            </>
          )}

          {!isYearly && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                  Refund Policy
                </h3>
                <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                  <p>
                    Monthly subscriptions are non-refundable. The subscription will remain active
                    until the end of the current billing period if canceled.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
