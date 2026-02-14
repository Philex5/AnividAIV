import type { LlmProviderName } from "./llm-providers";

export const LLM_PROVIDER_PRIORITY: LlmProviderName[] = [
  "xiaojing",
  "openrouter",
];

export const LLM_FALLBACK_PROVIDER: LlmProviderName = "openrouter";

export const LLM_MODEL_MAP: Record<LlmProviderName, Record<string, string>> = {
  xiaojing: {},
  openrouter: {
    "gpt-3.5-turbo": "openai/gpt-3.5-turbo",
    "gpt-4.1": "openai/gpt-4.1",
  },
};
