"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Dice5, 
  Sparkles,
  User,
  Image as ImageIcon,
  BookOpen,
  Cake
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { WorldSelector } from "./WorldSelector";
import { CharacterVisualSection } from "./CharacterVisualSection";
import { GenderIcon } from "@/components/icon/gender-icon";
import { SkillsTabContent } from "./SkillsTabContent";
import type { CharacterDetailPage } from "@/types/pages/landing";
import type { CharacterModules } from "@/types/oc";
import { cn } from "@/lib/utils";
import { getImageUrl, getR2Url } from "@/lib/asset-loader";
import { getUuid } from "@/lib/hash";
import { WorldThemeProvider, WorldTheme } from "@/contexts/WorldContext";
import { motion, AnimatePresence } from "framer-motion";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";
import { Badge } from "@/components/ui/badge";
import { X, Plus as PlusIcon } from "lucide-react";

// Configs
import speciesConfig from "@/configs/characters/species.json";
import rolesConfig from "@/configs/characters/roles.json";
import characterStylesConfig from "@/configs/styles/character_styles.json";

interface CharacterCreationWizardProps {
  character: any;
  modules: CharacterModules;
  pageData: CharacterDetailPage;
  isOwner: boolean;
  isSub?: boolean;
  onFinish: () => void;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  onGenerateAvatar?: () => void;
  onGenerateProfileImage?: (options?: {
    skipDialog?: boolean;
    characterData?: {
      name?: string;
      gender?: string;
      age?: number | null;
      species?: string | null;
      role?: string | null;
      personality_tags?: string[] | null;
      modules?: CharacterModules;
      body_type?: string | null;
      hair_color?: string | null;
      hair_style?: string | null;
      eye_color?: string | null;
      outfit_style?: string | null;
      accessories?: string[] | null;
      appearance_features?: string[] | null;
      brief_introduction?: string | null;
      background_story?: string | null;
      extended_attributes?: Record<string, string> | null;
      art_style?: string | null;
    };
    modules?: CharacterModules;
    artStyle?: string | null;
  }) => void;
  isGeneratingProfile?: boolean;
  world?: any;
}

const STEPS = ["basic_info", "visuals", "personality", "story", "skills"] as const;
type Step = (typeof STEPS)[number];

function extractTheme(world?: any): WorldTheme | null {
  if (!world?.theme_colors) return null;
  return {
    primary: world.theme_colors.primary,
    secondary: world.theme_colors.secondary,
    accent: world.theme_colors.accent,
    background: world.theme_colors.background,
    surface: world.theme_colors.surface,
    name: world.name,
  };
}

export function CharacterCreationWizard({
  character,
  modules,
  pageData,
  isOwner,
  isSub = false,
  onFinish,
  avatarUrl,
  profileImageUrl,
  onGenerateAvatar,
  onGenerateProfileImage,
  isGeneratingProfile,
  world,
}: CharacterCreationWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;
  const createModeCopy = pageData.create_mode || {};
  const createModeLabels = createModeCopy.labels || {};
  const createModePlaceholders = createModeCopy.placeholders || {};
  const createModeStatus = createModeCopy.status || {};
  const createModeToasts = createModeCopy.toasts || {};
  const createModeHints = createModeCopy.hints || {};
  const createModeTitles = createModeCopy.titles || {};
  const createModeOverlays = createModeCopy.overlays || {};

  const [currentWorld, setCurrentWorld] = useState(() => ({
    uuid: world?.uuid ?? character.world_uuid ?? null,
    name: world?.name ?? null,
    theme: extractTheme(world),
    cover_url: world?.cover_url ?? null,
  }));
  const { displayUrl: worldCoverDisplayUrl } = useResolvedImageUrl(
    currentWorld.cover_url,
  );

  const [formData, setFormData] = useState(() => {
    // Use consistent fallback name that matches QuickCreationHero handleManualCreate
    const unnamedFallback =
      pageData?.character_card?.unnamed_character ||
      createModePlaceholders.unnamed_character ||
      "Unnamed Character";
    const name = character.name === unnamedFallback ? "" : (character.name || "");

    return {
      name,
      gender: character.gender || "other",
      species: character.species || "human",
      age: character.age || null,
      role: character.role || "adventurer",
      brief_introduction: character.brief_introduction || "",
      world_uuid: character.world_uuid || null,
      appearance: {
        body_type: modules.appearance?.body_type || "",
        hair_style: modules.appearance?.hair_style || "",
        hair_color: modules.appearance?.hair_color || "",
        eye_color: modules.appearance?.eye_color || "",
        outfit_style: modules.appearance?.outfit_style || "",
        art_style: modules.art?.fullbody_style || "anime",
        appearance_features: modules.appearance?.appearance_features || [],
        accessories: modules.appearance?.accessories || [],
      },
      background_segments: Array.isArray(modules.background?.background_segments)
        ? modules.background?.background_segments
        : [],
      background_story: modules.background?.background_story || "",
      personality: {
        personality_tags: modules.personality?.personality_tags || [],
        greeting: modules.personality?.greeting || [],
        quotes: modules.personality?.quotes || [],
        extended_attributes: modules.personality?.extended_attributes || {},
      },
      skills: {
        stats: modules.skills?.stats || [],
        abilities: modules.skills?.abilities || [],
      },
    };
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleNext = async () => {
    if (currentStep === "basic_info" && !formData.name.trim()) {
      const message = pageData.action_bar?.errors?.name_required || createModeToasts.name_required || "";
      toast.error(message);
      return;
    }

    if (currentStepIndex < STEPS.length - 1) {
      await handleSave();
      setCurrentStepIndex(currentStepIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      await handleSave(true);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSave = async (finish = false) => {
    if (!isOwner) return;
    setIsSaving(true);
    try {
      const { art_style: artStyle, ...appearancePayload } =
        formData.appearance;
      const visibilityLevel = isSub ? "private" : "public";
      const payload = {
        name: formData.name,
        gender: formData.gender,
        species: formData.species,
        age: formData.age,
        role: formData.role,
        brief_introduction: formData.brief_introduction,
        world_uuid: formData.world_uuid,
        visibility_level: visibilityLevel,
        personality_tags: formData.personality.personality_tags,
        modules: {
          appearance: {
            ...modules.appearance,
            ...appearancePayload,
            name: formData.name,
            gender: formData.gender,
            species: formData.species,
            age: formData.age,
            role: formData.role,
          },
          art: {
            ...modules.art,
            fullbody_style: artStyle || undefined,
          },
          background: {
            ...modules.background,
            brief_introduction: formData.brief_introduction,
            background_story: formData.background_story,
            background_segments: formData.background_segments,
          },
          personality: {
            ...modules.personality,
            ...formData.personality,
            // Use user-edited greeting array
            greeting: formData.personality.greeting || [],
          },
          skills: {
            ...modules.skills,
            ...formData.skills,
          }
        }
      };

      const response = await fetch(`/api/oc-maker/characters/${character.uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save character");
      
      if (finish) {
        const message = pageData.action_bar?.toast?.saved || createModeToasts.save_success || "";
        toast.success(message);
        onFinish();
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error(createModeToasts.save_failed || "");
    } finally {
      setIsSaving(false);
    }
  };

  const buildGenerationModules = (): CharacterModules => ({
    appearance: {
      ...(modules.appearance ?? {}),
      body_type: formData.appearance.body_type || undefined,
      hair_style: formData.appearance.hair_style || undefined,
      hair_color: formData.appearance.hair_color || undefined,
      eye_color: formData.appearance.eye_color || undefined,
      outfit_style: formData.appearance.outfit_style || undefined,
      appearance_features: formData.appearance.appearance_features,
      accessories: formData.appearance.accessories,
      name: formData.name || undefined,
      gender: formData.gender || undefined,
      species: formData.species || undefined,
      age: formData.age ?? undefined,
      role: formData.role || undefined,
    },
    art: {
      ...(modules.art ?? {}),
      fullbody_style: formData.appearance.art_style || undefined,
    },
    background: {
      ...(modules.background ?? {}),
      brief_introduction: formData.brief_introduction || undefined,
      background_story: formData.background_story || undefined,
      background_segments: formData.background_segments || [],
    },
    personality: {
      ...(modules.personality ?? {}),
      personality_tags: formData.personality.personality_tags,
      quotes: formData.personality.quotes,
      extended_attributes: formData.personality.extended_attributes,
      // Use user-edited greeting array
      greeting: formData.personality.greeting || [],
    },
    skills: {
      ...(modules.skills ?? {}),
      stats: formData.skills.stats,
      abilities: formData.skills.abilities,
    },
  });

  const handleGenerateProfileImage = () => {
    if (!onGenerateProfileImage) return;
    const unnamedFallback =
      pageData?.character_card?.unnamed_character ||
      createModePlaceholders.unnamed_character ||
      "Unnamed Character";
    const resolvedName = formData.name.trim() || unnamedFallback;

    onGenerateProfileImage({
      characterData: {
        name: resolvedName,
        gender: formData.gender || "other",
        age: formData.age ?? null,
        species: formData.species || null,
        role: formData.role || null,
        personality_tags: formData.personality.personality_tags,
        body_type: formData.appearance.body_type || null,
        hair_color: formData.appearance.hair_color || null,
        hair_style: formData.appearance.hair_style || null,
        eye_color: formData.appearance.eye_color || null,
        outfit_style: formData.appearance.outfit_style || null,
        accessories: formData.appearance.accessories || null,
        appearance_features: formData.appearance.appearance_features || null,
        brief_introduction: formData.brief_introduction || null,
        background_story: formData.background_story || null,
        extended_attributes: formData.personality.extended_attributes || null,
        art_style: formData.appearance.art_style || null,
      },
      modules: buildGenerationModules(),
      artStyle: formData.appearance.art_style || null,
    });
  };

  const randomizeAppearance = () => {
    const hairColors = ["Black", "White", "Golden", "Blue", "Red", "Pink", "Silver", "Green"];
    const eyeColors = ["Blue", "Red", "Golden", "Green", "Purple", "Black", "Grey"];
    const bodyTypes = ["Slender", "Athletic", "Petite", "Tall", "Curvy"];
    
    const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    
    setFormData(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        hair_color: getRandom(hairColors),
        eye_color: getRandom(eyeColors),
        body_type: getRandom(bodyTypes),
      }
    }));
    toast.success(createModeToasts.randomize_success || "");
  };

  const aiExpandStory = async () => {
    toast.info(createModeToasts.ai_expand_start || "");
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        background_story: (createModeToasts.ai_expand_result || "")
          .replace(/{species}/g, prev.species || "")
          .replace(/{name}/g, prev.name || "")
          .replace(/{role}/g, prev.role || "")
          .replace(/{hair_color}/g, prev.appearance.hair_color || "")
          .replace(/{eye_color}/g, prev.appearance.eye_color || "")
          .replace(/{brief_introduction}/g, prev.brief_introduction || ""),
      }));
      toast.success(createModeToasts.ai_expand_success || "");
    }, 1500);
  };

  const speciesOptions = speciesConfig.items || [];
  const customSpeciesValue = "__custom__";
  const rolesOptions = rolesConfig.items || [];
  const styleOptions = (characterStylesConfig?.items || []).filter(s => s.status === "active");

  const [isTransitioning, setIsTransitioning] = useState(false);
  const backgroundCopy: NonNullable<CharacterDetailPage["background_story"]> =
    pageData.background_story || {};
  const eventsTitle = backgroundCopy?.events_title || "";
  const addEventLabel = backgroundCopy?.add_event || "";
  const eventTitleLabel = backgroundCopy?.event_title || "";
  const eventContentLabel = backgroundCopy?.event_content || "";
  const deleteEventLabel = backgroundCopy?.delete_event || "";

  // Use unified UUID generation from @/lib/hash
  const createSegmentId = getUuid;

  const handleAddSegment = () => {
    setFormData((prev) => ({
      ...prev,
      background_segments: [
        ...(prev.background_segments || []),
        { id: createSegmentId(), title: "", content: "" },
      ],
    }));
  };

  const handleWorldChange = (uuid: string | null, selected?: any) => {
    const nextTheme = extractTheme(selected);
    const nextBackground = selected?.cover_url || null;

    setIsTransitioning(true);

    setTimeout(() => {
      setFormData({...formData, world_uuid: uuid});
      setCurrentWorld({
        uuid,
        name: selected?.name || null,
        theme: nextTheme,
        cover_url: nextBackground,
      });
      setIsTransitioning(false);
    }, 600);
  };

  return (
    <WorldThemeProvider theme={currentWorld.theme}>
    <div className="w-full max-w-4xl mx-auto space-y-8 py-8 px-4 relative">
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none bg-background/80 backdrop-blur-md flex items-center justify-center"
          >
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold uppercase tracking-widest text-primary animate-pulse">
                  {createModeOverlays.switching_world || ""}
                </p>
              </div>
            </motion.div>
          )}
      </AnimatePresence>
      {/* Header & Progress */}
      <div className="text-center space-y-6">
        <h2 className="text-4xl sm:text-5xl font-anime font-semibold tracking-tight text-foreground drop-shadow-sm">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-yellow-500">
            {createModeCopy.title || ""}
          </span>
        </h2>
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 px-1">
            {STEPS.map((step, idx) => (
              <span key={step} className={cn(idx <= currentStepIndex && "text-primary opacity-100")}>
                {pageData.create_mode?.steps?.[step] || step.replace("_", " ")}
              </span>
            ))}
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden border border-border/50">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <Card className="relative bg-card/90 backdrop-blur-xl rounded-3xl border-2 border-border/50 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.08)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.03)] overflow-hidden">
        {/* Subtle Grid Background */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        {worldCoverDisplayUrl && (
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <img
              src={worldCoverDisplayUrl}
              className="w-full h-full object-cover"
              alt={`${currentWorld.name || "World"} ${pageData.header?.world_label || "World"} cover`}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
          </div>
        )}
        
        <CardContent className="relative p-5 sm:p-8">
          <div className="min-h-[450px]">
            {currentStep === "basic_info" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">{pageData.create_mode?.steps?.basic_info}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  {/* Name Input */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                      {pageData.action_bar?.labels?.name}
                    </Label>
                    <Input 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder={createModePlaceholders.name || ""}
                      className="h-11 bg-background/50 border-border/60 rounded-2xl px-5 text-lg font-medium focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Gender Select */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                      {pageData.action_bar?.labels?.gender}
                    </Label>
                    <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                      <SelectTrigger className="h-11 bg-background/50 border-border/60 rounded-2xl px-5 transition-all">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <GenderIcon gender={formData.gender} className="w-4 h-4" />
                            <span className="capitalize text-sm font-medium">{pageData.action_bar?.gender?.[formData.gender as keyof typeof pageData.action_bar.gender] || formData.gender}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {["male", "female", "other"].map(g => (
                          <SelectItem key={g} value={g} className="rounded-xl py-2">
                            <div className="flex items-center gap-2">
                              <GenderIcon gender={g} className="w-4 h-4" />
                              <span className="capitalize text-sm">{pageData.action_bar?.gender?.[g as keyof typeof pageData.action_bar.gender] || g}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Species Select */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                      {pageData.action_bar?.labels?.species}
                    </Label>
                    <div className="space-y-2">
                      <Select
                        value={
                          speciesOptions.some(s => s.key === formData.species)
                            ? formData.species
                            : customSpeciesValue
                        }
                        onValueChange={v => {
                          if (v === customSpeciesValue) {
                            setFormData({...formData, species: ""});
                          } else {
                            setFormData({...formData, species: v});
                          }
                        }}
                      >
                      <SelectTrigger className="h-11 bg-background/50 border-border/60 rounded-2xl px-5 transition-all">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            {speciesOptions.find(s => s.key === formData.species)?.icon_url ? (
                              <img
                                src={getR2Url(speciesOptions.find(s => s.key === formData.species)!.icon_url!)}
                                className="w-4 h-4"
                                alt=""
                              />
                            ) : (
                              <img src={getImageUrl("/assets/species/custom.webp")} className="w-4 h-4" alt="" />
                            )}
                            <span className="text-sm font-medium">
                              {speciesOptions.find(s => s.key === formData.species)?.name || formData.species || pageData.action_bar?.labels?.species_custom || ""}
                            </span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl max-h-[300px]">
                        {speciesOptions.map(s => (
                          <SelectItem key={s.key} value={s.key} className="rounded-xl py-2">
                            <div className="flex items-center gap-2">
                              {s.icon_url && <img src={getR2Url(s.icon_url)} className="w-4 h-4" alt="" />}
                              <span className="text-sm">{s.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value={customSpeciesValue} className="rounded-xl py-2 font-bold text-primary">
                          <div className="flex items-center gap-2">
                            <img src={getImageUrl("/assets/species/custom.webp")} className="w-4 h-4" alt="" />
                            <span className="text-sm">+ {pageData.action_bar?.labels?.species_custom || ""}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                      
                      {!speciesOptions.some(s => s.key === formData.species) && (
                        <Input
                          value={formData.species}
                          onChange={e => setFormData({...formData, species: e.target.value})}
                          placeholder={createModePlaceholders.species_custom || ""}
                          className="h-10 bg-background/30 border-dashed border-primary/30 rounded-xl px-4 text-sm transition-all animate-in fade-in slide-in-from-top-2"
                        />
                      )}
                    </div>
                  </div>

                  {/* Role Select */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                      {pageData.action_bar?.labels?.role}
                    </Label>
                    <div className="space-y-2">
                      <Select 
                        value={rolesOptions.some(r => r.key === formData.role) ? formData.role : "custom"} 
                        onValueChange={v => {
                          if (v === "custom") {
                            setFormData({...formData, role: ""});
                          } else {
                            setFormData({...formData, role: v});
                          }
                        }}
                      >
                        <SelectTrigger className="h-11 bg-background/50 border-border/60 rounded-2xl px-5 transition-all">
                          <SelectValue className="text-sm font-medium" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl max-h-[300px]">
                          {rolesOptions.map(r => (
                            <SelectItem key={r.key} value={r.key} className="rounded-xl py-2">
                              <span className="text-sm">{r.name}</span>
                            </SelectItem>
                          ))}
                          <SelectItem value="custom" className="rounded-xl py-2 font-bold text-primary">
                            <span className="text-sm">+ {pageData.action_bar?.labels?.custom || ""}</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {(!rolesOptions.some(r => r.key === formData.role) || formData.role === "") && (
                        <Input 
                          value={formData.role}
                          onChange={e => setFormData({...formData, role: e.target.value})}
                          placeholder={createModePlaceholders.role_custom || ""}
                          className="h-10 bg-background/30 border-dashed border-primary/30 rounded-xl px-4 text-sm transition-all animate-in fade-in slide-in-from-top-2"
                        />
                      )}
                    </div>
                  </div>

                  {/* World Select */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                      {pageData.header?.world_label}
                    </Label>
                    <WorldSelector 
                      value={formData.world_uuid} 
                      onChange={(uuid) => setFormData({...formData, world_uuid: uuid})}
                      pageData={pageData}
                      className="h-11 bg-background/50 border-border/60 rounded-2xl transition-all"
                    />
                  </div>

                  {/* Age Input */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                      {pageData.action_bar?.labels?.age}
                    </Label>
                    <div className="relative group max-w-[120px]">
                      <Input 
                        type="number"
                        value={formData.age || ""} 
                        onChange={e => setFormData({...formData, age: e.target.value ? Number(e.target.value) : null})}
                        placeholder={createModePlaceholders.age || ""}
                        className="h-11 bg-background/50 border-border/60 rounded-2xl px-5 pl-10 transition-all text-sm font-medium"
                      />
                      <Cake className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "visuals" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <ImageIcon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">{pageData.create_mode?.steps?.visuals}</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                  <div className="bg-muted/10 rounded-[2rem] border border-border/40 p-1 sm:p-2">
                    <CharacterVisualSection
                      name={formData.name || createModePlaceholders.character_fallback_name || ""}
                      characterImageUrl={profileImageUrl}
                      isEditMode={true}
                      isOwner={true}
                      pageData={pageData}
                      visualDraft={formData.appearance}
                      onVisualDraftChange={(updates) => setFormData(prev => ({
                        ...prev,
                        appearance: { ...prev.appearance, ...updates }
                      }))}
                      onGenerate={handleGenerateProfileImage}
                      onRandomize={randomizeAppearance}
                      isGenerating={isGeneratingProfile}
                      hideImage={true}
                      hideTitle={true}
                    />
                  </div>

                  <div className="space-y-6">
                    {/* Portrait Preview Section */}
                    <div className="bg-card rounded-3xl border border-border/40 p-1 shadow-sm overflow-hidden aspect-[3/4] flex flex-col relative group">
                      <div className="absolute top-4 left-0 right-0 z-10 text-center">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] bg-background/60 backdrop-blur-md px-3 py-1 rounded-full border border-border/40">
                          {createModeLabels.portrait_title || ""}
                        </Label>
                      </div>

                      <div className="flex-1 bg-muted/20 relative flex items-center justify-center">
                        {isGeneratingProfile ? (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm transition-all">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-primary/70 animate-pulse text-center px-4">
                              {pageData.visuals?.status?.generating_portrait || ""}
                            </p>
                          </div>
                        ) : null}

                        {profileImageUrl ? (
                          <img 
                            src={profileImageUrl} 
                            alt={createModeLabels.portrait_title || ""} 
                            className={cn(
                              "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
                              isGeneratingProfile && "opacity-50 blur-sm"
                            )}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-4 text-muted-foreground/30 px-6 text-center">
                            <ImageIcon className="w-12 h-12 stroke-[1px]" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest">
                                {createModeLabels.portrait_empty || ""}
                              </p>
                              <p className="text-[9px] italic leading-tight">
                                {pageData.portrait_generation?.generate_description || ""}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                      <p className="text-[10px] text-primary/70 leading-relaxed italic">
                        <strong>{createModeLabels.tip_label || ""}</strong>{" "}
                        {createModeHints.avatar_tip || ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "story" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">{pageData.create_mode?.steps?.story}</h2>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={aiExpandStory}
                    className="gap-2 rounded-full border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-4 transition-all"
                    title={pageData.create_mode?.story?.ai_expand_tooltip}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-wider">{pageData.create_mode?.buttons?.ai_expand}</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                      {createModeLabels.one_line_bio || ""}
                    </Label>
                    <Input 
                      value={formData.brief_introduction} 
                      onChange={e => setFormData({...formData, brief_introduction: e.target.value})}
                      placeholder={createModePlaceholders.one_line_bio || ""}
                      className="h-12 bg-background/50 border-border/60 rounded-2xl px-5 italic font-medium transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                      {createModeLabels.background_story || ""}
                    </Label>
                    <Textarea 
                      value={formData.background_story} 
                      onChange={e => setFormData({...formData, background_story: e.target.value})}
                      placeholder={createModePlaceholders.background_story || ""}
                      className="min-h-[300px] bg-background/50 border-border/60 rounded-[1.5rem] p-6 text-sm leading-relaxed resize-none transition-all focus:ring-primary/10"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                        {eventsTitle}
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddSegment}
                        className="gap-2 rounded-full border-border/60 bg-background/40 text-xs font-bold"
                      >
                        <PlusIcon className="h-4 w-4" />
                        {addEventLabel}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {(formData.background_segments || []).map((segment, index) => (
                        <div
                          key={segment.id || `segment-${index}`}
                          className="rounded-2xl border border-border/50 bg-background/40 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                              {eventTitleLabel}
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  background_segments: prev.background_segments.filter((_, i) => i !== index),
                                }));
                              }}
                              className="h-7 px-3 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive"
                            >
                              {deleteEventLabel}
                            </Button>
                          </div>
                          <Input
                            value={segment.title || ""}
                            onChange={(e) => {
                              const nextTitle = e.target.value;
                              setFormData((prev) => {
                                const nextSegments = [...prev.background_segments];
                                nextSegments[index] = { ...nextSegments[index], title: nextTitle };
                                return { ...prev, background_segments: nextSegments };
                              });
                            }}
                            placeholder={eventTitleLabel}
                            className="h-10 bg-background/60 border-border/60 rounded-2xl px-4 text-sm font-medium transition-all"
                          />

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                              {eventContentLabel}
                            </Label>
                            <Textarea
                              value={segment.content || ""}
                              onChange={(e) => {
                                const nextContent = e.target.value;
                                setFormData((prev) => {
                                  const nextSegments = [...prev.background_segments];
                                  nextSegments[index] = { ...nextSegments[index], content: nextContent };
                                  return { ...prev, background_segments: nextSegments };
                                });
                              }}
                              placeholder={eventContentLabel}
                              className="min-h-[140px] bg-background/60 border-border/60 rounded-2xl p-4 text-sm leading-relaxed resize-none transition-all"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "personality" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {createModeTitles.personality || ""}
                  </h2>
                </div>

                <div className="bg-card rounded-3xl border border-border/50 p-5 lg:p-6 shadow-sm space-y-8">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                        {createModeTitles.personality_traits || ""}
                        <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent"></div>
                      </Label>
                      <p className="text-[10px] text-muted-foreground/70 font-medium px-1">
                        {createModeHints.personality_traits || ""}
                      </p>
                    </div>

                    <ListEditor
                      values={formData.personality.personality_tags}
                      onChange={(newTags) => setFormData(prev => ({
                        ...prev,
                        personality: { ...prev.personality, personality_tags: newTags }
                      }))}
                      placeholder={createModePlaceholders.trait || ""}
                    />
                  </div>

                  {/* Greeting Messages - For chat introduction */}
                  <div className="pt-5 border-t border-border/20 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                        Chat Greetings
                        <div className="h-px w-24 bg-gradient-to-r from-border/50 to-transparent"></div>
                      </Label>
                      <p className="text-[10px] text-muted-foreground/70 font-medium px-1">
                        Add greeting phrases for chat conversations. Multiple greetings will be randomly selected when starting a chat.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {formData.personality.greeting.map((phrase, index) => (
                        <div key={`greeting-${index}`} className="flex items-center gap-2">
                          <Input
                            value={phrase}
                            onChange={(e) => {
                              const newGreetings = [...formData.personality.greeting];
                              newGreetings[index] = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                personality: { ...prev.personality, greeting: newGreetings.filter(g => g.trim()) }
                              }));
                            }}
                            placeholder="e.g. Hey there! Ready for an adventure?"
                            className="flex-1 bg-background/60 border-border/60 rounded-2xl px-4 text-sm transition-all"
                          />
                          {formData.personality.greeting.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                const newGreetings = formData.personality.greeting.filter((_, i) => i !== index);
                                setFormData(prev => ({
                                  ...prev,
                                  personality: { ...prev.personality, greeting: newGreetings }
                                }));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            personality: { ...prev.personality, greeting: [...prev.personality.greeting, ""] }
                          }));
                        }}
                        className="w-full rounded-2xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all px-6 py-3 text-sm font-medium"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add another greeting
                      </Button>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-border/20 space-y-6">
                    <div className="space-y-1 flex-1">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                        {createModeTitles.extended_attributes || ""}
                        <div className="h-px w-24 bg-gradient-to-r from-border/50 to-transparent"></div>
                      </Label>
                      <p className="text-[10px] text-muted-foreground/70 font-medium px-1">
                        {createModeHints.extended_attributes || ""}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(formData.personality.extended_attributes).map(([key, value], index) => (
                          <div key={`attr-${index}`} className="flex flex-col gap-1.5 bg-background/40 border border-border/40 p-3 rounded-2xl group relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                              onClick={() => {
                                const next = { ...formData.personality.extended_attributes };
                                delete next[key];
                                setFormData(prev => ({
                                  ...prev,
                                  personality: { ...prev.personality, extended_attributes: next }
                                }));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Input
                              value={key}
                              onChange={(e) => {
                                const newKey = e.target.value;
                                if (newKey === key) return;
                                const next = { ...formData.personality.extended_attributes };
                                next[newKey] = next[key];
                                delete next[key];
                                setFormData(prev => ({
                                  ...prev,
                                  personality: { ...prev.personality, extended_attributes: next }
                                }));
                              }}
                              placeholder={createModePlaceholders.attribute_key || ""}
                              className="h-7 text-[10px] font-black uppercase tracking-wider bg-background/60 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                            />
                            <Input
                              value={value}
                              onChange={(e) => {
                                const next = { ...formData.personality.extended_attributes };
                                next[key] = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  personality: { ...prev.personality, extended_attributes: next }
                                }));
                              }}
                              placeholder={createModePlaceholders.attribute_value || ""}
                              className="h-8 text-sm font-bold bg-background/20 border-border/20 focus-visible:ring-1 focus-visible:ring-primary/50"
                            />
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-2xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all px-6"
                          onClick={() => {
                            const next = { ...formData.personality.extended_attributes };
                            const newKey = `attribute_${Object.keys(next).length + 1}`;
                            next[newKey] = "";
                            setFormData(prev => ({
                              ...prev,
                              personality: { ...prev.personality, extended_attributes: next }
                            }));
                          }}
                        >
                          <PlusIcon className="h-4 w-4 mr-2" /> {createModeLabels.add_attribute || ""}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "skills" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {createModeTitles.skills || ""}
                  </h2>
                </div>

                {/* Skills content needs more width for radar chart interaction */}
                <div className="-mx-4 sm:-mx-6">
                  <div className="bg-card rounded-3xl border border-border/50 p-5 lg:p-6 shadow-sm">
                    <SkillsTabContent
                      stats={formData.skills.stats}
                      abilities={formData.skills.abilities}
                      isEditMode={true}
                      onStatsChange={(stats) => setFormData(prev => ({
                        ...prev,
                        skills: { ...prev.skills, stats }
                      }))}
                      onAbilitiesChange={(abilities) => setFormData(prev => ({
                        ...prev,
                        skills: { ...prev.skills, abilities }
                      }))}
                      pageData={pageData}
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        </CardContent>

        {/* Footer Actions */}
        <div className="relative p-6 sm:px-10 bg-muted/20 border-t border-border/50 flex justify-between items-center gap-4">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0 || isSaving}
            className="rounded-2xl px-6 h-12 font-bold uppercase tracking-widest text-xs hover:bg-background/50 transition-all"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {createModeCopy.buttons?.previous || ""}
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={isSaving || (currentStep === "basic_info" && !formData.name)}
            className="rounded-2xl px-10 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {createModeStatus.saving || ""}
              </span>
            ) : (
              currentStepIndex === STEPS.length - 1 ? (
                <>
                  {createModeCopy.buttons?.finish || ""}
                  <Check className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  {createModeCopy.buttons?.next || ""}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )
            )}
          </Button>
        </div>
      </Card>
    </div>
    </WorldThemeProvider>
  );
}

function ListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (newValues: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  
  const add = () => {
    if (!input.trim()) {
      setIsAdding(false);
      return;
    }
    if (values.includes(input.trim())) {
      setInput(""); 
      setIsAdding(false);
      return;
    }
    onChange([...values, input.trim()]);
    setInput("");
    setIsAdding(false);
  };

  const remove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap gap-3 items-center px-1">
      {values.map((v, i) => (
        <Badge
          key={`${v}-${i}`}
          className="rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 text-xs font-bold px-4 py-1.5 transition-all gap-2"
        >
          {v}
          <button
            type="button"
            className="opacity-50 hover:opacity-100 transition-opacity"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              remove(i);
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
          <Input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              } else if (e.key === "Escape") {
                setIsAdding(false);
                setInput("");
              }
            }}
            onBlur={add}
            placeholder={placeholder}
            className="h-8 w-32 text-xs px-3 bg-background/60 border-primary/30 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      ) : (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsAdding(true)}
          className="h-8 w-8 rounded-xl border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <PlusIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
