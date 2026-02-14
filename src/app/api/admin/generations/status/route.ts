import { NextRequest } from "next/server";
import { db } from "@/db";
import { generationImages, generationVideos } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/admin-auth';

type ArtworkType = "image" | "video" | "character";
type ModerationStatus = "normal" | "banned" | "featured";

interface BulkStatusUpdateRequest {
  items: Array<{
    artworkUuid: string;
    artworkType: ArtworkType;
  }>;
  status: ModerationStatus;
}

/**
 * POST /api/admin/generations/status
 * Bulk update moderation_status for artworks (images, videos, characters)
 */
export async function POST(request: NextRequest) {
  // Verify admin access
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    console.log(`🔐 [Admin-Generations-Status] Authenticated via: ${authResult.method}`);

    const body = await request.json() as BulkStatusUpdateRequest;
    const { items, status } = body;

    // Validate input
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({
        code: -1,
        message: "Items array is required and must not be empty",
      }, { status: 400 });
    }

    const validStatuses: ModerationStatus[] = ["normal", "banned", "featured"];
    if (!status || !validStatuses.includes(status as ModerationStatus)) {
      return Response.json({
        code: -1,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      }, { status: 400 });
    }

    const database = db();

    // Group items by type for batch updates
    const imageUuids: string[] = [];
    const videoUuids: string[] = [];
    const characterUuids: string[] = [];

    items.forEach(({ artworkUuid, artworkType }) => {
      if (!artworkUuid || !artworkType) return;

      switch (artworkType) {
        case "image":
          imageUuids.push(artworkUuid);
          break;
        case "video":
          videoUuids.push(artworkUuid);
          break;
        case "character":
          characterUuids.push(artworkUuid);
          break;
      }
    });

    // Execute batch updates in parallel
    const updatePromises: Promise<any>[] = [];
    const results = {
      images: { updated: 0, failed: 0 },
      videos: { updated: 0, failed: 0 },
      characters: { updated: 0, failed: 0 },
      totalUpdated: 0,
      totalFailed: 0,
    };

    if (imageUuids.length > 0) {
      updatePromises.push(
        database
          .update(generationImages)
          .set({ moderation_status: status })
          .where(inArray(generationImages.uuid, imageUuids))
          .returning({ uuid: generationImages.uuid })
          .then((result) => {
            results.images.updated = result.length;
            results.totalUpdated += result.length;
          })
          .catch((error) => {
            console.error("Failed to update images:", error);
            results.images.failed = imageUuids.length;
            results.totalFailed += imageUuids.length;
          })
      );
    }

    if (videoUuids.length > 0) {
      updatePromises.push(
        database
          .update(generationVideos)
          .set({ moderation_status: status })
          .where(inArray(generationVideos.uuid, videoUuids))
          .returning({ uuid: generationVideos.uuid })
          .then((result) => {
            results.videos.updated = result.length;
            results.totalUpdated += result.length;
          })
          .catch((error) => {
            console.error("Failed to update videos:", error);
            results.videos.failed = videoUuids.length;
            results.totalFailed += videoUuids.length;
          })
      );
    }

    if (characterUuids.length > 0) {
      updatePromises.push(
        database
          .update(generationImages)
          .set({ moderation_status: status })
          .where(inArray(generationImages.uuid, characterUuids))
          .returning({ uuid: generationImages.uuid })
          .then((result) => {
            results.characters.updated = result.length;
            results.totalUpdated += result.length;
          })
          .catch((error) => {
            console.error("Failed to update character images:", error);
            results.characters.failed = characterUuids.length;
            results.totalFailed += characterUuids.length;
          })
      );
    }

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    return Response.json({
      code: 0,
      data: results,
      message: `Updated ${results.totalUpdated} items to status: ${status}`,
    });
  } catch (error: any) {
    console.error("Admin generations status update error:", error);
    return Response.json(
      { code: -1, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/generations/status
 * Get moderation status for artworks
 */
export async function GET(request: NextRequest) {
  // Verify admin access
  const authResult = await verifyAdminAccess(request);
  if (!authResult.authenticated) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = request.nextUrl;
    const uuids = searchParams.get("uuids");
    const type = searchParams.get("type") as ArtworkType | null;

    if (!uuids || !type) {
      return Response.json({
        code: -1,
        message: "uuids and type parameters are required",
      }, { status: 400 });
    }

    const uuidList = uuids.split(",").filter(Boolean);
    if (uuidList.length === 0) {
      return Response.json({
        code: -1,
        message: "At least one UUID is required",
      }, { status: 400 });
    }

    const database = db();
    let statuses: Record<string, string> = {};

    switch (type) {
      case "image": {
        const rows = await database
          .select({ uuid: generationImages.uuid, moderation_status: generationImages.moderation_status })
          .from(generationImages)
          .where(inArray(generationImages.uuid, uuidList));
        statuses = Object.fromEntries(rows.map(r => [r.uuid, r.moderation_status || "normal"]));
        break;
      }
      case "video": {
        const rows = await database
          .select({ uuid: generationVideos.uuid, moderation_status: generationVideos.moderation_status })
          .from(generationVideos)
          .where(inArray(generationVideos.uuid, uuidList));
        statuses = Object.fromEntries(rows.map(r => [r.uuid, r.moderation_status || "normal"]));
        break;
      }
      case "character": {
        const rows = await database
          .select({ uuid: generationImages.uuid, moderation_status: generationImages.moderation_status })
          .from(generationImages)
          .where(inArray(generationImages.uuid, uuidList));
        statuses = Object.fromEntries(rows.map(r => [r.uuid, r.moderation_status || "normal"]));
        break;
      }
      default:
        return Response.json({
          code: -1,
          message: "Invalid type. Must be one of: image, video, character",
        }, { status: 400 });
    }

    return Response.json({
      code: 0,
      data: statuses,
    });
  } catch (error: any) {
    console.error("Admin get moderation status error:", error);
    return Response.json(
      { code: -1, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
