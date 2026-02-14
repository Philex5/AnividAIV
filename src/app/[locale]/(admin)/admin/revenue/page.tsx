"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import DataCharts from "@/components/blocks/data-charts";
import DataCards from "@/components/blocks/data-cards";
import AddCostDialog from "@/components/admin/revenue/AddCostDialog";
import MonthDetailDialog from "@/components/admin/revenue/MonthDetailDialog";
import RevenueTabs from "@/components/admin/revenue/RevenueTabs";
import ProductDistributionCard from "@/components/admin/revenue/ProductDistributionCard";
import { useTranslations } from "next-intl";

function getCurrentMonthString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function useAdminRevenueData(activeTab: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (!data) {
      setLoading(true);
    }
    try {
      // 根据 activeTab 获取不同的数据
      const range = activeTab === "current" ? "current" : "all";

      // 并发获取基础数据
      const [totalRevenue, totalOrders, totalCosts] = await Promise.all([
        fetch(`/api/admin/analytics/revenue/total?range=${range}`).then(r => r.json()),
        fetch(`/api/admin/analytics/orders/count?range=${range}`).then(r => r.json()),
        fetch(`/api/admin/analytics/costs/total?range=${range}`).then(r => r.json()),
      ]);

      if (totalRevenue.error || totalOrders.error || totalCosts.error) {
        throw new Error("Failed to fetch data");
      }

      // 获取产品分布数据
      const productsResponse = await fetch(`/api/admin/analytics/orders/by-product?range=${range}`);
      const productsData = await productsResponse.json();

      // 计算利润
      const revenue = (totalRevenue.total || 0) / 100;
      const costs = (totalCosts.total || 0) / 100;
      const manualCosts = (totalCosts.manual_total || 0) / 100;
      const mcCosts = (totalCosts.mc_cost || 0) / 100;
      const mcConsumed = totalCosts.mc_consumed || 0;
      const mcImageCosts = (totalCosts.mc_image_cost || 0) / 100;
      const mcImageConsumed = totalCosts.mc_image_consumed || 0;
      const mcVideoCosts = (totalCosts.mc_video_cost || 0) / 100;
      const mcVideoConsumed = totalCosts.mc_video_consumed || 0;
      const profit = revenue - costs;

      // 获取所有月份数据（用于底部展示）
      const monthsResponse = await fetch("/api/admin/analytics/months");
      const months = await monthsResponse.json();

      if (months.error) {
        throw new Error("Failed to fetch months");
      }

      // 获取图表数据
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const revMap = await fetch(`/api/admin/analytics/revenue/trend?start=${start.toISOString()}`).then(r => r.json());

      const trend = Array.from(Object.entries(revMap.data || {}))
        .map(([date, amount]) => ({ date, amount: Number(amount) }))
        .sort((a, b) => (a.date > b.date ? 1 : -1));

      // 获取前6个月的详细信息
      const monthsToShow = (months.data || []).slice(0, 6);
      const monthDetails = await Promise.all(
        monthsToShow.map(async (m: string) => {
          const [revenue, costs] = await Promise.all([
            fetch(`/api/admin/analytics/revenue/month?month=${m}`).then(r => r.json()),
            fetch(`/api/admin/analytics/costs/month?month=${m}`).then(r => r.json()),
          ]);
          return {
            month: m,
            revenue: (revenue.total || 0) / 100,
            costs: (costs.total || 0) / 100,
            manualCosts: (costs.manual_total || 0) / 100,
            mcCosts: (costs.mc_cost || 0) / 100,
            mcConsumed: costs.mc_consumed || 0,
            mcImageCosts: (costs.mc_image_cost || 0) / 100,
            mcImageConsumed: costs.mc_image_consumed || 0,
            mcVideoCosts: (costs.mc_video_cost || 0) / 100,
            mcVideoConsumed: costs.mc_video_consumed || 0,
            orders: revenue.orders || [],
          };
        })
      );

      setData({
        revenue,
        orders: totalOrders.count || 0,
        costs,
        manualCosts,
        mcCosts,
        mcConsumed,
        mcImageCosts,
        mcImageConsumed,
        mcVideoCosts,
        mcVideoConsumed,
        profit,
        products: productsData.data || [],
        trend,
        months: months.data || [],
        monthDetails,
        currentMonth: getCurrentMonthString(),
        range,
      });
    } catch (error) {
      console.error("Failed to fetch data:", error);
      // 如果获取失败，保留旧数据而不是清空
      if (data) {
        // 显示错误提示，但保留数据
        alert("Failed to refresh data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const openMonthDetail = (month: string) => {
    setSelectedMonth(month);
    setDialogOpen(true);
  };

  return {
    data,
    loading,
    currentPage,
    setCurrentPage,
    openMonthDetail,
    selectedMonth,
    dialogOpen,
    setDialogOpen,
    refetch: fetchData,
  };
}

export default function AdminRevenuePage() {
  const t = useTranslations("admin.revenue");
  const [activeTab, setActiveTab] = useState("current");

  const {
    data,
    loading,
    currentPage,
    setCurrentPage,
    openMonthDetail,
    selectedMonth,
    dialogOpen,
    setDialogOpen,
    refetch,
  } = useAdminRevenueData(activeTab);

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        <div className="text-center py-8">{t("loading")}</div>
      </div>
    );
  }

  const itemsPerPage = 5;
  const totalPages = Math.ceil(data.months.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const visibleMonths = data.monthDetails.slice(startIndex, startIndex + itemsPerPage);

  const dataCards = [
    {
      title: t("cards.orders"),
      value: data.orders.toString(),
      description: activeTab === "current" ? `${data.currentMonth} orders` : "Total paid orders",
    },
    {
      title: t("cards.revenue"),
      value: `$${data.revenue.toFixed(2)}`,
      description: activeTab === "current" ? `${data.currentMonth} revenue` : "All time revenue",
    },
    {
      title: t("cards.cost"),
      value: `${data.mcConsumed} MC`,
      description:
        t("cards.mc_usd_breakdown", {
          total: data.mcCosts.toFixed(2),
          image: data.mcImageCosts.toFixed(2),
          video: data.mcVideoCosts.toFixed(2),
        }),
      tip: t("cards.mc_total_and_type", {
        total: data.mcConsumed,
        image: data.mcImageConsumed,
        video: data.mcVideoConsumed,
      }),
    },
    {
      title: t("cards.profit"),
      value: `$${data.profit.toFixed(2)}`,
      description: activeTab === "current" ? `${data.currentMonth} profit` : "All time profit",
    },
  ];

  const fields = [{ key: "amount", label: t("chart.revenue"), color: "var(--primary)" }];

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("summary.revenue_summary")}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <RevenueTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <AddCostDialog onSuccess={refetch} />
        </div>
      </div>

      <DataCards dataCards={dataCards} />

      <div className="flex flex-row gap-6">
        <div className="w-[30%]">
          <ProductDistributionCard
            products={data.products}
            range={data.range}
          />
        </div>
        <div className="w-[70%]">
          <DataCharts
            data={data.trend}
            fields={fields}
            title={t("chart.title")}
            description={t("chart.description")}
            defaultTimeRange="90d"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("summary.monthly_details")}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @xl:grid-cols-3">
          {visibleMonths.map((block: any) => {
            const monthProfit = block.revenue - block.costs;
            const margin = block.revenue > 0 ? ((monthProfit / block.revenue) * 100).toFixed(1) : "0";

            return (
              <div
                key={block.month}
                className="rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openMonthDetail(block.month)}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium">{block.month}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("costs.profit_margin")}: {margin}%
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("summary.revenue")}:</span>
                    <span className="font-medium text-green-600">${block.revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("costs.cost")}:</span>
                    <span className="font-medium text-red-600">${block.costs.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("costs.manual_cost")}:</span>
                    <span>${(block.manualCosts || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("costs.mc_cost")}:</span>
                    <span>${(block.mcCosts || 0).toFixed(2)} ({t("costs.mc_consumed")} {(block.mcConsumed || 0)} MC)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("costs.mc_image_cost")}:</span>
                    <span>${(block.mcImageCosts || 0).toFixed(2)} ({t("costs.mc_image_consumed")} {(block.mcImageConsumed || 0)} MC)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("costs.mc_video_cost")}:</span>
                    <span>${(block.mcVideoCosts || 0).toFixed(2)} ({t("costs.mc_video_consumed")} {(block.mcVideoConsumed || 0)} MC)</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">{t("costs.profit")}:</span>
                    <span className={`font-medium ${monthProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${monthProfit.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground text-center">
                    {t("detail.click_to_view")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MonthDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        month={selectedMonth}
        onSuccess={refetch}
      />
    </div>
  );
}
