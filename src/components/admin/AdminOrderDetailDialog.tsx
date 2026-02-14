"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import moment from "moment";
import { Order } from "@/types/order";

interface AdminOrderDetailDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminOrderDetailDialog({
  order,
  open,
  onOpenChange,
}: AdminOrderDetailDialogProps) {
  if (!order) return null;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { label: "Paid", variant: "default" },
      created: { label: "Pending", variant: "secondary" },
      deleted: { label: "Cancelled", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatAmount = (amount: number, currency: string | null) => {
    const displayAmount = (amount / 100).toFixed(2);
    const currencySymbol = currency === "USD" ? "$" : currency || "";
    return `${currencySymbol}${displayAmount}`;
  };

  const getIntervalLabel = (interval: string | null) => {
    const intervalMap: Record<string, string> = {
      "one-time": "One-time Purchase",
      month: "Monthly Subscription",
      year: "Yearly Subscription",
    };
    return interval ? intervalMap[interval] || interval : "-";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order Details</span>
            {getStatusBadge(order.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Order Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Order No.</p>
                <p className="font-mono text-sm">{order.order_no}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="text-sm">
                  {order.created_at ? moment(order.created_at).format("YYYY-MM-DD HH:mm:ss") : "-"}
                </p>
              </div>
            </div>
            {(order.user_email || order.paid_email) && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">User Email</p>
                <p className="text-sm">{order.paid_email || order.user_email}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Product Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">
              Product Information
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Product Name</p>
                <p className="font-medium">{order.product_name || "-"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Product ID</p>
                  <p className="font-mono text-sm">{order.product_id || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="text-sm">{getIntervalLabel(order.interval) || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Credits (MC)</p>
                  <p className="text-lg font-semibold">{order.credits} MC</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-lg font-semibold">
                    {formatAmount(order.amount, order.currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          {order.status === "paid" && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  Payment Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {order.paid_at && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Paid At</p>
                      <p className="text-sm">
                        {moment(order.paid_at).format("YYYY-MM-DD HH:mm:ss")}
                      </p>
                    </div>
                  )}
                  {order.expired_at && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Expires At</p>
                      <p className="text-sm">
                        {moment(order.expired_at).format("YYYY-MM-DD HH:mm:ss")}
                      </p>
                    </div>
                  )}
                </div>
                {order.valid_months && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Valid Period</p>
                    <p className="text-sm">{order.valid_months} months</p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Subscription Information */}
          {order.sub_id && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  Subscription Information
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Subscription ID</p>
                  <p className="font-mono text-sm">{order.sub_id}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Session Information */}
          {order.stripe_session_id && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                Session Information
              </h3>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Session ID</p>
                <p className="font-mono text-xs break-all">{order.stripe_session_id}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
