"use client";

import { useCookieConsent } from "@/hooks/useCookieConsent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Cookie, Shield, BarChart, Info } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CookieSettingsPageClientProps {
  pageData: any;
}

export function CookieSettingsPageClient({ pageData }: CookieSettingsPageClientProps) {
  const { consent, saveConsent, resetConsent } = useCookieConsent();
  const [localConsent, setLocalConsent] = useState(consent);
  const router = useRouter();

  useEffect(() => {
    setLocalConsent(consent);
  }, [consent]);

  const handleSave = () => {
    saveConsent(localConsent);
  };

  const handleReset = () => {
    if (confirm(pageData.resetConfirm || "Are you sure you want to reset your cookie preferences?")) {
      resetConsent();
      setLocalConsent({ necessary: true, analytics: false, marketing: false });
    }
  };

  const hasChanges = JSON.stringify(consent) !== JSON.stringify(localConsent);

  return (
    <div className="min-h-[calc(100svh-48px)] lg:h-[calc(100vh-48px)] bg-background lg:overflow-hidden">
      <div className="container mx-auto py-4 sm:py-8 px-4 max-w-4xl h-full overflow-y-auto">
      {/* Header */}
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-2">
          <Cookie className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">{pageData.settingsTitle}</h1>
        </div>
        <p className="text-muted-foreground">
          {pageData.settingsDescription}
        </p>
      </div>

      {/* Info Box */}
      <Card className="mb-6 border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium">
                {pageData.infoTitle}
              </p>
              <p className="text-muted-foreground">
                {pageData.infoDescription}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Withdraw Consent Notice */}
      <Card className="mb-6 border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium">
                {pageData.withdrawConsentTitle}
              </p>
              <p className="text-muted-foreground">
                {pageData.withdrawConsentDescription}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cookie Categories */}
      <div className="space-y-6">
        {/* Necessary Cookies */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  {pageData.necessary.title}
                </CardTitle>
                <CardDescription>{pageData.necessary.description}</CardDescription>
              </div>
              <Badge variant="secondary">Always On</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {pageData.necessary.details}
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
              <li>{pageData.necessary.feature1}</li>
              <li>{pageData.necessary.feature2}</li>
              <li>{pageData.necessary.feature3}</li>
            </ul>
          </CardContent>
        </Card>

        {/* Analytics Cookies */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-primary" />
                  {pageData.analytics.title}
                </CardTitle>
                <CardDescription>{pageData.analytics.description}</CardDescription>
              </div>
              <Switch
                checked={localConsent.analytics}
                onCheckedChange={(checked) =>
                  setLocalConsent({ ...localConsent, analytics: checked })
                }
                aria-label={pageData.analytics.toggle}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {pageData.analytics.details}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-medium">Google Analytics</span>
              </div>
              <p className="text-xs text-muted-foreground pl-4">
                {pageData.analytics.googleDetails}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-medium">Microsoft Clarity</span>
              </div>
              <p className="text-xs text-muted-foreground pl-4">
                {pageData.analytics.clarityDetails}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-medium">Plausible</span>
              </div>
              <p className="text-xs text-muted-foreground pl-4">
                {pageData.analytics.plausibleDetails}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Links */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">{pageData.privacyLinksTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link
                href="/privacy-policy"
                className="text-primary hover:underline"
              >
                {pageData.privacyPolicy}
              </Link>
              <Link
                href="/terms-of-service"
                className="text-primary hover:underline"
              >
                {pageData.termsOfService}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1 w-full"
          >
            {pageData.saveChanges}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            {pageData.resetPreferences}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            {pageData.cancel}
          </Button>
        </div>

        {/* Last Updated */}
        <div className="mt-6 pb-8 text-xs text-muted-foreground text-center">
          {pageData.lastUpdated}: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
