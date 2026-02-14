import { isAbsoluteUrl, toImageUrl } from "@/lib/r2-utils";

export type ImageResolveSize = "auto" | "desktop" | "mobile";
export type ResolvedImage = {
  uuid?: string;
  resolvedUrl: string;
  originalUrl: string;
  size?: "desktop" | "mobile";
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const resolveCache = new Map<string, Promise<ResolvedImage | null>>();

export const isImageUuid = (value: string) => uuidRegex.test(value.trim());

const normalizeDirectUrl = (value: string): ResolvedImage => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { resolvedUrl: "", originalUrl: "" };
  }
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return { resolvedUrl: trimmed, originalUrl: trimmed };
  }
  if (isAbsoluteUrl(trimmed) || trimmed.startsWith("/")) {
    return { resolvedUrl: trimmed, originalUrl: trimmed };
  }
  const normalized = toImageUrl(trimmed);
  return { resolvedUrl: normalized, originalUrl: normalized };
};

export async function resolveImageReference(
  input: string | null | undefined,
  size: ImageResolveSize = "auto",
): Promise<ResolvedImage | null> {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!isImageUuid(trimmed)) {
    return normalizeDirectUrl(trimmed);
  }

  const cacheKey = `${trimmed}:${size}`;
  if (!resolveCache.has(cacheKey)) {
    resolveCache.set(
      cacheKey,
      (async () => {
        try {
          const response = await fetch(
            `/api/generation/image-resolve/${trimmed}?size=${size}`,
          );
          if (!response.ok) return null;
          const payload = await response.json().catch(() => null);
          if (!payload || payload.code !== 0) return null;
          const data = payload.data;
          if (!data || typeof data !== "object") return null;
          const resolvedUrl = data.resolved_url || data.original_url || "";
          const originalUrl = data.original_url || resolvedUrl || "";
          if (!resolvedUrl) {
            console.info("Resolved image url empty:", {
              uuid: trimmed,
              data,
            });
          }
          return {
            uuid: data.uuid,
            resolvedUrl,
            originalUrl,
            size: data.size,
          } satisfies ResolvedImage;
        } catch (error) {
          console.warn("Failed to resolve image reference:", error);
          return null;
        }
      })(),
    );
  }

  return resolveCache.get(cacheKey) ?? null;
}
