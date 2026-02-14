import crypto from "crypto";

export function generateWebhookToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function maskUrlForLog(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return urlStr.slice(0, 128);
  }
}

export function truncateForLog(text: string, maxLen = 200): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}
