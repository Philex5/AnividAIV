"use client";

import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useEffect } from "react";

export default function Clarity() {
  const { hasConsentFor } = useCookieConsent();

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === "undefined") {
      return;
    }

    if (!hasConsentFor("analytics")) {
      // Remove clarity script if consent is revoked
      const script = document.querySelector('script[src*="clarity.ms"]');
      if (script) {
        script.remove();
      }

      // Clear clarity cookies
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.startsWith("_clck") || name.startsWith("_clsk")) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname};`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
        }
      }

      // Clear window.clarity function
      if (window.clarity) {
        window.clarity = undefined;
      }

      return;
    }

    // Only load if consent is given and not already loaded
    const existingScript = document.querySelector('script[src*="clarity.ms"]');
    if (existingScript) {
      return;
    }

    const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
    if (!clarityId) {
      console.warn("Clarity: NEXT_PUBLIC_CLARITY_ID is not set");
      return;
    }

    // Initialize Clarity
    try {
      (function(c, l, a, r, i) {
        c[a] = c[a] || function() {
          (c[a].q = c[a].q || []).push(arguments);
        };
        const t = l.createElement(r) as HTMLScriptElement;
        t.async = true;
        t.src = "https://www.clarity.ms/tag/" + i;
        const y = l.getElementsByTagName(r)[0] as HTMLElement;
        y.parentNode?.insertBefore(t, y);
      })(window, document, "clarity", "script", clarityId);

      // Set default consent mode
      if (window.clarity) {
        window.clarity("set", "default", true);
      }
    } catch (error) {
      console.error("Failed to initialize Clarity:", error);
    }
  }, [hasConsentFor]);

  return null;
}
