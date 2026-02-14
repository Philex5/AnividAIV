import { TableColumn } from "@/types/blocks/table";
import { Slot } from "@/types/slots/base";

export interface Table extends Slot {
  columns?: TableColumn[];
  empty_message?: string;
  showHeader?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  totalItems?: number;
  showCount?: boolean;
  refresh?: {
    enabled?: boolean;
    onRefresh?: () => void | Promise<void>;
    loading?: boolean;
  };
}
