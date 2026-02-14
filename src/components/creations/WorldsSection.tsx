"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { WorldCard } from "@/components/worlds/WorldCard";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, Heart, Plus } from "lucide-react";
import { FilterTabs } from "@/components/ui/filter-tabs";
import Link from "next/link";
import { toast } from "sonner";
import type { OCworldWithCount } from "@/models/oc-world";

type TabKey = "mine" | "favorites";

interface TabState {
  worlds: OCworldWithCount[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
}

interface WorldsSectionProps {
  pageData: any;
  translations: any;
  userUuid: string;
}

export function WorldsSection({ pageData, translations, userUuid }: WorldsSectionProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("mine");
  const [tabState, setTabState] = useState<Record<TabKey, TabState>>({
    mine: { worlds: [], isLoading: true, error: null, hasFetched: false },
    favorites: {
      worlds: [],
      isLoading: false,
      error: null,
      hasFetched: false,
    },
  });

  const loadWorlds = useCallback(
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
        const baseUrl = "/api/worlds";
        const params = new URLSearchParams({
          page: "1",
          limit: "50",
        });

        if (tab === "mine") {
          params.set("creator_uuid", userUuid);
        } else if (tab === "favorites") {
          // Note: Current worlds API might not have a direct 'favorite' filter like characters
          // If not implemented, we might need a different approach.
          // For now, let's assume it might work or we'll need to update it.
          // params.set("favorite", "true");
          // If favorites for worlds isn't implemented yet, we'll just show empty for now
        }

        const response = await fetch(`${baseUrl}?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Request failed");
        }

        const result = await response.json();
        const worldsData: OCworldWithCount[] = result.data?.worlds || [];

        setTabState((prev) => ({
          ...prev,
          [tab]: {
            worlds: worldsData,
            isLoading: false,
            error: null,
            hasFetched: true,
          },
        }));
      } catch (error) {
        console.error(`Failed to load ${tab} worlds:`, error);
        setTabState((prev) => ({
          ...prev,
          [tab]: {
            ...prev[tab],
            isLoading: false,
            error:
              tab === "favorites" ? (translations.errors?.favorites || "Failed to load favorite worlds") : (translations.errors?.mine || "Failed to load worlds"),
            hasFetched: true,
          },
        }));
      }
    },
    [translations, userUuid]
  );

  useEffect(() => {
    void loadWorlds("mine", { force: true });
  }, [loadWorlds]);

  const handleTabChange = (value: string) => {
    const next = value as TabKey;
    setActiveTab(next);
    if (!tabState[next].hasFetched && !tabState[next].isLoading) {
      void loadWorlds(next);
    }
  };

  const handleDeleteWorld = async (uuid: string) => {
    try {
      const response = await fetch(`/api/worlds/${uuid}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      toast.success(translations.actions?.delete_success || "World deleted successfully");
      
      // Refresh list
      void loadWorlds(activeTab, { force: true });
    } catch (error) {
      console.error("Failed to delete world:", error);
      toast.error(translations.actions?.delete_failed || "Failed to delete world");
    }
  };

  const renderTabContent = (tab: TabKey) => {
    const state = tabState[tab];

    if (state.isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <span>
            {tab === "favorites" ? (translations.loading?.favorites || "Loading favorite worlds...") : (translations.loading?.mine || "Loading your worlds...")}
          </span>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className="py-12 text-center">
          <div className="mb-4 text-red-500">{state.error}</div>
          <Button
            onClick={() => loadWorlds(tab, { force: true })}
            variant="outline"
          >
            {translations.buttons?.try_again || "Try Again"}
          </Button>
        </div>
      );
    }

    if (state.worlds.length === 0) {
      if (tab === "mine") {
        return (
          <div className="py-12 text-center">
            <div className="mb-6">
              <Globe className="mx-auto h-20 w-20 text-gray-300" />
            </div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              {translations.empty?.mine_title || "You have no worlds yet"}
            </h2>
            <p className="mb-8 text-lg text-gray-600">
              {translations.empty?.mine_description || "Create your first world to start building your universe"}
            </p>
            <Button asChild size="sm" variant="default">
              <Link href="/worlds/create">
                <Plus className="mr-2 h-5 w-5" />
                {translations.buttons?.create || "Create New World"}
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
            {translations.empty?.favorites_title || "No favorite worlds yet"}
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            {translations.empty?.favorites_description || "Go explore the community to favorite worlds"}
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/worlds">{translations.buttons?.explore || "Explore Worlds"}</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {state.worlds.map((world) => (
          <WorldCard
            key={world.uuid}
            world={world}
            isOwner={activeTab === "mine"}
            onDelete={handleDeleteWorld}
            translations={translations}
          />
        ))}
      </div>
    );
  };

  const showStats =
    tabState.mine.worlds.length > 0 || tabState.favorites.hasFetched;

  const tabItems: Array<{ value: TabKey; label: string }> = [
    { value: "mine", label: translations.tabs?.mine || "My Worlds" },
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
            {translations.stats?.total_label || "Total worlds:"} {tabState.mine.worlds.length}
          </span>
          {tabState.favorites.hasFetched && (
            <span>
              {translations.stats?.favorites_label || "Favorite worlds:"}{" "}
              {tabState.favorites.worlds.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}