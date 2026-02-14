/**
 * File Transfer Section
 * 文件转存管理区域 - 客户端组件
 *
 * 功能：
 * 1. 统一的筛选控制台
 * 2. 待转存任务列表
 * 3. 手动操作控制台
 * 4. 共享筛选状态管理
 */

"use client";

import { useTranslations } from "next-intl";
import FileTransferFilters from "./FileTransferFilters";
import PendingTransfersList from "./PendingTransfersList";
import ManualTransferControls from "./ManualTransferControls";
import {
  FileTransferProvider,
  useFileTransferContext,
} from "@/contexts/admin/FileTransferContext";

function FileTransferContent() {
  const t = useTranslations("admin.file_trans");
  const { filters, updateFilter, resetFilters } = useFileTransferContext();

  return (
    <div className="space-y-6">
      {/* 统一的筛选控制台 */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <FileTransferFilters
          filters={filters}
          onFilterChange={updateFilter}
          onReset={resetFilters}
          showApplyButton={false}
          className=""
        />
      </div>

      {/* 双向布局：待转存列表 + 手动操作控制台 */}
      <div className="grid grid-cols-1 @xl/main:grid-cols-2 gap-6">
        {/* 待转存任务列表 */}
        <div className="space-y-4">
          <PendingTransfersList />
        </div>

        {/* 手动操作控制台 */}
        <div className="space-y-4">
          <ManualTransferControls />
        </div>
      </div>
    </div>
  );
}

export default function FileTransferSection() {
  return (
    <FileTransferProvider>
      <FileTransferContent />
    </FileTransferProvider>
  );
}
