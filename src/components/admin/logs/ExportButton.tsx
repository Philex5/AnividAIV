"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Download } from "lucide-react";

interface ExportButtonProps {
  data: any[];
}

export default function ExportButton({ data }: ExportButtonProps) {
  const t = useTranslations("admin.logs");
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/admin/logs/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "csv", data }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button onClick={handleExportCSV} disabled={exporting} variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      {exporting ? "Exporting..." : t("export.button")}
    </Button>
  );
}
