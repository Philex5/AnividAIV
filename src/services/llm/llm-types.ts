import type { CoreMessage } from "ai";
import type { LlmProviderName } from "@/configs/llm-providers";

export type LlmCallOptions = {
  model: string;
  system?: string;
  messages?: CoreMessage[];
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: LlmProviderName;
  scenario?: string;
};

export type LlmResolvedTarget = {
  provider: LlmProviderName;
  model: string;
};
