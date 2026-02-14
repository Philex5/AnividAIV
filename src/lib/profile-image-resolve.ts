import "server-only";

import { toImageUrl } from "@/lib/r2-utils";
import { isImageUuid } from "@/lib/image-resolve";
import { findGenerationImageByUuid } from "@/models/generation-image";
import { isUserProfileImageReference } from "@/models/user";

type ResolveSize = "desktop" | "mobile";

function pickResolvedPath(
  image: {
    thumbnail_mobile: string | null;
    thumbnail_desktop: string | null;
    thumbnail_detail: string | null;
    image_url: string;
  },
  size: ResolveSize,
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

export async function resolveProfileImageUrl(
  input: string | null | undefined,
  options: { size?: ResolveSize; ownerUuid?: string } = {},
): Promise<string> {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (!isImageUuid(trimmed)) {
    return toImageUrl(trimmed);
  }

  const image = await findGenerationImageByUuid(trimmed);
  if (!image) return "";

  const isPublic = image.visibility_level === "public";
  const isOwner = Boolean(options.ownerUuid && image.user_uuid === options.ownerUuid);
  if (!isPublic && !isOwner) {
    const isProfileImage = await isUserProfileImageReference(
      image.user_uuid,
      trimmed,
    );
    if (!isProfileImage) return "";
  }

  const size = options.size || "desktop";
  const resolvedPath = pickResolvedPath(
    {
      thumbnail_mobile: image.thumbnail_mobile,
      thumbnail_desktop: image.thumbnail_desktop,
      thumbnail_detail: image.thumbnail_detail,
      image_url: image.image_url,
    },
    size,
  );

  return toImageUrl(resolvedPath || image.image_url);
}
