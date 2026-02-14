import { NextRequest, NextResponse } from "next/server";

const cacheMaxAge = 60 * 5; // 5 minutes is enough for avatar previews

function isHostAllowed(hostname: string): boolean {
  return Boolean(hostname);
}

export async function GET(request: NextRequest) {
  const encodedUrl = request.nextUrl.searchParams.get("url");

  if (!encodedUrl) {
    return NextResponse.json(
      { error: "Image URL is required" },
      { status: 400 }
    );
  }

  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(encodedUrl);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid URL encoding" },
      { status: 400 }
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(decodedUrl);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid image URL" },
      { status: 400 }
    );
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return NextResponse.json(
      { error: "Only HTTP(S) protocols are supported" },
      { status: 400 }
    );
  }

  if (!isHostAllowed(targetUrl.hostname)) {
    return NextResponse.json(
      { error: "Image host is not allowed" },
      { status: 403 }
    );
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${cacheMaxAge}`,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Image proxy failed:", error);
    return NextResponse.json(
      { error: "Failed to proxy image" },
      { status: 500 }
    );
  }
}
