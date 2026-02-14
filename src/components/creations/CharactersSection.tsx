"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CharacterShowCard } from "@/components/oc-maker/CharacterShowCard";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Heart, Plus } from "lucide-react";
import { FilterTabs } from "@/components/ui/filter-tabs";
import Link from "next/link";
import type { OCGalleryCharacter } from "@/lib/configs";

interface CharacterData {
  uuid: string;
  name: string;
  gender: string;
  age?: number;
  role?: string;
  species?: string;
  personality_tags?: string[];
  brief_introduction?: string;
  avatar_url?: string;
  profile_image_url?: string;
  favorited?: boolean;
  created_at: string;
  updated_at: string;
  modules?: unknown;
}

type TabKey = "mine" | "favorites";

interface TabState {
  characters: CharacterData[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
}

interface CharactersSectionProps {
  translations: any;
}

export function CharactersSection({ translations }: CharactersSectionProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("mine");
  const [tabState, setTabState] = useState<Record<TabKey, TabState>>({
    mine: { characters: [], isLoading: true, error: null, hasFetched: false },
    favorites: {
      characters: [],
      isLoading: false,
      error: null,
      hasFetched: false,
    },
  });

  const loadCharacters = useCallback(
    async (tab: TabKey, options: { force?: boolean } = {}) => {
      setTabState((prev) => {
        const current = prev[tab];
        if (!options.force && current.isLoading) {
          return prev;
        }

        return {
          ...prev,
          [tab]: {
            ...current,
            isLoading: true,
            error: null,
          },
        };
      });

      try {
        const baseUrl = "/api/oc-maker/characters";
        const params = new URLSearchParams({
          page: "1",
          limit: "50",
        });

        if (tab === "favorites") {
          params.set("favorite", "true");
        }

        const response = await fetch(`${baseUrl}?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        const result = await response.json();
        const charactersData: CharacterData[] =
          result.data?.characters?.map((character: CharacterData) => ({
            ...character,
            favorited: tab === "favorites" ? true : character.favorited,
          })) || [];

        setTabState((prev) => ({
          ...prev,
          [tab]: {
            characters: charactersData,
            isLoading: false,
            error: null,
            hasFetched: true,
          },
        }));
      } catch (error) {
        console.error(`Failed to load ${tab} characters:`, error);
        setTabState((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            isLoading: false,
            error:
              tab === "favorites" ? (translations.errors?.favorites || "Failed to load favorite characters") : (translations.errors?.mine || "Failed to load characters"),
            hasFetched: true,
          },
        }));
      }
    },
    [translations]
  );

  useEffect(() => {
    void loadCharacters("mine", { force: true });
  }, [loadCharacters]);

  const handleTabChange = (value: string) => {
    const next = value as TabKey;
    setActiveTab(next);
    if (!tabState[next].hasFetched && !tabState[next].isLoading) {
      void loadCharacters(next);
    }
  };

  const handleCharacterClick = (character: CharacterData) => {
    router.push(`/characters/${character.uuid}`);
  };

  const renderTabContent = (tab: TabKey) => {
    const state = tabState[tab];

    if (state.isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <span>
            {tab === "favorites" ? (translations.loading?.favorites || "Loading favorite characters...") : (translations.loading?.mine || "Loading your characters...")}
          </span>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className="py-12 text-center">
          <div className="mb-4 text-red-500">{state.error}</div>
          <Button
            onClick={() => loadCharacters(tab, { force: true })}
            variant="outline"
          >
            {translations.buttons?.try_again || "Try Again"}
          </Button>
        </div>
      );
    }

    if (state.characters.length === 0) {
      if (tab === "mine") {
        return (
          <div className="py-12 text-center">
            <div className="mb-6">
              <Users className="mx-auto h-20 w-20 text-gray-300" />
            </div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              {translations.empty?.mine_title || "You have no characters yet"}
            </h2>
            <p className="mb-8 text-lg text-gray-600">
              {translations.empty?.mine_description || "Create your first original character to get started"}
            </p>
            <Button asChild size="sm" variant="default">
              <Link href="/oc-maker">
                <Plus className="mr-2 h-5 w-5" />
                {translations.buttons?.create || "Create New Character"}
              </Link>
            </Button>
          </div>
        );
      }

      return (
        <div className="py-12 text-center">
          <div className="mb-6">
            <Heart className="mx-auto h-20 w-20 text-gray-300" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            {translations.empty?.favorites_title || "No favorites yet"}
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            {translations.empty?.favorites_description || "Go explore the community to favorite characters"}
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/community">{translations.buttons?.explore || "Explore Community"}</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {state.characters.map((character) => {
          // Convert CharacterData to OCGalleryCharacter format
          const ocCharacter: OCGalleryCharacter = {
            uuid: character.uuid,
            name: character.name,
            brief_description: character.brief_introduction,
            profile_url: character.profile_image_url || "",
            avatar_url: character.avatar_url || "",
            thumbnail_path: "",
            character_data: {
              species: character.species || "",
              gender: character.gender,
              age: character.age || 0,
              personality_tags: character.personality_tags || [],
              art_style: "",
              hair_color: "",
              eye_color: "",
            },
            sort_order: 0,
          };

          return (
            <div
              key={character.uuid}
              className="relative aspect-[3/4] w-full"
            >
              <CharacterShowCard
                character={ocCharacter}
                onClick={() => handleCharacterClick(character)}
                variant="full"
                className="h-full w-full"
              />
            </div>
          );
        })}
      </div>
    );
  };

  const showStats =
    tabState.mine.characters.length > 0 || tabState.favorites.hasFetched;

  const tabItems: Array<{ value: TabKey; label: string }> = [
    { value: "mine", label: translations.tabs?.mine || "My OCs" },
    { value: "favorites", label: translations.tabs?.favorites || "Favorites" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-col gap-4">
        {/* Tab Navigation - Left aligned */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <FilterTabs
            value={activeTab}
            onValueChange={(val) => handleTabChange(val as TabKey)}
            items={tabItems}
          />
        </div>

        {/* Tab Content */}
        <div className="pt-4">
          {renderTabContent(activeTab)}
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground sm:flex-row sm:justify-center sm:gap-6">
          <span>
            {translations.stats?.total_label || "Total characters:"} {tabState.mine.characters.length}
          </span>
          {tabState.favorites.hasFetched && (
            <span>
              {translations.stats?.favorites_label || "Favorite characters:"}{" "}
              {tabState.favorites.characters.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
