"use client";

import { useMemo } from "react";
import moment from "moment";
import { useTranslations } from "next-intl";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import TableBlock from "@/components/blocks/table";
import DataCards from "@/components/blocks/data-cards";
import ErrorAnalysis from "@/components/admin/logs/ErrorAnalysis";
import { DataCard } from "@/types/blocks/base";

interface LogsTabsProps {
  allItems: any[];
  failedItems: any[];
  typeCards: DataCard[];
  topErrors: { code: string; count: number }[];
}

function getStatusClass(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "completed") {
    return "text-green-600";
  }
  if (normalized === "failed") {
    return "text-red-600";
  }
  return "text-yellow-600";
}

export default function LogsTabs({
  allItems,
  failedItems,
  typeCards,
  topErrors,
}: LogsTabsProps) {
  const t = useTranslations("admin.logs");

  const allColumns = useMemo(
    () => [
      {
        name: "uuid",
        title: t("table.uuid"),
        className: "w-[120px]",
        callback: (row: any) => row.uuid,
        type: "copy",
      },
      { name: "type", title: t("table.type"), className: "w-[100px]" },
      {
        name: "status",
        title: t("table.status"),
        className: "w-[100px]",
        callback: (row: any) => (
          <span className={getStatusClass(row.status)}>{row.status}</span>
        ),
      },
      { name: "error_code", title: t("table.error_code"), className: "w-[120px]" },
      {
        name: "error_message",
        title: t("table.error_message"),
        className: "w-[300px] max-w-[300px]",
        callback: (row: any) => row.error_message || "",
        type: "tooltip",
      },
      {
        name: "updated_at",
        title: t("table.updated_at"),
        className: "w-[160px]",
        callback: (row: any) => moment(row.updated_at).format("YYYY-MM-DD HH:mm:ss"),
      },
    ],
    [t]
  );

  const failedColumns = useMemo(
    () => [
      {
        name: "uuid",
        title: t("table.uuid"),
        className: "w-[120px]",
        callback: (row: any) => row.uuid,
        type: "copy",
      },
      { name: "type", title: t("table.type"), className: "w-[100px]" },
      {
        name: "status",
        title: t("table.status"),
        className: "w-[100px]",
        callback: (row: any) => (
          <span className={getStatusClass(row.status)}>{row.status}</span>
        ),
      },
      { name: "error_code", title: t("table.error_code"), className: "w-[120px]" },
      {
        name: "error_message",
        title: t("table.error_message"),
        className: "w-[300px] max-w-[300px]",
        callback: (row: any) => row.error_message || "",
        type: "tooltip",
      },
      {
        name: "mc_back_status",
        title: t("table.mc_back_status"),
        className: "w-[120px]",
        callback: (row: any) => row.mc_back_status || "pending",
      },
      {
        name: "mc_back_count",
        title: t("table.mc_back_count"),
        className: "w-[120px]",
        callback: (row: any) => row.mc_back_count || 0,
      },
      {
        name: "updated_at",
        title: t("table.updated_at"),
        className: "w-[160px]",
        callback: (row: any) => moment(row.updated_at).format("YYYY-MM-DD HH:mm:ss"),
      },
    ],
    [t]
  );

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList>
      <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
      <TabsTrigger value="failed">{t("tabs.failed")}</TabsTrigger>
    </TabsList>
    <TabsContent value="all" className="mt-4">
      {typeCards.length > 0 && (
        <div className="mb-4">
          <DataCards dataCards={typeCards} />
        </div>
      )}
      <Card className="overflow-x-auto px-6">
        <TableBlock
          columns={allColumns}
          data={allItems}
          emptyMessage={t("table.empty_all")}
        />
      </Card>
    </TabsContent>
    <TabsContent value="failed" className="mt-4">
      <div className="mb-4">
        <ErrorAnalysis topErrors={topErrors} />
      </div>
      <Card className="overflow-x-auto px-6">
        <TableBlock
          columns={failedColumns}
          data={failedItems}
            emptyMessage={t("table.empty_failed")}
          />
        </Card>
      </TabsContent>
    </Tabs>
  );
}
