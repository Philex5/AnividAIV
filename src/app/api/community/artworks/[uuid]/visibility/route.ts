import { respData, respErr } from "@/lib/resp";
import { getUserInfo, isUserSubscribed } from "@/services/user";
import {
  updateArtworkVisibility,
  getArtworkVisibility,
  findCharacterByUuidWithOwnership,
} from "@/models/artwork";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { findGenerationVideoByUuid } from "@/models/generation-video";

type ArtType = "image" | "video" | "character";

/**
 * PUT /api/community/artworks/[uuid]/visibility?type=image|video|character
 * Toggle artwork visibility (public <-> private)
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as ArtType | null;

    const user = await getUserInfo();
    if (!user) {
      return respErr("User not authenticated", 401);
    }

    if (!uuid) {
      return respErr("Artwork UUID is required");
    }

    if (!type || !["image", "video", "character"].includes(type)) {
      return respErr(
        "Valid artwork type is required (image, video, or character)"
      );
    }

    // Verify ownership for image/video/character
    if (type === "image") {
      const artwork = await findGenerationImageByUuid(uuid);
      if (!artwork) {
        return respErr("Artwork not found", 404);
      }
      if (artwork.user_uuid !== user.uuid) {
        return respErr("You can only update visibility of your own artworks", 403);
      }
    } else if (type === "video") {
      const artwork = await findGenerationVideoByUuid(uuid);
      if (!artwork) {
        return respErr("Artwork not found", 404);
      }
      if (artwork.user_uuid !== user.uuid) {
        return respErr("You can only update visibility of your own artworks", 403);
      }
    } else if (type === "character") {
      const character = await findCharacterByUuidWithOwnership(uuid, user.uuid);
      if (!character) {
        return respErr("Character not found or access denied", 404);
      }
    }

    // Get current visibility
    const currentVisibility = await getArtworkVisibility(uuid, type);

    // Toggle visibility
    const newVisibility =
      currentVisibility === "public" ? "private" : "public";

    // Enforce visibility rules: Free users cannot set to private
    if (newVisibility === "private") {
      const isSub = await isUserSubscribed(user as any);
      if (!isSub) {
        return respErr("Private visibility is a pro feature", 403);
      }
    }

    // Update visibility
    await updateArtworkVisibility(uuid, type, newVisibility);

    return respData({
      success: true,
      visibility_level: newVisibility,
    });
  } catch (error) {
    console.log("Update visibility failed:", error);
    return respErr("Failed to update visibility");
  }
}

/**
 * GET /api/community/artworks/[uuid]/visibility?type=image|video|character
 * Get current artwork visibility
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as ArtType | null;

    if (!uuid) {
      return respErr("Artwork UUID is required");
    }

    if (!type || !["image", "video", "character"].includes(type)) {
      return respErr(
        "Valid artwork type is required (image, video, or character)"
      );
    }

    // Get current visibility
    const visibility = await getArtworkVisibility(uuid, type);

    return respData({
      uuid,
      type,
      visibility_level: visibility,
    });
  } catch (error) {
    console.log("Get visibility failed:", error);
    return respErr("Failed to get visibility");
  }
}
