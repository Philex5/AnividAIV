import { z } from "zod";
import { respData, respErr, respError } from "@/lib/resp";
import {
  updateCharacter,
  validateCharacterOwnership,
} from "@/services/character";
import { getUserUuid } from "@/services/user";
import {
  findGenerationImageByUuid,
  insertGenerationImage,
} from "@/models/generation-image";
import { insertGeneration } from "@/models/generation";
import { v4 as uuidv4 } from "uuid";

function collectAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const candidates = [
    process.env.NEXT_PUBLIC_STORAGE_DOMAIN,
    process.env.STORAGE_DOMAIN,
    process.env.NEXT_PUBLIC_WEB_URL,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const normalized = candidate.startsWith("http")
        ? candidate
        : `https://${candidate}`;
      const url = new URL(normalized);
      origins.add(url.origin);
    } catch {
      // Ignore invalid domains
    }
  }
  return origins;
}

function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith("/")) {
    return true;
  }
  if (!/^https?:\/\//i.test(url)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    const allowedOrigins = collectAllowedOrigins();
    return allowedOrigins.has(parsed.origin);
  } catch {
    return false;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid: characterUuid } = await params;
    const data = await req.json();

    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respErr("User not authenticated", 401);
    }

    const hasPermission = await validateCharacterOwnership(characterUuid);
    if (!hasPermission) {
      return respErr("Access denied", 403);
    }

    const AvatarSchema = z
      .object({
        image_url: z.string().url().optional(),
        image_uuid: z.string().uuid().optional(),
        type: z.enum(["upload", "crop"]).default("upload"),
      })
      .refine((value) => value.image_url || value.image_uuid, {
        message: "image_url or image_uuid is required",
        path: ["image_url"],
      });

    const parsed = AvatarSchema.parse(data);
    if (parsed.image_uuid) {
      const existingImage = await findGenerationImageByUuid(
        parsed.image_uuid,
      );
      if (!existingImage || existingImage.user_uuid !== userUuid) {
        return respErr("Image not found", 404);
      }

      await updateCharacter(characterUuid, {
        avatar_generation_image_uuid: existingImage.uuid,
      });

      return respData({
        success: true,
        image_uuid: existingImage.uuid,
        image_url: existingImage.image_url,
      });
    }

    if (!parsed.image_url || !isAllowedImageUrl(parsed.image_url)) {
      return respErr("Image URL is not allowed", 400);
    }

    // 1. Create a generation record for this manual upload/crop
    const generationUuid = uuidv4();
    await insertGeneration({
      uuid: generationUuid,
      user_uuid: userUuid,
      type: "avatar",
      sub_type: parsed.type,
      prompt: `Manual avatar ${parsed.type}`,
      model_id: "manual",
      status: "completed",
      counts: 1,
      success_count: 1,
      visibility_level: "private",
      character_uuids: characterUuid,
    });

    // 2. Create a generation_image record
    const imageUuid = uuidv4();
    await insertGenerationImage({
      uuid: imageUuid,
      generation_uuid: generationUuid,
      user_uuid: userUuid,
      image_url: parsed.image_url,
      image_index: 0,
      gen_type: "avatar",
      visibility_level: "private",
      status: "archived",
    });

    // 3. Update character's avatar_generation_image_uuid
    await updateCharacter(characterUuid, {
      avatar_generation_image_uuid: imageUuid,
    });

    return respData({ 
      success: true, 
      image_uuid: imageUuid,
      image_url: parsed.image_url 
    });
  } catch (error) {
    console.error("Avatar update failed:", error);
    if (error instanceof z.ZodError) {
      return respError("Invalid parameters", 400, error.errors);
    }
    return respErr("Failed to update avatar");
  }
}
