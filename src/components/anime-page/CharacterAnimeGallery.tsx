"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { toImageUrl } from "@/lib/r2-utils";
import { cn } from "@/lib/utils";
import type { AnimeGeneratorPage } from "@/types/pages/landing";

interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  animeWorks: AnimeWork[];
}

interface AnimeWork {
  id: string;
  image: string;
  title: string;
}

interface CharacterAnimeGalleryProps {
  pageData: AnimeGeneratorPage;
}

export function CharacterAnimeGallery({
  pageData,
}: CharacterAnimeGalleryProps) {
  const characters: Character[] = [
    {
      id: "char-1",
      name: "Creamy",
      avatar: "gallery/character-anime/creamy/creamy-avatar.webp",
      description:
        "Creamy the Cat in her catgirl form, the official mascot of AnividAI.",
      animeWorks: [
        {
          id: "char-1-work-1",
          image: "gallery/character-anime/creamy/creamy-showcase-1.webp",
          title: "Watercolor Creamy surrounded by flowers",
        },
        {
          id: "char-1-work-4",
          image: "gallery/character-anime/creamy/creamy-showcase-4.webp",
          title: "Jungle Explorer Creamy",
        },
        {
          id: "char-1-work-2",
          image: "gallery/character-anime/creamy/creamy-showcase-2.webp",
          title: "Creamy runing in the rain",
        },
        {
          id: "char-1-work-3",
          image: "gallery/character-anime/creamy/creamy-showcase-3.webp",
          title: "Chibi Creamy",
        },
      ],
    },
    {
      id: "char-2",
      name: "Aelion",
      avatar: "gallery/character-anime/aelion/aelion-avatar.webp",
      description:
        "A wise elf sage who guards the secrets of the ancient woods.",
      animeWorks: [
        {
          id: "work-2-1",
          image: "gallery/character-anime/aelion/aelion-showcase-2.webp",
          title: "OC Maker showcase 2-1",
        },
        {
          id: "work-2-2",
          image: "gallery/character-anime/aelion/aelion-showcase-1.webp",
          title: "OC Maker showcase 2-2",
        },
        {
          id: "work-2-3",
          image: "gallery/character-anime/aelion/aelion-showcase-3.webp",
          title: "OC Maker showcase 2-3",
        },
        {
          id: "work-2-4",
          image: "gallery/character-anime/aelion/aelion-showcase-4.webp",
          title: "OC Maker showcase 2-4",
        },
        {
          id: "work-2-5",
          image: "gallery/character-anime/aelion/aelion-showcase-5.webp",
          title: "OC Maker showcase 2-5",
        },
      ],
    },
    {
      id: "char-3",
      name: "Puffie",
      avatar: "gallery/character-anime/puffie/puffie-avatar.webp",
      description:
        "A cuddly bear fairy who spreads joy and laughter wherever they go.",
      animeWorks: [
        {
          id: "work-3-4",
          image: "gallery/character-anime/puffie/puffie-showcase-4.webp",
          title: "OC Maker showcase 3-4",
        },
        {
          id: "work-3-3",
          image: "gallery/character-anime/puffie/puffie-showcase-3.webp",
          title: "OC Maker showcase 3-3",
        },
        {
          id: "work-3-2",
          image: "gallery/character-anime/puffie/puffie-showcase-2.webp",
          title: "OC Maker showcase 3-2",
        },
        {
          id: "work-3-1",
          image: "gallery/character-anime/puffie/puffie-showcase-1.webp",
          title: "OC Maker showcase 3-1",
        },
      ],
    },
  ];

  const [selectedCharacter, setSelectedCharacter] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Character auto-rotation every 10 seconds
  useEffect(() => {
    if (!isAutoPlay) return;

    intervalRef.current = setInterval(() => {
      setSelectedCharacter((prev) => (prev + 1) % characters.length);
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlay, characters.length]);

  const handleCharacterClick = (index: number) => {
    setSelectedCharacter(index);
    setIsAutoPlay(false); // Stop auto-play when user manually selects
  };

  const toggleAutoPlay = () => {
    setIsAutoPlay(!isAutoPlay);
  };

  const currentCharacter = characters[selectedCharacter];
  const currentWorks = currentCharacter.animeWorks;

  return (
    <section className="py-2 mb-2">
      <div className="container">
        <div className="max-w-5xl mx-auto">
          {/* Character Selection Area */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">
                {pageData.oc_anime_gallery.character_selector}
              </h3>
            </div>

            {/* Character Avatars - Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {characters.map((character, index) => (
                <div
                  key={character.id}
                  onClick={() => handleCharacterClick(index)}
                  className={cn(
                    "flex-shrink-0 cursor-pointer group transition-all duration-300",
                    selectedCharacter === index
                      ? "scale-105"
                      : "hover:scale-102"
                  )}
                >
                  <div
                    className={cn(
                      "relative p-1 rounded-full transition-all duration-300",
                      selectedCharacter === index
                        ? "bg-gradient-to-r from-primary to-primary/60"
                        : "bg-border hover:bg-primary/20"
                    )}
                  >
                    <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden bg-card">
                      <img
                        src={toImageUrl(character.avatar)}
                        alt={character.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <p
                      className={cn(
                        "text-sm font-medium transition-colors",
                        selectedCharacter === index
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {character.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Character Info */}
          <div className="mb-8 text-center">
            <h4 className="text-2xl font-bold text-foreground mb-2">
              {currentCharacter.name}'s Anime Collection
            </h4>
            <p className="text-muted-foreground">
              {currentCharacter.description}
            </p>
          </div>

          {/* Anime Works Waterfall Display */}
          <div
            className="waterfall-container p-2"
            style={{
              columnCount: 3,
              columnGap: "8px",
            }}
          >
            {currentWorks.map((work) => (
              <div
                key={work.id}
                className="waterfall-item mb-2 break-inside-avoid group"
              >
                <div className="relative rounded-lg overflow-hidden border border-border bg-card hover:border-ring hover:shadow-lg transition-all">
                  <img
                    src={toImageUrl(work.image)}
                    alt={work.title}
                    loading="lazy"
                    className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .waterfall-container {
          @media (max-width: 1024px) {
            column-count: 2 !important;
          }
          @media (max-width: 640px) {
            column-count: 2 !important;
            column-gap: 6px !important;
          }
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
