/**
 * R2 Storage URL Utilities
 *
 * Provides helper functions to construct URLs for images stored in Cloudflare R2.
 */

/**
 * Get the full URL for an R2 object
 * @param r2Path - The path within the R2 bucket (e.g., "gallery/anime/image.webp")
 * @returns Full URL to access the R2 object
 */
export function getR2Url(r2Path: string): string {
  // Handle null, undefined, or empty string
  if (!r2Path) {
    return "";
  }

  // Use NEXT_PUBLIC_STORAGE_DOMAIN for client-side consistency
  // STORAGE_DOMAIN is only available on server-side
  const storageDomain = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_STORAGE_DOMAIN 
    : (process.env.NEXT_PUBLIC_STORAGE_DOMAIN || process.env.STORAGE_DOMAIN);

  if (!storageDomain) {
    // For consistency between SSR and CSR, always use relative paths when domain is not configured
    console.warn('STORAGE_DOMAIN not configured, using relative path');
    const cleanPath = r2Path.startsWith('/') ? r2Path : `/${r2Path}`;
    return cleanPath;
  }

  // Remove leading slash if present
  const cleanPath = r2Path.startsWith('/') ? r2Path.slice(1) : r2Path;

  return `${storageDomain}/${cleanPath}`;
}

/**
 * Get the thumbnail URL for an R2 object
 * Assumes thumbnails are stored in a "thumbs" subdirectory
 * @param r2Path - The original image path
 * @returns Thumbnail URL
 */
export function getR2ThumbnailUrl(r2Path: string): string {
  // Handle null, undefined, or empty string
  if (!r2Path) {
    return "";
  }

  // Extract directory and filename
  const lastSlashIndex = r2Path.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    // No directory, add thumbs prefix
    return getR2Url(`thumbs/${r2Path}`);
  }

  const directory = r2Path.substring(0, lastSlashIndex);
  const filename = r2Path.substring(lastSlashIndex + 1);

  return getR2Url(`${directory}/thumbs/${filename}`);
}

/**
 * Check if a URL is already a full URL (has protocol)
 * @param url - URL to check
 * @returns true if URL is absolute
 */
export function isAbsoluteUrl(url: string): boolean {
  // Handle null, undefined, or empty string
  if (!url) {
    return false;
  }
  return /^https?:\/\//i.test(url);
}

/**
 * Convert any image reference to a full URL
 * Handles both R2 paths and absolute URLs
 * @param imageRef - Either an R2 path or absolute URL
 * @returns Full URL
 */
export function toImageUrl(imageRef: string | null | undefined): string {
  // Handle null, undefined, or empty string
  if (!imageRef) {
    return "";
  }
  
  if (isAbsoluteUrl(imageRef)) {
    return imageRef;
  }
  return getR2Url(imageRef);
}