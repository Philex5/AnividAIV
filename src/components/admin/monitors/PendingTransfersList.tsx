/**
 * Pending Transfers List Component
 * 待转存任务列表组件
 *
 * 功能：
 * 1. 展示所有待转存的任务
 * 2. 提供单个任务的转存按钮
 * 3. 显示任务状态和优先级
 * 4. 使用共享筛选器状态管理
 */

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFileTransferContext } from "@/contexts/admin/FileTransferContext";

interface PendingTransfer {
  uuid: string;
  created_at: string;
  temp_url_expires_at?: string;
  transfer_retry_count: number;
  file_transfer_status: string;
  result_urls_count?: number;
}

export default function PendingTransfersList() {
  const t = useTranslations("admin.file_trans.pending_list");
  const itemT = useTranslations("admin.file_trans.transfer_item");
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
  const [transferringUuids, setTransferringUuids] = useState<Set<string>>(
    new Set()
  );
  const { buildQueryParams } = useFileTransferContext();

  // 加载待转存列表
  const loadPendingTransfers = async () => {
    setLoading(true);

    try {
      const params = buildQueryParams();
      const response = await fetch(
        `/api/admin/file-transfer/pending-list?${params.toString()}`
      );
      const data = await response.json();

      if (response.ok) {
        setTransfers(data.data?.transfers || []);
      } else {
        alert(`Load failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Load pending transfers failed:", error);
      alert("Network error, load failed");
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    loadPendingTransfers();
  }, [buildQueryParams]);

  // 触发单个任务转存
  const triggerSingleTransfer = async (uuid: string) => {
    // 防止重复点击
    if (transferringUuids.has(uuid)) {
      return;
    }

    // 添加到传输中列表
    setTransferringUuids((prev) => new Set(prev).add(uuid));

    try {
      const response = await fetch(
        `/api/admin/file-transfer/trigger-one/${uuid}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Task ${uuid} transferred successfully!`);
        // 立刻刷新列表
        await loadPendingTransfers();
      } else {
        alert(
          `❌ Task ${uuid} transfer failed: ${data.error || data.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Trigger single transfer failed:", error);
      alert(
        `❌ Network error: ${error instanceof Error ? error.message : "Transfer failed"}`
      );
    } finally {
      // 移除传输中状态
      setTransferringUuids((prev) => {
        const newSet = new Set(prev);
        newSet.delete(uuid);
        return newSet;
      });
    }
  };

  /**
   * 获取状态文本
   */
  const getStatusText = (status: string): string => {
    const translation = itemT(`status_map.${status}`);
    // 如果翻译不存在，返回原始status
    return translation === `status_map.${status}` ? status : translation;
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <Button
          onClick={loadPendingTransfers}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? t("loading") : t("refresh")}
        </Button>
      </div>

      {transfers.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <p>📭 {t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer) => (
            <div
              key={transfer.uuid}
              className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-mono text-sm mb-2">
                    ID: {transfer.uuid}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {itemT("created_at")}
                      </span>
                      <span>
                        {new Date(transfer.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground">
                        {itemT("retry_count")}
                      </span>
                      <span className="font-semibold">
                        {transfer.transfer_retry_count}
                      </span>
                    </div>

                    {transfer.temp_url_expires_at && (
                      <div>
                        <span className="text-muted-foreground">
                          {itemT("expires_at")}
                        </span>
                        <span
                          className={
                            new Date(transfer.temp_url_expires_at).getTime() <
                            Date.now() + 24 * 60 * 60 * 1000
                              ? "text-destructive font-semibold"
                              : ""
                          }
                        >
                          {new Date(
                            transfer.temp_url_expires_at
                          ).toLocaleString()}
                          {new Date(transfer.temp_url_expires_at).getTime() <
                            Date.now() + 24 * 60 * 60 * 1000 && " ⚠️"}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-muted-foreground">
                        {itemT("status")}
                      </span>
                      <span className="font-semibold">
                        {getStatusText(transfer.file_transfer_status)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => triggerSingleTransfer(transfer.uuid)}
                  size="sm"
                  className="ml-4"
                  disabled={transferringUuids.has(transfer.uuid)}
                >
                  {transferringUuids.has(transfer.uuid)
                    ? "⏳ Transferring..."
                    : t("manual_transfer")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
