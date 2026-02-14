"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";

interface GenerationFiltersProps {
  onFilterChange?: (filters: { type: string; status: string }) => void;
  onExport?: () => void;
}

export default function GenerationFilters({ onFilterChange, onExport }: GenerationFiltersProps) {
  const t = useTranslations("admin.generations");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const handleTypeChange = (value: string) => {
    setType(value);
    onFilterChange?.({ type: value, status });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    onFilterChange?.({ type, status: value });
  };

  return (
    <div className="mb-4 flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{t("filters.type")}:</span>
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_types")}</SelectItem>
            <SelectItem value="image">{t("filters.image")}</SelectItem>
            <SelectItem value="video">{t("filters.video")}</SelectItem>
            <SelectItem value="character">{t("filters.character")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{t("filters.status")}:</span>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all_status")}</SelectItem>
            <SelectItem value="completed">{t("filters.completed")}</SelectItem>
            <SelectItem value="failed">{t("filters.failed")}</SelectItem>
            <SelectItem value="processing">{t("filters.processing")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} className="ml-auto">
          <Download className="h-4 w-4 mr-2" />
          {t("export.button")}
        </Button>
      )}
    </div>
  );
}
