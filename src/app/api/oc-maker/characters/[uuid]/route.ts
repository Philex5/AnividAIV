import { z } from "zod";
import { respData, respErr, respError } from "@/lib/resp";
import {
  getCharacterByUuid,
  updateCharacter,
  deleteCharacter,
  validateCharacterOwnership,
} from "@/services/character";
import { getUserUuid } from "@/services/user";
import { parseCharacterModules } from "@/types/oc";
import { GenderSchema } from "@/types/oc";
import { updateCharacterModules, ModuleValidationError } from "@/services/character-modules";
import { getMembershipLevel } from "@/services/membership";
import {
  normalizeTagList,
  TagValidationError,
} from "@/lib/tag-normalizer";

// GET /api/oc-maker/characters/[uuid] - 获取角色详情
export async function GET(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;

    if (!uuid) {
      return respErr("Character UUID is required");
    }

    const viewerUuid = await getUserUuid();

    const character = await getCharacterByUuid(uuid);

    if (!character) {
      return respErr("Character not found", 404);
    }

    // 检查权限：只有角色所有者或公开角色可以访问
    const isOwner = viewerUuid && character.user_uuid === viewerUuid;
    const isPublic = character.visibility_level === "public";

    if (!isOwner && !isPublic) {
      return respErr("Access denied", 403);
    }

    const modules = parseCharacterModules(character.modules);
    const tags = Array.isArray(character.tags) ? character.tags : [];

    return respData({ ...character, modules, tags });
  } catch (error) {
    console.log("Get character failed:", error);
    return respErr("Failed to get character");
  }
}

// PUT /api/oc-maker/characters/[uuid] - 更新角色
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const data = await req.json();

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("User not authenticated", 401);
    }

    if (!uuid) {
      return respErr("Character UUID is required");
    }

    const hasPermission = await validateCharacterOwnership(uuid);
    if (!hasPermission) {
      return respErr("Access denied", 403);
    }

    const UpdateSchema = z
      .object({
        name: z.string().min(1).max(255).optional(),
        gender: GenderSchema.optional(),
        age: z.number().int().min(1).max(999999).nullable().optional(),
        role: z.string().max(100).nullable().optional(),
        species: z.string().max(100).nullable().optional(),

        brief_introduction: z.string().max(1000).nullable().optional(),

        personality_tags: z.array(z.string().max(50)).nullable().optional(),

        profile_generation_image_uuid: z.string().min(1).max(255).nullable().optional(),
        avatar_generation_image_uuid: z.string().min(1).max(255).nullable().optional(),

        remixed_from_uuid: z.string().max(255).nullable().optional(),

        visibility_level: z.enum(["public", "private"]).optional(),
        allow_remix: z.boolean().optional(),

        modules: z.record(z.unknown()).optional(),
        world_uuid: z.string().uuid().nullable().optional(),
        tags: z.array(z.string().min(1).max(20)).max(20).optional(),
        background_url: z
          .union([z.string().url(), z.literal(""), z.null()])
          .optional()
          .transform((value) => {
            if (value === "" || value === null) return null;
            return value;
          }),
      })
      .strict();

    type UpdatePayload = z.infer<typeof UpdateSchema>;
    let parsed: UpdatePayload;
    try {
      parsed = UpdateSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return respError("Request parameter validation failed", 400, {
          issues: error.issues,
        });
      }
      throw error;
    }

    let normalizedTags: string[] | undefined;
    if (parsed.tags !== undefined) {
      try {
        normalizedTags = normalizeTagList(parsed.tags);
      } catch (error) {
        if (error instanceof TagValidationError) {
          return respErr(error.message, 400);
        }
        throw error;
      }
    }

    const updateData: Record<string, unknown> = {};

    const setIfProvided = (key: keyof UpdatePayload) => {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        updateData[key] = (parsed as any)[key];
      }
    };

    setIfProvided("name");
    setIfProvided("gender");
    setIfProvided("age");
    setIfProvided("role");
    setIfProvided("species");
    setIfProvided("brief_introduction");
    setIfProvided("personality_tags");
    setIfProvided("profile_generation_image_uuid");
    setIfProvided("avatar_generation_image_uuid");
    setIfProvided("remixed_from_uuid");
    setIfProvided("visibility_level");
    setIfProvided("allow_remix");
    setIfProvided("world_uuid");
    setIfProvided("background_url");

    // Enforce visibility rules: Free users cannot have private characters
    if (updateData.visibility_level === "private") {
      const level = await getMembershipLevel(user_uuid);
      if (level === "free") {
        updateData.visibility_level = "public";
      }
    }

    if (normalizedTags !== undefined) {
      updateData.tags = normalizedTags;
    }

    const moduleUpdates = parsed.modules as Record<string, unknown> | undefined;

    if (Object.keys(updateData).length > 0) {
      const updated = await updateCharacter(uuid, updateData);
      if (!updated) {
        return respErr("Character not found", 404);
      }
    }

    let nextModules;
    if (moduleUpdates && Object.keys(moduleUpdates).length > 0) {
      nextModules = await updateCharacterModules(uuid, moduleUpdates as any);
    }

    const finalCharacter = await getCharacterByUuid(uuid);
    if (!finalCharacter) {
      return respErr("Character not found", 404);
    }

    const modules = nextModules ?? parseCharacterModules(finalCharacter.modules);
    const tags = Array.isArray(finalCharacter.tags) ? finalCharacter.tags : [];

    return respData({ ...finalCharacter, modules, tags });
  } catch (error) {
    console.log("Update character failed:", error);

    if (error instanceof ModuleValidationError) {
      return respError(error.message || "Invalid module structure", 400, {
        issues: error.details,
      });
    }

    if (error instanceof TagValidationError) {
      return respError(error.message, 400);
    }

    return respErr(
      error instanceof Error
        ? error.message || "Failed to update character"
        : "Failed to update character"
    );
  }
}

// DELETE /api/oc-maker/characters/[uuid] - 删除角色
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("User not authenticated", 401);
    }

    if (!uuid) {
      return respErr("Character UUID is required");
    }

    const hasPermission = await validateCharacterOwnership(uuid);
    if (!hasPermission) {
      return respErr("Access denied", 403);
    }

    const success = await deleteCharacter(uuid);

    if (!success) {
      return respErr("Character not found", 404);
    }

    return respData({ success: true });
  } catch (error) {
    console.log("Delete character failed:", error);
    return respErr("Failed to delete character");
  }
}
