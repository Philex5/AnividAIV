"use client";

import { useState, useEffect } from "react";

export type CookieConsent = {
  necessary: boolean; // Always true, cannot be disabled
  analytics: boolean; // Google Analytics, Microsoft Clarity
  marketing?: boolean; // Optional: for future use
};

const CONSENT_KEY = "anivid-ai-cookie-consent";
const CONSENT_VERSION = "1.0.0"; // Increment to re-show banner for policy changes

interface StoredConsent {
  consent: CookieConsent;
  timestamp: number;
  version: string;
}

const defaultConsent: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent>(defaultConsent);
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load consent from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored) {
        const parsed: StoredConsent = JSON.parse(stored);
        // Check if consent version matches current version
        if (parsed.version === CONSENT_VERSION) {
          setConsent(parsed.consent);
          setHasConsent(true);
        } else {
          // Version mismatch, clear old consent
          localStorage.removeItem(CONSENT_KEY);
        }
      }
    } catch (error) {
      console.error("Error loading cookie consent:", error);
      localStorage.removeItem(CONSENT_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save consent to localStorage
  const saveConsent = (newConsent: Partial<CookieConsent>) => {
    const updatedConsent = {
      ...consent,
      ...newConsent,
      // Ensure necessary is always true
      necessary: true,
    };

    setConsent(updatedConsent);
    setHasConsent(true);

    // Persist to localStorage
    try {
      const toStore: StoredConsent = {
        consent: updatedConsent,
        timestamp: Date.now(),
        version: CONSENT_VERSION,
      };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(toStore));

      // Trigger custom event for other parts of the app to listen to
      window.dispatchEvent(
        new CustomEvent("cookieConsentChanged", {
          detail: updatedConsent,
        })
      );
    } catch (error) {
      console.error("Error saving cookie consent:", error);
    }
  };

  // Reset consent (for testing or user preference reset)
  const resetConsent = () => {
    localStorage.removeItem(CONSENT_KEY);
    setConsent(defaultConsent);
    setHasConsent(false);
  };

  // Check if consent is given for a specific category
  const hasConsentFor = (category: keyof CookieConsent): boolean => {
    if (category === "necessary") return true;
    return consent[category] || false;
  };

  return {
    consent,
    hasConsent,
    isLoading,
    saveConsent,
    resetConsent,
    hasConsentFor,
  };
}
