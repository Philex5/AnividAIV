import {
  LLM_FALLBACK_PROVIDER,
  LLM_MODEL_MAP,
  LLM_PROVIDER_PRIORITY,
} from "@/configs/llm-routing";
import type { LlmProviderName } from "@/configs/llm-providers";
import { isProviderConfigured } from "./llm-provider-registry";
import type { LlmResolvedTarget } from "./llm-types";

export function resolveProviderSequence(
  preferred?: LlmProviderName
): LlmProviderName[] {
  const configured = LLM_PROVIDER_PRIORITY.filter((name) =>
    isProviderConfigured(name)
  );
  if (!configured.length) {
    return [];
  }

  if (preferred) {
    const sequence = configured.includes(preferred)
      ? [preferred]
      : [];
    if (
      LLM_FALLBACK_PROVIDER &&
      configured.includes(LLM_FALLBACK_PROVIDER) &&
      !sequence.includes(LLM_FALLBACK_PROVIDER)
    ) {
      sequence.push(LLM_FALLBACK_PROVIDER);
    }
    return sequence.length ? sequence : configured;
  }

  return configured;
}

export function resolveModelId(
  provider: LlmProviderName,
  model: string
): string {
  const mapped = LLM_MODEL_MAP[provider]?.[model];
  return mapped || model;
}

export function resolveTargets(
  model: string,
  preferred?: LlmProviderName
): LlmResolvedTarget[] {
  return resolveProviderSequence(preferred).map((provider) => ({
    provider,
    model: resolveModelId(provider, model),
  }));
}
