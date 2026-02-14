"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AdminChatTrendPoint } from "@/components/admin/chats/types";

type Granularity = "day" | "month";

interface ChartItem {
  date: string;
  sessions: number;
  users: number;
}

export default function ChatTrendChart({
  dayData,
  monthData,
  t,
}: {
  dayData: AdminChatTrendPoint[];
  monthData: AdminChatTrendPoint[];
  t: (key: string) => string;
}) {
  const [granularity, setGranularity] = React.useState<Granularity>("day");

  const chartConfig = {
    sessions: {
      label: t("chart.sessions"),
      color: "var(--primary)",
    },
    users: {
      label: t("chart.users"),
      color: "var(--accent)",
    },
  } satisfies ChartConfig;

  const chartData: ChartItem[] = (granularity === "day" ? dayData : monthData).map((item) => ({
    date: item.bucket,
    sessions: item.sessions,
    users: item.users,
  }));

  const formatTick = (value: string) => {
    if (granularity === "month") {
      const [year, month] = value.split("-");
      if (!year || !month) {
        return value;
      }
      return `${year.slice(2)}-${month}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{t("chart.title")}</CardTitle>
        <CardDescription>{t("chart.description")}</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={granularity}
            onValueChange={(value) => {
              if (value === "day" || value === "month") {
                setGranularity(value);
              }
            }}
            variant="outline"
            className="*:data-[slot=toggle-group-item]:!px-4"
          >
            <ToggleGroupItem value="day">{t("chart.day")}</ToggleGroupItem>
            <ToggleGroupItem value="month">{t("chart.month")}</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fill-sessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fill-users" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={formatTick}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    granularity === "month"
                      ? `${t("chart.month_label")}: ${value}`
                      : new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="sessions"
              type="natural"
              fill="url(#fill-sessions)"
              stroke="var(--primary)"
            />
            <Area
              dataKey="users"
              type="natural"
              fill="url(#fill-users)"
              stroke="var(--accent)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

