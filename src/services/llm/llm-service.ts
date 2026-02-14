import { generateText, streamText, type CoreMessage } from "ai";
import { getProvider } from "./llm-provider-registry";
import { resolveTargets } from "./llm-router";
import type { LlmCallOptions, LlmResolvedTarget } from "./llm-types";

type LlmGenerateResult = Awaited<ReturnType<typeof generateText>> & {
  provider: string;
  model: string;
};

const LLM_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 800,
  backoffMultiplier: 2,
};

async function withLlmRetry<T>(operation: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let delay = LLM_RETRY_CONFIG.retryDelayMs;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= LLM_RETRY_CONFIG.maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= LLM_RETRY_CONFIG.backoffMultiplier;
      attempt += 1;
    }
  }
}

export async function generateTextWithFallback(
  options: LlmCallOptions
): Promise<LlmGenerateResult> {
  const targets = resolveTargets(options.model, options.provider);
  if (!targets.length) {
    throw new Error("LLM provider is not configured");
  }

  let lastError: unknown;
  for (const target of targets) {
    try {
      const result = await withLlmRetry(() =>
        generateText({
          model: getProvider(target.provider)(target.model),
          system: options.system,
          messages: options.messages as CoreMessage[] | undefined,
          prompt: options.prompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        })
      );
      return {
        ...result,
        provider: target.provider,
        model: target.model,
      };
    } catch (error) {
      lastError = error;
    }
  }

  const error = new Error("LLM service unavailable");
  (error as any).cause = lastError;
  throw error;
}

export async function streamTextWithFallback(
  options: LlmCallOptions
): Promise<{
  textStream: AsyncIterable<string>;
  provider: string;
  model: string;
}> {
  const targets = resolveTargets(options.model, options.provider);
  if (!targets.length) {
    throw new Error("LLM provider is not configured");
  }

  let lastError: unknown;
  for (const target of targets) {
    try {
      const streamResult = await withLlmRetry(() =>
        Promise.resolve(
          streamText({
            model: getProvider(target.provider)(target.model),
            system: options.system,
            messages: options.messages as CoreMessage[] | undefined,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
          })
        )
      );

      const textStream = wrapStreamWithFallback(
        streamResult.textStream,
        target,
        options,
        targets
      );

      return {
        textStream,
        provider: target.provider,
        model: target.model,
      };
    } catch (error) {
      lastError = error;
    }
  }

  const error = new Error("LLM service unavailable");
  (error as any).cause = lastError;
  throw error;
}

async function* wrapStreamWithFallback(
  primaryStream: AsyncIterable<string>,
  primaryTarget: LlmResolvedTarget,
  options: LlmCallOptions,
  targets: LlmResolvedTarget[]
): AsyncIterable<string> {
  let hasYielded = false;
  try {
    for await (const chunk of primaryStream) {
      hasYielded = true;
      yield chunk;
    }
    return;
  } catch (error) {
    if (hasYielded) {
      throw error;
    }
    const fallbackTarget = targets.find(
      (target) => target.provider !== primaryTarget.provider
    );
    if (!fallbackTarget) {
      throw error;
    }

    const fallbackStream = streamText({
      model: getProvider(fallbackTarget.provider)(fallbackTarget.model),
      system: options.system,
      messages: options.messages as CoreMessage[] | undefined,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    for await (const chunk of fallbackStream.textStream) {
      yield chunk;
    }
  }
}
