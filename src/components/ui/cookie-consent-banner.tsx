"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Cookie, Settings } from "lucide-react";

interface CookieConsentBannerProps {
  variant?: "banner" | "dialog";
  position?: "bottom" | "center" | "top";
}

export function CookieConsentBanner({
  variant = "banner",
  position = "bottom",
}: CookieConsentBannerProps) {
  const t = useTranslations("legal");
  const [showDetails, setShowDetails] = useState(false);
  const { consent, hasConsent, saveConsent, isLoading } = useCookieConsent();

  // Don't show at all if still loading
  if (isLoading) {
    return null;
  }

  // If user hasn't made a choice yet, show the compact banner
  if (!hasConsent) {
    return (
      <>
        {/* Compact Banner */}
        <div className="fixed bottom-4 left-4 z-[9999] max-w-sm">
          <Card className="shadow-2xl border-2 border-border/50 animate-in slide-in-from-bottom-4">
            <div className="p-3">
              <div className="flex items-start gap-3">
                <Cookie className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">{t("title")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("description")}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDetails(true)}
                      className="flex-1 h-8 text-xs"
                    >
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      {t("showDetails")}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => saveConsent({ necessary: true, analytics: false })}
                      className="flex-1 h-8 text-xs"
                    >
                      {t("rejectAll")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveConsent({ necessary: true, analytics: true })}
                      className="flex-1 h-8 text-xs"
                    >
                      {t("acceptAll")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl z-[99999]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Cookie className="h-5 w-5 text-primary" />
                {t("title")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {t("description")}
              </p>

              <div className="space-y-4">
                {/* Necessary Cookies */}
                <div className="flex items-start justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{t("necessary.title")}</div>
                      <Badge variant="secondary">Always On</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("necessary.description")}
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{t("analytics.title")}</div>
                      <Badge variant="secondary">Optional</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("analytics.description")}
                    </div>
                  </div>
                  <Switch
                    checked={consent.analytics}
                    onCheckedChange={(checked) =>
                      saveConsent({ analytics: checked })
                    }
                    aria-label={t("analytics.toggle")}
                    className="ml-4 flex-shrink-0"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => saveConsent({ necessary: true, analytics: false })}
                  className="sm:flex-1"
                >
                  {t("rejectAll")}
                </Button>
                <Button
                  onClick={() => saveConsent({ necessary: true, analytics: true })}
                  className="sm:flex-1"
                >
                  {t("acceptAll")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </>
  );
  }

  return null;
}
