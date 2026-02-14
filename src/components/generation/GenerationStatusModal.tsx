"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type GenerationStatusType =
  | "idle"
  | "submitting"
  | "polling"
  | "completed"
  | "failed";

interface GenerationStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status?: GenerationStatusType;
  message?: string;
  error?: string | null;
  previewUrl?: string;
}

const statusIconMap: Record<GenerationStatusType, typeof Loader2Icon> = {
  idle: Loader2Icon,
  submitting: Loader2Icon,
  polling: Loader2Icon,
  completed: CheckCircle2,
  failed: AlertTriangle,
};

export function GenerationStatusModal({
  open,
  onOpenChange,
  status = "idle",
  message,
  error,
  previewUrl,
}: GenerationStatusModalProps) {
  const t = useTranslations("common_components.generation_status_modal");
  const resolvedStatus = error ? "failed" : status;
  const StatusIcon = statusIconMap[resolvedStatus];
  const statusText =
    error || message || t(`status.${resolvedStatus}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel w-[92vw] max-w-md overflow-hidden rounded-3xl border border-border/40 p-0 shadow-2xl">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 top-6 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -left-12 bottom-6 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-5 p-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg font-semibold">
                {t("title")}
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border border-border/40",
                  resolvedStatus === "failed" ? "text-destructive" : "text-primary"
                )}
              >
                <StatusIcon
                  className={cn(
                    "h-5 w-5",
                    resolvedStatus === "submitting" ||
                      resolvedStatus === "polling" ||
                      resolvedStatus === "idle"
                      ? "animate-spin"
                      : ""
                  )}
                />
              </div>
              <div className="text-sm font-medium text-foreground">
                {statusText}
              </div>
            </div>

            {previewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-border/40">
                <img
                  src={previewUrl}
                  alt={t("labels.preview")}
                  className="h-40 w-full object-cover"
                />
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="glass-panel border border-border/40"
              >
                {t("actions.close")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
