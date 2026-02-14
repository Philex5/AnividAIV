/**
 * My Artworks Page Types
 * Related: FEAT-my-artworks
 */

export type ArtworkType = "image" | "video";
export type MainTab = "mine" | "favorites";
export type TypeTab = "all" | "image" | "video";

/**
 * Author brief information for artworks
 */
export interface ArtworkAuthor {
  id: string;
  name: string;
  avatar: string;
  membership_level?: string | null;
  membership_display_name?: string | null;
}

/**
 * Lightweight artwork item for list display
 */
export interface ArtworkListItem {
  uuid: string;
  type: ArtworkType;
  thumbnail_url: string;
  video_url?: string;
  model_id: string;
  style?: string;
  created_at: string;
  duration_seconds?: number; // Only for videos
  gen_type?: string | null; // Generation type (e.g., "image_to_image", "text_to_image")
  title?: string; // Display title (usually the prompt or a description)
  // Social statistics
  like_count: number; // Total number of likes
  favorite_count: number; // Total number of favorites
  visibility_level: "public" | "private"; // Artwork visibility
  // User interaction state (for current user)
  liked?: boolean; // Whether current user liked this artwork
  favorited?: boolean; // Whether current user favorited this artwork
  // Author information (for favorites tab)
  author?: ArtworkAuthor; // Author of the artwork (for favorites)
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Artworks API response
 */
export interface ArtworksResponse {
  artworks: ArtworkListItem[];
  pagination: PaginationInfo;
}

/**
 * Query options for fetching artworks
 */
export interface ArtworksQueryOptions {
  type?: TypeTab;
  tab?: MainTab;
  searchQuery?: string;
  page?: number;
  limit?: number;
}
