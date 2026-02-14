import { NextRequest } from "next/server";
import { getUserUuid } from "@/services/user";
import { isAdminUser } from "@/services/admin";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { isUserProfileImageReference } from "@/models/user";
import { toImageUrl } from "@/lib/r2-utils";
import { respErr } from "@/lib/resp";

type ResolveSize = "auto" | "desktop" | "mobile";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeSizeParam(size?: string | null): ResolveSize {
  if (!size) return "auto";
  const lowered = size.toLowerCase();
  if (lowered === "desktop" || lowered === "mobile" || lowered === "auto") {
    return lowered as ResolveSize;
  }
  return "auto";
}

function isMobileRequest(request: NextRequest): boolean {
  const clientHint = request.headers.get("sec-ch-ua-mobile");
  if (clientHint) {
    return clientHint === "?1" || clientHint === "1";
  }
  const userAgent = request.headers.get("user-agent") || "";
  return /Android|iPhone|iPad|iPod|Mobi/i.test(userAgent);
}

function pickResolvedPath(
  image: {
    thumbnail_mobile: string | null;
    thumbnail_desktop: string | null;
    thumbnail_detail: string | null;
    image_url: string;
  },
  size: "desktop" | "mobile",
) {
  if (size === "mobile") {
    return (
      image.thumbnail_mobile ||
      image.thumbnail_detail ||
      image.image_url ||
      ""
    );
  }
  return (
    image.thumbnail_desktop || image.thumbnail_detail || image.image_url || ""
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    if (!uuid || !uuidRegex.test(uuid)) {
      return respErr("Invalid uuid", 400);
    }

    const image = await findGenerationImageByUuid(uuid);
    if (!image) {
      return respErr("Image not found", 404);
    }

    const userUuid = await getUserUuid();
    const isPublic = image.visibility_level === "public";
    const isOwner = Boolean(userUuid && image.user_uuid === userUuid);
    let isAdmin = false;

    if (!isPublic && !isOwner) {
      if (userUuid) {
        isAdmin = await isAdminUser();
      }
      if (!isAdmin) {
        const isProfileImage = await isUserProfileImageReference(
          image.user_uuid,
          uuid,
        );
        if (!isProfileImage) {
          if (!userUuid) {
            return respErr("User not authenticated", 401);
          }
          return respErr("No permission to access this image", 403);
        }
      }
    }

    const { searchParams } = request.nextUrl;
    const sizeParam = normalizeSizeParam(searchParams.get("size"));
    const resolvedSize =
      sizeParam === "auto"
        ? isMobileRequest(request)
          ? "mobile"
          : "desktop"
        : sizeParam;

    const resolvedPath = pickResolvedPath(
      {
        thumbnail_mobile: image.thumbnail_mobile,
        thumbnail_desktop: image.thumbnail_desktop,
        thumbnail_detail: image.thumbnail_detail,
        image_url: image.image_url,
      },
      resolvedSize,
    );

    const resolvedUrl = toImageUrl(resolvedPath || image.image_url);
    const originalUrl = toImageUrl(image.image_url);

    return Response.json(
      {
        code: 0,
        message: "ok",
        data: {
          uuid: image.uuid,
          user_uuid: image.user_uuid,
          resolved_url: resolvedUrl,
          original_url: originalUrl,
          size: resolvedSize,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=300",
        },
      },
    );
  } catch (error: any) {
    console.error("Failed to resolve image:", error);
    return respErr(error?.message || "Resolve image failed", 500);
  }
}
