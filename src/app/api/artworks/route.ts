/**
 * Artworks List API
 * GET /api/artworks
 * Related: FEAT-my-artworks
 *
 * Query user's generated artworks (images and videos)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/services/user";
import { getUserArtworks } from "@/services/artworks";
import type { TypeTab, MainTab } from "@/types/pages/my-artworks";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getUserInfo();
    if (!user || !user.uuid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = (searchParams.get("type") || "all") as TypeTab;
    const tab = (searchParams.get("tab") || "mine") as MainTab;
    const searchQuery = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Validate parameters
    if (!["all", "image", "video"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type parameter" },
        { status: 400 }
      );
    }

    if (!["mine", "favorites"].includes(tab)) {
      return NextResponse.json(
        { success: false, error: "Invalid tab parameter" },
        { status: 400 }
      );
    }

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    // Query artworks
    const result = await getUserArtworks({
      userUuid: user.uuid,
      type,
      tab,
      searchQuery,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API] Failed to fetch artworks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch artworks",
      },
      { status: 500 }
    );
  }
}
