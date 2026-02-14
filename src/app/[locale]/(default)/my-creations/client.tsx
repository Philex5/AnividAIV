"use client";

import { useState } from "react";
import { Palette, ImageIcon, Globe } from "lucide-react";
import { CharactersSection } from "@/components/creations/CharactersSection";
import { ArtworksSection } from "@/components/creations/ArtworksSection";
import { WorldsSection } from "@/components/creations/WorldsSection";
import type { ArtworksResponse } from "@/types/pages/my-artworks";

interface MyCreationsClientProps {
  pageData: any;
  userUuid: string;
  initialArtworks: ArtworksResponse;
}

export type MainTab = "characters" | "artworks" | "worlds";

import { FilterTabs } from "@/components/ui/filter-tabs";

export function MyCreationsClient({
  pageData,
  userUuid,
  initialArtworks,
}: MyCreationsClientProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("characters");

  const t = pageData.mainTabs || {};
  const charactersT = pageData.characters || {};
  const artworksT = pageData.artworks || {};
  const worldsT = pageData.worlds || {};

  const mainTabItems: Array<{ value: MainTab; label: string; icon: React.ReactNode }> = [
    {
      value: "characters",
      label: t.characters || "Characters",
      icon: <Palette className="h-4 w-4" />,
    },
    {
      value: "artworks",
      label: t.artworks || "Artworks",
      icon: <ImageIcon className="h-4 w-4" />,
    },
    {
      value: "worlds",
      label: t.worlds || "Worlds",
      icon: <Globe className="h-4 w-4" />,
    },
  ];

  return (
    <div className="container mx-auto px-4 space-y-6">
      {/* Main Tab Navigation - Centered */}
      <div className="flex justify-center">
        <FilterTabs
          value={activeMainTab}
          onValueChange={(val) => setActiveMainTab(val as MainTab)}
          items={mainTabItems}
        />
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {activeMainTab === "characters" && (
          <CharactersSection translations={charactersT} />
        )}
        {activeMainTab === "artworks" && (
          <ArtworksSection
            pageData={pageData}
            translations={artworksT}
            initialArtworks={initialArtworks}
          />
        )}
        {activeMainTab === "worlds" && (
          <WorldsSection pageData={pageData} translations={worldsT} userUuid={userUuid} />
        )}
      </div>
    </div>
  );
}
