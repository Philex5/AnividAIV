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
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

interface Order {
  id: number;
  order_no: string;
  product_name: string;
  amount: number;
  currency: string;
  status: string;
  interval: string;
  credits: number;
  paid_at?: string;
  expired_at?: string;
  valid_months?: number;
}

interface UserOrderDetailDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageData?: any;
}

export default function UserOrderDetailDialog({
  order,
  open,
  onOpenChange,
  pageData,
}: UserOrderDetailDialogProps) {
  if (!order) return null;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { label: "Paid", variant: "default" },
      created: { label: "Pending", variant: "secondary" },
      deleted: { label: "Cancelled", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={statusInfo.variant} className="rounded-full px-3">{statusInfo.label}</Badge>;
  };

  const formatAmount = (amount: number, currency: string) => {
    const displayAmount = (amount / 100).toFixed(2);
    const currencySymbol = currency === "USD" ? "$" : currency;
    return `${currencySymbol}${displayAmount}`;
  };

  const getIntervalLabel = (interval: string) => {
    const intervalMap: Record<string, string> = {
      "one-time": "One-time Purchase",
      month: "Monthly Subscription",
      year: "Yearly Subscription",
    };
    return intervalMap[interval] || interval;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-3xl">
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
              {order.paid_at && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Paid At</p>
                  <p className="text-sm">
                    {moment(order.paid_at).format("YYYY-MM-DD HH:mm:ss")}
                  </p>
                </div>
              )}
            </div>
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
                <p className="font-medium">{order.product_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="text-sm">{getIntervalLabel(order.interval)}</p>
                </div>
                {order.valid_months && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Valid Period</p>
                    <p className="text-sm">{order.valid_months} months</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Credits</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-lg font-semibold text-primary">
                      <span>
                        {order.interval === "year" 
                          ? Math.floor(order.credits / 12).toLocaleString() 
                          : order.credits.toLocaleString()}
                      </span>
                      <img src={getCreamyCharacterUrl("meow_coin")} className="w-4 h-4" alt="MC" />
                      {order.interval === "year" && <span className="text-xs font-medium text-muted-foreground lowercase">/ mo</span>}
                    </div>
                    {order.interval === "year" && (
                      <div className="text-xs text-muted-foreground/60 font-medium flex items-center gap-1">
                        <span>Total: {order.credits.toLocaleString()}</span>
                        <img src={getCreamyCharacterUrl("meow_coin")} className="w-3 h-3" alt="MC" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-lg font-semibold">
                    {formatAmount(order.amount, order.currency)}
                  </p>
                </div>
              </div>
              {order.expired_at && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Expires At</p>
                  <p className="text-sm">
                    {moment(order.expired_at).format("YYYY-MM-DD HH:mm:ss")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
