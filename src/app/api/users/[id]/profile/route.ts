import { z } from "zod";
import { respData, respErr } from "@/lib/resp";
import { auth } from "@/auth";
import { getPublicProfile, updateProfile } from "@/services/user-profile";
import { isImageUuid } from "@/lib/image-resolve";
import { isAbsoluteUrl } from "@/lib/r2-utils";

const isValidImageReference = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isImageUuid(trimmed)) return true;
  if (isAbsoluteUrl(trimmed) || trimmed.startsWith("/")) return true;
  return /^[\w.\-\/]+$/.test(trimmed);
};

const ImageReferenceSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(isValidImageReference, { message: "Invalid image reference" });

const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(40).optional(),
  avatar_url: ImageReferenceSchema.nullable().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  bio: z.string().max(200).nullable().optional(),
  background_url: ImageReferenceSchema.nullable().optional(),
});

// GET /api/users/[id]/profile - 获取用户公开资料
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return respErr("User id is required", 400);
    }

    const session = await auth();
    const viewerUuid = session?.user?.uuid || undefined;

    const profile = await getPublicProfile(id, viewerUuid);

    return respData(profile);
  } catch (error: any) {
    const message = typeof error?.message === "string" ? error.message : "";
    if (message === "Profile not found") {
      return respErr("Profile not found", 404);
    }
    console.error("Failed to get user profile:", error);
    return respErr("Failed to load profile");
  }
}

// PUT /api/users/[id]/profile - 更新本人 profile
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return respErr("User id is required", 400);
    }

    const session = await auth();
    const viewerUuid = session?.user?.uuid;
    if (!viewerUuid || viewerUuid !== id) {
      return respErr("Unauthorized", 401);
    }

    const payload = UpdateProfileSchema.parse(await req.json());
    const updated = await updateProfile(id, payload);

    return respData(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return respErr("Invalid payload", 400);
    }

    const message = typeof error?.message === "string" ? error.message : "";
    if (message === "Profile not found") {
      return respErr("Profile not found", 404);
    }
    if (
      message === "Invalid gender" ||
      message === "Invalid avatar image" ||
      message === "Invalid background image"
    ) {
      return respErr(message, 400);
    }

    console.error("Failed to update user profile:", error);
    return respErr("Failed to update profile");
  }
}
