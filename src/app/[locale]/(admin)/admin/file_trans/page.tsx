/**
 * File Transfer Monitors Page
 * 文件转存监控页面 - Admin专用
 *
 * 功能：
 * 1. 展示转存统计信息
 * 2. 展示转存趋势图表
 * 3. 列出待转存任务
 * 4. 提供手动触发转存按钮
 * 5. 共享筛选器状态管理
 */

import DataCards from "@/components/blocks/data-cards";
import DataCharts from "@/components/blocks/data-charts";
import { getTranslations } from "next-intl/server";
import { getTransferStats, getTransferTrend } from "@/services/admin/monitors";
import FileTransferSection from "@/components/admin/monitors/FileTransferSection";
import RefreshButton from "@/components/ui/refresh-button";

export default async function MonitorsPage() {
  const t = await getTranslations("admin.file_trans");

  // 获取转存统计数据
  const transferStats = await getTransferStats();
  const transferTrend = await getTransferTrend(7);

  // 构建指标卡片
  const dataCards = [
    {
      title: t("cards.pending_transfers.title"),
      label: "",
      value: String(transferStats.pendingTransfers),
      description: t("cards.pending_transfers.description"),
    },
    {
      title: t("cards.success_rate.title"),
      label: "",
      value: `${transferStats.successRate.toFixed(1)}%`,
      description: t("cards.success_rate.description"),
    },
    {
      title: t("cards.today_transfers.title"),
      label: "",
      value: String(transferStats.todayTransfers),
      description: t("cards.today_transfers.description"),
    },
    {
      title: t("cards.completed_transfers.title"),
      label: "",
      value: String(transferStats.completedTransfers),
      description: t("cards.completed_transfers.description"),
    },
    {
      title: t("cards.expiring_soon.title"),
      label: "",
      value: String(transferStats.expiringSoon),
      description: t("cards.expiring_soon.description"),
    },
    {
      title: t("cards.failed_transfers.title"),
      label: "",
      value: String(transferStats.failedTransfers),
      description: t("cards.failed_transfers.description"),
    },
  ];

  const fields = [
    { key: "success", label: t("chart.success"), color: "var(--secondary)" },
    { key: "failed", label: t("chart.failed"), color: "var(--destructive)" },
    { key: "pending", label: t("chart.pending"), color: "var(--accent)" },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* 标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <RefreshButton onRefresh={async () => {
          "use server";
          await Promise.all([
            getTransferStats(),
            getTransferTrend(7),
          ]);
        }} />
      </div>

      {/* 指标卡片 */}
      <DataCards
        dataCards={dataCards}
        className="sm:grid-cols-2 md:grid-cols-3 @xl/main:grid-cols-3 @5xl/main:grid-cols-6"
      />

      {/* 转存趋势图表 */}
      <DataCharts
        data={transferTrend}
        fields={fields}
        title={t("chart.title")}
        description={t("chart.description")}
        defaultTimeRange="7d"
      />

      {/* 文件转存管理区域 - 完全在客户端渲染 */}
      <FileTransferSection />
    </div>
  );
}
