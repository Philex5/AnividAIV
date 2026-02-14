"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const REF_COOKIE = "anv_ref";
const UTM_SOURCE_COOKIE = "anv_utm_source";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getCookie(name: string): string | undefined {
  const cookieStr = typeof document !== "undefined" ? document.cookie : "";
  if (!cookieStr) return undefined;
  const parts = cookieStr.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(`${name}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.substring(name.length + 1));
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const encoded = encodeURIComponent(value);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encoded}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function sanitize(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export default function AttributionTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    const utmSource = searchParams.get("utm_source");

    if (ref && !getCookie(REF_COOKIE)) {
      setCookie(REF_COOKIE, sanitize(ref, 255), DEFAULT_MAX_AGE_SECONDS);
    }

    if (utmSource && !getCookie(UTM_SOURCE_COOKIE)) {
      setCookie(
        UTM_SOURCE_COOKIE,
        sanitize(utmSource, 255),
        DEFAULT_MAX_AGE_SECONDS
      );
    }
  }, [searchParams]);

  return null;
}

