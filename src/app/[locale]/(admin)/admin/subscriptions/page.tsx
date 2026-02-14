"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiArrowDownSLine, RiArrowUpSLine, RiLoader2Line, RiSearchLine } from "react-icons/ri";
import DataCharts from "@/components/blocks/data-charts";
import SubscriptionDetailDialog from "@/components/admin/SubscriptionDetailDialog";
import SubscriptionLogsDialog from "@/components/admin/SubscriptionLogsDialog";
import AdminUserAvatar from "@/components/admin/AdminUserAvatar";
import pageCopy from "@/i18n/pages/admin-subscriptions/en.json";

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  thisMonthCount: number;
}

interface Subscription {
  order_no: string;
  user_email: string;
  user_uuid: string;
  user_avatar_url: string | null;
  product_id: string | null;
  product_name: string | null;
  interval: string | null;
  status: string;
  amount: number;
  currency: string;
  credits: number;
  sub_id: string | null;
  sub_period_start: number | null;
  sub_period_end: number | null;
  sub_times: number | null;
  created_at: string;
  updated_at: string | null;
  paid_at: string | null;
  user_display_name: string | null;
}

interface SubscriptionsResponse {
  success: boolean;
  data: {
    subscriptions: Subscription[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats: SubscriptionStats;
    trendData?: {
      labels: string[];
      values: number[];
      chartData: Array<{
        date: string;
        subscriptions: number;
      }>;
    };
  };
}

export default function SubscriptionsPage() {
  const copy = pageCopy;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubscriptionsResponse["data"] | null>(null);

  // 筛选状态
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [status, setStatus] = useState("active");
  const [planType, setPlanType] = useState("all");
  const [interval, setInterval] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // 详情对话框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // 日志对话框状态
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedSubForLogs, setSelectedSubForLogs] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, [page, status, planType, interval, search, sortBy, sortOrder]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status,
        plan_type: planType,
        interval,
        search,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const response = await fetch(`/api/admin/subscriptions?${params}`);
      const result: SubscriptionsResponse = await response.json();

      if (!result.success) {
        throw new Error(result.data ? (result.data as any).error : copy.errors.loadFailed);
      }

      setData(result.data);
    } catch (err: any) {
      console.error("Fetch subscriptions failed:", err);
      setError(err.message || copy.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",           // 活跃订阅
      active: "default",         // 活跃订阅（新状态）
      pending_cancel: "secondary", // 待取消
      canceled: "destructive",   // 已取消
      expired: "destructive",    // 已过期
      created: "secondary",      // 已创建
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getPlanType = (productId: string | null) => {
    if (!productId) return copy.labels.unknown;
    if (productId.includes("basic")) return copy.filters.basic;
    if (productId.includes("plus")) return copy.filters.plus;
    if (productId.includes("pro")) return copy.filters.pro;
    return copy.labels.unknown;
  };

  const getIntervalLabel = (interval: string | null) => {
    return interval === "year"
      ? copy.labels.yearly
      : interval === "month"
        ? copy.labels.monthly
        : copy.labels.unknown;
  };

  const handleViewDetails = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setDetailDialogOpen(true);
  };

  const handleViewLogs = (sub: Subscription) => {
    setSelectedSubForLogs(sub);
    setLogsDialogOpen(true);
  };

  const toggleSort = (field: "created_at" | "updated_at") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const renderSortIcon = (field: "created_at" | "updated_at") => {
    if (sortBy !== field) {
      return <RiArrowDownSLine className="h-4 w-4 text-muted-foreground/40" />;
    }

    return sortOrder === "asc"
      ? <RiArrowUpSLine className="h-4 w-4 text-muted-foreground" />
      : <RiArrowDownSLine className="h-4 w-4 text-muted-foreground" />;
  };

  const formatDate = (value: string | null) => {
    if (!value) return copy.labels.unknown;
    return new Date(value).toLocaleDateString();
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
      </div>

      {/* 统计卡片 */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{copy.stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">{data.stats.totalSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{copy.stats.active}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">{data.stats.activeSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{copy.stats.canceledThisMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">{data.stats.canceledSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{copy.stats.thisMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">{data.stats.thisMonthCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{copy.stats.newSubscriptions}</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 订阅趋势图表 */}
      {data?.trendData?.chartData && (
        <Card>
          <CardContent className="p-6">
            <DataCharts
              title={copy.chart.title}
              description={copy.chart.description}
              data={data.trendData.chartData}
              fields={[
                { key: "subscriptions", label: copy.chart.series.subscriptions, color: "hsl(var(--primary))" }
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* 筛选和搜索 - 横栏布局 */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={copy.filters.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        <div className="w-[140px]">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={copy.filters.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.filters.allStatus}</SelectItem>
              <SelectItem value="active">{copy.filters.active}</SelectItem>
              <SelectItem value="paid">{copy.filters.paidLegacy}</SelectItem>
              <SelectItem value="pending_cancel">{copy.filters.stopping}</SelectItem>
              <SelectItem value="canceled">{copy.filters.canceled}</SelectItem>
              <SelectItem value="expired">{copy.filters.expired}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[140px]">
          <Select value={planType} onValueChange={setPlanType}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={copy.filters.planType} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.filters.allPlans}</SelectItem>
              <SelectItem value="basic">{copy.filters.basic}</SelectItem>
              <SelectItem value="plus">{copy.filters.plus}</SelectItem>
              <SelectItem value="pro">{copy.filters.pro}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[140px]">
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={copy.filters.interval} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.filters.allIntervals}</SelectItem>
              <SelectItem value="month">{copy.filters.monthly}</SelectItem>
              <SelectItem value="year">{copy.filters.yearly}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={fetchSubscriptions} variant="outline" className="h-9 px-6">
          {copy.filters.apply}
        </Button>
      </div>

      {/* 订阅列表 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RiLoader2Line className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{copy.loading}</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              {error}
            </div>
          ) : data ? (
            <>
              <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] text-center">{copy.table.user}</TableHead>
                      <TableHead className="text-center">{copy.table.plan}</TableHead>
                      <TableHead className="text-center">{copy.table.interval}</TableHead>
                      <TableHead className="text-center">{copy.table.status}</TableHead>
                      <TableHead className="text-center">{copy.table.price}</TableHead>
                      <TableHead className="text-center">{copy.table.subTimes}</TableHead>
                      <TableHead className="text-center">{copy.table.credits}</TableHead>
                      <TableHead className="text-center">
                        <button
                          type="button"
                          onClick={() => toggleSort("created_at")}
                          className="inline-flex items-center gap-1"
                        >
                          {copy.table.created}
                          {renderSortIcon("created_at")}
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button
                          type="button"
                          onClick={() => toggleSort("updated_at")}
                          className="inline-flex items-center gap-1"
                        >
                          {copy.table.updated}
                          {renderSortIcon("updated_at")}
                        </button>
                      </TableHead>
                      <TableHead className="text-center">{copy.table.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.subscriptions.map((sub) => (
                      <TableRow key={sub.order_no}>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <AdminUserAvatar
                              avatarUrl={sub.user_avatar_url}
                              name={sub.user_display_name}
                              email={sub.user_email}
                            />
                            <div className="space-y-1 text-left">
                              <p className="font-medium leading-none">{sub.user_display_name || copy.labels.unknown}</p>
                              <p className="text-sm text-muted-foreground">{sub.user_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-normal">
                            {getPlanType(sub.product_id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {getIntervalLabel(sub.interval)}
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(sub.status)}</TableCell>
                        <TableCell className="text-center font-mono">
                          ${(sub.amount / 100).toFixed(2)} {sub.currency}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {sub.sub_times || 1}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {sub.credits.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {formatDate(sub.created_at)}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {formatDate(sub.updated_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => handleViewDetails(sub)}
                            >
                              {copy.actions.viewDetails}
                            </Button>
                            {sub.sub_id && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8"
                                onClick={() => handleViewLogs(sub)}
                              >
                                {copy.actions.logs}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    {copy.pagination.pageInfo
                      .replace("{page}", String(data.pagination.page))
                      .replace("{totalPages}", String(data.pagination.totalPages))
                      .replace("{total}", String(data.pagination.total))}
                  </p>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      {copy.pagination.previous}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === data.pagination.totalPages}
                    >
                      {copy.pagination.next}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* 订阅详情对话框 */}
      <SubscriptionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        subscription={selectedSubscription}
      />

      {/* 订阅日志对话框 */}
      <SubscriptionLogsDialog
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
        subscription={selectedSubForLogs}
      />
    </div>
  );
}
