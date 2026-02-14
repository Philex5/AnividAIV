export type ResolvedPromptTemplate = {
  prompt: string;
  missingKeys: string[];
  hasTemplate: boolean;
};

export function resolvePromptTemplate(
  template: string | null | undefined,
  params: Record<string, string | number | boolean | null | undefined>,
): ResolvedPromptTemplate {
  if (!template || !template.trim()) {
    return { prompt: "", missingKeys: [], hasTemplate: false };
  }

  const missingKeys = new Set<string>();
  const resolvedPrompt = template.replace(
    /\{([a-zA-Z0-9_]+)\}/g,
    (_, key: string) => {
      const rawValue = params[key];
      if (rawValue === null || rawValue === undefined) {
        missingKeys.add(key);
        return "";
      }
      const value = String(rawValue).trim();
      if (!value) {
        missingKeys.add(key);
        return "";
      }
      return value;
    },
  );

  return {
    prompt: resolvedPrompt.trim(),
    missingKeys: Array.from(missingKeys),
    hasTemplate: true,
  };
}
