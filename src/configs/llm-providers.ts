export type LlmProviderName = "xiaojing" | "openrouter";

export type LlmProviderConfig = {
  name: LlmProviderName;
  baseURL: string;
  apiKey?: string;
  headers?: Record<string, string>;
};

function buildOpenRouterHeaders(): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  const referer = process.env.OPENROUTER_SITE_URL;
  const title = process.env.OPENROUTER_APP_NAME;
  if (referer) {
    headers["HTTP-Referer"] = referer;
  }
  if (title) {
    headers["X-Title"] = title;
  }
  return Object.keys(headers).length ? headers : undefined;
}

export const LLM_PROVIDERS: Record<LlmProviderName, LlmProviderConfig> = {
  xiaojing: {
    name: "xiaojing",
    baseURL: "https://api.open.xiaojingai.com/v1",
    apiKey: process.env.XIAOJING_API_KEY,
  },
  openrouter: {
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: buildOpenRouterHeaders(),
  },
};
