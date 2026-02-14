"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { PaginationInfo } from "@/types/pages/my-artworks";
import { cn } from "@/lib/utils";

interface ArtworksPaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  className?: string;
}

export function ArtworksPagination({
  pagination,
  onPageChange,
  className,
}: ArtworksPaginationProps) {
  const { page, totalPages, total, limit, hasNext, hasPrev } = pagination;

  // Calculate display range
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5; // Maximum page numbers to show

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (page > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const startPage = Math.max(2, page - 1);
      const endPage = Math.min(totalPages - 1, page + 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("...");
      }

      // Show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (total === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Info text */}
      <p className="text-sm text-muted-foreground">
        Showing {start}-{end} of {total} artworks
      </p>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* First page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={!hasPrev}
          className="hidden sm:flex"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === "...") {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }

            const pageNumber = pageNum as number;
            const isActive = pageNumber === page;

            return (
              <Button
                key={pageNumber}
                variant={isActive ? "default" : "outline"}
                size="icon"
                onClick={() => onPageChange(pageNumber)}
                className={cn(
                  "hidden sm:flex",
                  isActive && "pointer-events-none"
                )}
              >
                {pageNumber}
              </Button>
            );
          })}

          {/* Mobile: Show current page */}
          <span className="flex sm:hidden px-4 py-2 text-sm font-medium">
            {page} / {totalPages}
          </span>
        </div>

        {/* Next page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext}
          className="hidden sm:flex"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
