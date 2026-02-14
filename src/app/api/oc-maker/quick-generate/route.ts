import { z } from "zod";
import { respData, respError } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import {
  OcLimitReachedError,
  QuickGenerationService,
} from "@/services/generation/character/quick-generation-service";

const QuickGenerateSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(10000, "Description must be less than 10000 characters"),
  auto_generate_image: z.boolean().optional().default(true),
  art_style: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respError("User not authenticated", 401);
    }

    const requestData = await req.json();
    const validated = QuickGenerateSchema.parse(requestData);

    const result = await QuickGenerationService.generateFromDescription({
      description: validated.description,
      user_uuid,
      auto_generate_image: validated.auto_generate_image,
      art_style: validated.art_style,
    });

    return respData(result);
  } catch (error: any) {
    console.error("Quick generate failed:", error);

    if (error?.name === "ZodError") {
      return respError(
        "Request parameter validation failed",
        400,
        error.errors,
      );
    }

    if (
      error?.name === "ServiceError" &&
      error?.code === "INSUFFICIENT_CREDITS"
    ) {
      return respError(error.message || "Insufficient credits", 402);
    }

    if (
      typeof error?.message === "string" &&
      error.message.includes("Insufficient credits")
    ) {
      return respError(error.message, 402);
    }

    if (error instanceof OcLimitReachedError) {
      return respError(error.message, 403);
    }

    return respError(
      error?.message || "Failed to quick generate character",
      500,
    );
  }
}
