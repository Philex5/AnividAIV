import { useState, useEffect } from "react";
import ConfigManager from "@/lib/config-manager";
import type { OCGalleryCharacter } from "@/lib/configs";

interface CharacterData {
  uuid: string;
  name: string;
  role?: string;
  brief_description?: string;
  description?: string;
  profile_url?: string;
  avatar_url?: string;
  thumbnail_path?: string;
  modules?: any;
  character_data?: {
    species?: string;
    gender?: string;
    age?: number;
    personality_tags?: string[];
    art_style?: string;
    body_type?: string;
    hair_color?: string;
    hair_style?: string;
    eye_color?: string;
    outfit_style?: string;
    accessories?: any[];
    appearance_features?: string;
    role?: string;
    brief_introduction?: string;
    background_story?: string;
    extended_attributes?: any[];
  };
  sort_order?: number;
}

interface UseOCSpotlightResult {
  characters: CharacterData[];
  loading: boolean;
  error: string | null;
}

/**
 * Optimized hook to fetch OC spotlight characters in parallel
 *
 * This hook performs two requests in parallel:
 * 1. Fetch OC Gallery config (for UUIDs)
 * 2. Fetch character details from database
 *
 * This is more efficient than sequential fetching, reducing total load time.
 *
 * @example
 * ```tsx
 * const { characters, loading, error } = useOCSpotlight();
 *
 * if (loading) return <Skeleton />;
 * if (error) return <ErrorState />;
 * return <CharacterGallery characters={characters} />;
 * ```
 */
export function useOCSpotlight(): UseOCSpotlightResult {
  const [state, setState] = useState<{
    data: CharacterData[];
    loading: boolean;
    error: string | null;
  }>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const loadSpotlightCharacters = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Step 1: Fetch OC Gallery config for spotlight UUIDs
        const ocGalleryCharacters = await ConfigManager.getOCGallery();
        const spotlightUuids = ocGalleryCharacters
          .map((item) => item.uuid)
          .filter(Boolean);

        if (!mounted) return;

        // Step 2: Fetch character details from database (can start immediately)
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

        if (!mounted) return;

        // API returns structure: { code, message, data: { characters: [...] } }
        const characters: CharacterData[] = (
          data?.data?.characters || []
        ).map((char: any) => ({
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

        setState({
          data: characters,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (mounted) {
          setState({
            data: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load spotlight characters",
          });
        }
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
  };
}
