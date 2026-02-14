import { createHash, randomUUID } from "node:crypto";

type WatermarkConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  logoUrl: string;
  timeoutMs: number;
};

type CloudinaryUploadResult = {
  publicId: string;
  version?: number;
  format?: string;
};

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_LOGO_URL = "https://artworks.anividai.com/assets/logo.webp";

function getWatermarkConfig(): WatermarkConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const logoUrl = process.env.VIDEO_WATERMARK_LOGO_URL || DEFAULT_LOGO_URL;
  const timeoutMs = Number(
    process.env.VIDEO_WATERMARK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS
  );

  if (!cloudName) {
    throw new Error("Cloudinary cloud name is not configured");
  }

  if (!apiKey) {
    throw new Error("Cloudinary API key is not configured");
  }

  if (!apiSecret) {
    throw new Error("Cloudinary API secret is not configured");
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    logoUrl,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

function ensureHttpsUrl(url: string): string {
  if (!url) {
    throw new Error("Video URL is required for watermarking");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Video URL is invalid");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Video URL must use HTTPS for Cloudinary fetch");
  }

  return parsed.toString();
}

function createSignature(
  params: Record<string, string>,
  apiSecret: string
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${sorted}${apiSecret}`).digest("hex");
}

/**
 * Creates a signature for a Cloudinary delivery URL.
 * According to Cloudinary docs:
 * - Signature is first 8 chars of URL-safe base64 encoded SHA-1 hash
 * - String to sign: transformation_string + "/" + public_id_with_extension + api_secret
 * - Returns format: s--XXXXXXXX--
 */
function createDeliverySignature(
  transformationString: string,
  publicIdWithExtension: string,
  apiSecret: string
): string {
  // The string to sign is: transformation/public_id.ext + api_secret
  const toSign = `${transformationString}/${publicIdWithExtension}${apiSecret}`;

  const hash = createHash("sha1").update(toSign).digest("base64");

  // Convert to URL-safe base64 (replace + with -, / with _)
  const urlSafeHash = hash.replace(/\+/g, "-").replace(/\//g, "_");

  // Take first 8 characters
  const signature = urlSafeHash.substring(0, 8);

  return `s--${signature}--`;
}

function sanitizeForPublicId(value?: string | null): string {
  if (!value) {
    return "";
  }

  return value.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/\/{2,}/g, "/");
}

function buildUploadPublicId(generationUuid?: string): string {
  const sanitized = sanitizeForPublicId(generationUuid);

  if (sanitized.length >= 6) {
    return `anime-video/${sanitized}`;
  }

  const fallback = randomUUID().replace(/-/g, "").slice(0, 12);
  return `anime-video/${fallback}`;
}

function base64EncodeUrl(url: string): string {
  return Buffer.from(url)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildDerivedUrl(
  uploadResult: CloudinaryUploadResult,
  config: WatermarkConfig
): string {
  const base64Logo = base64EncodeUrl(config.logoUrl);

  // Watermark transformation parameters:
  // - l_fetch: Fetch remote logo image (base64 encoded URL)
  // - w_0.15,fl_relative: Width = 15% of video width
  // - o_70: Opacity = 70%
  // - g_south_east: Gravity = bottom-right corner
  // - x_10,y_10: Offset 10px from right and bottom edges
  // - fl_layer_apply: Apply all layer transformations
  const transformation = `l_fetch:${base64Logo},w_0.15,fl_relative,o_70,g_south_east,x_10,y_10,fl_layer_apply`;

  // Extension
  const extension = uploadResult.format ? `.${uploadResult.format}` : ".mp4";
  const publicIdWithExt = `${uploadResult.publicId}${extension}`;

  // Generate signature: transformation/public_id.ext + api_secret
  const signature = createDeliverySignature(
    transformation,
    publicIdWithExt,
    config.apiSecret
  );

  const baseUrl = `https://res.cloudinary.com/${config.cloudName}/video/upload`;

  // Note: public_id should NOT be URL-encoded in the final URL path
  // Cloudinary expects it as-is with slashes intact
  // FINAL URL: baseUrl / signature / transformation / publicId.ext
  return `${baseUrl}/${signature}/${transformation}/${uploadResult.publicId}${extension}`;
}

async function uploadVideoToCloudinary(params: {
  videoUrl: string;
  publicId: string;
  config: WatermarkConfig;
}): Promise<CloudinaryUploadResult> {
  const { config, publicId, videoUrl } = params;
  const timestamp = Math.round(Date.now() / 1000);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`;
  const signature = createSignature(
    {
      overwrite: "true",
      public_id: publicId,
      timestamp: String(timestamp),
    },
    config.apiSecret
  );

  const formParams = new URLSearchParams();
  formParams.append("file", videoUrl);
  formParams.append("public_id", publicId);
  formParams.append("timestamp", String(timestamp));
  formParams.append("overwrite", "true");
  formParams.append("signature", signature);
  formParams.append("api_key", config.apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formParams.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new Error(
        `Cloudinary upload failed with status ${response.status}${
          responseText ? `: ${responseText}` : ""
        }`
      );
    }

    const payload = (await response.json()) as {
      public_id?: string;
      version?: number;
      format?: string;
      secure_url?: string;
    };

    if (!payload?.public_id) {
      throw new Error("Cloudinary upload response missing public_id");
    }

    return {
      publicId: payload.public_id,
      version: payload.version,
      format: payload.format,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Deletes a video from Cloudinary by public_id.
 * Uses Admin API destroy endpoint with signature authentication.
 */
async function deleteVideoFromCloudinary(params: {
  publicId: string;
  config: WatermarkConfig;
}): Promise<void> {
  const { config, publicId } = params;
  const timestamp = Math.round(Date.now() / 1000);

  // Admin API destroy endpoint
  const destroyUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/video/destroy`;

  // Create signature for destroy request
  const signature = createSignature(
    {
      public_id: publicId,
      timestamp: String(timestamp),
    },
    config.apiSecret
  );

  const formParams = new URLSearchParams();
  formParams.append("public_id", publicId);
  formParams.append("timestamp", String(timestamp));
  formParams.append("signature", signature);
  formParams.append("api_key", config.apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(destroyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formParams.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new Error(
        `Cloudinary delete failed with status ${response.status}${
          responseText ? `: ${responseText}` : ""
        }`
      );
    }

    const payload = (await response.json()) as {
      result?: string;
    };

    if (payload?.result !== "ok") {
      throw new Error(`Cloudinary delete failed: ${JSON.stringify(payload)}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Downloads a video from a URL and uploads it back to Cloudinary.
 * Used to persist a transformation as a permanent asset.
 */
async function saveTransformedVideo(params: {
  transformedUrl: string;
  targetPublicId: string;
  config: WatermarkConfig;
}): Promise<CloudinaryUploadResult> {
  const { transformedUrl, targetPublicId, config } = params;
  const timestamp = Math.round(Date.now() / 1000);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`;

  const signature = createSignature(
    {
      overwrite: "true",
      public_id: targetPublicId,
      timestamp: String(timestamp),
    },
    config.apiSecret
  );

  const formParams = new URLSearchParams();
  formParams.append("file", transformedUrl);
  formParams.append("public_id", targetPublicId);
  formParams.append("timestamp", String(timestamp));
  formParams.append("overwrite", "true");
  formParams.append("signature", signature);
  formParams.append("api_key", config.apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs * 2); // Double timeout for download+upload

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formParams.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new Error(
        `Failed to save transformed video (status ${response.status}${
          responseText ? `: ${responseText}` : ""
        })`
      );
    }

    const payload = (await response.json()) as {
      public_id?: string;
      version?: number;
      format?: string;
      secure_url?: string;
    };

    if (!payload?.public_id) {
      throw new Error("Upload response missing public_id");
    }

    return {
      publicId: payload.public_id,
      version: payload.version,
      format: payload.format,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function applyVideoWatermark(params: {
  videoUrl: string;
  generationUuid?: string;
}): Promise<string> {
  const config = getWatermarkConfig();
  const safeVideoUrl = ensureHttpsUrl(params.videoUrl);
  const tempPublicId = buildUploadPublicId(params.generationUuid);

  // Step 1: Upload original video to Cloudinary
  const uploadResult = await uploadVideoToCloudinary({
    videoUrl: safeVideoUrl,
    publicId: tempPublicId,
    config,
  });

  // Step 2: Generate transformation URL (with watermark)
  const transformedUrl = buildDerivedUrl(uploadResult, config);

  // Step 3: Save the transformed video as a permanent asset
  // Use a different public_id to store the watermarked version
  const finalPublicId = `${tempPublicId}-watermarked`;
  const finalResult = await saveTransformedVideo({
    transformedUrl,
    targetPublicId: finalPublicId,
    config,
  });

  // Step 4: Delete the temporary original upload
  try {
    await deleteVideoFromCloudinary({
      publicId: uploadResult.publicId,
      config,
    });
  } catch (deleteError) {
    // Log but don't fail - we already have the watermarked version saved
    console.error(
      `Failed to delete temporary source video: ${deleteError}`
    );
  }

  // Step 5: Return the URL of the permanent watermarked video
  const extension = finalResult.format ? `.${finalResult.format}` : ".mp4";
  return `https://res.cloudinary.com/${config.cloudName}/video/upload/${finalResult.publicId}${extension}`;
}
