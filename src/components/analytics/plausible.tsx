"use client";

import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useEffect } from "react";

export default function Plausible() {
  const { hasConsentFor } = useCookieConsent();

  useEffect(() => {
    if (!hasConsentFor("analytics")) {
      // Remove plausible script if consent is revoked
      const script = document.querySelector('script[data-domain]');
      if (script) {
        script.remove();
      }
      // Clear any plausible cookies
      const cookies = document.cookie.split(";");
      for (let cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.startsWith("plausible_")) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
        }
      }
      return;
    }

    // Only load if consent is given and not already loaded
    const existingScript = document.querySelector('script[data-domain]');
    if (existingScript) {
      return;
    }

    const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    const plausibleScriptUrl = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL;

    if (!plausibleDomain || !plausibleScriptUrl) {
      return;
    }

    const script = document.createElement("script");
    script.defer = true;
    script.setAttribute("data-domain", plausibleDomain);
    script.src = plausibleScriptUrl;
    document.head.appendChild(script);
  }, [hasConsentFor]);

  return null;
}
