"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import ChatMetricsCards from "@/components/admin/chats/ChatMetricsCards";
import ChatTrendChart from "@/components/admin/chats/ChatTrendChart";
import TopOcCards from "@/components/admin/chats/TopOcCards";
import ChatSessionsTable from "@/components/admin/chats/ChatSessionsTable";
import ChatSessionDetailDialog from "@/components/admin/chats/ChatSessionDetailDialog";
import {
  AdminChatSessionDetail,
  AdminChatSessionItem,
  AdminChatTrendPoint,
  AdminTopOcItem,
} from "@/components/admin/chats/types";

interface OverviewResponse {
  totals: {
    sessions: number;
    users: number;
  };
  trends: AdminChatTrendPoint[];
}

interface SessionsResponse {
  items: AdminChatSessionItem[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export default function ChatsPageClient({ pageData }: { pageData: any }) {
  const text = pageData || {};

  const t = (key: string, values?: Record<string, string | number>) => {
    const keys = key.split(".");
    let value: any = text;
    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value !== "string") {
      return key;
    }

    if (!values) {
      return value;
    }

    return Object.entries(values).reduce((acc, [k, v]) => {
      return acc.replaceAll(`{${k}}`, String(v));
    }, value);
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [overviewDay, setOverviewDay] = useState<OverviewResponse>({
    totals: { sessions: 0, users: 0 },
    trends: [],
  });
  const [overviewMonth, setOverviewMonth] = useState<OverviewResponse>({
    totals: { sessions: 0, users: 0 },
    trends: [],
  });
  const [topOcs, setTopOcs] = useState<AdminTopOcItem[]>([]);
  const [sessionsData, setSessionsData] = useState<SessionsResponse>({
    items: [],
    total: 0,
    page: 1,
    limit: 50,
    has_more: false,
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<AdminChatSessionDetail | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const summaryTotals = useMemo(() => overviewDay.totals, [overviewDay]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [overviewDayRes, overviewMonthRes, topOcsRes, sessionsRes] = await Promise.all([
          fetch("/api/admin/chats/overview?granularity=day", { cache: "no-store" }),
          fetch("/api/admin/chats/overview?granularity=month", { cache: "no-store" }),
          fetch("/api/admin/chats/top-ocs?limit=3", { cache: "no-store" }),
          fetch(`/api/admin/chats/sessions?page=${currentPage}&limit=50&sort=created_at_desc`, {
            cache: "no-store",
          }),
        ]);

        if (!overviewDayRes.ok || !overviewMonthRes.ok || !topOcsRes.ok || !sessionsRes.ok) {
          throw new Error(t("errors.load_failed"));
        }

        const overviewDayJson = await overviewDayRes.json();
        const overviewMonthJson = await overviewMonthRes.json();
        const topOcsJson = await topOcsRes.json();
        const sessionsJson = await sessionsRes.json();

        if (
          overviewDayJson.code !== 0 ||
          overviewMonthJson.code !== 0 ||
          topOcsJson.code !== 0 ||
          sessionsJson.code !== 0
        ) {
          throw new Error(t("errors.load_failed"));
        }

        setOverviewDay(overviewDayJson.data || { totals: { sessions: 0, users: 0 }, trends: [] });
        setOverviewMonth(overviewMonthJson.data || { totals: { sessions: 0, users: 0 }, trends: [] });
        setTopOcs(topOcsJson.data?.items || []);
        setSessionsData(
          sessionsJson.data || {
            items: [],
            total: 0,
            page: currentPage,
            limit: 50,
            has_more: false,
          }
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t("errors.load_failed");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, refreshKey]);

  const handleViewSession = async (sessionId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);

    try {
      const response = await fetch(`/api/admin/chats/sessions/${sessionId}/messages`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(t("errors.load_detail_failed"));
      }

      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || t("errors.load_detail_failed"));
      }

      setDetailData(result.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("errors.load_detail_failed");
      setError(message);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefreshKey((prev) => prev + 1)}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          {t("actions.refresh")}
        </Button>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div className="text-sm text-muted-foreground">{t("states.loading")}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <ChatMetricsCards
                totalSessions={summaryTotals.sessions}
                totalUsers={summaryTotals.users}
                t={(key) => t(key)}
              />
            </div>
            <div className="lg:col-span-2">
              <ChatTrendChart
                dayData={overviewDay.trends}
                monthData={overviewMonth.trends}
                t={(key) => t(key)}
              />
            </div>
          </div>

          <TopOcCards items={topOcs} t={(key, values) => t(key, values)} />

          <ChatSessionsTable
            items={sessionsData.items}
            total={sessionsData.total}
            page={sessionsData.page}
            limit={sessionsData.limit}
            onPageChange={setCurrentPage}
            onView={handleViewSession}
            t={(key) => t(key)}
          />
        </>
      )}

      <ChatSessionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        data={detailData}
        loading={detailLoading}
        t={(key) => t(key)}
      />
    </div>
  );
}

