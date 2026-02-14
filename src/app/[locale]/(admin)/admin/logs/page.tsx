import DataCards from "@/components/blocks/data-cards";
import ExportButton from "@/components/admin/logs/ExportButton";
import LogsTabs from "@/components/admin/logs/LogsTabs";
import GenerationTrendChart from "@/components/admin/logs/GenerationTrendChart";
import {
  listFailedGenerations,
  getFailureStats,
  getGenerationStats,
  getGenerationTrendSince,
  getGenerationTypeSummary,
} from "@/services/admin";
import { listAllGenerationsWithPagination } from "@/services/admin-generations";
import { getTranslations } from "next-intl/server";
import RefreshButton from "@/components/ui/refresh-button";

export default async function AdminLogsPage() {
  const t = await getTranslations("admin.logs");
  const trendStart = new Date();
  trendStart.setDate(trendStart.getDate() - 365);

  const [items, stats, generationStats, allGenerations, trendMap, typeMap] = await Promise.all([
    listFailedGenerations({ limit: 100 }),
    getFailureStats(),
    getGenerationStats(),
    listAllGenerationsWithPagination({ limit: 100, page: 1 }),
    getGenerationTrendSince(trendStart.toISOString()),
    getGenerationTypeSummary(),
  ]);

  const summaryCards = [
    {
      title: t("stats.total"),
      label: "",
      value: generationStats.total.toString(),
      description: t("stats.total_desc"),
    },
    {
      title: t("stats.success"),
      label: "",
      value: generationStats.success.toString(),
      description: t("stats.success_desc"),
    },
    {
      title: t("stats.failed"),
      label: "",
      value: generationStats.failed.toString(),
      description: t("stats.failed_desc"),
    },
    {
      title: t("stats.success_rate"),
      label: "",
      value: `${generationStats.successRate.toFixed(2)}%`,
      description: t("stats.success_rate_desc"),
    },
  ];

  const typeCards = Array.from(typeMap.entries()).map(
    ([type, count]) => ({
      title: type,
      label: "",
      value: String(count),
      description: t("types.desc"),
    })
  );

  const trendData = Array.from(trendMap.values())
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((item) => ({
      date: item.date,
      total: item.total,
      successRate: item.total > 0 ? (item.success / item.total) * 100 : 0,
    }));

  return (
    <div className="items-center justify-between gap-8 p-4 lg:p-6 pt-4">
      <div className="flex items-center justify-between mt-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <ExportButton data={items as any} />
          <RefreshButton onRefresh={async () => {
            "use server";
            await Promise.all([
              listFailedGenerations({ limit: 100 }),
              getFailureStats(),
              getGenerationStats(),
              listAllGenerationsWithPagination({ limit: 100, page: 1 }),
              getGenerationTrendSince(trendStart.toISOString()),
              getGenerationTypeSummary(),
            ]);
          }} />
        </div>
      </div>

      <DataCards
        dataCards={summaryCards}
        className="sm:grid-cols-2 md:grid-cols-4 @xl/main:grid-cols-4 @5xl/main:grid-cols-4"
      />
      <GenerationTrendChart data={trendData} />
      <LogsTabs
        allItems={allGenerations.data as any[]}
        failedItems={items as any[]}
        typeCards={typeCards}
        topErrors={stats.topErrors}
      />
    </div>
  );
}
