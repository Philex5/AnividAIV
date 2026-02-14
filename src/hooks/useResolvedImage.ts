import { useEffect, useMemo, useState } from "react";
import {
  resolveImageReference,
  isImageUuid,
  type ImageResolveSize,
} from "@/lib/image-resolve";
import { isAbsoluteUrl, toImageUrl } from "@/lib/r2-utils";

export function useResolvedImageUrl(
  input: string | null | undefined,
  size: ImageResolveSize = "auto",
) {
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const normalizedInput = useMemo(() => {
    return typeof input === "string" ? input.trim() : "";
  }, [input]);
  const inputIsUuid = useMemo(
    () => (normalizedInput ? isImageUuid(normalizedInput) : false),
    [normalizedInput],
  );

  useEffect(() => {
    let active = true;
    const value = normalizedInput;
    if (!value) {
      setResolvedUrl("");
      setOriginalUrl("");
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    resolveImageReference(value, size)
      .then((result) => {
        if (!active) return;
        const resolved = result?.resolvedUrl || result?.originalUrl || "";
        const original = result?.originalUrl || resolved || "";
        setResolvedUrl(resolved);
        setOriginalUrl(original);
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [normalizedInput, size]);

  const displayUrl = useMemo(() => {
    if (!normalizedInput) return "";
    if (inputIsUuid) return resolvedUrl;
    
    // For non-UUIDs, we can resolve immediately
    if (
      isAbsoluteUrl(normalizedInput) ||
      normalizedInput.startsWith("/") ||
      normalizedInput.startsWith("data:") ||
      normalizedInput.startsWith("blob:")
    ) {
      return normalizedInput;
    }
    return toImageUrl(normalizedInput);
  }, [normalizedInput, inputIsUuid, resolvedUrl]);

  return {
    resolvedUrl,
    originalUrl,
    displayUrl,
    inputUrl: normalizedInput,
    isUuid: inputIsUuid,
    isLoading,
  };
}

export function useResolvedImageUrls(
  inputs: Array<string | null | undefined>,
  size: ImageResolveSize = "auto",
) {
  const [resolvedMap, setResolvedMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const normalizedInputs = useMemo(() => {
    return inputs
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
  }, [inputs]);
  const key = normalizedInputs.join("|");

  useEffect(() => {
    let active = true;
    if (!normalizedInputs.length) {
      setResolvedMap({});
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    (async () => {
      const uniqueInputs = Array.from(new Set(normalizedInputs));
      const entries = await Promise.all(
        uniqueInputs.map(async (value) => {
          const result = await resolveImageReference(value, size);
          const resolved = result?.resolvedUrl || result?.originalUrl || "";
          return [value, resolved] as const;
        }),
      );
      if (!active) return;
      const next: Record<string, string> = {};
      entries.forEach(([value, resolved]) => {
        if (resolved) next[value] = resolved;
      });
      setResolvedMap(next);
      setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [key, size]);

  return { resolvedMap, isLoading };
}
