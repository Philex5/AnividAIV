/**
 * Base Adapter for KieAI Models
 * Provides common functionality and state mapping
 */

import type {
  GenerationParams,
  TaskCreationResult,
  TaskQueryResult,
  TaskState,
} from "@/types/kie-ai-provider";

export abstract class BaseAdapter {
  protected apiKey: string;
  protected baseUrl: string;

  constructor() {
    this.apiKey = process.env.KIE_AI_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("KIE_AI_API_KEY is not configured");
    }

    const configuredBaseUrl =
      process.env.KIE_AI_BASE_URL ||
      process.env.KIE_AI_API_BASE_URL ||
      process.env.KIE_AI_API_URL ||
      "";

    const rawBaseUrl = (configuredBaseUrl || "https://api.kie.ai").trim();
    let parsed: URL;
    try {
      parsed = new URL(rawBaseUrl);
    } catch {
      throw new Error(
        `KIE_AI_BASE_URL is not a valid absolute URL: ${rawBaseUrl}`
      );
    }

    this.baseUrl = parsed.toString().replace(/\/$/, "");
  }

  protected buildApiUrl(path: string): string {
    try {
      return new URL(path, this.baseUrl).toString();
    } catch {
      throw new Error(
        `Failed to build KieAI API url (base: ${this.baseUrl}, path: ${path})`
      );
    }
  }

  /**
   * Create a generation task
   */
  abstract createTask(
    params: GenerationParams,
    callbackUrl: string
  ): Promise<TaskCreationResult>;

  /**
   * Query task status
   */
  abstract queryTask(taskId: string): Promise<TaskQueryResult>;

  /**
   * Map aspect ratio to model-specific format
   */
  protected abstract mapAspectRatio(aspectRatio: string): string;

  /**
   * Standardize state mapping from KieAI states to internal states
   */
  protected mapState(
    state: TaskState
  ): "pending" | "processing" | "completed" | "failed" {
    switch (state) {
      case "waiting":
      case "queuing":
        return "pending";
      case "generating":
        return "processing";
      case "success":
        return "completed";
      case "fail":
        return "failed";
      default:
        return "pending";
    }
  }

  /**
   * Sleep helper for retry delays
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable (network/timeout errors)
   */
  private isRetryableError(error: any): boolean {
    // Network errors that should be retried
    const retryableErrors = [
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ECONNREFUSED",
    ];

    if (error.cause?.code) {
      return retryableErrors.includes(error.cause.code);
    }

    if (error.code) {
      return retryableErrors.includes(error.code);
    }

    // TypeError: fetch failed is also retryable
    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      return true;
    }

    return false;
  }

  /**
   * Common fetch wrapper with timeout control and retry mechanism
   */
  protected async fetchAPI<T>(
    url: string,
    options: RequestInit,
    timeout: number = 30000, // 30 seconds default
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const errorMsg = `KieAI API error: ${response.status} - ${errorText}`;
          console.error(`[KieAI API] HTTP error:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          throw new Error(errorMsg);
        }

        const result = await response.json();
        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;

        // Log error details
        console.error(`[KieAI API] Request failed on attempt ${attempt + 1}:`, {
          error: error.message,
          code: error.code || error.cause?.code,
          type: error.constructor.name,
          isRetryable: this.isRetryableError(error),
        });

        // Don't retry on HTTP errors (they are returned as successful responses but !ok)
        // Only retry on network/timeout errors
        if (!this.isRetryableError(error)) {
          console.error("[KieAI API] Non-retryable error, aborting");
          throw error;
        }

        // If we've exhausted retries, throw the error
        if (attempt === maxRetries) {
          console.error(
            `[KieAI API] Max retries (${maxRetries}) exceeded, giving up`
          );
          const hint =
            "KieAI API is unreachable after multiple attempts. Verify network egress/DNS/TLS and check KIE_AI_BASE_URL.";
          throw new Error(`${hint} Last error: ${error.message}`, {
            cause: error,
          });
        }

        // Exponential backoff: 2^attempt * 1000ms (1s, 2s, 4s)
        const backoffMs = Math.pow(2, attempt) * 1000;
        await this.sleep(backoffMs);
      }
    }

    // Should never reach here, but TypeScript requires it
    throw lastError;
  }
}
