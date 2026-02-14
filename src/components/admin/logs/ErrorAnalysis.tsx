"use client";

import { useTranslations } from "next-intl";

interface ErrorAnalysisProps {
  topErrors: { code: string; count: number }[];
}

export default function ErrorAnalysis({
  topErrors,
}: ErrorAnalysisProps) {
  const t = useTranslations("admin.logs");

  return (
    topErrors.length > 0 ? (
      <div className="rounded-lg border p-4">
        <h3 className="mb-1 font-medium">{t("summary.top_errors")}</h3>
        <div className="space-y-1">
          {topErrors.map((error, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="font-mono text-muted-foreground">{error.code}</span>
              <span className="text-muted-foreground">
                {t("summary.times", { count: error.count })}
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : null
  );
}
