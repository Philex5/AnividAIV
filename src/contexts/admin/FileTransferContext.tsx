/**
 * File Transfer Context
 * 文件转存筛选状态上下文
 *
 * 提供全局的筛选状态管理，让两个组件共享筛选条件
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useFileTransferFilters, FileTransferFilters } from '@/hooks/admin/useFileTransferFilters';

interface FileTransferContextType {
  filters: FileTransferFilters;
  updateFilter: <K extends keyof FileTransferFilters>(
    key: K,
    value: FileTransferFilters[K]
  ) => void;
  resetFilters: () => void;
  buildQueryParams: () => URLSearchParams;
}

const FileTransferContext = createContext<FileTransferContextType | undefined>(
  undefined
);

interface FileTransferProviderProps {
  children: ReactNode;
}

export function FileTransferProvider({ children }: FileTransferProviderProps) {
  const { filters, updateFilter, resetFilters, buildQueryParams } =
    useFileTransferFilters();

  return (
    <FileTransferContext.Provider
      value={{
        filters,
        updateFilter,
        resetFilters,
        buildQueryParams,
      }}
    >
      {children}
    </FileTransferContext.Provider>
  );
}

export function useFileTransferContext() {
  const context = useContext(FileTransferContext);
  if (context === undefined) {
    throw new Error(
      'useFileTransferContext must be used within a FileTransferProvider'
    );
  }
  return context;
}
