import { NextRequest } from "next/server";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { generateTextWithFallback } from "@/services/llm/llm-service";
import { resolvePromptTemplate } from "@/lib/prompt-template";
import { getUserUuid } from "@/services/user";

type LlmBuildConfig = {
  model: string;
  temperature?: number;
  max_tokens?: number;
  required_fields?: string[];
  system_prompt: string;
  user_prompt_template: string;
};

type OutputRules = {
  max_length?: number;
  sanitize_prompt?: boolean;
};

type PromptTemplateConfig = {
  llm_build?: LlmBuildConfig;
  output_rules?: OutputRules;
  prompt?: string;
};

const BuildExtractPromptSchema = z.object({
  template_key: z.string().min(1, "Template key is required"),
  template_params: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .default({}),
  use_llm_build: z.boolean().optional().default(true),
});

const PROMPT_BASE_DIR = path.join(process.cwd(), "src", "configs", "prompts");

function sanitizePrompt(prompt: string): string {
  return prompt
    .trim()
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*$/, "");
}

function resolveTemplatePath(templateKey: string): string {
  const normalizedKey = templateKey.replace(/\\/g, "/").replace(/^\/+/, "");
  const fileName = normalizedKey.endsWith(".json")
    ? normalizedKey
    : `${normalizedKey}.json`;
  const resolvedPath = path.normalize(path.join(PROMPT_BASE_DIR, fileName));
  if (!resolvedPath.startsWith(`${PROMPT_BASE_DIR}${path.sep}`)) {
    throw new Error("Template path is not allowed");
  }
  return resolvedPath;
}

async function loadPromptConfig(templateKey: string): Promise<PromptTemplateConfig> {
  const filePath = resolveTemplatePath(templateKey);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as PromptTemplateConfig;
}

function formatErrorResponse(message: string, code: string, status: number) {
  return Response.json(
    {
      success: false,
      error: message,
      error_code: code,
    },
    { status }
  );
}

function resolveRequiredFields(
  templateParams: Record<string, string | number | boolean | null>,
  requiredFields: string[]
): string[] {
  return requiredFields.filter((field) => {
    const value = templateParams[field];
    if (value === null || value === undefined) return true;
    return String(value).trim().length === 0;
  });
}

export async function POST(request: NextRequest) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return Response.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = BuildExtractPromptSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: "Request parameter validation failed",
          details: parsed.error.errors,
        },
        { status: 400 }
      );
    }

    const { template_key, template_params, use_llm_build } = parsed.data;

    let config: PromptTemplateConfig;
    try {
      config = await loadPromptConfig(template_key);
    } catch (error) {
      console.error("Failed to load prompt config:", error);
      return formatErrorResponse("Template not found", "TEMPLATE_NOT_FOUND", 404);
    }

    if (!use_llm_build) {
      if (!config.prompt) {
        return formatErrorResponse(
          "Template prompt is missing",
          "TEMPLATE_PROMPT_MISSING",
          500
        );
      }
      const resolved = resolvePromptTemplate(config.prompt, template_params);
      if (resolved.missingKeys.length > 0) {
        return formatErrorResponse(
          `Missing template params: ${resolved.missingKeys.join(", ")}`,
          "REQUIRED_FIELD_MISSING",
          400
        );
      }
      if (!resolved.prompt.trim()) {
        return formatErrorResponse("Prompt is empty", "PROMPT_EMPTY", 500);
      }
      return Response.json({ success: true, data: { prompt: resolved.prompt } });
    }

    const llmBuild = config.llm_build;
    if (!llmBuild) {
      return formatErrorResponse(
        "LLM build configuration is missing",
        "LLM_BUILD_CONFIG_MISSING",
        500
      );
    }

    if (!Array.isArray(llmBuild.required_fields) || llmBuild.required_fields.length === 0) {
      return formatErrorResponse(
        "Required fields are not configured",
        "REQUIRED_FIELD_MISSING",
        500
      );
    }

    const missingRequired = resolveRequiredFields(
      template_params,
      llmBuild.required_fields
    );
    if (missingRequired.length > 0) {
      return formatErrorResponse(
        `Missing required fields: ${missingRequired.join(", ")}`,
        "REQUIRED_FIELD_MISSING",
        400
      );
    }

    if (!llmBuild.system_prompt || !llmBuild.user_prompt_template || !llmBuild.model) {
      return formatErrorResponse(
        "LLM build configuration is incomplete",
        "LLM_BUILD_CONFIG_INVALID",
        500
      );
    }

    const resolvedPrompt = resolvePromptTemplate(
      llmBuild.user_prompt_template,
      template_params
    );
    const missingRequiredInPrompt = resolvedPrompt.missingKeys.filter((key) =>
      llmBuild.required_fields?.includes(key)
    );
    if (missingRequiredInPrompt.length > 0) {
      return formatErrorResponse(
        `Missing required fields: ${missingRequiredInPrompt.join(", ")}`,
        "REQUIRED_FIELD_MISSING",
        400
      );
    }

    let output = "";
    try {
      const { text } = await generateTextWithFallback({
        model: llmBuild.model,
        system: llmBuild.system_prompt,
        prompt: resolvedPrompt.prompt,
        temperature: llmBuild.temperature,
        maxTokens: llmBuild.max_tokens,
        provider: "xiaojing",
        scenario: "anime_generation_build_extract_prompt",
      });
      output = text.trim();
    } catch (error) {
      console.error("LLM build failed:", error);
      if (error instanceof Error && error.message === "LLM provider is not configured") {
        return formatErrorResponse(
          "LLM provider is not configured",
          "LLM_SERVICE_UNAVAILABLE",
          503
        );
      }
      return formatErrorResponse("LLM build failed", "LLM_BUILD_FAILED", 502);
    }

    const outputRules = config.output_rules;
    if (outputRules?.sanitize_prompt) {
      output = sanitizePrompt(output);
    }
    if (typeof outputRules?.max_length === "number" && output.length > outputRules.max_length) {
      output = output.slice(0, outputRules.max_length).trim();
    }

    if (!output) {
      return formatErrorResponse("Prompt is empty", "PROMPT_EMPTY", 500);
    }

    return Response.json({ success: true, data: { prompt: output } });
  } catch (error: any) {
    console.error("Build extract prompt failed:", error);
    return Response.json(
      {
        success: false,
        error: error?.message || "Build extract prompt failed",
      },
      { status: 500 }
    );
  }
}
