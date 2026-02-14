"use client";

import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export default function GoogleAnalytics() {
  const { hasConsentFor } = useCookieConsent();

  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const analyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  if (!analyticsId || !hasConsentFor("analytics")) {
    return null;
  }

  return <NextGoogleAnalytics gaId={analyticsId} />;
}
