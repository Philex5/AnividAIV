"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";

export interface GenerationTrendPoint {
  date: string;
  total: number;
  successRate: number;
}

type TimeRange = "7d" | "30d" | "365d" | "custom";

export default function GenerationTrendChart({
  data,
}: {
  data: GenerationTrendPoint[];
}) {
  const t = useTranslations("admin.logs");
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const lastDate = useMemo(() => {
    if (!data.length) return "";
    return data[data.length - 1].date;
  }, [data]);

  useEffect(() => {
    if (timeRange !== "custom" || !lastDate) return;
    if (!customEnd) {
      setCustomEnd(lastDate);
    }
    if (!customStart) {
      const start = new Date(lastDate);
      start.setDate(start.getDate() - 30);
      setCustomStart(formatDateInput(start));
    }
  }, [timeRange, lastDate, customStart, customEnd]);

  const filteredData = useMemo(() => {
    if (!data.length) return [];
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (timeRange === "custom") {
      if (!customStart || !customEnd) return [];
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const end = new Date(lastDate);
      const start = new Date(end);
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 365;
      start.setDate(start.getDate() - days);
      startDate = start;
      endDate = end;
    }

    return data.filter((item) => {
      const date = new Date(item.date);
      return date >= (startDate as Date) && date <= (endDate as Date);
    });
  }, [data, timeRange, customStart, customEnd, lastDate]);

  const chartConfig = {
    total: {
      label: t("chart.total"),
      color: "var(--primary)",
    },
    successRate: {
      label: t("chart.success_rate"),
      color: "var(--secondary)",
    },
  };

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{t("chart.title")}</CardTitle>
        <CardDescription>{t("chart.description")}</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value: TimeRange) => {
              if (value) {
                setTimeRange(value);
              }
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-3 @[767px]/card:flex"
          >
            <ToggleGroupItem value="365d">{t("chart.range_year")}</ToggleGroupItem>
            <ToggleGroupItem value="30d">{t("chart.range_month")}</ToggleGroupItem>
            <ToggleGroupItem value="7d">{t("chart.range_week")}</ToggleGroupItem>
            <ToggleGroupItem value="custom">{t("chart.range_custom")}</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value: TimeRange) => setTimeRange(value)}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label={t("chart.range_select")}
            >
              <SelectValue placeholder={t("chart.range_year")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="365d" className="rounded-lg">
                {t("chart.range_year")}
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                {t("chart.range_month")}
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                {t("chart.range_week")}
              </SelectItem>
              <SelectItem value="custom" className="rounded-lg">
                {t("chart.range_custom")}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      {timeRange === "custom" && (
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("chart.range_start")}</span>
              <Input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="h-9 w-[160px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("chart.range_end")}</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="h-9 w-[160px]"
              />
            </div>
          </div>
        </div>
      )}
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[280px] w-full"
        >
          <ComposedChart data={filteredData}>
            <defs>
              <linearGradient id="fill-total" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-total)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  formatter={(value, name) => {
                    if (name === "successRate") {
                      return [`${Number(value).toFixed(2)}%`, t("chart.success_rate")];
                    }
                    return [value, t("chart.total")];
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="total"
              name="total"
              type="natural"
              yAxisId="left"
              fill="url(#fill-total)"
              stroke="var(--color-total)"
              stackId="a"
            />
            <Line
              dataKey="successRate"
              name="successRate"
              type="monotone"
              yAxisId="right"
              stroke="var(--color-successRate)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
