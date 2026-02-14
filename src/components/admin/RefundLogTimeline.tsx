"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, Circle, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
  id: number;
  created_at: string;
  to_status: string;
  reason: string;
  metadata?: Record<string, any>;
  created_by?: string;
}

interface RefundLogTimelineProps {
  orderNo: string;
}

export function RefundLogTimeline({ orderNo }: RefundLogTimelineProps) {
  const t = useTranslations("admin.refunds");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [orderNo]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // 这里应该调用实际的API来获取退款日志
      // 暂时使用模拟数据
      const mockLogs: LogEntry[] = [
        {
          id: 1,
          created_at: new Date().toISOString(),
          to_status: "refunded",
          reason: "Refund completed successfully",
          created_by: "system",
          metadata: {
            refund_amount: 4200,
            currency: "USD",
          },
        },
        {
          id: 2,
          created_at: new Date(Date.now() - 60000).toISOString(),
          to_status: "refund_processing",
          reason: "Refund is being processed",
          created_by: "system",
          metadata: {
            stripe_refund_id: "re_123456789",
          },
        },
        {
          id: 3,
          created_at: new Date(Date.now() - 120000).toISOString(),
          to_status: "refund_requested",
          reason: "Refund requested by admin",
          created_by: "admin",
        },
      ];
      setLogs(mockLogs);
    } catch (error) {
      console.error("Failed to fetch refund logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "refunded":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "refund_processing":
        return <Clock className="w-5 h-5 text-blue-500" />;
      case "refund_requested":
        return <Circle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "refunded":
        return "bg-green-100 text-green-800 border-green-200";
      case "refund_processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "refund_requested":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      refunded: t("timeline.status.refunded"),
      refund_processing: t("timeline.status.processing"),
      refund_requested: t("timeline.status.requested"),
      payment_failed: t("timeline.status.paymentFailed"),
      subscription_canceled: t("timeline.status.subscriptionCanceled"),
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-pulse text-muted-foreground">
          {t("timeline.loading")}
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("timeline.noLogs")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => (
        <div key={log.id} className="relative">
          {/* Timeline line */}
          {index < logs.length - 1 && (
            <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
          )}

          <div className="flex gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon(log.to_status)}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={getStatusColor(log.to_status)}>
                  {getStatusLabel(log.to_status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(log.created_at)}
                </span>
              </div>

              <div className="text-sm text-muted-foreground mb-2">
                {log.reason}
              </div>

              {/* Metadata */}
              {log.metadata && (
                <div className="bg-muted/50 p-3 rounded-md text-xs">
                  <div className="font-medium mb-1">{t("timeline.details")}:</div>
                  {log.metadata.refund_amount && (
                    <div>
                      <span className="text-muted-foreground">{t("timeline.amount")}: </span>
                      <span className="font-medium">
                        ${(log.metadata.refund_amount / 100).toFixed(2)} {log.metadata.currency}
                      </span>
                    </div>
                  )}
                  {log.metadata.stripe_refund_id && (
                    <div>
                      <span className="text-muted-foreground">{t("timeline.stripeRefundId")}: </span>
                      <span className="font-mono">{log.metadata.stripe_refund_id}</span>
                    </div>
                  )}
                  {log.created_by && (
                    <div>
                      <span className="text-muted-foreground">{t("timeline.operator")}: </span>
                      <span className="font-medium">{log.created_by}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
