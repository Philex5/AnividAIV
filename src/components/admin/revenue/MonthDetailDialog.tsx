"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import EditCostDialog from "./EditCostDialog";
import { formatCents } from "@/lib/currency";

interface MonthDetailData {
  month: string;
  totalCost: number;
  manualCost?: number;
  mcCost?: number;
  mcConsumed?: number;
  mcImageCost?: number;
  mcImageConsumed?: number;
  mcVideoCost?: number;
  mcVideoConsumed?: number;
  totalRevenue: number;
  costs: Array<{
    id: number;
    platform: string;
    amount: number;
    currency: string;
    note: string | null;
    created_at: string;
  }>;
  ordersByProduct: Array<{
    product_id: string;
    product_name: string;
    total_amount: number;
    count: number;
  }>;
}

interface MonthDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string | null;
  onSuccess?: () => void;
}

export default function MonthDetailDialog({
  open,
  onOpenChange,
  month,
  onSuccess,
}: MonthDetailDialogProps) {
  const t = useTranslations("admin.revenue");
  const [data, setData] = useState<MonthDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState<any>(null);

  useEffect(() => {
    if (open && month) {
      fetchMonthDetail(month);
    }
  }, [open, month]);

  const fetchMonthDetail = async (monthStr: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/month-detail?month=${monthStr}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch month detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cost: any) => {
    setSelectedCost(cost);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("edit_cost.confirm_delete"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/costs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete cost");
      }

      fetchMonthDetail(month!);
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting cost:", error);
      alert("Failed to delete cost");
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedCost(null);
    fetchMonthDetail(month!);
    onSuccess?.();
  };

  if (!month) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {t("detail.title")} {month}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("detail.loading")}
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* 汇总数据 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">
                    {t("detail.total_revenue")}
                  </div>
                  <div className="text-2xl font-bold">
                    ${data.totalRevenue.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">
                    {t("detail.total_cost")}
                  </div>
                  <div className="text-2xl font-bold">
                    ${data.totalCost.toFixed(2)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("detail.manual_cost")}: ${(data.manualCost || 0).toFixed(2)} · {t("detail.mc_cost")}: ${(data.mcCost || 0).toFixed(2)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("detail.mc_consumed")}: {data.mcConsumed || 0} MC
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("detail.mc_image_cost")}: ${(data.mcImageCost || 0).toFixed(2)} ({t("detail.mc_image_consumed")}: {data.mcImageConsumed || 0} MC)
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("detail.mc_video_cost")}: ${(data.mcVideoCost || 0).toFixed(2)} ({t("detail.mc_video_consumed")}: {data.mcVideoConsumed || 0} MC)
                  </div>
                </div>
              </div>

              {/* 成本详情 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  {t("detail.cost_details")}
                </h3>
                {data.costs.length > 0 ? (
                  <div className="space-y-2">
                    {data.costs.map((cost) => (
                      <div
                        key={cost.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{cost.platform}</div>
                          {cost.note && (
                            <div className="text-sm text-muted-foreground">
                              {cost.note}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {new Date(cost.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatCents(cost.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {cost.currency}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(cost)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(cost.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("detail.no_costs")}
                  </div>
                )}
              </div>

              <Separator />

              {/* 订单详情 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  {t("detail.order_details")}
                </h3>
                {data.ordersByProduct.length > 0 ? (
                  <div className="space-y-2">
                    {data.ordersByProduct.map((product) => (
                      <div
                        key={product.product_id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {product.product_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("detail.orders_count")}: {product.count}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCents(product.total_amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("detail.no_orders")}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("detail.no_data")}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      <EditCostDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        cost={selectedCost}
        onSuccess={handleEditSuccess}
      />
    </Dialog>
  );
}
