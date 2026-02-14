import { NextRequest } from "next/server";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { toImageUrl } from "@/lib/r2-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const resolvedParams = await params;
    const imageUuid = resolvedParams.uuid;

    // 获取图片记录
    const image = await findGenerationImageByUuid(imageUuid);
    if (!image) {
      return Response.json({ error: "Image not found" }, { status: 404 });
    }

    // 获取完整的图片 URL（自动处理临时 URL 和 R2 URL）
    const imageUrl = toImageUrl(image.image_url);

    // 下载图片
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status}`);
    }

    // 获取图片数据
    const arrayBuffer = await response.arrayBuffer();

    // 获取内容类型
    const contentType =
      response.headers.get("Content-Type") || "image/jpeg";

    // 确定文件扩展名
    const extension = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
      ? "webp"
      : "jpg";

    // 返回图片流
    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="anime-${imageUuid}.${extension}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Download image failed:", error);

    return Response.json(
      { error: error.message || "Failed to download image" },
      { status: 500 }
    );
  }
}
