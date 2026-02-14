import { useState, useEffect } from "react";
import ConfigManager from "@/lib/config-manager";

const CACHE_KEY = "landing_oc_spotlight_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  characters: any[];
  timestamp: number;
}

interface UseCachedOCSpotlightResult {
  characters: any[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
}

/**
 * Hook with client-side caching for OC spotlight characters
 *
 * This hook first checks localStorage for cached data (valid for 5 minutes).
 * If cache is valid, it returns cached data immediately for instant display.
 * Fresh data is fetched in background for next visit.
 *
 * @example
 * ```tsx
 * const { characters, loading, fromCache } = useCachedOCSpotlight();
 * ```
 */
export function useCachedOCSpotlight(): UseCachedOCSpotlightResult {
  const [state, setState] = useState<{
    data: any[];
    loading: boolean;
    error: string | null;
    fromCache: boolean;
  }>({
    data: [],
    loading: true,
    error: null,
    fromCache: false,
  });

  useEffect(() => {
    let mounted = true;

    const loadSpotlightCharacters = async () => {
      try {
        // Step 1: Check cache first
        const cachedJson = localStorage.getItem(CACHE_KEY);
        let fromCache = false;

        if (cachedJson) {
          try {
            const cached: CachedData = JSON.parse(cachedJson);
            const now = Date.now();

            // Cache is still valid
            if (now - cached.timestamp < CACHE_DURATION) {
              if (mounted) {
                setState({
                  data: cached.characters,
                  loading: false,
                  error: null,
                  fromCache: true,
                });
              }
              fromCache = true;

              // Fetch fresh data in background
              fetchFreshData().catch(console.error);
              return;
            }
          } catch (e) {
            // Invalid cache, ignore and fetch fresh
            console.warn("Invalid cache data, fetching fresh");
          }
        }

        // Step 2: No valid cache, fetch fresh data
        await fetchFreshData();
      } catch (error) {
        if (mounted) {
          setState({
            data: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load spotlight characters",
            fromCache: false,
          });
        }
      }
    };

    const fetchFreshData = async () => {
      // Fetch OC Gallery config for spotlight UUIDs
      const ocGalleryCharacters = await ConfigManager.getOCGallery();
      const spotlightUuids = ocGalleryCharacters
        .map((item) => item.uuid)
        .filter(Boolean);

      // Fetch character details from database
      const params = new URLSearchParams();
      if (spotlightUuids.length) {
        params.set("uuids", spotlightUuids.join(","));
      } else {
        params.set("limit", "10");
      }

      const response = await fetch(
        `/api/oc-maker/public/characters?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch characters");
      }

      const data = await response.json();

      // Transform data
      const characters = (data?.data?.characters || []).map((char: any) => ({
        uuid: char.uuid,
        name: char.name,
        role: char.role || undefined,
        brief_description: char.brief_introduction,
        description: char.brief_introduction,
        profile_url: char.profile_image_url || "",
        avatar_url: char.avatar_url || "",
        thumbnail_path: char.profile_image_url || "",
        modules: char.modules,
        character_data: {
          species: char.species || "human",
          gender: char.gender || "other",
          age: char.age || 0,
          personality_tags: Array.isArray(char.personality_tags)
            ? char.personality_tags
            : [],
          art_style: char.art_style || "anime",
          body_type: char.body_type || "average",
          hair_color: char.hair_color || "#000000",
          hair_style: char.hair_style || "short",
          eye_color: char.eye_color || "#000000",
          outfit_style: char.outfit_style || "",
          accessories: Array.isArray(char.accessories) ? char.accessories : [],
          appearance_features: char.appearance_features || "",
          role: char.role || undefined,
          brief_introduction: char.brief_introduction || "",
          background_story: char.background_story || "",
          extended_attributes: Array.isArray(char.extended_attributes)
            ? char.extended_attributes
            : [],
        },
        sort_order: 0,
      }));

      // Update cache
      try {
        const cacheData: CachedData = {
          characters,
          timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      } catch (e) {
        // Storage might be full or disabled
        console.warn("Failed to cache character data:", e);
      }

      // Update state
      if (mounted) {
        setState({
          data: characters,
          loading: false,
          error: null,
          fromCache: false,
        });
      }
    };

    loadSpotlightCharacters();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    characters: state.data,
    loading: state.loading,
    error: state.error,
    fromCache: state.fromCache,
  };
}

/**
 * Utility to clear the OC spotlight cache
 * Useful for debugging or when user wants to force refresh
 */
export function clearOCSpotlightCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn("Failed to clear cache:", e);
  }
}
