"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CharacterShowCard } from "@/components/oc-maker/CharacterShowCard";
import type { CharacterDetailPage } from "@/types/pages/landing";
import type { OCGalleryCharacter } from "@/lib/configs";
import { parseCharacterModules } from "@/types/oc";

interface RecommendedCharacter {
  uuid: string;
  name: string;
  gender?: string | null;
  age?: number | null;
  species?: string | null;
  personality_tags?: string[] | null;
  brief_introduction?: string | null;
  profile_image_url?: string | null;
  avatar_image_url?: string | null;
  modules?: unknown;
}

interface OCRecommendationProps {
  characterUuid: string;
  artStyle?: string | null;
  species?: string | null;
  pageData: CharacterDetailPage;
}

export function OCRecommendation({
  characterUuid,
  artStyle,
  species,
  pageData,
}: OCRecommendationProps) {
  const recommendationCopy = pageData.recommendations || {};
  const recommendationDefaults = recommendationCopy.defaults || {};
  const [loading, setLoading] = useState(true);
  const [galleryCharacters, setGalleryCharacters] = useState<
    OCGalleryCharacter[]
  >([]);

  useEffect(() => {
    async function initRecommendations() {
      console.log("[OCRecommendation] useEffect triggered", { characterUuid });

      if (!characterUuid) {
        console.log("[OCRecommendation] No characterUuid, skipping");
        setGalleryCharacters([]);
        setLoading(false);
        return;
      }

      console.log("[OCRecommendation] Starting fetchRecommendations");
      setLoading(true);
      console.log(
        "[OCRecommendation] Fetching recommendations for character:",
        characterUuid,
      );
      console.log(
        "[OCRecommendation] Art style:",
        artStyle,
        "Species:",
        species,
      );

      try {
        const params = new URLSearchParams();
        params.set("limit", "8");
        if (artStyle) {
          params.set("style", artStyle);
        }
        if (species) {
          params.set("species", species);
        }

        const queryString = params.toString();
        const response = await fetch(
          `/api/characters/${characterUuid}/recommendations${
            queryString ? `?${queryString}` : ""
          }`,
        );

        console.log("[OCRecommendation] Response status:", response.status);

        if (!response.ok) {
          throw new Error(recommendationCopy?.errors?.fetch_failed || "");
        }

        const data = await response.json();
        console.log("[OCRecommendation] API raw response:", data);

        if (data.success && Array.isArray(data.data)) {
          const transformed = data.data
            .map((item: RecommendedCharacter) =>
              mapToGalleryCharacter(item, recommendationDefaults),
            )
            .filter(
              (item: OCGalleryCharacter | null): item is OCGalleryCharacter =>
                item !== null && !!item.profile_url,
            );

          setGalleryCharacters(transformed);
          console.log(
            "[OCRecommendation] Set transformed recommendations:",
            transformed.length,
          );
        } else {
          console.log("[OCRecommendation] No data in response");
          setGalleryCharacters([]);
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        setGalleryCharacters([]);
      } finally {
        setLoading(false);
      }
    }

    initRecommendations();
  }, [characterUuid, artStyle, species]);

  if (loading) {
    return (
      <div className="rounded-2xl border-none shadow-none overflow-hidden bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold font-display tracking-tight">
            <h2 className="text-2xl font-bold font-display tracking-tight">
              {recommendationCopy?.title || ""}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide px-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="shrink-0 w-44 sm:w-52 md:w-56">
                <Skeleton className="aspect-3/4 rounded-2xl mb-3 shadow-none" />
                <Skeleton className="h-5 w-3/4 mb-2 rounded-full" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    );
  }

  if (galleryCharacters.length === 0) {
    return null; // Don't show if no recommendations
  }

  return (
    <div
      data-testid="recommendations-section"
      className="rounded-2xl border-none shadow-none overflow-hidden bg-transparent"
    >
      <CardHeader className="pb-4 px-0">
        <CardTitle className="text-2xl font-bold font-display tracking-tight">
          <h2 className="text-2xl font-bold font-display tracking-tight">
            {recommendationCopy?.title || ""}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-6 px-1">
            {galleryCharacters.map((character) => (
              <Link
                key={character.uuid}
                href={`/characters/${character.uuid}`}
                className="shrink-0 w-44 sm:w-52 md:w-56 group"
              >
                <div className="transition-all duration-300">
                  <CharacterShowCard
                    character={character}
                    variant="preview"
                    className="w-full rounded-2xl shadow-none border-none"
                  />
                </div>
              </Link>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
      </CardContent>
    </div>
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : null))
      .filter((item): item is string => !!item);
  }
  return [];
}

function mapToGalleryCharacter(
  character: RecommendedCharacter,
  defaults: {
    name?: string;
    species?: string;
    gender?: string;
    art_style?: string;
    hair_color?: string;
    eye_color?: string;
  },
): OCGalleryCharacter | null {
  const imageUrl =
    character.profile_image_url || character.avatar_image_url || null;

  if (!imageUrl) {
    console.warn(
      "[OCRecommendation] Character missing image url:",
      character.uuid,
    );
    return null;
  }

  const modules = parseCharacterModules(character.modules);
  const appearance = modules.appearance || {};
  const personality = modules.personality || {};
  const background = modules.background || {};
  const art = modules.art || {};

  const personalityTags = normalizeStringArray(personality.personality_tags);
  const accessories = normalizeStringArray(appearance.accessories);
  const appearanceFeatures = Array.isArray(appearance.appearance_features)
    ? appearance.appearance_features.join(", ")
    : undefined;

  const ageNumber =
    typeof character.age === "number"
      ? character.age
      : Number(character.age) || 0;

  return {
    uuid: character.uuid,
    name: character.name || defaults.name || "",
    brief_description: character.brief_introduction || undefined,
    description: background.background_story || undefined,
    profile_url: imageUrl,
    avatar_url: character.avatar_image_url || imageUrl,
    thumbnail_path: imageUrl,
    character_data: {
      species: appearance.species || character.species || defaults.species || "",
      gender: appearance.gender || character.gender || defaults.gender || "",
      age: ageNumber,
      personality_tags: personalityTags,
      art_style: art.fullbody_style || defaults.art_style || "",
      body_type: appearance.body_type || undefined,
      hair_color: appearance.hair_color || defaults.hair_color || "",
      hair_style: appearance.hair_style || undefined,
      eye_color: appearance.eye_color || defaults.eye_color || "",
      outfit_style: appearance.outfit_style || undefined,
      accessories,
      appearance_features: appearanceFeatures,
      brief_introduction: character.brief_introduction || undefined,
      background_story: background.background_story || undefined,
      extended_attributes: undefined,
    },
    sort_order: 0,
  };
}
