"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharacterVisualSection } from "./CharacterVisualSection";
import { CharacterImageGallery, type ImageItem } from "./CharacterImageGallery";
import { SkillsTabContent } from "./SkillsTabContent";
import { Badge } from "@/components/ui/badge";
import type { CharacterDetailPage } from "@/types/pages/landing";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MoreHorizontal,
  Plus,
  Sparkles,
  X,
  UploadIcon,
  Loader2Icon,
  ImagesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMemo, useState, useRef, useCallback } from "react";
import type { GeneratorModalCopy } from "@/components/generation/generation-modal-types";
import { ArtworkGalleryDialog } from "@/components/anime-generator/ArtworkGalleryDialog";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";
import ocEventsPrompt from "@/configs/prompts/ocs/oc_events.json";
import { getCreamyCharacterUrl } from "@/lib/asset-loader";
import { resolveImageReference, isImageUuid } from "@/lib/image-resolve";
import {
  useGenerationPolling,
  type GenerationStatusResponse,
} from "@/hooks/useGenerationPolling";
import { GenerationStatusModal, type GenerationStatusType } from "@/components/generation/GenerationStatusModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ModuleDisplayTabsProps {
  characterUuid?: string;
  appearance: {
    name: string;
    gender?: string;
    age?: number | null;
    role?: string;
    species?: string;
    body_type?: string;
    hair_style?: string;
    hair_color?: string;
    eye_color?: string;
    outfit_style?: string;
    art_style?: string;
    accessories?: string[];
    appearance_features?: string[];
    characterImageUrl?: string | null;
    avatarImageUrl?: string | null;
  };
  personality?: {
    personality_tags?: string[];
    greeting?: string;
    quotes?: string[];
  };
  background?: {
    brief_introduction?: string;
    background_story?: string;
    background_segments?: { id?: string; title: string; content: string; image_url?: string; image_uuid?: string }[];
  };
  skills?: {
    stats?: { label: string; value: number }[];
    abilities?: {
      id: string;
      name: string;
      type?: string;
      level?: number;
      description?: string;
    }[];
  };
  extendedAttributes?: Record<string, string>;
  galleryImages?: ImageItem[];
  primaryPortraitUuid?: string | null;
  onPrimaryPortraitChange?: (nextUuid: string | null) => void;
  onGalleryImagesChange?: (images: ImageItem[]) => void;
  onGalleryUpload?: () => void;
  onGallerySelectFromArtworks?: () => void;
  pageData: CharacterDetailPage;
  isEditMode?: boolean;
  isOwner?: boolean;
  onGenerateProfileImage?: (options?: { skipDialog?: boolean; type?: ImageItem["type"] }) => void;
  backgroundStoryDraft?: string;
  onBackgroundStoryDraftChange?: (next: string) => void;
  backgroundSegmentsDraft?: { id: string; title: string; content: string; image_url?: string; image_uuid?: string }[];
  onBackgroundSegmentsDraftChange?: (
    next: { id: string; title: string; content: string; image_url?: string; image_uuid?: string }[]
  ) => void;
  locale?: string;
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
  onPersonalityDraftChange?: (updates: Partial<{
    personality_tags: string[];
    greeting: string;
    quotes: string[];
  }>) => void;
  personalityDraft?: {
    personality_tags: string[];
    quotes: string[];
  };
  skillsDraft?: {
    stats: { label: string; value: number }[];
    abilities: {
      id: string;
      name: string;
      type?: string;
      level?: number;
      description?: string;
    }[];
  };
  onSkillsDraftChange?: (next: {
    stats: { label: string; value: number }[];
    abilities: {
      id: string;
      name: string;
      type?: string;
      level?: number;
      description?: string;
    }[];
  }) => void;
  extendedAttributesDraft?: Record<string, string>;
  onExtendedAttributesDraftChange?: (next: Record<string, string>) => void;
  themeColor?: string | null;
  visualArchiveLimit?: number;
}

export function ModuleDisplayTabs({
  characterUuid,
  appearance,
  personality,
  background,
  skills,
  extendedAttributes,
  galleryImages = [],
  primaryPortraitUuid,
  onPrimaryPortraitChange,
  onGalleryImagesChange,
  onGalleryUpload,
  onGallerySelectFromArtworks,
  pageData,
  isEditMode = false,
  isOwner = false,
  onGenerateProfileImage,
  backgroundStoryDraft,
  onBackgroundStoryDraftChange,
  backgroundSegmentsDraft,
  onBackgroundSegmentsDraftChange,
  locale,
  visualDraft,
  onVisualDraftChange,
  onPersonalityDraftChange,
  personalityDraft,
  skillsDraft,
  onSkillsDraftChange,
  extendedAttributesDraft,
  onExtendedAttributesDraftChange,
  themeColor,
  visualArchiveLimit = 10,
}: ModuleDisplayTabsProps) {
  const appearanceLabel = pageData.sections?.appearance_style || "";
  const backgroundLabel = pageData.sections?.background_story || "";
  const personalityLabel = pageData.sections?.personality_traits || "";
  const skillsLabel = pageData.skills?.title || "";
  const breakdownSheetLabel =
    pageData.gallery?.breakdown_sheet_label || "";
  const breakdownSheetHint =
    pageData.gallery?.breakdown_sheet_hint || "";
  const visualArchivesLabel = pageData.gallery?.visual_archives_label || "";
  const primaryBadgeLabel = pageData.gallery?.primary_badge;
  const primaryBadgeTooltip = pageData.gallery?.primary_badge_tooltip;
  const primarySetLabel = pageData.gallery?.primary_set_label;
  const primaryDeleteTitle = pageData.gallery?.primary_delete_title;
  const primaryDeleteConfirm = pageData.gallery?.primary_delete_confirm;
  const primaryDeleteCancel = pageData.gallery?.primary_delete_cancel;
  const primaryDeleteAction = pageData.gallery?.primary_delete_action;
  const eventVisualGenerationCopy = pageData.event_visual_generation;

  const backgroundCopy = pageData.background_story;
  const overallTitle = backgroundCopy?.overall_title || backgroundCopy?.title || backgroundLabel;
  const overallPlaceholder = backgroundCopy?.overall_placeholder || backgroundCopy?.placeholder || "";
  const backgroundStoryEmpty = pageData.sections?.background_story_empty || "";

  const eventsTitle = backgroundCopy?.events_title || "";
  const addEventLabel = backgroundCopy?.add_event || "";
  const eventTitleLabel = backgroundCopy?.event_title || "";
  const eventContentLabel = backgroundCopy?.event_content || "";
  const deleteEventLabel = backgroundCopy?.delete_event || "";
  const eventTitlePlaceholder = backgroundCopy?.event_title_placeholder || "";
  const eventContentPlaceholder = backgroundCopy?.event_content_placeholder || "";
  const eventAiGenerateLabel = backgroundCopy?.event_ai_generate || "";
  const eventImageUploadLabel = backgroundCopy?.event_image_upload || "";
  const eventImageSelectLabel = backgroundCopy?.event_image_select || "";

  const viewSegments = (Array.isArray(background?.background_segments) ? background.background_segments : []).map((s, i) => ({
    id: (s as any).id || `segment-${i}`,
    title: (s as any).title || "",
    content: (s as any).content || "",
    image_url: (s as any).image_url,
    image_uuid: (s as any).image_uuid,
  }));

  const segments = isEditMode ? backgroundSegmentsDraft ?? viewSegments : viewSegments;

  const createId = () => {
    if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
      const cryptoValue = (globalThis as any).crypto as Crypto | undefined;
      if (cryptoValue?.randomUUID) return cryptoValue.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const handleAddEvent = () => {
    if (!isEditMode || !onBackgroundSegmentsDraftChange) return;
    const next = [...(backgroundSegmentsDraft ?? viewSegments)];
    next.push({ id: createId(), title: "", content: "" });
    onBackgroundSegmentsDraftChange(next);
  };

  const handleRemoveEvent = (index: number) => {
    if (!isEditMode || !onBackgroundSegmentsDraftChange) return;
    const next = [...(backgroundSegmentsDraft ?? viewSegments)];
    next.splice(index, 1);
    onBackgroundSegmentsDraftChange(next);
  };

  const displayImages = useMemo(() => {
    if (galleryImages && galleryImages.length > 0) return galleryImages;
    if (appearance.characterImageUrl) {
      return [
        {
          id: "main-image",
          url: appearance.characterImageUrl,
          type: "generation",
        } as ImageItem,
      ];
    }
    return [] as ImageItem[];
  }, [galleryImages, appearance.characterImageUrl]);
  const eventReferenceSource = useMemo(() => {
    const resolveImageUuid = (image: ImageItem) => {
      const rawValue = image.meta?.image_uuid || image.url;
      if (!rawValue) return null;
      return isImageUuid(rawValue) ? rawValue : null;
    };
    const isPrimaryCandidate = (image: ImageItem) =>
      image.type !== "design_sheet" && Boolean(resolveImageUuid(image));
    const primaryPortrait = primaryPortraitUuid
      ? galleryImages?.find(
          (image) =>
            resolveImageUuid(image) === primaryPortraitUuid &&
            isPrimaryCandidate(image),
        )
      : null;
    const portrait =
      (primaryPortrait && isPrimaryCandidate(primaryPortrait)
        ? primaryPortrait
        : null) || galleryImages?.find((image) => isPrimaryCandidate(image));
    const portraitUuid = portrait ? resolveImageUuid(portrait) : null;
    return (
      primaryPortraitUuid ||
      portraitUuid ||
      portrait?.url ||
      appearance.characterImageUrl ||
      appearance.avatarImageUrl ||
      ""
    );
  }, [
    galleryImages,
    appearance.characterImageUrl,
    appearance.avatarImageUrl,
    primaryPortraitUuid,
  ]);
  const displayCount = displayImages.length;

  return (
    <Tabs defaultValue="visuals" className="w-full space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-center w-full">
        <TabsList className="bg-muted/30 backdrop-blur-md p-1 gap-1 rounded-2xl border border-border/40 h-auto w-full max-w-full overflow-x-auto flex-nowrap scrollbar-hide justify-start sm:justify-center">
          {[
            { value: "visuals", label: appearanceLabel },
            { value: "story", label: backgroundLabel },
            { value: "personality", label: personalityLabel },
            { value: "skills", label: skillsLabel },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-lg hover:text-primary/60 h-auto border-none dark:data-[state=active]:bg-card whitespace-nowrap"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[400px]">
        {/* Tab 1: Visuals & Appearance */}
        <TabsContent value="visuals" className="mt-0 focus-visible:outline-none outline-none">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,680px)_320px] justify-center items-start">
            {/* Left Column: Gallery */}
            <div className="bg-card rounded-3xl border border-border/40 p-4 lg:p-5 shadow-sm h-full flex flex-col overflow-visible">
              <Label className="mb-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3 px-1">
                {visualArchivesLabel
                  .replace("{current}", String(displayCount))
                  .replace("{limit}", String(visualArchiveLimit))}
                <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent"></div>
              </Label>
              <div className="px-1 flex-1">
                <CharacterImageGallery
                  images={displayImages}
                  primaryImageUuid={primaryPortraitUuid || null}
                  onPrimaryChange={onPrimaryPortraitChange}
                  primaryBadgeLabel={primaryBadgeLabel}
                  primaryBadgeTooltip={primaryBadgeTooltip}
                  primarySetLabel={primarySetLabel}
                  primaryDeleteTitle={primaryDeleteTitle}
                  primaryDeleteConfirm={primaryDeleteConfirm}
                  primaryDeleteCancel={primaryDeleteCancel}
                  primaryDeleteAction={primaryDeleteAction}
                  isEditMode={isEditMode}
                  onImagesChange={onGalleryImagesChange}
                  onGenerate={(type) => onGenerateProfileImage?.({ type })}
                  onUpload={onGalleryUpload}
                  onSelectFromArtworks={onGallerySelectFromArtworks}
                  breakdownSheetLabel={breakdownSheetLabel}
                  breakdownSheetHint={breakdownSheetHint}
                  galleryCopy={pageData.gallery}
                />
              </div>
            </div>

            {/* Right Column: Visual Features */}
            <div className="bg-card rounded-3xl border border-border/40 p-4 lg:p-5 shadow-sm h-full">
               <Label className="mb-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                {isEditMode
                  ? pageData.appearance?.visual_matrix || ""
                  : pageData.appearance?.metadata_label || ""}
                <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent"></div>
              </Label>

              <div className="px-1">
                <CharacterVisualSection
                  name={appearance.name}
                  bodyType={appearance.body_type}
                  hairStyle={appearance.hair_style}
                  hairColor={appearance.hair_color}
                  eyeColor={appearance.eye_color}
                  outfitStyle={appearance.outfit_style}
                  artStyle={appearance.art_style}
                  apperanceFeatures={appearance.appearance_features}
                  accessories={appearance.accessories}
                  pageData={pageData}
                  isOwner={isOwner}
                  isEditMode={isEditMode}
                  visualDraft={visualDraft}
                  onVisualDraftChange={onVisualDraftChange}
                  onGenerate={onGenerateProfileImage}
                  hideImage={true}
                  hideTitle={true}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Background Story */}
        <TabsContent value="story" className="mt-0 focus-visible:outline-none outline-none">
          <div className="space-y-6">
             <div className="bg-card rounded-3xl border border-border/50 p-4 lg:p-5 shadow-sm space-y-3 mx-auto w-full max-w-5xl">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                  {overallTitle}
                  <div className="h-px w-12 bg-gradient-to-r from-border/50 to-transparent"></div>
                </h3>

                {isEditMode ? (
                  <Textarea
                    value={backgroundStoryDraft}
                    onChange={(e) => onBackgroundStoryDraftChange?.(e.target.value)}
                    placeholder={overallPlaceholder}
                    className="min-h-[160px] bg-background/20 border-border/40 focus:border-primary/50 transition-all resize-none rounded-2xl text-sm leading-relaxed p-4"
                  />
                ) : (
                  <p className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap font-medium p-1">
                    {background?.background_story || background?.brief_introduction || backgroundStoryEmpty}
                  </p>
                )}
             </div>

             {/* Major Events section */}
             <div className="space-y-2.5 mx-auto w-full max-w-5xl">
               <div className="flex items-center justify-between px-1">
                 <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                   {eventsTitle}
                   <div className="h-px w-12 bg-gradient-to-r from-border/50 to-transparent"></div>
                 </h3>
               </div>

               <div className="flex flex-col gap-2.5">
                 {segments.map((segment, index) => (
                  <EventCard
                    key={segment.id}
                    segment={segment}
                    index={index}
                    isEditMode={isEditMode}
                     deleteEventLabel={deleteEventLabel}
                    eventTitleLabel={eventTitleLabel}
                    eventContentLabel={eventContentLabel}
                    eventTitlePlaceholder={eventTitlePlaceholder}
                    eventContentPlaceholder={eventContentPlaceholder}
                    eventAiGenerateLabel={eventAiGenerateLabel}
                    eventImageUploadLabel={eventImageUploadLabel}
                    eventImageSelectLabel={eventImageSelectLabel}
                    onRemove={() => handleRemoveEvent(index)}
                    onUpdate={(updates) => {
                      const next = [...(backgroundSegmentsDraft ?? viewSegments)];
                      next[index] = { ...next[index], ...updates };
                      onBackgroundSegmentsDraftChange?.(next);
                    }}
                    appearance={appearance}
                    characterUuid={characterUuid}
                    locale={locale}
                    eventVisualGenerationCopy={eventVisualGenerationCopy}
                    referenceSource={eventReferenceSource}
                  />
                ))}

                 {isEditMode && (
                   <button
                     type="button"
                     onClick={handleAddEvent}
                     className="rounded-[2rem] border-2 border-dashed border-border/60 bg-card/20 backdrop-blur-sm p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground/70 hover:text-primary hover:border-primary/50 transition-all min-h-[70px]"
                   >
                     <div className="h-6 w-6 rounded-full border border-dashed border-border/60 flex items-center justify-center">
                       <Plus className="h-4 w-4" />
                     </div>
                     <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                       {addEventLabel}
                     </span>
                   </button>
                 )}
               </div>
             </div>
          </div>
        </TabsContent>

        {/* Tab 3: Personality & Attributes */}
        <TabsContent value="personality" className="mt-0 focus-visible:outline-none outline-none">
          <div className="space-y-6">
            <div className="bg-card rounded-3xl border border-border/50 p-5 lg:p-6 shadow-sm space-y-8">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                    Core Neural Traits
                    <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent"></div>
                  </h3>
                  <p className="text-[10px] text-muted-foreground/70 font-medium px-1">
                    {pageData.sections?.personality_traits_description || ""}
                  </p>
                </div>
                
                {isEditMode && personalityDraft ? (
                  <ListEditor
                    values={personalityDraft.personality_tags || []}
                    onChange={(newTags) => onPersonalityDraftChange?.({ personality_tags: newTags })}
                    placeholder="Add trait..."
                  />
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {(personality?.personality_tags || []).map((tag) => (
                      <Badge key={tag} className="rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 text-[11px] font-bold px-4 py-1.5 transition-all">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Combined Attributes section */}
              <div className="pt-5 border-t border-border/20 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                      Extended Parametrics
                      <div className="h-px w-24 bg-gradient-to-r from-border/50 to-transparent"></div>
                    </h3>
                  <p className="text-[10px] text-muted-foreground/70 font-medium px-1">
                    {pageData.sections?.extended_attributes_description || ""}
                  </p>
                  </div>
                </div>

                {isEditMode ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(extendedAttributesDraft || {}).map(([key, value], index) => (
                        <div key={index} className="flex flex-col gap-1.5 bg-background/40 border border-border/40 p-3 rounded-2xl group relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            onClick={() => {
                              const next = { ...extendedAttributesDraft };
                              delete next[key];
                              onExtendedAttributesDraftChange?.(next);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Input
                            value={key}
                            onChange={(e) => {
                              const newKey = e.target.value;
                              if (newKey === key) return;
                              // Preserve order of keys when renaming
                              const next: Record<string, string> = {};
                              Object.keys(extendedAttributesDraft || {}).forEach(k => {
                                if (k === key) {
                                  next[newKey] = extendedAttributesDraft![key];
                                } else {
                                  next[k] = extendedAttributesDraft![k];
                                }
                              });
                              onExtendedAttributesDraftChange?.(next);
                            }}
                            placeholder="Key"
                            className="h-7 text-[10px] font-black uppercase tracking-wider bg-background/60 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                          />
                          <Input
                            value={value}
                            onChange={(e) => {
                              const next = { ...extendedAttributesDraft };
                              next[key] = e.target.value;
                              onExtendedAttributesDraftChange?.(next);
                            }}
                            placeholder="Value"
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
                          const next = { ...extendedAttributesDraft };
                          const newKey = `attribute_${Object.keys(next).length + 1}`;
                          next[newKey] = "";
                          onExtendedAttributesDraftChange?.(next);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Attribute
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(extendedAttributes || {}).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1 bg-background/20 border border-border/40 p-4 rounded-2xl hover:bg-background/40 transition-all group shadow-sm hover:shadow-md hover:border-primary/30">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover:text-primary transition-colors">{key}</span>
                        <span className="text-sm font-bold text-foreground leading-tight">{value}</span>
                      </div>
                    ))}
                    {!Object.keys(extendedAttributes || {}).length && (
                      <div className="col-span-full py-10 text-center border border-dashed border-border/40 rounded-[2rem] bg-background/5">
                        <span className="text-[10px] text-muted-foreground/50 font-medium italic uppercase tracking-widest">
                          {pageData.sections?.attributes_empty || ""}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Skills & Abilities */}
        <TabsContent value="skills" className="mt-0 focus-visible:outline-none outline-none">
          <SkillsTabContent
            stats={isEditMode ? (skillsDraft?.stats || []) : (skills?.stats || [])}
            abilities={isEditMode ? (skillsDraft?.abilities || []) : (skills?.abilities || [])}
            isEditMode={isEditMode}
            onStatsChange={(stats) => onSkillsDraftChange?.({ ...((isEditMode ? skillsDraft : skills) as any), stats })}
            onAbilitiesChange={(abilities) => onSkillsDraftChange?.({ ...((isEditMode ? skillsDraft : skills) as any), abilities })}
            pageData={pageData}
            themeColor={themeColor}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}

const buildCharacterVisualProfile = (
  appearance?: ModuleDisplayTabsProps["appearance"],
) => {
  if (!appearance) return "";
  const items: Array<[string, string | undefined]> = [
    ["Gender", appearance.gender],
    ["Age", appearance.age !== null && appearance.age !== undefined ? String(appearance.age) : undefined],
    ["Role", appearance.role],
    ["Species", appearance.species],
    ["Body type", appearance.body_type],
    ["Hair style", appearance.hair_style],
    ["Hair color", appearance.hair_color],
    ["Eye color", appearance.eye_color],
    ["Outfit style", appearance.outfit_style],
    ["Art style", appearance.art_style],
    ["Accessories", appearance.accessories?.filter(Boolean).join(", ")],
    ["Features", appearance.appearance_features?.filter(Boolean).join(", ")],
  ];

  const summary = items
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([label, value]) => `${label}: ${value}`)
    .join("; ");

  return summary || "Anime character with a distinct visual identity";
};

const inferTemporalPromptContext = (title: string, content: string) => {
  const text = `${title} ${content}`.toLowerCase();

  const ageMatch = text.match(
    /(?:\bage\s*|\baged\s*|\bat\s+age\s*)(\d{1,2})|(?:\b(\d{1,2})\s*(?:years?\s*old|yo)\b)/,
  );

  const parsedAge = Number(ageMatch?.[1] || ageMatch?.[2]);
  const hasValidAge = Number.isFinite(parsedAge) && parsedAge >= 0;

  let timelinePeriod = "an important life moment";
  let compositionGuidance =
    "Use cinematic composition that supports narrative clarity with varied framing, not a centered portrait-only layout.";

  if (hasValidAge) {
    if (parsedAge <= 12) {
      timelinePeriod = "childhood";
      compositionGuidance =
        "Favor wider environmental framing and supporting characters or props, placing the protagonist off-center when it improves storytelling.";
    } else if (parsedAge <= 18) {
      timelinePeriod = "adolescence";
      compositionGuidance =
        "Use medium-wide framing with motion and social context, avoiding static centered posing.";
    } else if (parsedAge <= 29) {
      timelinePeriod = "early adulthood";
      compositionGuidance =
        "Balance character and environment, using directional composition and scene depth instead of a centered hero shot.";
    } else {
      timelinePeriod = "adulthood";
      compositionGuidance =
        "Use grounded scene composition emphasizing responsibility, relationships, or consequences through contextual staging.";
    }
  } else if (
    /childhood|child|kid|elementary|primary school|first day of school/.test(text)
  ) {
    timelinePeriod = "childhood";
    compositionGuidance =
      "Favor wider environmental framing and supporting characters or props, placing the protagonist off-center when it improves storytelling.";
  } else if (
    /teen|adolescen|high school|academy|coming[- ]of[- ]age/.test(text)
  ) {
    timelinePeriod = "adolescence";
    compositionGuidance =
      "Use medium-wide framing with motion and social context, avoiding static centered posing.";
  } else if (
    /college|university|new job|journey|departure|first mission/.test(text)
  ) {
    timelinePeriod = "early adulthood";
    compositionGuidance =
      "Balance character and environment, using directional composition and scene depth instead of a centered hero shot.";
  } else if (
    /married|marriage|wedding|parent|mentor|commander|leader|veteran/.test(
      text,
    )
  ) {
    timelinePeriod = "adulthood";
    compositionGuidance =
      "Use grounded scene composition emphasizing responsibility, relationships, or consequences through contextual staging.";
  }

  return { timelinePeriod, compositionGuidance };
};

function EventCard({
  segment,
  index,
  isEditMode,
  deleteEventLabel,
  eventTitleLabel,
  eventContentLabel,
  eventTitlePlaceholder,
  eventContentPlaceholder,
  eventAiGenerateLabel,
  eventImageUploadLabel,
  eventImageSelectLabel,
  eventVisualGenerationCopy,
  onRemove,
  onUpdate,
  appearance,
  characterUuid,
  locale,
  referenceSource,
}: {
  segment: { id?: string; title: string; content: string; image_url?: string; image_uuid?: string };
  index: number;
  isEditMode: boolean;
  deleteEventLabel: string;
  eventTitleLabel: string;
  eventContentLabel: string;
  eventTitlePlaceholder: string;
  eventContentPlaceholder: string;
  eventAiGenerateLabel: string;
  eventImageUploadLabel: string;
  eventImageSelectLabel: string;
  eventVisualGenerationCopy?: GeneratorModalCopy;
  onRemove: () => void;
  onUpdate: (updates: Partial<typeof segment>) => void;
  appearance?: ModuleDisplayTabsProps["appearance"];
  characterUuid?: string;
  locale?: string;
  referenceSource?: string;
}) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [results, setResults] = useState<
    GenerationStatusResponse["results"]
  >();
  const [status, setStatus] = useState<GenerationStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { displayUrl: segmentDisplayUrl } = useResolvedImageUrl(
    segment.image_uuid || segment.image_url,
  );

  const characterInfo = useMemo(
    () => buildCharacterVisualProfile(appearance),
    [appearance],
  );

  const { isPolling, error: pollingError } = useGenerationPolling({
    generationId,
    generationType: "anime",
    onCompleted: (completedResults) => {
      setResults(completedResults);
      setStatus((prev) => (prev ? { ...prev, status: "completed" } : prev));
      if (completedResults.length > 0) {
        const primaryResult = completedResults[0];
        onUpdate({
          image_url: primaryResult.image_url || undefined,
          image_uuid: primaryResult.image_uuid || undefined,
        });
      }
      setGenerationId(null);
      setIsStatusOpen(false);
    },
    onFailed: (message) => {
      setError(message);
    },
    onStatusUpdate: (statusUpdate) => {
      setStatus(statusUpdate);
    },
  });

  const statusType: GenerationStatusType = error || pollingError
    ? "failed"
    : isSubmitting
      ? "submitting"
      : isPolling
        ? "polling"
        : results?.length
          ? "completed"
          : "idle";

  const resolveTemplatePrompt = useCallback(
    (template: string, params: Record<string, string>) => {
      const missingKeys = new Set<string>();
      const resolved = template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
        const rawValue = params[key];
        if (!rawValue || rawValue.trim().length === 0) {
          missingKeys.add(key);
          return "";
        }
        return rawValue.trim();
      });
      return { prompt: resolved, missingKeys: Array.from(missingKeys) };
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    setError(null);
    setResults(undefined);
    setStatus(null);
    setGenerationId(null);
    setIsStatusOpen(true);

    const errors = eventVisualGenerationCopy?.errors;
    const trimmedTitle = segment.title.trim();
    const trimmedContent = segment.content.trim();
    const promptTemplate = ocEventsPrompt?.prompt;
    const { timelinePeriod, compositionGuidance } = inferTemporalPromptContext(
      trimmedTitle,
      trimmedContent,
    );

    if (!trimmedTitle) {
      setError(errors?.missingEventTitle || errors?.requestFailed || null);
      return;
    }
    if (!trimmedContent) {
      setError(errors?.missingEventContent || errors?.requestFailed || null);
      return;
    }
    if (!promptTemplate) {
      setError(errors?.missingTemplate || errors?.requestFailed || null);
      return;
    }

    const { prompt, missingKeys } = resolveTemplatePrompt(promptTemplate, {
      eventTitle: trimmedTitle,
      eventContent: trimmedContent,
      characterInfo,
      locale: locale || "en",
      timelinePeriod,
      compositionGuidance,
    });

    if (missingKeys.length > 0) {
      const baseMessage = errors?.missingTemplateParams || errors?.requestFailed;
      setError(baseMessage ? `${baseMessage}: ${missingKeys.join(", ")}` : null);
      return;
    }

    const characterUuids = characterUuid ? [characterUuid] : undefined;
    let referenceImageUrls: string[] | undefined;

    if (referenceSource && referenceSource.trim()) {
      const resolvedReference = await resolveImageReference(referenceSource);
      const referenceUrl =
        resolvedReference?.originalUrl || resolvedReference?.resolvedUrl || "";
      if (referenceUrl) {
        referenceImageUrls = [referenceUrl];
      }
    }

    const payload = {
      gen_type: "oc_events",
      prompt,
      model_uuid: "google/nano-banana",
      batch_size: 1,
      aspect_ratio: "16:9",
      image_resolution: "16:9",
      visibility_level: "public",
      character_uuids: characterUuids,
      reference_image_urls: referenceImageUrls,
    };

    console.info("[MajorEventGeneration] create-task payload", payload);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/anime-generation/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.error || errors?.requestFailed || null);
        return;
      }

      const data = await response.json();
      if (!data?.success || !data?.data?.generation_uuid) {
        setError(data?.error || errors?.requestFailed || null);
        return;
      }

      setGenerationId(data.data.generation_uuid);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : eventVisualGenerationCopy?.errors?.requestFailed || null
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    characterInfo,
    characterUuid,
    eventVisualGenerationCopy?.errors,
    locale,
    resolveTemplatePrompt,
    referenceSource,
    segment.content,
    segment.title,
  ]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "oc-art");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        onUpdate({ image_url: data.url, image_uuid: undefined });
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-border/40 p-4 lg:p-5 space-y-2 group hover:border-primary/30 transition-all relative overflow-hidden">
      {isEditMode && (
        <div className="absolute right-3 top-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/50 hover:bg-background/80 backdrop-blur-md">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
                {deleteEventLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 space-y-3">
          {isEditMode ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                  {eventTitleLabel}
                </Label>
                <Input
                  value={segment.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  className="h-10 bg-background/40 border-border/40 rounded-2xl text-sm font-bold focus-visible:ring-1 focus-visible:ring-primary/50"
                  placeholder={eventTitlePlaceholder}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                  {eventContentLabel}
                </Label>
                <Textarea
                  value={segment.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  className="min-h-[100px] bg-background/40 border-border/40 rounded-2xl text-sm resize-none focus-visible:ring-1 focus-visible:ring-primary/50 leading-relaxed p-4"
                  placeholder={eventContentPlaceholder}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <h4 className="text-lg font-bold text-primary/90 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {segment.title}
              </h4>
              <p className="text-[13px] text-muted-foreground leading-relaxed pl-4 border-l-2 border-primary/10 font-medium">
                {segment.content}
              </p>
            </div>
          )}
        </div>

        {(segment.image_url || segment.image_uuid || isEditMode) && (
          <div className="lg:w-[40%] shrink-0">
            <div 
              className={cn(
                "relative aspect-video rounded-2xl overflow-hidden border border-border/40 bg-background/20 group/img transition-all",
                isEditMode && "cursor-default"
              )}
            >
              {segmentDisplayUrl ? (
                <img
                  src={segmentDisplayUrl}
                  alt={segment.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                />
              ) : isEditMode ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                  <Plus className="h-6 w-6" />
                </div>
              ) : null}

              {isEditMode && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          className="h-9 w-9 rounded-xl shadow-xl hover:scale-110 transition-transform bg-white text-black hover:bg-white/90 border-0"
                          onClick={handleGenerate}
                          disabled={isSubmitting || isPolling}
                        >
                          {isSubmitting || isPolling ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {eventAiGenerateLabel}
                        </span>
                        <div className="flex items-center gap-1 px-1">
                          <img src={getCreamyCharacterUrl("meow_coin")} className="w-3 h-3" alt="" />
                          <span className="text-[10px] font-black text-white">30</span>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Button 
                            size="icon" 
                            className="h-9 w-9 rounded-xl shadow-xl hover:scale-110 transition-transform bg-white text-black hover:bg-white/90 border-0"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            {isUploading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>{eventImageUploadLabel}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            className="h-9 w-9 rounded-xl shadow-xl hover:scale-110 transition-transform bg-white text-black hover:bg-white/90 border-0"
                            onClick={() => setIsGalleryOpen(true)}
                          >
                            <ImagesIcon className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>{eventImageSelectLabel}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        )}
      </div>

      <ArtworkGalleryDialog
        open={isGalleryOpen}
        onOpenChange={setIsGalleryOpen}
        onConfirm={(urls) => {
          if (urls.length > 0) {
            onUpdate({ image_url: urls[0], image_uuid: undefined });
            setIsGalleryOpen(false);
          }
        }}
        maxSelect={1}
      />
      <GenerationStatusModal
        open={isStatusOpen}
        onOpenChange={setIsStatusOpen}
        status={statusType}
        message={status?.message}
        error={pollingError || error}
        previewUrl={results?.[0]?.image_url}
      />
    </div>
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
    <div className="flex flex-wrap gap-3 items-center">
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
          <Plus className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
