"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RiLoader2Line, RiHistoryLine, RiArrowRightUpLine } from "react-icons/ri";

interface SubscriptionLog {
  id: string;
  subscription_id: string;
  user_uuid: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
}

interface Subscription {
  order_no: string;
  user_email: string;
  user_uuid: string;
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
  paid_at: string | null;
  user_display_name: string | null;
}

interface SubscriptionLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
}

export default function SubscriptionLogsDialog({
  open,
  onOpenChange,
  subscription,
}: SubscriptionLogsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SubscriptionLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && subscription?.sub_id) {
      fetchLogs();
    }
  }, [open, subscription]);

  const fetchLogs = async () => {
    if (!subscription?.sub_id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/subscriptions?sub_id=${subscription.sub_id}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch logs");
      }

      setLogs(result.data.logs || []);
    } catch (err: any) {
      console.error("Fetch subscription logs failed:", err);
      setError(err.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      active: "default",
      pending_cancel: "secondary",
      canceled: "destructive",
      expired: "destructive",
      created: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatMetadata = (metadata: Record<string, any>) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return null;
    }

    return Object.entries(metadata).map(([key, value]) => (
      <div key={key} className="text-xs">
        <span className="text-muted-foreground">{key}:</span>{" "}
        <span className="font-mono">{String(value)}</span>
      </div>
    ));
  };

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <RiHistoryLine className="w-6 h-6" />
            Subscription Logs
          </DialogTitle>
          <DialogDescription>
            Complete history of subscription status changes for {subscription.user_email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Subscription Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">User Email</p>
                <p className="font-medium">{subscription.user_email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Subscription ID</p>
                <p className="font-mono text-sm">{subscription.sub_id}</p>
              </div>
            </div>
          </div>

          {/* Logs */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RiLoader2Line className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading logs...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No logs found for this subscription
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={log.id} className="bg-background border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <RiArrowRightUpLine className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Status Change</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Status Transition */}
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.from_status)}
                      <RiArrowRightUpLine className="w-3 h-3 text-muted-foreground" />
                      {getStatusBadge(log.to_status)}
                    </div>

                    {/* Reason */}
                    {log.reason && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Reason:</p>
                        <p className="text-sm">{log.reason}</p>
                      </div>
                    )}

                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Additional Info:</p>
                        <div className="bg-muted/30 rounded p-2 space-y-1">
                          {formatMetadata(log.metadata)}
                        </div>
                      </div>
                    )}

                    {/* Created By */}
                    {log.created_by && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Created by:</span> {log.created_by}
                      </div>
                    )}
                  </div>

                  {/* Separator between logs */}
                  {index < logs.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
