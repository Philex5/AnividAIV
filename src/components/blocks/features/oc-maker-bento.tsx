"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { OCMakerSkeleton } from "@/components/loading/OCMakerSkeleton";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useOCGallery, usePublicCharactersFromDB } from "@/lib/hooks/useConfigs";
import { useImagePreload } from "@/lib/hooks/useImagePreload";
import { useCachedOCSpotlight } from "@/lib/hooks/useCachedOCSpotlight";
import { assetLoader } from "@/lib/asset-loader";
import { parseCharacterModules } from "@/types/oc";
import { GenderIcon } from "@/components/icon/gender-icon";
import { Badge } from "@/components/ui/badge";
import speciesConfig from "@/configs/characters/species.json";

const DEFAULT_STATS = [
  { label: "STR", value: 8 },
  { label: "INT", value: 7 },
  { label: "AGI", value: 9 },
  { label: "VIT", value: 6 },
  { label: "DEX", value: 8 },
  { label: "LUK", value: 5 },
];

const getSkillIconUrl = (icon?: string) =>
  assetLoader.getAssetUrl(`skills/${icon || "Default"}.webp`);

// 复用档案中的种族解析逻辑
const resolveSpeciesItem = (speciesValue: string | null | undefined) => {
  const value = (speciesValue || "").trim();
  if (!value) return null;
  const items = (speciesConfig as any)?.items;
  if (!Array.isArray(items)) return null;
  const lower = value.toLowerCase();
  return (
    items.find((item: any) => item.key === value) ||
    items.find((item: any) => item.uuid === value) ||
    items.find((item: any) => item.name.toLowerCase() === lower) ||
    null
  );
};

export function OCMakerBentoLayout() {
  // Optimized: Use cached hook for instant display on repeat visits
  const { characters: dbCharacters, loading } = useCachedOCSpotlight();

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (dbCharacters.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % dbCharacters.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [dbCharacters.length]);

  const activeCharacter = useMemo(() => dbCharacters[currentIndex], [dbCharacters, currentIndex]);
  
  // 核心逻辑复用：模块解析与角色身份确定
  const activeModules = useMemo(() => {
    const rawModules = (activeCharacter as any)?.modules ?? (activeCharacter as any)?.character_data?.modules;
    return parseCharacterModules(rawModules);
  }, [activeCharacter]);

  const resolvedRole = useMemo(() => {
    if (!activeCharacter) return "LEGEND";
    return (
      activeModules.appearance?.role ||
      (activeCharacter as any)?.role ||
      (activeCharacter as any).character_data?.role ||
      (activeCharacter as any).character_data?.character_role ||
      (activeCharacter as any).character_data?.species ||
      "LEGEND"
    );
  }, [activeCharacter, activeModules]);

  const resolvedThemeColor = activeModules.appearance?.hair_color || activeCharacter?.character_data?.hair_color || "var(--primary)";
  const resolvedStats = activeModules.skills?.stats && activeModules.skills.stats.length > 0
    ? activeModules.skills.stats
    : DEFAULT_STATS;
  const resolvedAbilities = activeModules.skills?.abilities || [];

  const speciesItem = useMemo(() =>
    resolveSpeciesItem(activeCharacter?.character_data?.species),
  [activeCharacter]);

  const profileImageUrl = useMemo(
    () => assetLoader.getR2Url(activeCharacter?.profile_url || ""),
    [activeCharacter?.profile_url],
  );

  const avatarImageUrl = useMemo(
    () => assetLoader.getR2Url(activeCharacter?.avatar_url || ""),
    [activeCharacter?.avatar_url],
  );

  const [mainImageSrc, setMainImageSrc] = useState("");
  const [mainImageReady, setMainImageReady] = useState(false);

  useEffect(() => {
    const initialSrc = profileImageUrl || avatarImageUrl;
    setMainImageSrc(initialSrc);
    setMainImageReady(false);
  }, [activeCharacter?.uuid, profileImageUrl, avatarImageUrl]);

  useEffect(() => {
    if (!dbCharacters.length) return;
    const nextIndex = (currentIndex + 1) % dbCharacters.length;
    const nextProfileUrl = dbCharacters[nextIndex]?.profile_url;
    if (!nextProfileUrl) return;

    const nextImage = new Image();
    nextImage.src = assetLoader.getR2Url(nextProfileUrl);
  }, [dbCharacters, currentIndex]);

  // Collect non-critical image URLs for preloading
  const secondaryImageUrls = useMemo(() => {
    if (!activeCharacter) return [];
    const urls: string[] = [];
    if (avatarImageUrl && avatarImageUrl !== profileImageUrl) urls.push(avatarImageUrl);
    if (speciesItem?.icon_url) urls.push(assetLoader.getR2Url(speciesItem.icon_url));
    resolvedAbilities.forEach((ability: any) => {
      if (ability.icon) urls.push(getSkillIconUrl(ability.icon));
    });
    return urls;
  }, [activeCharacter, avatarImageUrl, profileImageUrl, speciesItem, resolvedAbilities]);

  useImagePreload(secondaryImageUrls, {
    enabled: !loading && !!activeCharacter,
  });

  if (loading || !activeCharacter) {
    return <OCMakerSkeleton />;
  }

  const handleMainImageError = () => {
    if (mainImageSrc === profileImageUrl && avatarImageUrl && avatarImageUrl !== profileImageUrl) {
      setMainImageSrc(avatarImageUrl);
      setMainImageReady(false);
      return;
    }
    setMainImageReady(true);
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCharacter.uuid}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="relative w-full h-full"
        >
          <div 
            className="absolute inset-0 blur-[120px] opacity-25 transition-colors duration-1000"
            style={{ backgroundColor: resolvedThemeColor }}
          />

          <motion.div
            initial={{ scale: 0.9, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 20, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            {!mainImageReady && (
              <div className="w-[45%] h-[75%] rounded-[2rem] border border-white/10 bg-white/5 animate-pulse" />
            )}
            {mainImageSrc && (
              <img
                src={mainImageSrc}
                alt={activeCharacter.name}
                className={cn(
                  "h-full w-auto object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)] transition-opacity duration-500",
                  mainImageReady ? "opacity-100" : "opacity-0 absolute",
                )}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onLoad={() => setMainImageReady(true)}
                onError={handleMainImageError}
              />
            )}
          </motion.div>

          {/* Top-Left: Bio Fragment */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute top-8 left-6 z-20 w-64 hidden md:block"
          >
            <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[1.8rem] p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Quote className="w-4 h-4 text-primary" />
                <span className="text-[9px] uppercase font-black text-white/60 tracking-[0.2em]">Soul Lore</span>
              </div>
              <p className="text-[11px] italic font-medium leading-relaxed text-white/90 line-clamp-3">
                &quot;{activeCharacter.character_data?.brief_introduction || "Every soul carries a story that needs a form to manifest in this realm."}&quot;
              </p>
            </div>
          </motion.div>

          {/* Top-Right: Skill Arsenal */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute top-8 right-6 z-20 w-56 hidden lg:block"
          >
            <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[1.8rem] p-5 shadow-2xl">
               <p className="text-[9px] uppercase font-black text-white/60 tracking-[0.2em] mb-4">Skill Arsenal</p>
               <div className="space-y-3">
                  {(resolvedAbilities.slice(0, 2).length ? resolvedAbilities.slice(0, 2) : [{ name: "Unique Aura", level: 5 }]).map((ability: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                         {getSkillIconUrl(ability.icon) && (
                           <img src={getSkillIconUrl(ability.icon)} className="w-6 h-6 object-contain opacity-70" alt={ability.name} />
                         )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase italic text-white/80 leading-tight truncate">{ability.name}</p>
                        <div className="flex gap-0.5 mt-1">
                          {[...Array(Math.min(5, ability.level || 5))].map((_, s) => (
                            <Star key={s} className="w-2 h-2 text-primary fill-primary" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </motion.div>

          {/* Bottom-Left: Identity Card (对标画廊布局) */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute bottom-36 left-6 z-20 w-64 hidden lg:block"
          >
            <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[1.8rem] p-5 shadow-2xl group/card">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-muted overflow-hidden border border-white/10 shrink-0">
                      {(activeCharacter.avatar_url || activeCharacter.profile_url) && (
                        <img 
                          src={assetLoader.getR2Url(activeCharacter.avatar_url || activeCharacter.profile_url)} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110" 
                          alt={`${activeCharacter.name} avatar`} 
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xl font-black italic tracking-tighter text-white truncate leading-none">{activeCharacter.name}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <GenderIcon gender={activeCharacter.character_data?.gender || ""} className="text-sm opacity-80 text-white" />
                        {speciesItem?.icon_url && (
                          <div className="w-4 h-4 rounded bg-white/10 border border-white/10 flex items-center justify-center">
                            <img src={assetLoader.getR2Url(speciesItem.icon_url)} className="w-3 h-3" alt={speciesItem.name} />
                          </div>
                        )}
                        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[8px] font-black uppercase px-2 h-3.5 rounded-md leading-none">
                          {resolvedRole}
                        </Badge>
                      </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                   {activeCharacter.character_data?.personality_tags?.slice(0, 2).map((tag: string) => (
                      <Badge key={tag} className="bg-white/5 hover:bg-white/10 text-white/60 text-[9px] font-bold rounded-lg border-none px-2 py-0.5 capitalize transition-colors">
                        {tag}
                      </Badge>
                   ))}
                </div>
            </div>
          </motion.div>

          {/* Bottom-Right: Power Matrix */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute bottom-32 right-6 z-20 w-48 h-48 hidden md:block"
          >
            <div className="bg-card/40 backdrop-blur-3xl border border-white/10 rounded-[1.8rem] p-5 shadow-2xl h-full flex flex-col">
              <p className="text-[9px] uppercase font-black text-white/60 tracking-[0.2em] mb-4 text-center">Soul Frequency</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={resolvedStats}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis 
                      dataKey="label" 
                      tick={{ fill: "white", fontSize: 8, fontWeight: 800, opacity: 0.4 }}
                    />
                    <Radar
                      dataKey="value"
                      stroke={resolvedThemeColor}
                      fill={resolvedThemeColor}
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
