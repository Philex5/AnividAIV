/**
 * Custom Hook for File Transfer Filters
 * 文件转存筛选状态管理Hook
 */

'use client';

import { useState, useCallback } from 'react';

export interface FileTransferFilters {
  startDate: string;
  endDate: string;
  includeImages: boolean;
  includeVideos: boolean;
  includeCharacters: boolean;
}

export interface UseFileTransferFiltersReturn {
  filters: FileTransferFilters;
  updateFilter: <K extends keyof FileTransferFilters>(
    key: K,
    value: FileTransferFilters[K]
  ) => void;
  resetFilters: () => void;
  buildQueryParams: () => URLSearchParams;
}

/**
 * 管理文件转存筛选状态的自定义Hook
 * 提供统一的筛选状态管理和查询参数构建功能
 */
export function useFileTransferFilters(): UseFileTransferFiltersReturn {
  const [filters, setFilters] = useState<FileTransferFilters>({
    startDate: '',
    endDate: '',
    includeImages: true,
    includeVideos: true,
    includeCharacters: true,
  });

  /**
   * 更新单个筛选条件
   */
  const updateFilter = useCallback(
    <K extends keyof FileTransferFilters>(key: K, value: FileTransferFilters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  /**
   * 重置所有筛选条件
   */
  const resetFilters = useCallback(() => {
    setFilters({
      startDate: '',
      endDate: '',
      includeImages: true,
      includeVideos: true,
      includeCharacters: true,
    });
  }, []);

  /**
   * 构建查询参数
   * 用于API调用
   */
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();

    if (filters.startDate) {
      params.append('start_date', filters.startDate);
    }

    if (filters.endDate) {
      params.append('end_date', filters.endDate);
    }

    const typeFilter = [];
    if (filters.includeImages) {
      typeFilter.push('image');
    }
    if (filters.includeVideos) {
      typeFilter.push('video');
    }
    if (filters.includeCharacters) {
      typeFilter.push('character');
    }

    if (typeFilter.length > 0) {
      params.append('type_filter', typeFilter.join(','));
    }

    return params;
  }, [filters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    buildQueryParams,
  };
}
