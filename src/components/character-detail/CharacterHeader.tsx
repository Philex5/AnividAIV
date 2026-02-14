"use client";

import type { ReactNode } from "react";
import { Cake, Wand2, Upload, Crop, Settings2, ImageIcon, Camera, Images } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CharacterDetailPage } from "@/types/pages/landing";
import { GenderIcon } from "@/components/icon/gender-icon";
import speciesConfig from "@/configs/characters/species.json";
import { getImageUrl, getR2Url } from "@/lib/asset-loader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CharacterVisualSection } from "./CharacterVisualSection";

interface CharacterHeaderProps {
  name: string;
  species?: string | null;
  gender?: string | null;
  role?: string | null;
  age?: number | null;
  greeting?: string | null;
  artStyle?: string | null;
  tags?: string[] | null;
  tagsNode?: ReactNode;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  creator?: {
    uuid: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  worldName?: string | null;
  worldNode?: ReactNode;
  isOwner: boolean;
  isEditMode: boolean;
  pageData: CharacterDetailPage;
  onShare?: () => void;
  onGenerateAvatar?: () => void;
  onGenerateProfileImage?: () => void;
  onOpenAvatarSetting?: () => void;
  onUploadAvatar?: () => void;
  onSelectFromGallery?: () => void;
  isGeneratingProfile?: boolean;
  variant?: "default" | "overlay";
  children?: ReactNode;
  // Edit support
  editValues?: {
    name: string;
    greeting: string;
    gender: string;
    species: string;
    role: string;
    age: number | null;
  };
  onEditChange?: (updates: Partial<{
    name: string;
    greeting: string;
    gender: string;
    species: string;
    role: string;
    age: number | null;
  }>) => void;
  visualDraft?: {
    body_type: string;
    hair_style: string;
    hair_color: string;
    eye_color: string;
    outfit_style: string;
    art_style: string;
    appearance_features: string[];
    accessories: string[];
  };
  onVisualDraftChange?: (updates: Partial<{
    body_type: string;
    hair_style: string;
    hair_color: string;
    eye_color: string;
    outfit_style: string;
    art_style: string;
    appearance_features: string[];
    accessories: string[];
  }>) => void;
}

type SpeciesConfigItem = {
  uuid: string;
  key: string;
  name: string;
  i18n_key?: string;
  icon_url?: string;
};

function resolveSpeciesItem(speciesValue: string | null | undefined) {
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
}

const CUSTOM_SPECIES_VALUE = "__custom__";

export function CharacterHeader({
  name,
  species,
  gender,
  role,
  age,
  greeting,
  artStyle,
  tags,
  tagsNode,
  avatarUrl,
  profileImageUrl,
  creator,
  worldName,
  worldNode,
  isOwner,
  isEditMode,
  pageData,
  onShare,
  onGenerateAvatar,
  onGenerateProfileImage,
  onOpenAvatarSetting,
  onUploadAvatar,
  onSelectFromGallery,
  isGeneratingProfile = false,
  variant = "default",
  children,
  editValues,
  onEditChange,
  visualDraft,
  onVisualDraftChange,
}: CharacterHeaderProps) {
  const worldLabel = pageData.header?.world_label || "";
  const worldEmptyLabel = pageData.header?.world_empty || "";
  
  const genderValue = (editValues?.gender ?? gender ?? "other") || "other";
  const genderLabels = {
    male: pageData.action_bar?.gender?.male || "",
    female: pageData.action_bar?.gender?.female || "",
    other: pageData.action_bar?.gender?.other || "",
  };
  const resolveGenderLabel = (value: string) =>
    value === "male"
      ? genderLabels.male
      : value === "female"
      ? genderLabels.female
      : genderLabels.other;
  const genderLabel = resolveGenderLabel(genderValue);
  const viewGenderLabel = resolveGenderLabel(gender || "other");

  const speciesLabel = pageData.action_bar?.labels?.species || "";
  const speciesCustomLabel =
    pageData.action_bar?.labels?.species_custom || speciesLabel;
  const speciesCustomPlaceholder =
    pageData.action_bar?.labels?.species_custom_placeholder || speciesLabel;
  const rawSpecies = editValues?.species ?? (species || "");
  const selectedSpecies = resolveSpeciesItem(rawSpecies);
  const customSpeciesIconUrl = getImageUrl("/assets/species/custom.webp");
  const ageLabel = pageData.action_bar?.labels?.age || "";
  const roleLabel = pageData.action_bar?.labels?.role || "";
  const ageSuffix = pageData.info?.years_old || "";
  const greetingPlaceholder = pageData.header?.greeting_placeholder || "";

  const containerClasses =
    variant === "overlay"
      ? "text-foreground bg-transparent"
      : "bg-background/90 text-foreground border-border/50 shadow-md rounded-3xl border-2";

  return (
    <>
          <div
            className={`relative flex flex-col items-center transition-all overflow-hidden z-20 ${containerClasses}`}
          >
            {/* Subtle Grid Background - Improved for all variants */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            <div className="relative w-full max-w-4xl mx-auto z-10 px-4 pt-6 pb-0 flex flex-col items-center gap-1.5">
              <div className="relative group/avatar">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-2 border-background relative overflow-hidden shadow-2xl">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-muted text-4xl font-bold">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                
                {isEditMode && isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div 
                        className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 bg-black/30 rounded-full cursor-pointer"
                      >
                        <div className="bg-background/90 p-2 rounded-full shadow-lg border border-border/50 hover:scale-110 transition-transform">
                          <Settings2 className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48 rounded-2xl p-1.5">
                      <DropdownMenuItem 
                        onClick={onUploadAvatar}
                        className="rounded-xl flex items-center gap-2.5 py-2.5 cursor-pointer"
                      >
                        <div className="w-7 h-7 flex items-center justify-center">
                          <Camera className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {pageData.header?.avatar_upload_label || ""}
                        </span>
                      </DropdownMenuItem>
      
                      <DropdownMenuItem 
                        onClick={onSelectFromGallery}
                        className="rounded-xl flex items-center gap-2.5 py-2.5 cursor-pointer"
                      >
                        <div className="w-7 h-7 flex items-center justify-center">
                          <Images className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {pageData.header?.avatar_gallery_label || ""}
                        </span>
                      </DropdownMenuItem>
      
                      <div className="h-px bg-border/50 my-1" />
                      
                      <DropdownMenuItem 
                        onClick={onOpenAvatarSetting}
                        className="rounded-xl flex items-center gap-2.5 py-2.5 cursor-pointer"
                      >
                        <div className="w-7 h-7 flex items-center justify-center">
                          <Crop className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {pageData.portrait_generation?.crop_from_fullbody || ""}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              <div className="space-y-2 w-full flex flex-col items-center text-center">
                <div className="flex flex-col items-center gap-1.5 w-full">
                  {isEditMode ? (
                    <div className="relative w-full max-w-sm">
                      <Input
                        value={editValues?.name ?? ""}
                        onChange={(e) => onEditChange?.({ name: e.target.value })}
                        className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tighter text-center bg-transparent border-none focus-visible:ring-0 font-display leading-tight h-12"
                      />
                    </div>
                  ) : (
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tighter text-foreground font-display leading-tight">
                      {name}
                    </h2>
                  )}
      
                  {isEditMode ? (
                    <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1.5 px-4 py-1 w-full max-w-2xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {/* Gender Select */}
                      <Select
                        value={genderValue}
                        onValueChange={(val) => onEditChange?.({ gender: val })}
                      >
                        <SelectTrigger className="h-7 w-fit bg-background/50 backdrop-blur-sm border-border/50 rounded-xl px-2.5 gap-1 text-[10px] font-bold uppercase hover:bg-background/80 transition-colors shadow-none">
                          <GenderIcon gender={genderValue} className="w-3 h-3" />
                          <span className="sr-only">{genderLabel}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">
                            <span className="flex items-center gap-2">
                              <GenderIcon gender="male" className="w-3 h-3" />
                              <span>{genderLabels.male}</span>
                            </span>
                          </SelectItem>
                          <SelectItem value="female">
                            <span className="flex items-center gap-2">
                              <GenderIcon gender="female" className="w-3 h-3" />
                              <span>{genderLabels.female}</span>
                            </span>
                          </SelectItem>
                          <SelectItem value="other">
                            <span className="flex items-center gap-2">
                              <GenderIcon gender="other" className="w-3 h-3" />
                              <span>{genderLabels.other}</span>
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Species Select */}
                      <Select
                        value={
                          selectedSpecies ? selectedSpecies.key : CUSTOM_SPECIES_VALUE
                        }
                        onValueChange={(val) => {
                          if (val === CUSTOM_SPECIES_VALUE) {
                            if (selectedSpecies) {
                              onEditChange?.({ species: "" });
                            }
                            return;
                          }
                          onEditChange?.({ species: val });
                        }}
                      >
                        <SelectTrigger className="h-7 w-fit bg-background/50 backdrop-blur-sm border-border/50 rounded-xl px-2.5 gap-1.5 text-[10px] font-bold uppercase hover:bg-background/80 transition-colors shadow-none">
                          {(() => {
                            const label = selectedSpecies?.name || rawSpecies || speciesLabel;
                            return (
                              <span className="flex items-center gap-1">
                                {selectedSpecies?.icon_url ? (
                                  <img
                                    src={getR2Url(selectedSpecies.icon_url)}
                                    alt={selectedSpecies.name}
                                    width={12}
                                    height={12}
                                    className="h-3 w-3"
                                  />
                                ) : rawSpecies ? (
                                  <img
                                    src={customSpeciesIconUrl}
                                    alt={speciesCustomLabel}
                                    width={12}
                                    height={12}
                                    className="h-3 w-3"
                                  />
                                ) : null}
                                <span>{label}</span>
                              </span>
                            );
                          })()}
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {(((speciesConfig as any)?.items as SpeciesConfigItem[]) || []).map(
                            (item) => (
                              <SelectItem key={item.uuid} value={item.key}>
                                <span className="flex items-center gap-2">
                                  {item.icon_url ? (
                                    <img
                                      src={getR2Url(item.icon_url)}
                                      alt={item.name}
                                      width={16}
                                      height={16}
                                      className="h-4 w-4"
                                    />
                                  ) : null}
                                  <span>{item.name}</span>
                                </span>
                              </SelectItem>
                            )
                          )}
                          <SelectItem value={CUSTOM_SPECIES_VALUE}>
                            <span className="flex items-center gap-2">
                              <img
                                src={customSpeciesIconUrl}
                                alt={speciesCustomLabel}
                                width={16}
                                height={16}
                                className="h-4 w-4"
                              />
                              <span>{speciesCustomLabel}</span>
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {(() => {
                        if (selectedSpecies) return null;
                        return (
                          <Input
                            value={rawSpecies}
                            placeholder={speciesCustomPlaceholder}
                            onChange={(e) => onEditChange?.({ species: e.target.value })}
                            className="h-7 bg-transparent border-border/50 text-[10px] font-bold uppercase"
                            style={{ minWidth: "8ch", width: `${Math.max(rawSpecies.length, 8) + 2}ch` }}
                          />
                        );
                      })()}
      
                      {/* Age Input */}
                      <div className="flex items-center px-2.5 h-7 gap-1 transition-colors">
                        <Input
                          type="number"
                          value={editValues?.age ?? ""}
                          placeholder={ageLabel}
                          onChange={(e) => onEditChange?.({ age: e.target.value ? Number(e.target.value) : null })}
                          className="h-full bg-transparent border-none focus-visible:ring-0 p-0 text-[10px] font-bold uppercase text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          style={{ minWidth: '3ch', width: `${(editValues?.age?.toString().length || 1) + 2}ch` }}
                        />
                        <Cake className="w-3 h-3 text-muted-foreground/50" />
                      </div>
      
                      {/* Role Input */}
                      <div className="flex items-center px-2.5 h-7 transition-colors">
                        <Input
                          value={editValues?.role ?? ""}
                          placeholder={roleLabel}
                          onChange={(e) => onEditChange?.({ role: e.target.value })}
                          className="h-full bg-transparent border-none focus-visible:ring-0 p-0 text-[10px] font-bold uppercase text-center"
                          style={{ minWidth: '4ch', width: `${Math.max((editValues?.role?.length || 0), 4) + 2}ch` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <TooltipProvider delayDuration={0}>
                      <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1.5 text-xs sm:text-sm font-semibold text-muted-foreground/80 font-sans">
                        {gender && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="flex items-center justify-center p-1 rounded-lg bg-background/40 border border-border/40 hover:bg-background/60 transition-colors"
                                aria-label={viewGenderLabel}
                              >
                                <GenderIcon gender={gender} className="w-3.5 h-3.5" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-[10px] font-bold uppercase tracking-wider">{viewGenderLabel}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {species && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center p-1 rounded-lg bg-background/40 border border-border/40 hover:bg-background/60 transition-colors">
                                {(() => {
                                  const selected = resolveSpeciesItem(species);
                                  if (!selected?.icon_url) {
                                    return (
                                      <img
                                        src={customSpeciesIconUrl}
                                        alt={speciesCustomLabel}
                                        width={14}
                                        height={14}
                                        className="h-3.5 w-3.5"
                                      />
                                    );
                                  }
                                  return (
                                    <img
                                      src={getR2Url(selected.icon_url)}
                                      alt={selected.name}
                                      width={14}
                                      height={14}
                                      className="h-3.5 w-3.5"
                                    />
                                  );
                                })()}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-[10px] font-bold uppercase tracking-wider">{resolveSpeciesItem(species)?.name || species}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
      
                        {age && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg hover:bg-background/60 transition-colors">
                                <Cake className="w-3.5 h-3.5 opacity-60" />
                                <span className="text-xs">{age}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-[10px] font-bold uppercase tracking-wider">{ageLabel}: {age} {ageSuffix}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
      
                        {role && (
                          <div className="px-1.5 py-1 rounded-lg text-[10px] uppercase tracking-wider">
                            {role}
                          </div>
                        )}
                      </div>
                    </TooltipProvider>
                  )}
      
                  <div className="w-full max-w-xl px-4 mt-1">
                    {isEditMode ? (
                      <div className="relative">
                        <Textarea
                          value={editValues?.greeting ?? ""}
                          placeholder={greetingPlaceholder}
                          onChange={(e) => onEditChange?.({ greeting: e.target.value })}
                          rows={2}
                          className="w-full min-h-[60px] text-center bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1 text-base text-primary/80 placeholder:text-muted-foreground/30 font-serif resize-none leading-relaxed"
                        />
                        <div className="absolute -bottom-4 right-0 text-[8px] text-muted-foreground/30 font-mono">
                          {(editValues?.greeting ?? "").length}/100
                        </div>
                      </div>
                    ) : (
                  <p className="text-base sm:text-lg italic text-primary/80 font-serif line-clamp-2 leading-relaxed">
                    <span className="opacity-40 mr-1.5 text-lg">"</span>
                    {greeting || greetingPlaceholder}
                    <span className="opacity-40 ml-1.5 text-lg">"</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="w-full px-6 pt-4 pb-1 mt-auto relative">
        <div className="w-full flex flex-col items-center">
          {isEditMode ? (
            <div className="w-full max-w-xl space-y-4">
              {tagsNode}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-1">
              {tags && tags.length > 0 && (
                <div className="flex items-center gap-4 max-w-xl w-full">
                  <span className="text-[10px] font-black text-muted-foreground/20">#</span>
                  <div className="flex overflow-hidden gap-2 flex-nowrap">
                    {tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-bold text-muted-foreground/40 tracking-widest whitespace-nowrap">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {children}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
