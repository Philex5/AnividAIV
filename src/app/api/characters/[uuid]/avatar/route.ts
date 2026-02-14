import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { characters, generationImages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toImageUrl } from "@/lib/r2-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid: characterUuid } = await params;
    const { searchParams } = new URL(request.url);
    const deviceType = searchParams.get("device") || "desktop";

    if (!characterUuid) {
      return NextResponse.json(
        { error: "Character UUID is required" },
        { status: 400 }
      );
    }

    const database = db();

    // 查询角色及其关联的头像信息
    const result = await database
      .select({
        avatar_generation_image_uuid: characters.avatar_generation_image_uuid,
        image_url: generationImages.image_url,
        thumbnail_mobile: generationImages.thumbnail_mobile,
        thumbnail_desktop: generationImages.thumbnail_desktop,
        thumbnail_detail: generationImages.thumbnail_detail,
      })
      .from(characters)
      .leftJoin(
        generationImages,
        eq(generationImages.uuid, characters.avatar_generation_image_uuid)
      )
      .where(eq(characters.uuid, characterUuid))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    const characterData = result[0];

    if (!characterData.avatar_generation_image_uuid || !characterData.image_url) {
      return NextResponse.json(
        { error: "No avatar image found for this character" },
        { status: 404 }
      );
    }

    // 根据设备类型选择合适的图片 URL
    let selectedUrl: string;
    switch (deviceType) {
      case "mobile":
        selectedUrl = characterData.thumbnail_mobile ||
                     characterData.thumbnail_desktop ||
                     characterData.image_url;
        break;
      case "desktop":
        selectedUrl = characterData.thumbnail_desktop ||
                     characterData.thumbnail_detail ||
                     characterData.image_url;
        break;
      case "detail":
        selectedUrl = characterData.thumbnail_detail || characterData.image_url;
        break;
      case "original":
        selectedUrl = characterData.image_url;
        break;
      default:
        selectedUrl = characterData.thumbnail_desktop || characterData.image_url;
    }

    // 使用 r2-utils 转换为完整 URL
    const fullUrl = toImageUrl(selectedUrl);

    return NextResponse.json({
      success: true,
      data: {
        url: fullUrl,
        deviceType,
        hasAvatar: true
      }
    });

  } catch (error) {
    console.error("Failed to get character avatar:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}