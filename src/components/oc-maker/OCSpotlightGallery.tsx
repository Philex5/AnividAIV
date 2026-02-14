"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useOCGallery, usePublicCharactersFromDB } from "@/lib/hooks/useConfigs";
import { assetLoader } from "@/lib/asset-loader";
import { GenderIcon } from "@/components/icon/gender-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OCMakerPage } from "@/types/pages/landing";
import { useRouter } from "@/i18n/navigation";
import { parseCharacterModules } from "@/types/oc";
import speciesConfig from "@/configs/characters/species.json";

interface OCSpotlightGalleryProps {
  pageData?: OCMakerPage;
  className?: string;
}

const DEFAULT_STATS = [
  { label: "STR", value: 8 },
  { label: "INT", value: 7 },
  { label: "AGI", value: 9 },
  { label: "VIT", value: 6 },
  { label: "DEX", value: 8 },
  { label: "LUK", value: 5 },
];

const SKILL_ICON_OPTIONS = [
  "Default",
  "Magic",
  "Elemental",
  "Physical",
  "Psychic",
  "Spatial",
  "Buff",
  "Summoning",
  "Shapeshifting",
  "Technological",
  "Potion",
  "Unique",
];

const normalizeSkillIconName = (icon?: string) => {
  const trimmed = icon?.trim() || "";
  const base = trimmed
    .replace(/^assets\/skills\//i, "")
    .replace(/\.webp$/i, "");
  if (!base) return "Default";
  const matched = SKILL_ICON_OPTIONS.find(
    (option) => option.toLowerCase() === base.toLowerCase(),
  );
  return matched || "Default";
};

const getSkillIconUrl = (icon?: string) =>
  assetLoader.getAssetUrl(`skills/${normalizeSkillIconName(icon)}.webp`);

type SpeciesConfigItem = (typeof speciesConfig)["items"][number];

const resolveSpeciesItem = (speciesValue: string | null | undefined) => {
  const value = (speciesValue || "").trim();
  if (!value) return null;
  const items = (speciesConfig as any)?.items as SpeciesConfigItem[] | undefined;
  if (!Array.isArray(items) || !items.length) return null;
  const lower = value.toLowerCase();
  return (
    items.find((item) => item.key === value) ||
    items.find((item) => item.uuid === value) ||
    items.find((item) => item.name.toLowerCase() === lower) ||
    null
  );
};

export function OCSpotlightGallery({ pageData, className }: OCSpotlightGalleryProps) {
  const {
    characters: ocGalleryCharacters,
    loading: ocGalleryLoading,
    error: ocGalleryError,
  } = useOCGallery();
  const spotlightUuids = useMemo(
    () => ocGalleryCharacters.map((item) => item.uuid).filter(Boolean),
    [ocGalleryCharacters]
  );
  const {
    characters: dbCharacters,
    loading: dbLoading,
    error: dbError,
  } = usePublicCharactersFromDB({
    uuids: spotlightUuids,
    enabled: !ocGalleryLoading,
  });
  const characters = dbCharacters;
  const loading = ocGalleryLoading || dbLoading;
  const error = ocGalleryError || dbError;
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % characters.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + characters.length) % characters.length);
  };

  const activeCharacter = useMemo(() => characters[currentIndex], [characters, currentIndex]);
  const activeModules = useMemo(() => {
    const rawModules =
      (activeCharacter as any)?.modules ??
      (activeCharacter as any)?.character_data?.modules;
    return parseCharacterModules(rawModules);
  }, [activeCharacter]);
  const resolvedRole =
    activeModules.appearance?.role ||
    (activeCharacter as any)?.role ||
    activeCharacter?.character_data?.role ||
    (activeCharacter?.character_data as any)?.character_role ||
    activeCharacter?.character_data?.species ||
    "LEGEND";
  const resolvedThemeColor =
    activeModules.appearance?.hair_color ||
    activeCharacter?.character_data?.hair_color ||
    "var(--primary)";
  const resolvedAbilities = activeModules.skills?.abilities || [];
  const resolvedStats =
    activeModules.skills?.stats && activeModules.skills.stats.length > 0
      ? activeModules.skills.stats
      : DEFAULT_STATS;

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !activeCharacter) return null;

  return (
    <div className={cn("relative w-full max-w-7xl mx-auto py-12 px-4", className)}>
      <div className="mb-12 text-center lg:text-left">
        <h2 className="text-3xl md:text-4xl font-black text-foreground font-display tracking-tight mb-2 uppercase italic">
          {pageData?.spotlight_gallery?.title || "OC Spotlight Gallery"}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
          {pageData?.spotlight_gallery?.subtitle || "Explore the souls of legends through multi-dimensional archives."}
        </p>
      </div>

      <div className="relative min-h-[650px] lg:min-h-[700px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCharacter.uuid}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            {/* Background Theme Glow */}
              <div 
              className="absolute inset-0 blur-[120px] opacity-20 transition-colors duration-1000"
              style={{ 
                backgroundColor: resolvedThemeColor
              }}
            />

            {/* Main Spotlight Container */}
            <div className="relative lg:col-span-12 w-full h-full flex flex-col lg:block">
              
              {/* Center Portrait */}
              <div className="order-2 lg:absolute lg:inset-0 flex items-center justify-center z-10 py-8 lg:py-0">
                <motion.div
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="relative group cursor-pointer"
                  onClick={() => router.push(`/characters/${activeCharacter.uuid}`)}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <img
                    src={assetLoader.getR2Url(activeCharacter.profile_url || "")}
                    alt={activeCharacter.name}
                    className="h-[400px] md:h-[500px] lg:h-[600px] w-auto object-contain transform group-hover:scale-105 transition-transform duration-700 drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                  />
                  <div className="absolute inset-x-0 -bottom-6 flex justify-center opacity-0 group-hover:opacity-100 group-hover:-bottom-2 transition-all duration-500 ease-out">
                     <div className="px-6 py-2.5 bg-primary text-primary-foreground rounded-2xl shadow-[0_10px_25px_-5px_rgba(var(--primary-rgb),0.5)] flex items-center gap-3 border border-white/20 backdrop-blur-md">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest italic">{pageData?.spotlight_gallery?.access_archives || pageData?.character_card?.view_details || "Access Archives"}</span>
                        <ChevronRight className="w-4 h-4" />
                     </div>
                  </div>
                </motion.div>
              </div>

              {/* Top-Left: Bio Fragment (Moved from Bottom-Left) */}
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="order-1 lg:absolute lg:top-8 lg:left-8 z-20 w-full lg:w-80"
              >
                <div className="bg-card/60 dark:bg-card/40 backdrop-blur-2xl border border-border/50 dark:border-white/10 rounded-[2.5rem] p-7 shadow-xl dark:shadow-2xl hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <Quote className="w-5 h-5 text-primary" />
                    <span className="text-[10px] uppercase font-black text-muted-foreground/80 tracking-[0.2em]">{pageData?.spotlight_gallery?.bio_fragment_title || "The Origin / Lore"}</span>
                  </div>
                  <p className="text-sm italic font-medium leading-relaxed text-foreground/90 dark:text-foreground/80 line-clamp-3 relative">
                    <span className="relative z-10">&quot;{activeCharacter.character_data?.brief_introduction || "Every soul carries a story that needs a form to manifest in this realm."}&quot;</span>
                  </p>
                </div>
              </motion.div>

              {/* Top-Right: Skill Arsenal (Moved from Bottom-Right) */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="order-3 lg:absolute lg:top-8 lg:right-8 z-20 w-full lg:w-80"
              >
                <div className="bg-card/60 dark:bg-card/40 backdrop-blur-2xl border border-border/50 dark:border-white/10 rounded-[2.5rem] p-7 shadow-xl dark:shadow-2xl hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <p className="text-[10px] uppercase font-black text-muted-foreground/80 tracking-[0.2em]">{pageData?.spotlight_gallery?.skill_arsenal_title || "Skill Arsenal"}</p>
                      <p className="text-xs font-bold text-foreground/60 mt-0.5">{pageData?.spotlight_gallery?.skill_arsenal_subtitle || "Techniques"}</p>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 rounded-full bg-primary" />
                      <div className="w-1 h-1 rounded-full bg-primary/40" />
                      <div className="w-1 h-1 rounded-full bg-primary/10" />
                    </div>
                  </div>

                  <div className="space-y-5">
                    {(resolvedAbilities.slice(0, 2).length ? resolvedAbilities.slice(0, 2) : [
                      { 
                        name: activeCharacter.character_data?.art_style || "Unique Aura", 
                        level: 4,
                        icon: "Soul"
                      },
                      { 
                        name: activeCharacter.character_data?.appearance_features?.split(',')[0] || "Intrinsic", 
                        level: 3,
                        icon: "Vestige"
                      }
                    ]).map((ability: any, index: number) => {
                      const displayRate =
                        typeof ability.rate === "number"
                          ? ability.rate
                          : typeof ability.level === "number"
                            ? ability.level
                            : 0;
                      const starCount = Math.max(
                        0,
                        Math.min(5, Math.round(displayRate)),
                      );
                      return (
                        <div key={index} className="group/item relative">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-transparent border border-border/50 dark:border-white/10 flex items-center justify-center group-hover/item:border-primary/40 transition-all shadow-sm overflow-hidden shrink-0">
                              <img 
                                src={getSkillIconUrl(ability.icon)} 
                                className="w-8 h-8 object-contain"
                                alt={ability.name}
                                onError={(e) => { (e.target as any).src = getSkillIconUrl("Default") }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1.5">
                                <p className="text-[11px] font-black uppercase italic text-foreground leading-tight truncate pr-2">{ability.name}</p>
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: starCount }).map((_, starIndex) => (
                                    <Star
                                      key={`${index}-${starIndex}`}
                                      className="w-3 h-3 text-primary fill-primary"
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Bottom-Left: Identity Card (Moved from Top-Left) */}
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="order-4 lg:absolute lg:bottom-8 lg:left-8 z-20 w-full lg:w-72"
              >
                <div className="bg-card/60 dark:bg-card/40 backdrop-blur-2xl border border-border/50 dark:border-white/10 rounded-[2.5rem] p-6 shadow-xl dark:shadow-2xl group/card hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-4 mb-5">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border border-border/20 dark:border-white/20 shadow-inner overflow-hidden relative bg-muted"
                    >
                    {activeCharacter.avatar_url || activeCharacter.profile_url ? (
                        <img 
                          src={assetLoader.getR2Url(activeCharacter.avatar_url || activeCharacter.profile_url)} 
                          alt={activeCharacter.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                        />
                      ) : (
                        <>
                          <div className="absolute inset-0 opacity-20" style={{ backgroundColor: activeCharacter.character_data?.hair_color || "var(--primary)" }} />
                          <span className="relative z-10 text-foreground">{activeCharacter.name[0]}</span>
                        </>
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black italic tracking-tighter text-foreground leading-none">{activeCharacter.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-2 items-center">
                        <GenderIcon 
                          gender={activeCharacter.character_data?.gender || ""} 
                          className="text-lg opacity-80" 
                        />
                        {(() => {
                          const speciesValue = activeCharacter.character_data?.species || "";
                          const selected = resolveSpeciesItem(speciesValue);
                          if (!selected?.icon_url) return null;
                          return (
                            <div className="w-5 h-5 rounded-md bg-background/40 border border-border/40 flex items-center justify-center">
                              <img
                                src={assetLoader.getR2Url(selected.icon_url)}
                                alt={selected.name}
                                className="w-3.5 h-3.5"
                              />
                            </div>
                          );
                        })()}
                        <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase px-2.5 h-4 rounded-md">
                          {resolvedRole}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase font-black text-muted-foreground/80 tracking-[0.2em]">{pageData?.spotlight_gallery?.aura_fragments_title || "Aura Fragments"}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeCharacter.character_data?.personality_tags?.map((tag: string) => (
                        <Badge key={tag} className="bg-primary/10 dark:bg-white/5 hover:bg-primary/20 dark:hover:bg-white/10 text-primary dark:text-foreground text-[10px] font-bold rounded-lg border-none px-2.5 py-1 capitalize transition-colors">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Bottom-Right: Power Matrix (Moved from Top-Right) */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="order-5 lg:absolute lg:bottom-8 lg:right-8 z-20 w-full lg:w-80"
              >
                <div className="bg-card/60 dark:bg-card/40 backdrop-blur-2xl border border-border/50 dark:border-white/10 rounded-[2.5rem] p-6 shadow-xl dark:shadow-2xl hover:border-primary/30 transition-colors h-full">
                  <p className="text-[10px] uppercase font-black text-muted-foreground/80 tracking-[0.2em] mb-4">{pageData?.spotlight_gallery?.soul_frequency_title || "Soul Frequency (Stats)"}</p>
                  <div className="aspect-square w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={resolvedStats}>
                        <PolarGrid stroke="currentColor" className="text-border/30" />
                        <PolarAngleAxis 
                          dataKey="label" 
                          tick={{ fill: "currentColor", fontSize: 9, fontWeight: 800, className: "text-muted-foreground" }}
                        />
                        <Radar
                          name="Stats"
                          dataKey="value"
                          stroke={resolvedThemeColor}
                          fill={resolvedThemeColor}
                          fillOpacity={0.4}
                          dot={{ r: 3, fill: "currentColor", className: "text-foreground" }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none z-30">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-background/20 backdrop-blur-md border border-white/10 hover:bg-background/40 pointer-events-auto shadow-xl"
            onClick={handlePrev}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-background/20 backdrop-blur-md border border-white/10 hover:bg-background/40 pointer-events-auto shadow-xl"
            onClick={handleNext}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 mt-8">
        {characters.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              idx === currentIndex ? "w-8 bg-primary" : "bg-white/20"
            )}
          />
        ))}
      </div>
    </div>
  );
}
