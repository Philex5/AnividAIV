import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { OpenAICompatibleProvider } from "@ai-sdk/openai-compatible";
import { LLM_PROVIDERS, type LlmProviderName } from "@/configs/llm-providers";

const providerCache = new Map<LlmProviderName, OpenAICompatibleProvider>();

export function isProviderConfigured(name: LlmProviderName): boolean {
  const config = LLM_PROVIDERS[name];
  return Boolean(config?.apiKey);
}

export function getProvider(name: LlmProviderName): OpenAICompatibleProvider {
  const cached = providerCache.get(name);
  if (cached) {
    return cached;
  }

  const config = LLM_PROVIDERS[name];
  if (!config) {
    throw new Error(`Unknown LLM provider: ${name}`);
  }
  if (!config.apiKey) {
    throw new Error(`LLM provider ${name} is not configured`);
  }

  const provider = createOpenAICompatible({
    name: config.name,
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    headers: config.headers,
  });
  providerCache.set(name, provider);
  return provider;
}
