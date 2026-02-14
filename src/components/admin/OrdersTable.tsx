"use client";

import { useState } from "react";
import { TableColumn } from "@/types/blocks/table";
import TableBlock from "@/components/blocks/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AdminOrderDetailDialog from "@/components/admin/AdminOrderDetailDialog";
import moment from "moment";
import { Order } from "@/types/order";

interface OrdersTableProps {
  orders: Order[];
  translations: {
    order_no: string;
    paid_email: string;
    product_name: string;
    amount: string;
    created_at: string;
    status: string;
    actions: string;
    view_details: string;
  };
}

export default function OrdersTable({
  orders,
  translations,
}: OrdersTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      paid: { label: "Paid", variant: "default" },
      created: { label: "Pending", variant: "secondary" },
      deleted: { label: "Cancelled", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || {
      label: status,
      variant: "outline" as const,
    };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatAmount = (amount: number, currency: string | null) => {
    const displayAmount = (amount / 100).toFixed(2);
    const currencySymbol = currency === "USD" ? "$" : currency || "";
    return `${currencySymbol}${displayAmount}`;
  };

  const columns: TableColumn[] = [
    {
      name: "order_no",
      title: translations.order_no,
      callback: (row) => (
        <span className="font-mono text-xs">{row.order_no}</span>
      ),
    },
    {
      name: "paid_email",
      title: translations.paid_email,
    },
    {
      name: "product_name",
      title: translations.product_name,
      callback: (row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.product_name || "-"}</div>
        </div>
      ),
    },
    {
      name: "amount",
      title: translations.amount,
      callback: (row) => (
        <span className="font-medium">
          {formatAmount(row.amount, row.currency)}
        </span>
      ),
    },
    {
      name: "status",
      title: translations.status,
      callback: (row) => getStatusBadge(row.status),
    },
    {
      name: "created_at",
      title: translations.created_at,
      callback: (row) => {
        const date = row.created_at ? moment(row.created_at).format("YYYY-MM-DD HH:mm:ss") : "-";
        return date;
      },
    },
    {
      name: "actions",
      title: translations.actions,
      callback: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetails(row)}
        >
          {translations.view_details}
        </Button>
      ),
    },
  ];

  return (
    <>
      <TableBlock columns={columns} data={orders} />
      <AdminOrderDetailDialog
        order={selectedOrder}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </>
  );
}
