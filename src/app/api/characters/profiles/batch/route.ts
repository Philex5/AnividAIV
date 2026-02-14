import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { characters, generationImages } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { toImageUrl } from "@/lib/r2-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { characterUuids, deviceType = "desktop" } = body;

    if (!characterUuids || !Array.isArray(characterUuids) || characterUuids.length === 0) {
      return NextResponse.json(
        { error: "Character UUIDs array is required" },
        { status: 400 }
      );
    }

    const database = db();

    const results = await database
      .select({
        character_uuid: characters.uuid,
        image_url: generationImages.image_url,
        thumbnail_mobile: generationImages.thumbnail_mobile,
        thumbnail_desktop: generationImages.thumbnail_desktop,
        thumbnail_detail: generationImages.thumbnail_detail,
      })
      .from(characters)
      .leftJoin(
        generationImages,
        eq(generationImages.uuid, characters.profile_generation_image_uuid)
      )
      .where(
        characterUuids.length === 1
          ? eq(characters.uuid, characterUuids[0])
          : inArray(characters.uuid, characterUuids)
      );

    const profileMap: Record<string, string | null> = {};

    // 处理查询结果
    for (const result of results) {
      if (!result.character_uuid) continue;

      if (!result.image_url) {
        profileMap[result.character_uuid] = null;
        continue;
      }

      // 根据设备类型选择合适的图片 URL
      let selectedUrl: string;
      switch (deviceType) {
        case "mobile":
          selectedUrl = result.thumbnail_mobile ||
                       result.thumbnail_desktop ||
                       result.image_url;
          break;
        case "desktop":
          selectedUrl = result.thumbnail_desktop ||
                       result.thumbnail_detail ||
                       result.image_url;
          break;
        case "detail":
          selectedUrl = result.thumbnail_detail || result.image_url;
          break;
        case "original":
          selectedUrl = result.image_url;
          break;
        default:
          selectedUrl = result.thumbnail_desktop || result.image_url;
      }

      profileMap[result.character_uuid] = toImageUrl(selectedUrl);
    }

    // 确保所有请求的角色都有对应的条目
    for (const uuid of characterUuids) {
      if (!(uuid in profileMap)) {
        profileMap[uuid] = null;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        profiles: profileMap,
        deviceType
      }
    });

  } catch (error) {
    console.error("Failed to get character profiles in batch:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}