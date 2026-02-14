import { headers } from "next/headers";

function normalizeCountryCode(value: string): string {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return "";
  if (trimmed === "XX" || trimmed === "ZZ") return "";
  if (!/^[A-Z]{2}$/.test(trimmed)) return "";
  return trimmed;
}

export async function getRequestCountryCode(): Promise<string> {
  const h = await headers();

  const candidates = [
    h.get("cf-ipcountry"),
    h.get("x-vercel-ip-country"),
    h.get("x-country-code"),
    h.get("x-geo-country"),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeCountryCode(candidate);
    if (normalized) return normalized;
  }

  return "";
}

