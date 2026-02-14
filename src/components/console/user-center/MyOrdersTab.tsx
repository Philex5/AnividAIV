"use client";

import { useEffect, useState } from "react";
import TableSlot from "@/components/console/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import UserOrderDetailDialog from "./UserOrderDetailDialog";
import { getCreamyCharacterUrl } from "@/lib/asset-loader";

interface MyOrdersTabProps {
  userUuid: string;
  pageData: any;
}

interface Order {
  id: number;
  order_no: string;
  product_name: string;
  product_id: string;
  amount: number;
  currency: string;
  status: string;
  interval: string;
  credits: number;
  created_at: string;
  paid_at?: string;
  expired_at?: string;
  sub_id?: string;
  stripe_session_id?: string;
  valid_months?: number;
}

export default function MyOrdersTab({ userUuid, pageData }: MyOrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (userUuid) {
      fetchOrders();
    }
  }, [userUuid]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/orders");

      if (response.ok) {
        const data = await response.json();
        if (data.code === 0) {
          setOrders(data.data.orders || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-lg font-medium text-muted-foreground">Loading orders...</span>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        className: string;
      }
    > = {
      paid: { 
        label: "Paid", 
        className: "bg-primary/20 text-primary border-primary/30" 
      },
      created: { 
        label: "Pending", 
        className: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" 
      },
      deleted: { 
        label: "Cancelled", 
        className: "bg-destructive/20 text-destructive border-destructive/30" 
      },
    };

    const statusInfo = statusMap[status] || {
      label: status,
      className: "bg-muted text-muted-foreground border-border",
    };
    return (
      <Badge variant="outline" className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusInfo.className}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getIntervalLabel = (interval: string) => {
    const intervalMap: Record<string, string> = {
      "one-time": "One-time",
      month: "Monthly",
      year: "Yearly",
    };
    return intervalMap[interval] || interval;
  };

  const formatAmount = (amount: number, currency: string) => {
    const displayAmount = (amount / 100).toFixed(2);
    const currencySymbol = currency === "USD" ? "$" : currency;
    return `${currencySymbol}${displayAmount}`;
  };

  const table: TableSlotType = {
    title: pageData?.orders?.title || "My Orders",
    toolbar: {
      items: [
        {
          title: "Buy Credits",
          url: "/pricing",
          target: "_self",
          icon: "RiBankCardLine",
        },
      ],
    },
    columns: [
      {
        title: pageData?.orders?.order_no || "Order No.",
        name: "order_no",
        callback: (v: any) => {
          return <span className="font-mono text-xs text-muted-foreground opacity-70">{v.order_no}</span>;
        },
      },
      {
        title: pageData?.orders?.product_name || "Product",
        name: "product_name",
        callback: (v: any) => {
          const isYearly = v.interval === "year";
          const monthlyCredits = isYearly ? Math.floor(v.credits / 12) : v.credits;
          
          return (
            <div className="space-y-1">
              <div className="font-bold text-foreground">{v.product_name}</div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <div className="flex items-center gap-1 text-primary">
                    <span>{monthlyCredits.toLocaleString()}</span>
                    <img src={getCreamyCharacterUrl("meow_coin")} className="w-3 h-3" alt="MC" />
                    {isYearly && <span className="text-[9px] opacity-70 lowercase">/ mo</span>}
                  </div>
                  <span className="opacity-30">•</span>
                  <span>{getIntervalLabel(v.interval)}</span>
                </div>
                
                {isYearly && (
                  <div className="text-[10px] font-medium text-muted-foreground/60 flex items-center gap-1">
                    <span>Total: {v.credits.toLocaleString()}</span>
                    <img src={getCreamyCharacterUrl("meow_coin")} className="w-2.5 h-2.5" alt="MC" />
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        title: pageData?.orders?.amount || "Amount",
        name: "amount",
        callback: (v: any) => {
          return (
            <div className="font-extrabold text-foreground">
              {formatAmount(v.amount, v.currency)}
            </div>
          );
        },
      },
      {
        title: pageData?.orders?.status || "Status",
        name: "status",
        callback: (v: any) => getStatusBadge(v.status),
      },
      {
        title: pageData?.orders?.created_at || "Created At",
        name: "created_at",
        callback: (v: any) => {
          return (
            <div className="text-sm">
              <div className="font-medium text-foreground">{moment(v.created_at).format("YYYY-MM-DD")}</div>
              <div className="text-xs text-muted-foreground">{moment(v.created_at).format("HH:mm:ss")}</div>
            </div>
          );
        },
      },
      {
        title: "Actions",
        name: "actions",
        callback: (v: any) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors text-xs font-bold"
              onClick={() => handleViewDetails(v)}
            >
              {pageData?.orders?.view_details || "View Details"}
            </Button>
          );
        },
      },
    ],
    data: orders,
    empty_message: pageData?.orders?.no_orders || "No orders found",
  };

  return (
    <div className="glass-card rounded-3xl p-8">
      <TableSlot {...table} />
      <UserOrderDetailDialog
        order={selectedOrder}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        pageData={pageData}
      />
    </div>
  );
}
