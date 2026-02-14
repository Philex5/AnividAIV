import Header from "@/components/dashboard/header";
import TableBlock from "@/components/blocks/table";
import Pagination from "@/components/ui/pagination";
import { Table as TableSlotType } from "@/types/slots/table";
import Toolbar from "@/components/blocks/toolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export default function ({ ...table }: TableSlotType) {
  const t = useTranslations("admin.users");
  const showHeader = table.showHeader ?? true;
  const containerClass = cn(
    "w-full px-4 md:px-8 pb-8",
    showHeader ? "pt-3" : "pt-2"
  );

  return (
    <>
      {showHeader && <Header crumb={table.crumb} />}
      <div className={containerClass}>
        <h1 className="text-2xl font-medium mb-2">{table.title}</h1>
        {table.description && (
          <p className="text-sm text-muted-foreground mb-2">
            {table.description}
          </p>
        )}
        {table.tip && (
          <p className="text-sm text-muted-foreground mb-2">
            {table.tip.description || table.tip.title}
          </p>
        )}
        {(table.toolbar || table.refresh?.enabled) && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              {table.toolbar && <Toolbar items={table.toolbar.items} />}
            </div>
            {table.refresh?.enabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={table.refresh?.onRefresh}
                disabled={table.refresh?.loading}
                className="shrink-0"
              >
                {table.refresh.loading ? "Loading..." : "Refresh"}
              </Button>
            )}
          </div>
        )}
        <Card className="overflow-x-auto px-6">
          <TableBlock columns={table.columns ?? []} data={table.data ?? []} />
        </Card>
        {table.pagination && (
          <Pagination
            currentPage={table.pagination.currentPage}
            totalPages={table.pagination.totalPages}
            onPageChange={table.pagination.onPageChange}
          />
        )}
        {table.showCount && table.totalItems !== undefined && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            {t("pagination.showing", {
              start: (table.pagination?.currentPage || 1 - 1) * 50 + 1,
              end: Math.min(
                (table.pagination?.currentPage || 1) * 50,
                table.totalItems
              ),
              total: table.totalItems,
            })}
          </div>
        )}
      </div>
    </>
  );
}
