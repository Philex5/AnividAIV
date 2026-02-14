"use client";

import { useEffect, useState } from "react";
import TableSlot from "@/components/console/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import moment from "moment";

interface MyCreditsTabProps {
  userUuid: string;
  pageData: any;
}

interface CreditItem {
  transNo: string;
  transType: string;
  amount: number;
  createdAt: string;
  expiresAt?: string;
  orderInterval?: string; // For distinguishing subscription vs one-time
}

interface CreditSummary {
  balance: number;
  totalEarned: number;
  totalUsed: number;
  expiringCredits?: number;
  expiringAt?: string;
}

export default function MyCreditsTab({ userUuid, pageData }: MyCreditsTabProps) {
  const [summary, setSummary] = useState<CreditSummary>({ balance: 0, totalEarned: 0, totalUsed: 0 });
  const [timeline, setTimeline] = useState<CreditItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userUuid) {
      fetchCreditsData();
    }
  }, [userUuid]);

  const fetchCreditsData = async () => {
    try {
      setLoading(true);

      // 使用 POST 方法并传递必要参数
      const response = await fetch("/api/get-user-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          window: "all",
          type: "all",
          includeTimeline: true,
          limit: 100,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // API返回格式: {code: 0, data: {...summary, timeline}}
        if (data.code === 0) {
          const { timeline: timelineData, ...summaryData } = data.data;
          setSummary({
            balance: summaryData.balance || 0,
            totalEarned: summaryData.totalEarned || 0,
            totalUsed: summaryData.totalUsed || 0,
            expiringCredits: summaryData.expiringCredits,
            expiringAt: summaryData.expiringAt,
          });
          setTimeline(timelineData || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch credits data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-lg font-medium text-muted-foreground">Loading credits...</span>
        </div>
      </div>
    );
  }

  // Helper function to get transaction type display text
  const getTransTypeDisplay = (item: CreditItem): string => {
    // Handle subscription types (both monthly and yearly)
    if (item.transType === "order_pay_monthly" || item.transType === "order_pay_yearly") {
      return pageData?.credits?.trans_types?.order_pay_subscription || "Subscription (Monthly Credits)";
    }

    // For order_pay, distinguish between one-time and subscription
    if (item.transType === "order_pay") {
      if (item.orderInterval) {
        return pageData?.credits?.trans_types?.order_pay_subscription || "Subscription (Monthly Credits)";
      }
      return pageData?.credits?.trans_types?.order_pay_one_time || "One-time Purchase";
    }

    // For other types, use the mapping
    const typeMap: { [key: string]: string } = {
      "new_user": pageData?.credits?.trans_types?.new_user || "New User Bonus",
      "order_pay": pageData?.credits?.trans_types?.order_pay_one_time || "One-time Purchase",
      "order_pay_one_time": pageData?.credits?.trans_types?.order_pay_one_time || "One-time Purchase",
      "order_pay_monthly": pageData?.credits?.trans_types?.order_pay_subscription || "Subscription (Monthly Credits)",
      "order_pay_yearly": pageData?.credits?.trans_types?.order_pay_subscription || "Subscription (Monthly Credits)",
      "system_add": pageData?.credits?.trans_types?.system_add || "System Add",
      "ping": pageData?.credits?.trans_types?.ping || "API Usage",
      "chat": pageData?.credits?.trans_types?.chat || "Chat Usage",
      "chat_refund": pageData?.credits?.trans_types?.chat_refund || "Chat Refund",
      "oc_generation": pageData?.credits?.trans_types?.oc_generation || "OC Generation",
      "image_generation": pageData?.credits?.trans_types?.image_generation || "Image Generation",
      "image_generation_refund": pageData?.credits?.trans_types?.image_generation_refund || "Image Generation Refund",
      "video_generation": pageData?.credits?.trans_types?.video_generation || "Video Generation",
      "video_generation_refund": pageData?.credits?.trans_types?.video_generation_refund || "Video Generation Refund",
    };

    return typeMap[item.transType] || item.transType;
  };

  // 适配数据格式以匹配 TableSlot 期望的结构
  const data = timeline.map((item) => ({
    trans_no: item.transNo,
    trans_type: getTransTypeDisplay(item),
    credits: item.amount,
    created_at: item.createdAt,
    // For negative credits (consumption), do not show expiry date
    expired_at: item.amount < 0 ? null : item.expiresAt,
  }));

  const table: TableSlotType = {
    title: pageData?.credits?.title || "My Credits",
    tip: {
      title: pageData?.credits?.summary_tip
        ? pageData.credits.summary_tip
            .replace("{balance}", String(Math.max(0, summary.balance || 0)))
            .replace("{totalEarned}", String(summary.totalEarned || 0))
            .replace("{totalUsed}", String(summary.totalUsed || 0))
        : `Balance: ${Math.max(0, summary.balance || 0)} | Earned: ${summary.totalEarned || 0} | Used: ${summary.totalUsed || 0}`,
      description:
        (summary.expiringCredits || 0) > 0
          ? pageData?.credits?.expiring_tip
              ? pageData.credits.expiring_tip
                  .replace("{expiringCredits}", String(summary.expiringCredits || 0))
                  .replace(
                    "{expiringAt}",
                    summary.expiringAt
                      ? moment(summary.expiringAt).format("YYYY-MM-DD HH:mm")
                      : "-"
                  )
              : `${summary.expiringCredits || 0} credits expiring at ${summary.expiringAt ? moment(summary.expiringAt).format("YYYY-MM-DD HH:mm") : "-"}`
          : pageData?.credits?.no_expiring_tip || "No credits expiring soon",
    },
    toolbar: {
      items: [
        {
          title: pageData?.credits?.recharge || "Get more [MC] (MC)",
          url: "/pricing",
          target: "_self",
        },
      ],
    },
    columns: [
      {
        title: pageData?.credits?.table?.trans_no || "Transaction No.",
        name: "trans_no",
      },
      {
        title: pageData?.credits?.table?.trans_type || "Type",
        name: "trans_type",
      },
      {
        title: pageData?.credits?.table?.credits || "Credits",
        name: "credits",
        callback: (v: any) => {
          const isNegative = v.credits < 0;
          return (
            <span className={`font-bold ${isNegative ? 'text-destructive' : 'text-primary'}`}>
              {isNegative ? '' : '+'}{v.credits.toLocaleString()}
            </span>
          );
        }
      },
      {
        title: pageData?.credits?.table?.created_at || "Created At",
        name: "created_at",
        callback: (v: any) => {
          return (
            <div className="text-sm">
              <div className="font-medium text-foreground">{moment(v.created_at).format("YYYY-MM-DD")}</div>
              <div className="text-xs text-muted-foreground">{moment(v.created_at).format("HH:mm:ss")}</div>
            </div>
          );
        },
      },
      {
        title: pageData?.credits?.table?.expired_at || "Expires At",
        name: "expired_at",
        callback: (v: any) => {
          // If credits is negative (consumption), show "-" (no expiry)
          if (v.credits < 0 || !v.expired_at) {
            return "-";
          }

          const t = moment(v.expired_at);
          return (
            <div className="text-sm">
              <div className="font-medium text-foreground">{t.format("YYYY-MM-DD")}</div>
              <div className="text-xs text-primary font-bold">{t.fromNow()}</div>
            </div>
          );
        },
      },
    ],
    data,
    empty_message: pageData?.credits?.no_credits || "No credit records found",
  };

  return (
    <div className="glass-card rounded-3xl p-8">
      <TableSlot {...table} />
    </div>
  );
}
