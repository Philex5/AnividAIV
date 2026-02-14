import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { VideoParamsSchema } from "@/services/generation/video/video-types";
import { videoGenerationService } from "@/services/generation/video/video-generation-service";
import { db } from "@/db";
import { characters, generationImages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toImageUrl } from "@/lib/r2-utils";
import { canUsePrivateVisibility } from "@/services/membership";
import { getPromptMaxLength, getPromptMinLength, getActiveModels } from "@/lib/configs";

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  let requestId: string | undefined;

  try {
    const userUuid = await getUserUuid();
    if (!userUuid) {
      console.warn("[CreateTaskAPI] Request rejected: User not authenticated");
      return Response.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate visibility permission
    if (body.visibility_level === "private") {
      const canUsePrivate = await canUsePrivateVisibility(userUuid);
      if (!canUsePrivate) {
        console.warn(
          "[CreateTaskAPI] Request rejected: Private visibility requires subscription",
          {
            user_uuid: userUuid,
          }
        );
        return Response.json(
          {
            success: false,
            error:
              "Private visibility requires a subscription. Upgrade to unlock this feature.",
            error_code: "SUBSCRIPTION_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

    const origin = request.nextUrl.origin;

    const toAbsoluteUrl = (url?: string | null) => {
      if (!url) return undefined;
      if (/^https?:\/\//i.test(url)) {
        return url;
      }
      try {
        const normalized = url.startsWith("/") ? url : `/${url}`;
        return new URL(normalized, origin).toString();
      } catch (err) {
        console.warn("[CreateTaskAPI] Failed to normalize URL", {
          url,
          origin,
          error: err instanceof Error ? err.message : err,
        });
        return undefined;
      }
    };

    // 支持 character_uuid → 自动解析为 character_image_url
    let character_image_url = body.character_image_url as string | undefined;
    if (!character_image_url && body.character_uuid) {
      try {
        const database = db();
        const [characterRecord] = await database
          .select({
            uuid: characters.uuid,
            profile_generation_image_uuid:
              characters.profile_generation_image_uuid,
            image_url: generationImages.image_url,
          })
          .from(characters)
          .leftJoin(
            generationImages,
            eq(generationImages.uuid, characters.profile_generation_image_uuid)
          )
          .where(eq(characters.uuid, body.character_uuid))
          .limit(1);

        if (!characterRecord) {
          console.warn("[CreateTaskAPI] Character not found", {
            character_uuid: body.character_uuid,
          });
        }

        const resolvedFromDb = characterRecord?.image_url
          ? toAbsoluteUrl(toImageUrl(characterRecord.image_url))
          : undefined;

        const fallbackUrl = toAbsoluteUrl(
          characterRecord?.profile_generation_image_uuid
            ? `/api/generation/image/${characterRecord.profile_generation_image_uuid}`
            : undefined
        );

        character_image_url = resolvedFromDb || fallbackUrl;

        if (character_image_url) {
          console.log("[CreateTaskAPI] Character image resolved", {
            character_image_url,
            usedFallback: !resolvedFromDb,
          });
        } else {
          console.warn("[CreateTaskAPI] Failed to resolve character image", {
            character_uuid: body.character_uuid,
            resolvedFromDb,
            fallbackUrl,
          });
        }
      } catch (e) {
        console.error("[CreateTaskAPI] Failed to resolve character image:", e);
      }
    }

    const parsed = VideoParamsSchema.parse({
      ...body,
      user_uuid: userUuid,
      character_image_url,
    });

    // Validate prompt length based on model configuration
    if (parsed.prompt) {
      const models = await getActiveModels();
      const selectedModel = models.find((m) => m.model_id === parsed.model_id);

      if (selectedModel) {
        const maxLength = getPromptMaxLength(selectedModel);
        const minLength = getPromptMinLength(selectedModel);

        if (parsed.prompt.length > maxLength) {
          return Response.json(
            {
              success: false,
              error: `Prompt exceeds maximum length of ${maxLength} characters`,
            },
            { status: 400 }
          );
        }

        if (parsed.prompt.length < minLength) {
          return Response.json(
            {
              success: false,
              error: `Prompt must be at least ${minLength} characters`,
            },
            { status: 400 }
          );
        }
      }
    }

    const result = await videoGenerationService.createGeneration(parsed);
    requestId = result.generation_uuid;

    const duration = Date.now() - requestStartTime;

    return Response.json({ success: true, data: result });
  } catch (error: any) {
    const duration = Date.now() - requestStartTime;

    if (error.name === "ZodError") {
      console.error("[CreateTaskAPI] Parameter validation failed", {
        request_id: requestId,
        errors: error.errors,
        duration: `${duration}ms`,
      });
      return Response.json(
        {
          success: false,
          error: "Request parameter validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    const msg = error?.message || "Failed to create video task";
    const status = msg.includes("Insufficient credits") ? 402 : 500;

    console.error("[CreateTaskAPI] Request failed", {
      request_id: requestId,
      error: msg,
      status,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    return Response.json({ success: false, error: msg }, { status });
  }
}
