import { NextRequest } from "next/server";
import { findGenerationVideoByUuid } from "@/models/generation-video";
import { toImageUrl } from "@/lib/r2-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const resolvedParams = await params;
    const videoUuid = resolvedParams.uuid;

    const video = await findGenerationVideoByUuid(videoUuid);
    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    const rawUrl = video.video_url;
    if (!rawUrl) {
      return Response.json({ error: "Video URL is missing" }, { status: 404 });
    }

    const videoUrl = toImageUrl(rawUrl);
    if (!videoUrl) {
      return Response.json({ error: "Video URL is invalid" }, { status: 404 });
    }

    const upstream = await fetch(videoUrl);
    if (!upstream.ok) {
      throw new Error(`Failed to fetch video: HTTP ${upstream.status}`);
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const contentType =
      upstream.headers.get("Content-Type") || "video/mp4";

    const extension = contentType.includes("webm")
      ? "webm"
      : contentType.includes("ogg")
      ? "ogg"
      : "mp4";

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="anime-video-${videoUuid}.${extension}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Download video failed:", error);

    return Response.json(
      { error: error.message || "Failed to download video" },
      { status: 500 }
    );
  }
}
