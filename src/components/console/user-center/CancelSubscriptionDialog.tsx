"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RiAlertLine, RiCalendarLine, RiLoader2Line } from "react-icons/ri";

interface Subscription {
  sub_id: string | null;
  plan_type: string;
  interval: string;
  current_period_end: string | null;
  amount: number;
  currency: string;
}

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription | null;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
  t: any;
}

/**
 * Cancel Subscription Dialog
 * - Simplified cancellation flow with unified messaging
 * - Access continues until current period end
 * - No automatic refunds issued
 */
export default function CancelSubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  onConfirm,
  isProcessing,
  t,
}: CancelSubscriptionDialogProps) {
  if (!subscription) {
    return null;
  }

  // Helper function to get translated text from nested object
  const getTranslatedText = (obj: any, key: string, params?: any): string => {
    if (!obj) return key;
    const keys = key.split(".");
    let value = obj;
    for (const k of keys) {
      value = value?.[k];
    }
    if (typeof value === "string") {
      // Simple interpolation for {params}
      if (params) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return params[paramKey] !== undefined ? params[paramKey] : match;
        });
      }
      return value;
    }
    return key;
  };

  const periodEnd = new Date(subscription.current_period_end || "").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getPlanDisplayName = (plan: string) => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const getIntervalDisplayName = (interval: string) => {
    return interval === "year" ? "Yearly" : "Monthly";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <RiAlertLine className="w-6 h-6 text-destructive" />
            {getTranslatedText(t, "title", { plan: getPlanDisplayName(subscription.plan_type) })}
          </DialogTitle>
          <DialogDescription>
            {getTranslatedText(t, "description", { plan: getPlanDisplayName(subscription.plan_type) })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Subscription Info */}
          <section className="bg-muted/50 rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              {getTranslatedText(t, "current_plan")}
            </h3>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-base px-3 py-1">
                {getPlanDisplayName(subscription.plan_type)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {getIntervalDisplayName(subscription.interval)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <RiCalendarLine className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{getTranslatedText(t, "period_end")}:</span>
              <span className="font-medium">{periodEnd}</span>
            </div>
          </section>

          {/* Unified cancellation notice for all subscription types */}
          <Alert>
            <AlertDescription className="text-sm">
              <strong>{getTranslatedText(t, "cancel_notice.title")}</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>{getTranslatedText(t, "cancel_notice.continue_access", { date: periodEnd })}</li>
                <li>{getTranslatedText(t, "cancel_notice.no_refund")}</li>
                <li>{getTranslatedText(t, "cancel_notice.manual_refund")}</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Impact Section */}
          <section className="space-y-3">
            <h3 className="font-semibold">{getTranslatedText(t, "impact_section.title")}</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{getTranslatedText(t, "impact_section.active_until", { date: periodEnd })}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{getTranslatedText(t, "impact_section.no_renewal")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{getTranslatedText(t, "impact_section.features_disabled")}</span>
              </li>
            </ul>
          </section>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            {getTranslatedText(t, "buttons.keep")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <RiLoader2Line className="w-4 h-4 mr-2 animate-spin" />
                {getTranslatedText(t, "buttons.processing")}
              </>
            ) : (
              getTranslatedText(t, "buttons.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
