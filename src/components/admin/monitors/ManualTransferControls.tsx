/**
 * Manual Transfer Controls Component
 * 手动转存控制台组件
 *
 * 功能：
 * 1. 提供手动触发全部转存的按钮
 * 2. 提供手动触发图片后处理的按钮
 * 3. 显示操作结果和状态
 * 4. 使用共享筛选器状态管理
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useFileTransferContext } from "@/contexts/admin/FileTransferContext";

export default function ManualTransferControls() {
  const t = useTranslations("admin.file_trans.controls");
  const [transferLoading, setTransferLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { filters, resetFilters } = useFileTransferContext();

  const triggerAllTransfers = async () => {
    setTransferLoading(true);
    setLastResult(null);

    try {
      const typeFilter = [];
      if (filters.includeImages) typeFilter.push("image");
      if (filters.includeVideos) typeFilter.push("video");
      if (filters.includeCharacters) typeFilter.push("character");

      if (typeFilter.length === 0) {
        alert(
          t("errors.no_type_selected") ||
            "Please select at least one type to transfer"
        );
        return;
      }

      const response = await fetch("/api/admin/file-transfer/trigger-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_date: filters.startDate || null,
          end_date: filters.endDate || null,
          type_filter: typeFilter,
          triggered_by: "admin_panel",
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      const isSuccess = response.ok && data.success !== false;

      setLastResult({
        type: "transfer",
        success: isSuccess,
        data,
      });

      if (isSuccess) {
        const message = data.message || "Transfer triggered successfully";
        alert(`✅ ${message}`);
        setLastResult({
          type: "transfer",
          success: true,
          data,
        });
        // 转存成功后重置筛选条件
        resetFilters();
      } else {
        const errorMsg = data.error || data.message || "Unknown error";
        alert(`❌ Transfer failed: ${errorMsg}`);
        setLastResult({
          type: "transfer",
          success: false,
          data,
        });
      }
    } catch (error) {
      console.error("Trigger transfer failed:", error);
      const errorMsg = error instanceof Error ? error.message : "Network error";
      setLastResult({
        type: "transfer",
        success: false,
        error: errorMsg,
      });
      alert(`❌ Network error: ${errorMsg}`);
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">{t("title")}</h3>

      <div className="flex flex-col gap-4">
        {/* 统一转存按钮 */}
        <Button
          onClick={triggerAllTransfers}
          disabled={transferLoading}
          className="w-full h-10 text-base font-medium"
        >
          {transferLoading
            ? t("triggering") || "Transferring..."
            : t("trigger_all_transfers") || "Manual Transfer"}
        </Button>

        {lastResult && (
          <div
            className={`p-4 rounded-md ${
              lastResult.success
                ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            <div className="font-semibold mb-2">
              {lastResult.type === "transfer"
                ? t("result.transfer_operation") || "Transfer Operation"
                : t("result.operation") || "Operation"}
            </div>
            {lastResult.success ? (
              <pre className="text-sm overflow-auto">
                {JSON.stringify(lastResult.data, null, 2)}
              </pre>
            ) : (
              <div className="text-sm">
                {t("result.error", {
                  error: lastResult.error || lastResult.data?.error,
                }) || `Error: ${lastResult.error || lastResult.data?.error}`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
