/**
 * File Transfer Filters Component
 * 文件转存筛选器共享组件
 *
 * 功能：
 * 1. 提供日期范围筛选
 * 2. 提供文件类型筛选（图片/视频）
 * 3. 统一的筛选UI和交互
 * 4. 可重用的筛选逻辑
 */

'use client';

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FileTransferFilters as FiltersType, useFileTransferFilters } from "@/hooks/admin/useFileTransferFilters";

interface FileTransferFiltersProps {
  filters: FiltersType;
  onFilterChange: <K extends keyof FiltersType>(
    key: K,
    value: FiltersType[K]
  ) => void;
  onReset: () => void;
  onApply?: () => void;
  showResetButton?: boolean;
  showApplyButton?: boolean;
  className?: string;
}

export default function FileTransferFilters({
  filters,
  onFilterChange,
  onReset,
  onApply,
  showResetButton = true,
  showApplyButton = false,
  className = '',
}: FileTransferFiltersProps) {

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium"> "Filters"</h4>
        {showResetButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 px-2 text-xs"
          >
          "Reset"
          </Button>
        )}
      </div>

      {/* 筛选条件 */}
      <div className="space-y-4">
        {/* 日期范围 */}
        <div>
          <h5 className="text-xs font-medium mb-2 text-muted-foreground">
            "Time Range"
          </h5>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                "Start Date"
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => onFilterChange('startDate', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                "End Date"
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => onFilterChange('endDate', e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* 文件类型 */}
        <div>
          <h5 className="text-xs font-medium mb-2 text-muted-foreground">
            "Type"
          </h5>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-include-images"
                checked={filters.includeImages}
                onCheckedChange={(checked) =>
                  onFilterChange('includeImages', checked as boolean)
                }
              />
              <label
                htmlFor="filter-include-images"
                className="text-sm cursor-pointer"
              >
                "Images"
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-include-videos"
                checked={filters.includeVideos}
                onCheckedChange={(checked) =>
                  onFilterChange('includeVideos', checked as boolean)
                }
              />
              <label
                htmlFor="filter-include-videos"
                className="text-sm cursor-pointer"
              >
                "Videos"
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-include-characters"
                checked={filters.includeCharacters}
                onCheckedChange={(checked) =>
                  onFilterChange('includeCharacters', checked as boolean)
                }
              />
              <label
                htmlFor="filter-include-characters"
                className="text-sm cursor-pointer"
              >
                 "Characters"
              </label>
            </div>
          </div>
        </div>

        {/* 应用按钮 */}
        {showApplyButton && onApply && (
          <Button
            onClick={onApply}
            variant="secondary"
            size="sm"
            className="w-full"
          >
            "Apply Filters"
          </Button>
        )}
      </div>
    </div>
  );
}
