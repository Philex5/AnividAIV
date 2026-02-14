import { getUserUuid } from "@/services/user";
import { generationServiceFactory } from "@/services/generation";
import type { AvatarGenerationRequest } from "@/services/generation";
import { z } from "zod";
import { respData, respError } from "@/lib/resp";

// 独立头像生成Schema（不需要character_uuid）
const AvatarGenerationSchema = z.object({
  reference_image_urls: z.array(z.string().url()).min(1, "At least one reference image URL is required"),
  // Use edit model by default to ensure KIE receives image_urls
  model_uuid: z.string().default("google/nano-banana"),
  character_data: z
    .object({
      name: z.string(),
      gender: z.string(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respError("User not authenticated", 401);
    }

    const requestData = await req.json();
    const validatedData = AvatarGenerationSchema.parse(requestData);

    console.log("🎭 Avatar generation request:", {
      has_reference: validatedData.reference_image_urls.length > 0,
      reference_count: validatedData.reference_image_urls.length,
      character_name: validatedData.character_data?.name,
    });

    const avatarRequest: AvatarGenerationRequest = {
      user_uuid,
      model_id: validatedData.model_uuid || "google/nano-banana",
      aspect_ratio: "1:1",
      counts: 1,
      gen_type: "avatar",
      reference_image_urls: validatedData.reference_image_urls,
      metadata: {
        source: "oc_maker_avatar",
        character_name: validatedData.character_data?.name,
      },
    };

    const result = await generationServiceFactory.createGeneration(
      "avatar",
      avatarRequest
    );

    return respData(result);
  } catch (error: any) {
    console.error("❌ Avatar generation failed:", error);

    if (error.name === "ZodError") {
      return respError(
        `Validation failed: ${error.errors.map((e: any) => e.message).join(", ")}`,
        400
      );
    }

    if (error.name === "GenerationError") {
      return respError(error.message, error.statusCode || 400);
    }

    if (error.message?.includes("Insufficient credits")) {
      return respError(error.message, 402);
    }

    return respError(
      error.message || "Failed to generate avatar",
      500
    );
  }
}
