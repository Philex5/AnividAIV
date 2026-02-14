"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Edit, Eye, EyeOff, Share2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LinkingComponent } from "@/components/ui/linking";
import { characterDetailConfig } from "@/components/ui/linking.config";
import type { CharacterDetailPage } from "@/types/pages/landing";
import type { CharacterModules } from "@/types/oc";
import { BackgroundCustomizer } from "./BackgroundCustomizer";
import { CharacterHeader } from "./CharacterHeader";
import { ModuleDisplayTabs } from "./ModuleDisplayTabs";
import { ActionBar } from "./ActionBar";
import { OCCreations } from "./OCCreations";
import { OCRecommendation } from "./OCRecommendation";
import { CommentSection } from "@/components/community/comment/CommentSection";
import { WorldSelector } from "./WorldSelector";
import { WorldThemeProvider, WorldTheme } from "@/contexts/WorldContext";
import { ShareCardDialog } from "./ShareCardDialog";
import { TagEditor } from "./TagEditor";
import { useCharacterGeneration } from "@/hooks/useCharacterGeneration";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";
import {
  useGenerationPolling,
  type GenerationStatusResponse,
  type GenerationType,
} from "@/hooks/useGenerationPolling";
import {
  GenerationStatusModal,
  type GenerationStatusType,
} from "@/components/generation/GenerationStatusModal";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { CharacterCreationWizard } from "./CharacterCreationWizard";
import { ArtworkGalleryDialog } from "@/components/anime-generator/ArtworkGalleryDialog";
import type { ImageItem } from "./CharacterImageGallery";
import type { ArtworkListItem } from "@/types/pages/my-artworks";
import type { CharacterCreationItem } from "@/services/character-creations";
import breakdownSheetPromptConfig from "@/configs/prompts/ocs/breakdown_sheet.json";
import { resolvePromptTemplate } from "@/lib/prompt-template";
import { motion, AnimatePresence } from "framer-motion";
import { isImageUuid } from "@/lib/image-resolve";

interface SerializedCharacter {
  uuid: string;
  name: string;
  gender: string;
  species?: string | null;
  role?: string | null;
  age?: number | null;
  brief_introduction?: string | null;
  personality_tags?: string[] | null;
  tags?: string[] | null;
  like_count?: number | null;
  favorite_count?: number | null;
  comment_count?: number | null;
  visibility_level: string;
  world_uuid?: string | null;
  background_url?: string | null;
  avatar_generation_image_uuid?: string | null;
  profile_generation_image_uuid?: string | null;
  remixed_from_uuid?: string | null;
}

interface Serializedworld {
  id: number;
  uuid: string;
  name: string;
  theme_colors?: Record<string, string> | null;
  cover_url?: string | null;
}

interface SerializedCreator {
  uuid: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface CharacterDetailClientProps {
  character: SerializedCharacter;
  modules: CharacterModules;
  pageData: CharacterDetailPage;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  creator?: SerializedCreator | null;
  isOwner: boolean;
  isSub?: boolean;
  userHasLiked: boolean;
  userHasFavorited: boolean;
  locale: string;
  world?: Serializedworld | null;
  initialCreationsByType?: Record<string, CharacterCreationItem[]>;
}

interface GenerationCharacterDataOverride {
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
}

export function CharacterDetailClient({
  character,
  modules,
  pageData,
  avatarUrl,
  profileImageUrl,
  creator,
  isOwner,
  isSub = false,
  userHasLiked,
  userHasFavorited,
  locale,
  world,
  initialCreationsByType,
}: CharacterDetailClientProps) {
  const visualArchiveLimit = 10;
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const mode = searchParams?.get("mode");
  const isEditMode = isOwner && mode === "edit";
  const isCreateMode = isOwner && mode === "create";
  const normalizeGenderValue = (
    value?: string | null,
  ): "male" | "female" | "other" | undefined => {
    const normalized = (value || "").toLowerCase().trim();
    if (normalized === "male" || normalized === "female" || normalized === "other") {
      return normalized as "male" | "female" | "other";
    }
    return undefined;
  };

  const { triggerAvatarGeneration, triggerBackgroundGeneration } =
    useCharacterGeneration();

  const breakdownSheetLabel = pageData.gallery?.breakdown_sheet_label || "";
  const operationFailedMessage =
    pageData.action_bar?.errors?.operation_failed || "";
  const galleryCopy = pageData.gallery;
  const uploadLabel = galleryCopy?.upload_label;

  // --- 1. Hooks & Memo declarations ---
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [isGalleryDialogOpen, setIsGalleryDialogOpen] = useState(false);
  const [gallerySelectionType, setGallerySelectionType] = useState<
    "gallery" | "avatar"
  >("gallery");
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(
    null,
  );
  const [activeGenerationMode, setActiveGenerationMode] = useState<
    "avatar" | "full_body" | "design_sheet" | "background" | null
  >(null);
  const [isGenerationStatusOpen, setIsGenerationStatusOpen] = useState(false);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatusResponse | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationResults, setGenerationResults] =
    useState<GenerationStatusResponse["results"]>();
  const [isGenerationSubmitting, setIsGenerationSubmitting] = useState(false);
  const [isApplyingResult, setIsApplyingResult] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(() =>
    resolveCropImageUrl(profileImageUrl),
  );
  const [isPreparingCropImage, setIsPreparingCropImage] = useState(false);

  const [isPublic, setIsPublic] = useState(
    character.visibility_level === "public",
  );
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(false);

  const [galleryImages, setGalleryImages] = useState<ImageItem[]>(() => {
    const moduleGallery = normalizeGalleryImages(modules.art?.gallery);
    if (moduleGallery.length) return moduleGallery;
    if (profileImageUrl) {
      const fallbackUuid = character.profile_generation_image_uuid || null;
      return [
        {
          id: fallbackUuid || "initial-portrait",
          url: fallbackUuid || profileImageUrl,
          type: "generation",
          meta: fallbackUuid ? { image_uuid: fallbackUuid } : undefined,
        },
      ];
    }
    return [];
  });
  const [primaryPortraitUuid, setPrimaryPortraitUuid] = useState<string | null>(
    character.profile_generation_image_uuid ?? null,
  );

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(
    character.background_url ?? null,
  );
  const effectivePrimaryPortraitUuid = useMemo(
    () =>
      resolvePrimaryPortraitUuid({
        images: galleryImages,
        currentPrimaryUuid: primaryPortraitUuid,
      }),
    [galleryImages, primaryPortraitUuid],
  );
  const { displayUrl: resolvedPrimaryDisplayUrl } = useResolvedImageUrl(
    effectivePrimaryPortraitUuid,
  );
  const { displayUrl: avatarDisplayUrl } = useResolvedImageUrl(avatarUrl);
  const effectivePrimaryPortraitUrl = useMemo(() => {
    if (effectivePrimaryPortraitUuid) {
      return resolvedPrimaryDisplayUrl || null;
    }
    return profileImageUrl ?? null;
  }, [
    effectivePrimaryPortraitUuid,
    profileImageUrl,
    resolvedPrimaryDisplayUrl,
  ]);
  const [themeColor, setThemeColor] = useState<string | null>(
    modules.appearance?.theme_color ?? null,
  );

  const [currentWorld, setCurrentworld] = useState(() => ({
    uuid: world?.uuid ?? character.world_uuid ?? null,
    name: world?.name ?? null,
    theme: extractTheme(world),
    cover_url: (world as any)?.cover_url ?? null,
  }));

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTheme, setTransitionTheme] = useState<WorldTheme | null>(
    null,
  );
  const [transitionBackground, setTransitionBackground] = useState<
    string | null
  >(null);

  // Memoize theme values to prevent unnecessary re-renders
  const currentWorldTheme = useMemo(() => currentWorld.theme, [currentWorld]);
  const currentWorldCoverUrl = useMemo(
    () => currentWorld.cover_url,
    [currentWorld],
  );
  const { displayUrl: worldCoverDisplayUrl } =
    useResolvedImageUrl(currentWorldCoverUrl);

  useEffect(() => {
    if (!currentWorldCoverUrl) return;
    console.info("World cover display url:", worldCoverDisplayUrl || "");
  }, [currentWorldCoverUrl, worldCoverDisplayUrl]);

  const mergedTheme = useMemo(() => {
    if (!themeColor) return currentWorldTheme;
    return {
      ...currentWorldTheme,
      primary: themeColor,
    } as WorldTheme;
  }, [currentWorldTheme, themeColor]);

  const displayBackgroundUrl = useMemo(() => {
    return backgroundUrl || null;
  }, [backgroundUrl]);

  const [isShareOpen, setShareOpen] = useState(false);
  const [currentTags, setCurrentTags] = useState<string[]>(
    character.tags || [],
  );
  const primaryPortraitInitializedRef = useRef(false);

  // Stabilize character and modules references using deep comparison
  const prevCharacterRef = useRef(character);
  const stableCharacter = useMemo(() => {
    const charStr = JSON.stringify(character);
    const prevCharStr = JSON.stringify(prevCharacterRef.current);
    if (charStr !== prevCharStr) {
      prevCharacterRef.current = character;
      return character;
    }
    return prevCharacterRef.current;
  }, [character]);

  const prevModulesRef = useRef(modules);
  const stableModules = useMemo(() => {
    const modulesStr = JSON.stringify(modules);
    const prevModulesStr = JSON.stringify(prevModulesRef.current);
    if (modulesStr !== prevModulesStr) {
      prevModulesRef.current = modules;
      return modules;
    }
    return prevModulesRef.current;
  }, [modules]);

  const extendedAttributesSource =
    stableModules.personality?.extended_attributes;
  const extendedAttributes = useMemo(
    () => normalizeExtendedAttributes(extendedAttributesSource),
    [extendedAttributesSource],
  );

  const appearanceData = useMemo(() => {
    const appearanceModule = stableModules.appearance || {};
    const artModule = stableModules.art || {};
    const featuresRaw = Array.isArray(appearanceModule.appearance_features)
      ? appearanceModule.appearance_features
      : undefined;

    const features = featuresRaw?.filter(Boolean);

    return {
      name: appearanceModule.name || stableCharacter.name,
      gender: appearanceModule.gender || stableCharacter.gender,
      age:
        appearanceModule.age ??
        (typeof stableCharacter.age === "number" ? stableCharacter.age : null),
      role: appearanceModule.role || stableCharacter.role || undefined,
      species: appearanceModule.species || stableCharacter.species || undefined,
      body_type: appearanceModule.body_type || undefined,
      hair_style: appearanceModule.hair_style || undefined,
      hair_color: appearanceModule.hair_color || undefined,
      eye_color: appearanceModule.eye_color || undefined,
      outfit_style: appearanceModule.outfit_style || undefined,
      art_style: artModule.fullbody_style || undefined,
      accessories: appearanceModule.accessories || undefined,
      appearance_features: features,
      characterImageUrl: effectivePrimaryPortraitUrl || null,
      avatarImageUrl: avatarDisplayUrl || null,
      theme_color: appearanceModule.theme_color || null,
    };
  }, [
    avatarDisplayUrl,
    effectivePrimaryPortraitUrl,
    stableCharacter,
    stableModules.appearance,
    stableModules.art,
  ]);

  const personalityData = useMemo(() => {
    const moduleTags = Array.isArray(
      stableModules.personality?.personality_tags,
    )
      ? stableModules.personality?.personality_tags
      : [];
    const pTags =
      moduleTags.length > 0
        ? moduleTags
        : Array.isArray(stableCharacter.personality_tags)
          ? stableCharacter.personality_tags
          : [];
    const greeting = Array.isArray(stableModules.personality?.greeting)
      ? stableModules.personality.greeting[0] || stableCharacter.brief_introduction || undefined
      : (stableModules.personality?.greeting || stableCharacter.brief_introduction || undefined);
    const quotes = stableModules.personality?.quotes || [];
    return {
      personality_tags: pTags,
      greeting,
      quotes,
    };
  }, [
    stableCharacter.personality_tags,
    stableCharacter.brief_introduction,
    stableModules.personality,
  ]);

  const backgroundData = useMemo(() => {
    return {
      brief_introduction:
        stableModules.background?.brief_introduction ||
        stableCharacter.brief_introduction ||
        undefined,
      background_story: stableModules.background?.background_story || undefined,
      background_segments: normalizeBackgroundSegmentsDraft(
        stableModules.background?.background_segments,
      ),
    };
  }, [stableCharacter.brief_introduction, stableModules.background]);

  const skillsData = useMemo(() => {
    return {
      stats: stableModules.skills?.stats || [],
      abilities: stableModules.skills?.abilities || [],
    };
  }, [stableModules.skills]);

  const [basicDraft, setBasicDraft] = useState(() => ({
    name: appearanceData.name,
    gender: appearanceData.gender || "other",
    species: appearanceData.species || "",
    role: appearanceData.role || "",
    age: appearanceData.age ?? null,
    greeting: personalityData.greeting || "",
  }));
  const [isSavingBasic, setIsSavingBasic] = useState(false);

  const [backgroundStoryDraft, setBackgroundStoryDraft] = useState(
    backgroundData.background_story || backgroundData.brief_introduction || "",
  );
  const [isSavingBackgroundStory, setIsSavingBackgroundStory] = useState(false);

  const [backgroundSegmentsDraft, setBackgroundSegmentsDraft] = useState(() =>
    normalizeBackgroundSegmentsDraft(backgroundData.background_segments),
  );
  const [isSavingBackgroundSegments, setIsSavingBackgroundSegments] =
    useState(false);

  const [personalityDraft, setPersonalityDraft] = useState(() => ({
    personality_tags: personalityData.personality_tags,
    quotes: personalityData.quotes,
  }));
  const [extendedAttributesDraft, setExtendedAttributesDraft] = useState<
    Record<string, string>
  >(() => extendedAttributes || {});
  const [isSavingPersonality, setIsSavingPersonality] = useState(false);
  const [isSavingVisuals, setIsSavingVisuals] = useState(false);
  const [isSavingExtendedAttributes, setIsSavingExtendedAttributes] =
    useState(false);
  const [isSavingSkills, setIsSavingSkills] = useState(false);

  const [visualDraft, setVisualDraft] = useState(() => ({
    body_type: appearanceData.body_type || "",
    hair_style: appearanceData.hair_style || "",
    hair_color: appearanceData.hair_color || "",
    eye_color: appearanceData.eye_color || "",
    outfit_style: appearanceData.outfit_style || "",
    art_style: appearanceData.art_style || "anime",
    appearance_features: appearanceData.appearance_features || [],
    accessories: appearanceData.accessories || [],
  }));

  const [skillsDraft, setSkillsDraft] = useState(() => ({
    stats: skillsData.stats,
    abilities: skillsData.abilities,
  }));

  const isSavingRef = useRef<boolean>(false);
  const prevCharacterUuidRef = useRef(character.uuid);
  const activeGenerationModeRef = useRef<
    "avatar" | "full_body" | "design_sheet" | "background" | null
  >(null);
  const forcedGenerationModeRef = useRef<
    "avatar" | "full_body" | "design_sheet" | "background" | null
  >(null);
  const activeGenerationIdRef = useRef<string | null>(null);
  const appliedGenerationRef = useRef<string | null>(null);
  const autoAvatarTriggeredGenerationRef = useRef<string | null>(null);

  // Memoize the appearance object passed to ModuleDisplayTabs to prevent unnecessary re-renders
  const moduleAppearanceData = useMemo(
    () => ({
      ...appearanceData,
      name: isEditMode ? basicDraft.name : appearanceData.name,
      gender: isEditMode ? basicDraft.gender : appearanceData.gender,
      species: isEditMode ? basicDraft.species : appearanceData.species,
      role: isEditMode ? basicDraft.role : appearanceData.role,
      age: isEditMode ? basicDraft.age : appearanceData.age,
      body_type: isEditMode ? visualDraft.body_type : appearanceData.body_type,
      hair_style: isEditMode
        ? visualDraft.hair_style
        : appearanceData.hair_style,
      hair_color: isEditMode
        ? visualDraft.hair_color
        : appearanceData.hair_color,
      eye_color: isEditMode ? visualDraft.eye_color : appearanceData.eye_color,
      outfit_style: isEditMode
        ? visualDraft.outfit_style
        : appearanceData.outfit_style,
      accessories: isEditMode
        ? visualDraft.accessories
        : appearanceData.accessories,
      appearance_features: isEditMode
        ? visualDraft.appearance_features
        : appearanceData.appearance_features,
    }),
    [appearanceData, isEditMode, basicDraft, visualDraft],
  );

  const normalizedAppearanceForPrompt = useMemo(() => {
    return {
      ...moduleAppearanceData,
      gender: normalizeGenderValue(moduleAppearanceData.gender),
      theme_color: moduleAppearanceData.theme_color ?? undefined,
    };
  }, [moduleAppearanceData, normalizeGenderValue]);

  const promptModules = useMemo<CharacterModules>(
    () => ({
      ...modules,
      appearance: {
        ...(modules.appearance ?? {}),
        ...normalizedAppearanceForPrompt,
        age: moduleAppearanceData.age ?? undefined,
      },
      background: {
        ...(modules.background ?? {}),
        brief_introduction:
          (Array.isArray(basicDraft.greeting) ? basicDraft.greeting[0] : basicDraft.greeting) ||
          modules.background?.brief_introduction,
        background_story:
          backgroundStoryDraft || modules.background?.background_story,
      },
      art: {
        ...(modules.art ?? {}),
        fullbody_style:
          visualDraft.art_style || modules.art?.fullbody_style || undefined,
      },
    }),
    [
      modules,
      moduleAppearanceData,
      basicDraft.greeting,
      backgroundStoryDraft,
      visualDraft.art_style,
      normalizedAppearanceForPrompt,
    ],
  );

  const pollingGenerationType: GenerationType = useMemo(() => {
    if (activeGenerationMode === "avatar") return "avatar";
    if (activeGenerationMode === "background") return "background";
    if (activeGenerationMode === "full_body") return "character";
    return "anime";
  }, [activeGenerationMode]);

  const resetGenerationState = useCallback(() => {
    setIsGenerationStatusOpen(false);
    setActiveGenerationId(null);
    activeGenerationIdRef.current = null;
    setActiveGenerationMode(null);
    activeGenerationModeRef.current = null;
    forcedGenerationModeRef.current = null;
    setGenerationStatus(null);
    setGenerationError(null);
    setGenerationResults(undefined);
    setIsGenerationSubmitting(false);
    setIsApplyingResult(false);
    appliedGenerationRef.current = null;
  }, []);

  const applyGenerationResult = useCallback(
    async (
      result: NonNullable<GenerationStatusResponse["results"]>[number],
      mode: "avatar" | "full_body" | "design_sheet" | "background",
    ) => {
      const resolvedImageRef = result.image_uuid || result.image_url;
      if (!resolvedImageRef) {
        throw new Error(operationFailedMessage);
      }

      const limitReachedMessage = pageData.gallery?.limit_reached
        ? pageData.gallery.limit_reached.replace(
            "{limit}",
            String(visualArchiveLimit),
          )
        : "";
      const notifyLimitReached = () => {
        if (limitReachedMessage) toast.warning(limitReachedMessage);
      };

      const payload: Record<string, unknown> = {};
      let nextGallery = [...galleryImages];

      // Define variables in outer scope for use in later conditions
      let resolvedImageUuid: string | undefined;
      let hasValidImageUuid = false;

      if (mode === "avatar") {
        if (!result.image_uuid) {
          throw new Error(operationFailedMessage);
        }
        payload.avatar_generation_image_uuid = result.image_uuid;
      } else if (mode === "background") {
        payload.background_url = resolvedImageRef;
      } else {
        const isBreakdownSheet = mode === "design_sheet";
        const imageUuid = result.image_uuid || null;

        // Debug logging to track image_uuid
        console.log('[applyGenerationResult] Processing image generation:', {
          mode,
          isBreakdownSheet,
          imageUuid,
          resultKeys: Object.keys(result),
          result,
        });

        // Handle cases where image_uuid might be missing but result has an id
        resolvedImageUuid = imageUuid || (result as any).id || (result as any).image_url;
        hasValidImageUuid = !!resolvedImageUuid && typeof resolvedImageUuid === 'string' && resolvedImageUuid.length > 0;

        console.log('[applyGenerationResult] Resolved image_uuid:', {
          originalImageUuid: imageUuid,
          resolvedImageUuid,
          hasValidImageUuid,
        });

        const newItem: ImageItem = {
          id: resolvedImageUuid || crypto.randomUUID(),
          url: resolvedImageUuid || resolvedImageRef,
          type: isBreakdownSheet ? "design_sheet" : "generation",
          label: isBreakdownSheet ? breakdownSheetLabel : undefined,
          meta: resolvedImageUuid ? { image_uuid: resolvedImageUuid } : undefined,
        };
        if (nextGallery.length >= visualArchiveLimit) {
          notifyLimitReached();
          return false;
        }
        const shouldSetPrimary =
          !isBreakdownSheet &&
          hasValidImageUuid &&
          (!effectivePrimaryPortraitUuid || isCreateMode);  // In create mode, always set primary

        console.log('[applyGenerationResult] shouldSetPrimary check:', {
          isBreakdownSheet,
          hasImageUuid: !!result.image_uuid,
          imageUuidValue: result.image_uuid,
          resolvedImageUuid,
          hasValidImageUuid,
          effectivePrimaryPortraitUuid,
          isCreateMode,
          shouldSetPrimary,
        });

        if (shouldSetPrimary) {
          payload.profile_generation_image_uuid = resolvedImageUuid;
          console.log('[applyGenerationResult] Set profile_generation_image_uuid:', resolvedImageUuid);
        } else {
          console.warn('[applyGenerationResult] Skipping profile_generation_image_uuid update:', {
            isBreakdownSheet,
            hasImageUuid: !!result.image_uuid,
            imageUuidValue: result.image_uuid,
            effectivePrimaryPortraitUuid,
            isCreateMode,
          });
        }
        nextGallery = [...nextGallery, newItem];
        payload.modules = {
          art: { gallery: buildGalleryPayload(nextGallery) },
        };

        // Debug logging for payload
        console.log('[applyGenerationResult] Sending PUT request:', {
          mode,
          shouldSetPrimary,
          hasProfileImageUuid: !!payload.profile_generation_image_uuid,
          profileImageUuidValue: payload.profile_generation_image_uuid,
          payloadKeys: Object.keys(payload),
        });
      }

      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(operationFailedMessage);
      }

      if (mode === "background") {
        setBackgroundUrl(resolvedImageRef);
      }
      if (mode === "full_body" || mode === "design_sheet") {
        setGalleryImages(nextGallery);
        if (
          mode === "full_body" &&
          hasValidImageUuid &&
          (!effectivePrimaryPortraitUuid || isCreateMode)
        ) {
          setPrimaryPortraitUuid(resolvedImageUuid ?? null);
        }
      }
      router.refresh();
      return true;
    },
    [
      breakdownSheetLabel,
      character.uuid,
      galleryImages,
      effectivePrimaryPortraitUuid,
      isCreateMode,
      operationFailedMessage,
      pageData.gallery?.limit_reached,
      router,
      visualArchiveLimit,
    ],
  );

  const handleGenerationCompleted = useCallback(
    async (results: GenerationStatusResponse["results"]) => {
      setGenerationResults(results);
      if (!results || results.length === 0) {
        setGenerationError(operationFailedMessage);
        return;
      }
      const mode =
        forcedGenerationModeRef.current || activeGenerationModeRef.current;
      const generationId = activeGenerationIdRef.current;
      if (!mode || !generationId) return;
      if (appliedGenerationRef.current === generationId) return;
      appliedGenerationRef.current = generationId;

      // Debug logging
      console.log('[handleGenerationCompleted] Processing generation result:', {
        resultsCount: results.length,
        firstResult: results[0],
        mode,
        generationId,
        isCreateMode,
      });

      // Set applying state to keep loading animation active
      setIsApplyingResult(true);

      try {
        const applied = await applyGenerationResult(results[0], mode);
        if (applied !== false) {
          if (mode === "full_body" && isCreateMode && generationId) {
            const shouldAutoTrigger =
              autoAvatarTriggeredGenerationRef.current !== generationId;
            if (shouldAutoTrigger) {
              autoAvatarTriggeredGenerationRef.current = generationId;
              const generatedImageUuid =
                typeof results[0]?.image_uuid === "string"
                  ? results[0].image_uuid
                  : null;
              const autoReferenceUrl = generatedImageUuid
                ? await resolveGenerationImageUrl(generatedImageUuid)
                : null;
              resetGenerationState();
              if (autoReferenceUrl) {
                await startAvatarGeneration(autoReferenceUrl);
              }
              return;
            }
          }
          resetGenerationState();
          return;
        }
        resetGenerationState();
      } catch (error) {
        setGenerationError(
          error instanceof Error ? error.message : operationFailedMessage,
        );
      } finally {
        setIsApplyingResult(false);
      }
    },
    [
      applyGenerationResult,
      isCreateMode,
      operationFailedMessage,
      resetGenerationState,
      startAvatarGeneration,
    ],
  );

  const { isPolling: isGenerationPolling, error: generationPollingError } =
    useGenerationPolling({
      generationId: activeGenerationId,
      generationType: pollingGenerationType,
      onCompleted: handleGenerationCompleted,
      onFailed: (message) => setGenerationError(message),
      onStatusUpdate: (statusUpdate) => {
        setGenerationStatus(statusUpdate);
      },
    });

  const generationStatusType: GenerationStatusType =
    generationError || generationPollingError
      ? "failed"
      : isGenerationSubmitting
        ? "submitting"
        : isGenerationPolling
          ? "polling"
          : generationResults?.length
            ? "completed"
            : "idle";

  const isPortraitGenerating =
    (activeGenerationMode === "full_body" ||
      activeGenerationMode === "design_sheet") &&
    (isGenerationSubmitting || isGenerationPolling || isApplyingResult);
  const isGeneratingProfile = isPortraitGenerating;

  // --- 2. Function declarations ---

  const handleSaveBasic = useCallback(async () => {
    try {
      isSavingRef.current = true;
      const trimmedName = basicDraft.name.trim();
      if (!trimmedName)
        throw new Error(pageData.action_bar?.errors?.name_required || "");

      const parsedAge = basicDraft.age;
      if (
        parsedAge !== null &&
        (!Number.isFinite(parsedAge) ||
          !Number.isInteger(parsedAge) ||
          parsedAge <= 0 ||
          parsedAge > 999999)
      ) {
        throw new Error(pageData.action_bar?.errors?.age_invalid || "");
      }

      setIsSavingBasic(true);
      const payload = {
        name: trimmedName,
        gender: basicDraft.gender,
        age: parsedAge,
        role: basicDraft.role || null,
        species: basicDraft.species || null,
        brief_introduction: (Array.isArray(basicDraft.greeting) ? basicDraft.greeting[0] : basicDraft.greeting) || null,
        modules: {
          appearance: {
            name: trimmedName,
            gender: basicDraft.gender,
            age: parsedAge,
            role: basicDraft.role || undefined,
            species: basicDraft.species || undefined,
          },
          personality: { greeting: Array.isArray(basicDraft.greeting) ? basicDraft.greeting : (basicDraft.greeting ? [basicDraft.greeting] : undefined) },
          background: { brief_introduction: (Array.isArray(basicDraft.greeting) ? basicDraft.greeting[0] : basicDraft.greeting) || undefined },
        },
      };

      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.code !== 0)
        throw new Error(
          json?.message || pageData.action_bar?.errors?.update_failed || "",
        );
    } catch (error) {
      console.error("Failed to save basic info", error);
      toast.error(
        error instanceof Error
          ? error.message
          : pageData.action_bar?.errors?.update_failed || "",
      );
    } finally {
      setIsSavingBasic(false);
      isSavingRef.current = false;
    }
  }, [basicDraft, character.uuid]);

  const handleSaveVisuals = useCallback(async () => {
    try {
      isSavingRef.current = true;
      setIsSavingVisuals(true);
      const payload = {
        modules: {
          art: { fullbody_style: visualDraft.art_style || undefined },
          appearance: {
            body_type: visualDraft.body_type || undefined,
            hair_style: visualDraft.hair_style || undefined,
            hair_color: visualDraft.hair_color || undefined,
            eye_color: visualDraft.eye_color || undefined,
            outfit_style: visualDraft.outfit_style || undefined,
            appearance_features: visualDraft.appearance_features,
            accessories: visualDraft.accessories,
          },
        },
      };

      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.code !== 0)
        throw new Error(
          json?.message || pageData.action_bar?.errors?.update_failed || "",
        );
    } catch (error) {
      console.error("Failed to save visual info", error);
      toast.error(
        error instanceof Error
          ? error.message
          : pageData.action_bar?.errors?.update_failed || "",
      );
    } finally {
      setIsSavingVisuals(false);
      isSavingRef.current = false;
    }
  }, [visualDraft, character.uuid]);

  const handleSaveBackgroundStory = useCallback(async () => {
    try {
      isSavingRef.current = true;
      setIsSavingBackgroundStory(true);
      const nextStory = backgroundStoryDraft.trim();
      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modules: {
              background: { background_story: nextStory || undefined },
            },
          }),
        },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.code !== 0)
        throw new Error(
          json?.message || pageData.action_bar?.errors?.update_failed || "",
        );
    } catch (error) {
      console.error("Failed to save background story", error);
      toast.error(
        error instanceof Error
          ? error.message
          : pageData.action_bar?.errors?.update_failed || "",
      );
    } finally {
      setIsSavingBackgroundStory(false);
      isSavingRef.current = false;
    }
  }, [backgroundStoryDraft, character.uuid]);

  const handleSaveBackgroundSegments = useCallback(async () => {
    try {
      isSavingRef.current = true;
      setIsSavingBackgroundSegments(true);
      const nextSegments = backgroundSegmentsDraft
        .map((segment) => ({
          id: segment.id,
          title: segment.title.trim(),
          content: segment.content.trim(),
          image_url: segment.image_url,
          image_uuid: segment.image_uuid,
        }))
        .filter((segment) => segment.title.length || segment.content.length);

      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modules: { background: { background_segments: nextSegments } },
          }),
        },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.code !== 0)
        throw new Error(
          json?.message || pageData.action_bar?.errors?.update_failed || "",
        );
    } catch (error) {
      console.error("Failed to save background segments", error);
      toast.error(
        error instanceof Error
          ? error.message
          : pageData.action_bar?.errors?.update_failed || "",
      );
    } finally {
      setIsSavingBackgroundSegments(false);
      isSavingRef.current = false;
    }
  }, [backgroundSegmentsDraft, character.uuid]);

  const handleSavePersonality = useCallback(async () => {
    try {
      isSavingRef.current = true;
      setIsSavingPersonality(true);
      const payload = {
        personality_tags: personalityDraft.personality_tags,
        modules: {
          personality: {
            personality_tags: personalityDraft.personality_tags,
            quotes: personalityDraft.quotes,
          },
        },
      };

      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.code !== 0)
        throw new Error(
          json?.message ||
            pageData.action_bar?.errors?.update_personality_failed ||
            "",
        );
    } catch (error) {
      console.error("Failed to save personality info", error);
      toast.error(
        error instanceof Error
          ? error.message
          : pageData.action_bar?.errors?.update_personality_failed || "",
      );
    } finally {
      setIsSavingPersonality(false);
      isSavingRef.current = false;
    }
  }, [personalityDraft, character.uuid]);

  const handleSaveExtendedAttributes = useCallback(async () => {
    try {
      isSavingRef.current = true;
      setIsSavingExtendedAttributes(true);

      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modules: {
              personality: { extended_attributes: extendedAttributesDraft },
            },
          }),
        },
      );

      const json = await response.json().catch(() => null);
      if (!response.ok || json?.code !== 0)
        throw new Error(
          json?.message ||
            pageData.action_bar?.errors?.update_extended_attributes_failed ||
            "",
        );
    } catch (error) {
      console.error("Failed to save extended attributes", error);
      throw error;
    } finally {
      setIsSavingExtendedAttributes(false);
      isSavingRef.current = false;
    }
  }, [extendedAttributesDraft, character.uuid]);

  const handleSaveSkills = useCallback(async () => {
    try {
      isSavingRef.current = true;
      setIsSavingSkills(true);
      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modules: {
              skills: {
                stats: skillsDraft.stats,
                abilities: skillsDraft.abilities,
              },
            },
          }),
        },
      );
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.code !== 0)
        throw new Error(
          json?.message ||
            pageData.action_bar?.errors?.update_skills_failed ||
            "",
        );
    } catch (error) {
      console.error("Failed to save skills", error);
      throw error;
    } finally {
      setIsSavingSkills(false);
      isSavingRef.current = false;
    }
  }, [skillsDraft, character.uuid]);

  const handleToggleEditMode = useCallback(async () => {
    const params = new URLSearchParams(searchParams?.toString());
    const isExitingEditMode = params.get("mode") === "edit";

    if (isExitingEditMode) {
      try {
        isSavingRef.current = true;
        const saveHandlers = [
          handleSaveBasic,
          handleSaveVisuals,
          handleSaveBackgroundStory,
          handleSaveBackgroundSegments,
          handleSavePersonality,
          handleSaveExtendedAttributes,
          handleSaveSkills,
        ];
        for (const save of saveHandlers) {
          await save();
        }
      } catch (error) {
        console.error("Failed to save changes:", error);
        toast.error(pageData.action_bar?.errors?.save_changes_failed || "");
        isSavingRef.current = false;
        return;
      } finally {
        isSavingRef.current = false;
      }
    }

    if (isExitingEditMode) params.delete("mode");
    else params.set("mode", "edit");
    const next = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(next);
  }, [
    searchParams,
    pathname,
    router,
    handleSaveBasic,
    handleSaveVisuals,
    handleSaveBackgroundStory,
    handleSaveBackgroundSegments,
    handleSavePersonality,
    handleSaveExtendedAttributes,
    handleSaveSkills,
  ]);

  const handleToggleVisibility = useCallback(async () => {
    if (!isSub) {
      toast.info(
        pageData.action_bar?.errors?.visibility_sub_required ||
          "Subscription Plan required to change visibility",
      );
      return;
    }
    if (isVisibilityLoading) return;
    setIsVisibilityLoading(true);
    try {
      const response = await fetch(
        `/api/community/artworks/${character.uuid}/visibility?type=character`,
        { method: "PUT" },
      );
      if (!response.ok) throw new Error("Failed to update visibility");
      const nextIsPublic = !isPublic;
      setIsPublic(nextIsPublic);
      toast.success(
        nextIsPublic
          ? pageData.action_bar?.toast?.visibility_public ||
              "Visibility set to public"
          : pageData.action_bar?.toast?.visibility_private ||
              "Visibility set to private",
      );
      router.refresh();
    } catch (error) {
      console.error("Toggle visibility failed:", error);
      toast.error(pageData.action_bar?.errors?.operation_failed || "");
    } finally {
      setIsVisibilityLoading(false);
    }
  }, [isSub, isVisibilityLoading, character.uuid, isPublic, router]);

  const handleGalleryImagesChange = async (newImages: ImageItem[]) => {
    const nextPrimaryUuid = resolvePrimaryPortraitUuid({
      images: newImages,
      currentPrimaryUuid: primaryPortraitUuid,
    });
    setGalleryImages(newImages);
    setPrimaryPortraitUuid(nextPrimaryUuid);
    try {
      const payload: Record<string, unknown> = {
        modules: {
          art: { gallery: buildGalleryPayload(newImages) },
        },
      };
      if (nextPrimaryUuid !== primaryPortraitUuid) {
        payload.profile_generation_image_uuid = nextPrimaryUuid;
      }
      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error("Failed to save gallery");
      if (nextPrimaryUuid !== primaryPortraitUuid) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save gallery order");
    }
  };

  const handlePrimaryPortraitChange = useCallback(
    async (
      nextUuid: string | null,
      options?: {
        silent?: boolean;
      },
    ) => {
      if (nextUuid === primaryPortraitUuid) return;
      setPrimaryPortraitUuid(nextUuid);
      try {
        const response = await fetch(
          `/api/oc-maker/characters/${character.uuid}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile_generation_image_uuid: nextUuid,
            }),
          },
        );
        if (!response.ok) throw new Error(operationFailedMessage);
        router.refresh();
      } catch (error) {
        console.error(error);
        if (!options?.silent) {
          toast.error(
            error instanceof Error ? error.message : operationFailedMessage,
          );
        }
      }
    },
    [character.uuid, operationFailedMessage, primaryPortraitUuid, router],
  );

  useEffect(() => {
    if (primaryPortraitInitializedRef.current) return;
    if (!isOwner) return;
    if (!primaryPortraitUuid && effectivePrimaryPortraitUuid) {
      primaryPortraitInitializedRef.current = true;
      void handlePrimaryPortraitChange(effectivePrimaryPortraitUuid, {
        silent: true,
      });
    }
  }, [
    effectivePrimaryPortraitUuid,
    handlePrimaryPortraitChange,
    isOwner,
    primaryPortraitUuid,
  ]);

  const handleFinishCreation = () => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("mode");
    const next = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    // Navigate to view mode first
    router.replace(next);
    // Then refresh to ensure we have the latest character data
    router.refresh();
  };

  async function startAvatarGeneration(referenceUrl: string) {
    setIsGenerationSubmitting(true);
    setGenerationStatus(null);
    setGenerationError(null);
    setGenerationResults(undefined);
    setIsGenerationStatusOpen(true);
    activeGenerationModeRef.current = "avatar";
    setActiveGenerationMode("avatar");
    appliedGenerationRef.current = null;
    try {
      const uuid = await triggerAvatarGeneration({
        character_data: { name: character.name, gender: character.gender },
        reference_image_urls: [referenceUrl],
      });
      if (!uuid) {
        throw new Error(operationFailedMessage);
      }
      activeGenerationIdRef.current = uuid;
      setActiveGenerationId(uuid);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : operationFailedMessage;
      setGenerationError(message);
      toast.error(message);
      setActiveGenerationId(null);
      activeGenerationIdRef.current = null;
      return false;
    } finally {
      setIsGenerationSubmitting(false);
    }
  }

  const handleGenerateAvatar = async () => {
    const referenceUrl = await resolvePortraitReferenceUrl({
      galleryImages,
      primaryUuid: effectivePrimaryPortraitUuid,
      fallbackUuid: character.profile_generation_image_uuid,
      fallbackUrl: effectivePrimaryPortraitUrl,
    });
    if (!referenceUrl) {
      toast.error(
        pageData.action_bar?.errors?.profile_required_for_avatar || "",
      );
      return;
    }
    await startAvatarGeneration(referenceUrl);
  };

  const handleUploadAvatarByUuid = async (imageUuid: string) => {
    try {
      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}/avatar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_uuid: imageUuid, type: "upload" }),
        },
      );

      const result = await response.json();
      if (!response.ok || result.code !== 0)
        throw new Error(
          result.message ||
            pageData.action_bar?.errors?.update_avatar_failed ||
            "",
        );

      router.refresh();
    } catch (error: any) {
      toast.error(
        error.message ||
          pageData.action_bar?.errors?.update_avatar_failed ||
          "",
      );
      throw error;
    }
  };

  useEffect(() => {
    setCropImageUrl(resolveCropImageUrl(effectivePrimaryPortraitUrl));
  }, [effectivePrimaryPortraitUrl]);

  const isRenderableImageUrl = useCallback((url?: string | null) => {
    if (!url) return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (/^(https?:|data:|blob:)/i.test(trimmed)) return true;
    if (trimmed.startsWith("/")) {
      return !trimmed.startsWith("/Users/") && !trimmed.startsWith("/Volumes/");
    }
    return false;
  }, []);

  const fetchProfileImageForCrop = useCallback(async () => {
    const response = await fetch(
      `/api/characters/${character.uuid}/profile?device=detail`,
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.data?.url) {
      throw new Error(
        data?.error ||
          pageData.action_bar?.errors?.profile_required_for_avatar ||
          pageData.action_bar?.errors?.load_profile_failed ||
          "",
      );
    }
    return data.data.url as string;
  }, [
    character.uuid,
    pageData.action_bar?.errors?.profile_required_for_avatar,
  ]);

  const handleCropAvatar = async () => {
    if (!effectivePrimaryPortraitUuid && !effectivePrimaryPortraitUrl) {
      toast.error(
        pageData.action_bar?.errors?.profile_required_for_avatar || "",
      );
      return;
    }
    setIsPreparingCropImage(true);
    try {
      const preparedUrl = isRenderableImageUrl(effectivePrimaryPortraitUrl)
        ? effectivePrimaryPortraitUrl
        : await fetchProfileImageForCrop();
      const safeUrl = resolveCropImageUrl(preparedUrl);
      if (!safeUrl) {
        throw new Error(pageData.action_bar?.errors?.load_profile_failed || "");
      }
      setCropImageUrl(safeUrl);
      setIsCropDialogOpen(true);
    } catch (error: any) {
      console.error("Failed to prepare crop image", error);
      toast.error(
        error?.message ||
          pageData.action_bar?.errors?.load_profile_failed ||
          "",
      );
    } finally {
      setIsPreparingCropImage(false);
    }
  };

  const handleConfirmCrop = async (imageUuid: string) => {
    try {
      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}/avatar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_uuid: imageUuid, type: "crop" }),
        },
      );

      const result = await response.json();
      if (!response.ok || result.code !== 0)
        throw new Error(
          result.message ||
            pageData.action_bar?.errors?.update_avatar_failed ||
            "",
        );

      router.refresh();
    } catch (error: any) {
      toast.error(
        error.message ||
          pageData.action_bar?.errors?.update_avatar_failed ||
          "",
      );
      throw error;
    }
  };

  const handleGenerateProfile = async (options?: {
    skipDialog?: boolean;
    type?: ImageItem["type"];
    characterData?: GenerationCharacterDataOverride;
    modules?: CharacterModules;
    artStyle?: string | null;
  }) => {
    const type =
      options?.type === "design_sheet" ? "design_sheet" : "generation";
    const limitReachedMessage = pageData.gallery?.limit_reached
      ? pageData.gallery.limit_reached.replace(
          "{limit}",
          String(visualArchiveLimit),
        )
      : "";
    const limitReached = galleryImages.length >= visualArchiveLimit;
    if (limitReached) {
      toast.warning(limitReachedMessage);
      return;
    }
    let prompt = "";
    let aspectRatio = "3:4";
    let imageResolution = "3:4";
    let genType = "character";
    let referenceImageUrls: string[] | undefined;

    if (type === "design_sheet") {
      const referenceUrl = await resolvePortraitReferenceUrl({
        galleryImages,
        primaryUuid: effectivePrimaryPortraitUuid,
        fallbackUuid: character.profile_generation_image_uuid,
        fallbackUrl: effectivePrimaryPortraitUrl,
      });
      if (!referenceUrl) {
        toast.error(
          pageData.action_bar?.errors?.profile_required_for_breakdown_sheet ||
            "",
        );
        return;
      }
      const promptTemplate =
        typeof breakdownSheetPromptConfig?.prompt === "string"
          ? breakdownSheetPromptConfig.prompt
          : "";
      const {
        prompt: breakdownPrompt,
        missingKeys,
        hasTemplate,
      } = resolvePromptTemplate(promptTemplate, {
        locale: normalizeTemplateLocale(locale),
      });
      if (!hasTemplate) {
        toast.error(
          pageData.action_bar?.errors?.breakdown_sheet_prompt_missing || "",
        );
        return;
      }
      if (missingKeys.length > 0 || !breakdownPrompt) {
        const baseMessage =
          pageData.action_bar?.errors?.breakdown_sheet_prompt_missing || "";
        toast.error(
          missingKeys.length > 0
            ? `${baseMessage}: ${missingKeys.join(", ")}`
            : baseMessage,
        );
        return;
      }
      prompt = breakdownPrompt;
      aspectRatio = "16:9";
      imageResolution = "16:9";
      genType = "design_sheet";
      referenceImageUrls = [referenceUrl];
    }

    setIsGenerationSubmitting(true);
    setGenerationStatus(null);
    setGenerationError(null);
    setGenerationResults(undefined);
    setIsGenerationStatusOpen(true);
    activeGenerationModeRef.current =
      type === "design_sheet" ? "design_sheet" : "full_body";
    forcedGenerationModeRef.current =
      type === "design_sheet" ? "design_sheet" : null;
    setActiveGenerationMode(activeGenerationModeRef.current);
    appliedGenerationRef.current = null;
    setActiveGenerationId(null);
    activeGenerationIdRef.current = null;

    try {
      if (type === "design_sheet") {
        const response = await fetch("/api/anime-generation/create-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gen_type: genType,
            prompt,
            model_uuid: "google/nano-banana",
            batch_size: 1,
            aspect_ratio: aspectRatio,
            image_resolution: imageResolution,
            character_uuids: [character.uuid],
            reference_image_urls: referenceImageUrls,
            visibility_level: "public",
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success || !data?.data?.generation_uuid) {
          throw new Error(data?.error || operationFailedMessage);
        }
        const generationId = data.data.generation_uuid as string;
        setActiveGenerationId(generationId);
        activeGenerationIdRef.current = generationId;
        return;
      }

      const override = options?.characterData;
      const overrideModules = options?.modules;
      const mergedModules = overrideModules || promptModules;
      const mergedAppearance =
        mergedModules.appearance || promptModules.appearance || {};
      const mergedBackground =
        mergedModules.background || promptModules.background || {};
      const mergedPersonality =
        mergedModules.personality || promptModules.personality || {};
      const mergedArt = mergedModules.art || promptModules.art || {};
      const resolvedArtStyle =
        options?.artStyle ||
        override?.art_style ||
        mergedArt.fullbody_style ||
        moduleAppearanceData.art_style ||
        undefined;
      const resolvedAppearanceFeatures =
        override?.appearance_features ??
        (Array.isArray(mergedAppearance.appearance_features)
          ? mergedAppearance.appearance_features
          : moduleAppearanceData.appearance_features);

      const generationModules: CharacterModules = {
        appearance: {
          name: override?.name ?? moduleAppearanceData.name ?? character.name,
          gender: normalizeGenderValue(
            override?.gender ?? moduleAppearanceData.gender ?? character.gender,
          ),
          age: override?.age ?? moduleAppearanceData.age ?? undefined,
          species: override?.species ?? moduleAppearanceData.species ?? undefined,
          role: override?.role ?? moduleAppearanceData.role ?? undefined,
          body_type:
            override?.body_type ??
            mergedAppearance.body_type ??
            moduleAppearanceData.body_type ??
            undefined,
          hair_color:
            override?.hair_color ??
            mergedAppearance.hair_color ??
            moduleAppearanceData.hair_color ??
            undefined,
          hair_style:
            override?.hair_style ??
            mergedAppearance.hair_style ??
            moduleAppearanceData.hair_style ??
            undefined,
          eye_color:
            override?.eye_color ??
            mergedAppearance.eye_color ??
            moduleAppearanceData.eye_color ??
            undefined,
          outfit_style:
            override?.outfit_style ??
            mergedAppearance.outfit_style ??
            moduleAppearanceData.outfit_style ??
            undefined,
          accessories:
            override?.accessories ??
            mergedAppearance.accessories ??
            moduleAppearanceData.accessories ??
            undefined,
          appearance_features: Array.isArray(resolvedAppearanceFeatures)
            ? resolvedAppearanceFeatures
            : resolvedAppearanceFeatures
              ? [resolvedAppearanceFeatures]
              : moduleAppearanceData.appearance_features,
        },
        personality: {
          personality_tags:
            override?.personality_tags ??
            personalityDraft.personality_tags ??
            mergedPersonality.personality_tags ??
            [],
        },
        background: {},
        art: {},
        skills: { stats: [], abilities: [] },
      };

      const response = await fetch("/api/oc-maker/characters/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aspect_ratio: aspectRatio,
          model_uuid: "google/nano-banana",
          art_style: resolvedArtStyle,
          gen_type: "full_body",
          character_data: {
            character_uuid: character.uuid,
            name: override?.name ?? moduleAppearanceData.name ?? character.name,
            gender:
              override?.gender ??
              moduleAppearanceData.gender ??
              character.gender,
            age: override?.age ?? moduleAppearanceData.age ?? null,
            species: override?.species ?? moduleAppearanceData.species ?? null,
            personality_tags:
              override?.personality_tags ??
              mergedPersonality.personality_tags ??
              null,
            modules: generationModules,
            body_type:
              override?.body_type ??
              mergedAppearance.body_type ??
              moduleAppearanceData.body_type ??
              null,
            hair_color:
              override?.hair_color ??
              mergedAppearance.hair_color ??
              moduleAppearanceData.hair_color ??
              null,
            hair_style:
              override?.hair_style ??
              mergedAppearance.hair_style ??
              moduleAppearanceData.hair_style ??
              null,
            eye_color:
              override?.eye_color ??
              mergedAppearance.eye_color ??
              moduleAppearanceData.eye_color ??
              null,
            outfit_style:
              override?.outfit_style ??
              mergedAppearance.outfit_style ??
              moduleAppearanceData.outfit_style ??
              null,
            accessories:
              override?.accessories ??
              mergedAppearance.accessories ??
              moduleAppearanceData.accessories ??
              null,
            appearance_features: Array.isArray(resolvedAppearanceFeatures)
              ? resolvedAppearanceFeatures.join(", ")
              : (resolvedAppearanceFeatures ??
                moduleAppearanceData.appearance_features?.join(", ") ??
                null),
            brief_introduction:
              override?.brief_introduction ??
              mergedBackground.brief_introduction ??
              null,
            background_story:
              override?.background_story ??
              mergedBackground.background_story ??
              null,
            extended_attributes:
              override?.extended_attributes ??
              mergedPersonality.extended_attributes ??
              null,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.code !== 0 || !data?.data?.generation_uuid) {
        throw new Error(data?.message || operationFailedMessage);
      }
      const generationId = data.data.generation_uuid as string;
      setActiveGenerationId(generationId);
      activeGenerationIdRef.current = generationId;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : operationFailedMessage;
      setGenerationError(message);
      toast.error(message);
      setActiveGenerationId(null);
      activeGenerationIdRef.current = null;
    } finally {
      setIsGenerationSubmitting(false);
    }
  };

  const handleGenerateBackground = async (sceneDescription: string) => {
    setIsGenerationSubmitting(true);
    setGenerationStatus(null);
    setGenerationError(null);
    setGenerationResults(undefined);
    setIsGenerationStatusOpen(true);
    activeGenerationModeRef.current = "background";
    setActiveGenerationMode("background");
    appliedGenerationRef.current = null;
    try {
      const referenceUrl = await resolvePortraitReferenceUrl({
        galleryImages,
        primaryUuid: effectivePrimaryPortraitUuid,
        fallbackUuid: character.profile_generation_image_uuid,
        fallbackUrl: effectivePrimaryPortraitUrl,
      });
      const uuid = await triggerBackgroundGeneration({
        scene_description: sceneDescription,
        reference_image_urls: referenceUrl ? [referenceUrl] : [],
      });
      if (uuid) {
        activeGenerationIdRef.current = uuid;
        setActiveGenerationId(uuid);
      } else {
        throw new Error(operationFailedMessage);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : operationFailedMessage;
      setGenerationError(message);
      toast.error(message);
      setActiveGenerationId(null);
      activeGenerationIdRef.current = null;
    } finally {
      setIsGenerationSubmitting(false);
    }
  };

  const handleGalleryUpload = () => {
    if (galleryImages.length >= visualArchiveLimit) {
      const message = pageData.gallery?.limit_reached;
      if (message) {
        toast.warning(message.replace("{limit}", String(visualArchiveLimit)));
      }
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "oc-gallery");
      try {
        toast.loading("Uploading...");
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(
            data.error || pageData.action_bar?.errors?.upload_failed || "",
          );
        }
        const uploadUuid = data.upload_uuid as string | null;
        if (!uploadUuid) {
          throw new Error("Upload UUID is required");
        }
        const newItem: ImageItem = {
          id: uploadUuid,
          url: uploadUuid,
          type: "user_upload",
          label: uploadLabel,
          meta: { image_uuid: uploadUuid },
        };
        handleGalleryImagesChange([...galleryImages, newItem]);
        toast.dismiss();
        toast.success("Uploaded successfully");
      } catch (err: any) {
        toast.dismiss();
        toast.error(
          err.message || pageData.action_bar?.errors?.upload_failed || "",
        );
      }
    };
    input.click();
  };

  const handleGalleryConfirmFromArtworksItems = (items: ArtworkListItem[]) => {
    if (!items.length) return;

    if (gallerySelectionType === "avatar") {
      void handleUploadAvatarByUuid(items[0].uuid);
      setIsGalleryDialogOpen(false);
      return;
    }

    let nextGallery = [...galleryImages];
    const limitReachedMessage = pageData.gallery?.limit_reached
      ? pageData.gallery.limit_reached.replace(
          "{limit}",
          String(visualArchiveLimit),
        )
      : "";
    const notifyLimitReached = () => {
      if (limitReachedMessage) toast.warning(limitReachedMessage);
    };
    if (nextGallery.length >= visualArchiveLimit) {
      notifyLimitReached();
      setIsGalleryDialogOpen(false);
      return;
    }
    const remainingSlots = visualArchiveLimit - nextGallery.length;
    const itemsToAdd = items.slice(0, remainingSlots);
    itemsToAdd.forEach((item) => {
      const imageUuid = item.uuid;
      nextGallery.push({
        id: imageUuid,
        url: imageUuid,
        type: "generation",
        label: "My Artwork",
        meta: { image_uuid: imageUuid },
      });
    });
    if (items.length > remainingSlots) notifyLimitReached();
    handleGalleryImagesChange(nextGallery);
    setIsGalleryDialogOpen(false);
  };

  const handleBackgroundChange = async (next: string | null) => {
    try {
      const response = await fetch(
        `/api/oc-maker/characters/${character.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ background_url: next }),
        },
      );
      if (!response.ok) throw new Error("Failed to update background");
      setBackgroundUrl(next);
      toast.success(pageData.background_controls?.saved || "");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update background",
      );
    }
  };

  const handleWorldChange = useCallback(
    async (nextUuid: string | null, selected?: any) => {
      const nextTheme = extractTheme(selected);
      const nextBackground = (selected as any)?.cover_url || null;

      try {
        // 1. 立即开启过渡并同步更新本地状态
        setIsTransitioning(true);
        setTransitionTheme(nextTheme);
        setTransitionBackground(nextBackground);

        // 立即更新底层数据，这样当遮罩揭开时，内容已经变了
        setCurrentworld({
          uuid: nextUuid,
          name: selected?.name ?? null,
          theme: nextTheme,
          cover_url: nextBackground,
        });
        setThemeColor(null);

        // 2. 并行执行：网络请求与最小动画时长控制
        const updatePromise = fetch(
          `/api/oc-maker/characters/${character.uuid}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              world_uuid: nextUuid,
              modules: { appearance: { theme_color: undefined } },
            }),
          },
        );

        // 设定一个舒适的最小动画时长（600ms），给 UI 留出渲染新状态的时间
        const minAnimPromise = new Promise((resolve) =>
          setTimeout(resolve, 600),
        );

        const [response] = await Promise.all([updatePromise, minAnimPromise]);

        if (!response.ok) throw new Error("Failed to update world");

        // 3. 结束后立即揭晓结果
        setIsTransitioning(false);
        toast.success(pageData.world_selector?.updated || "");

        // 触发 router.refresh 以同步其他服务器端状态（静默进行）
        router.refresh();
      } catch (error) {
        console.error("World change failed:", error);
        setIsTransitioning(false);
        toast.error(
          error instanceof Error ? error.message : "Failed to update world",
        );
      }
    },
    [character.uuid, pageData.world_selector?.updated, router],
  );

  const handleTagsChange = useCallback(
    async (nextTags: string[]) => {
      setCurrentTags(nextTags);
      if (!isOwner) return;
      try {
        const response = await fetch(
          `/api/oc-maker/characters/${character.uuid}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: nextTags }),
          },
        );
        if (!response.ok) throw new Error("Failed to update tags");
        toast.success(pageData.tags?.updated || "");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update tags",
        );
      }
    },
    [isOwner, character.uuid],
  );

  // Memoize callback functions to prevent unnecessary re-renders
  const handleOpenGalleryDialog = useCallback(() => {
    if (galleryImages.length >= visualArchiveLimit) {
      const message = pageData.gallery?.limit_reached;
      if (message) {
        toast.warning(message.replace("{limit}", String(visualArchiveLimit)));
      }
      return;
    }
    setGallerySelectionType("gallery");
    setIsGalleryDialogOpen(true);
  }, [
    galleryImages.length,
    pageData.gallery?.limit_reached,
    visualArchiveLimit,
  ]);

  const handleHeaderSelectFromGallery = useCallback(() => {
    setGallerySelectionType("avatar");
    setIsGalleryDialogOpen(true);
  }, []);

  const handleHeaderUploadAvatar = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "oc-avatar");
      try {
        toast.loading("Uploading avatar...");
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(
            data.error || pageData.action_bar?.errors?.upload_failed || "",
          );
        }
        const uploadUuid = data.upload_uuid as string | null;
        if (!uploadUuid) {
          throw new Error("Upload UUID is required");
        }
        await handleUploadAvatarByUuid(uploadUuid);
        toast.dismiss();
        toast.success("Avatar uploaded successfully");
      } catch (err: any) {
        toast.dismiss();
        toast.error(
          err.message || pageData.action_bar?.errors?.upload_failed || "",
        );
      }
    };
    input.click();
  }, [handleUploadAvatarByUuid]);
  const handleOpenAvatarSetting = useCallback(
    () => handleCropAvatar(),
    [handleCropAvatar],
  );

  const handleVisualDraftChange = useCallback(
    (updates: Partial<typeof visualDraft>) => {
      setVisualDraft((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const handlePersonalityDraftChange = useCallback(
    (updates: Partial<typeof personalityDraft>) => {
      setPersonalityDraft((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const handleBasicDraftChange = useCallback(
    (updates: Partial<typeof basicDraft>) => {
      setBasicDraft((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const handleOpenShareDialog = useCallback(() => setShareOpen(true), []);

  const handleExportLongImage = useCallback(() => {
    toast.info(
      "Long image generation is currently in development. You can use the Share Card for now!",
      {
        description:
          "As an alternative, you can also use your browser's print feature to save the page as an image or PDF.",
      },
    );
  }, []);

  // Memoize the tag editor copy object
  const tagEditorCopy = useMemo(
    () => ({
      placeholder: pageData.tags?.placeholder,
      suggestionsLabel: pageData.tags?.suggestions,
      recommendedLabel: pageData.tags?.recommended,
      maxReached: pageData.tags?.max,
      duplicateLabel: pageData.tags?.duplicate,
      savingLabel: pageData.tags?.saving,
      removeAriaLabel: pageData.tags?.remove,
    }),
    [pageData.tags],
  );

  // Memoize the tags node
  const tagsNode = useMemo(() => {
    if (!isEditMode) return undefined;
    return (
      <div className="w-full max-w-xl pt-2">
        <TagEditor
          value={currentTags}
          onChange={handleTagsChange}
          readOnly={!isEditMode}
          copy={tagEditorCopy}
        />
      </div>
    );
  }, [isEditMode, currentTags, handleTagsChange, tagEditorCopy]);

  // --- 3. Effects ---
  useEffect(() => {
    if (character.uuid !== prevCharacterUuidRef.current) {
      prevCharacterUuidRef.current = character.uuid;
      window.location.reload();
    }
  }, [character.uuid]);

  const rightSideActions = useMemo(() => {
    if (!isOwner) return null;
    const visibilityTitle = pageData.action_bar?.labels?.visibility || "";
    const visibilityStateText = isPublic
      ? pageData.visibility?.public || ""
      : pageData.visibility?.private || "";
    const editLabel = isEditMode
      ? pageData.actions?.quit_edit || ""
      : pageData.actions?.edit || "";

    return (
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-col items-center gap-3 bg-background/40 backdrop-blur-md border border-border/50 p-2 rounded-2xl shadow-xl">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={isEditMode ? "default" : "ghost"}
                size="icon"
                onClick={handleToggleEditMode}
                className={cn(
                  "h-10 w-10 rounded-xl transition-all shadow-none",
                  isEditMode
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary/20",
                )}
              >
                {isEditMode ? (
                  <Save className="h-5 w-5" />
                ) : (
                  <Edit className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs font-bold uppercase tracking-wider">
                {editLabel}
              </p>
            </TooltipContent>
          </Tooltip>
          {!isEditMode && (
            <LinkingComponent
              {...characterDetailConfig(character.uuid)}
              orientation="vertical"
              displayMode="icon-only"
            />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleToggleVisibility}
                disabled={isVisibilityLoading}
                className={cn(
                  "h-10 w-10 rounded-xl transition-all border",
                  isPublic
                    ? "bg-primary/10 text-primary border-primary shadow-sm hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
                    : "bg-destructive/10 text-destructive border-destructive shadow-sm hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30",
                )}
              >
                {isPublic ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <div className="space-y-1 max-w-[200px]">
                <p className="text-xs font-bold uppercase tracking-wider">
                  {visibilityTitle}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {isPublic
                    ? pageData.action_bar?.labels?.visibility_public_desc ||
                      "Anyone can view this character."
                    : pageData.action_bar?.labels?.visibility_private_desc ||
                      "Only you can view this character."}
                </p>
                {!isSub && !isPublic && (
                  <p className="text-[10px] text-amber-500 font-medium leading-tight pt-1">
                    {pageData.action_bar?.labels?.visibility_pro_hint ||
                      "Pro plan required to set as private."}
                  </p>
                )}
                <div className="h-px bg-border/50 my-1" />
                <p className="text-xs">{visibilityStateText}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }, [
    isOwner,
    isPublic,
    isVisibilityLoading,
    character.uuid,
    isEditMode,
    handleToggleEditMode,
    handleToggleVisibility,
    isSub,
  ]);

  if (isCreateMode) {
    return (
      <CharacterCreationWizard
        character={character}
        modules={modules}
        pageData={pageData}
        isOwner={isOwner}
        isSub={isSub}
        onFinish={handleFinishCreation}
        avatarUrl={avatarDisplayUrl || null}
        profileImageUrl={effectivePrimaryPortraitUrl}
        onGenerateAvatar={handleGenerateAvatar}
        onGenerateProfileImage={handleGenerateProfile}
        isGeneratingProfile={isGeneratingProfile}
        world={world}
      />
    );
  }

  return (
    <WorldThemeProvider theme={mergedTheme}>
      <div className="space-y-6 relative max-w-6xl mx-auto px-4 sm:px-8 lg:px-10">
        <div
          className="rounded-3xl border-2 border-border/40 shadow-xl overflow-hidden bg-card/80 backdrop-blur-md transition-all flex flex-col relative group/main"
          style={{
            borderColor: mergedTheme?.primary
              ? `${mergedTheme.primary}40`
              : undefined,
          }}
        >
          <AnimatePresence>
            {isTransitioning && (
              <motion.div
                initial={{ clipPath: "circle(0% at 0% 0%)" }}
                animate={{ clipPath: "circle(150% at 0% 0%)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 z-[60] pointer-events-none"
                style={{
                  background:
                    transitionTheme?.background || "var(--background)",
                  backgroundImage: transitionBackground
                    ? `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%), url(${transitionBackground})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
          </AnimatePresence>
          {isOwner && (
            <div
              className={cn(
                "absolute right-4 z-50 transition-all duration-300",
                isEditMode ? "top-20 sm:top-24" : "top-8 sm:top-12",
              )}
            >
              {rightSideActions}
            </div>
          )}
          <div className="absolute left-6 top-6 z-50 flex items-center">
            {isEditMode ? (
              <WorldSelector
                value={currentWorld.uuid}
                onChange={handleWorldChange}
                pageData={pageData}
                ownerUuid={isOwner ? creator?.uuid || null : null}
                className="h-10 w-fit min-w-[140px] px-4 bg-background/40 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl transition-all hover:bg-background/60 flex justify-center items-center"
              />
            ) : currentWorld.uuid ? (
              <Link
                href={`/worlds/${currentWorld.uuid}`}
                target="_blank"
                className="flex items-center gap-3 bg-background/30 backdrop-blur-md pl-1.5 pr-5 py-1.5 rounded-2xl border border-white/10 hover:bg-background/50 transition-all group/wv cursor-pointer shadow-lg overflow-hidden relative"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 transition-colors duration-500"
                  style={{
                    backgroundColor: mergedTheme?.primary || "var(--primary)",
                  }}
                />
                <div className="w-8 h-8 ml-1 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border border-white/10 shadow-inner group-hover/wv:scale-105 transition-transform duration-500">
                  {worldCoverDisplayUrl ? (
                    <img
                      src={worldCoverDisplayUrl}
                      alt={`${currentWorld.name || "World"} ${pageData.header?.world_label || "World"} cover`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full opacity-60"
                      style={{
                        background: `linear-gradient(135deg, ${mergedTheme?.primary || "var(--primary)"} 0%, ${mergedTheme?.secondary || "var(--secondary)"} 100%)`,
                      }}
                    />
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none mb-1 group-hover/wv:text-primary transition-colors text-center">
                    {pageData.header?.world_label || ""}
                  </span>
                  <span className="text-xs font-bold text-foreground leading-none tracking-tight text-center">
                    {currentWorld.name}
                  </span>
                </div>
              </Link>
            ) : null}
          </div>
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover/main:bg-primary/10 transition-colors duration-1000"></div>
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px] pointer-events-none group-hover/main:bg-secondary/10 transition-colors duration-1000"></div>
          <BackgroundCustomizer
            backgroundUrl={displayBackgroundUrl}
            themeColor={themeColor}
            isOwner={isOwner}
            isEditMode={isEditMode}
            onBackgroundChange={handleBackgroundChange}
            onGenerateBackground={handleGenerateBackground}
            pageData={pageData}
            theme={mergedTheme}
          >
            <div className="pt-12 sm:pt-16 pb-2 px-4">
              <CharacterHeader
                name={isEditMode ? basicDraft.name : appearanceData.name}
                species={
                  isEditMode ? basicDraft.species : appearanceData.species
                }
                gender={isEditMode ? basicDraft.gender : appearanceData.gender}
                role={isEditMode ? basicDraft.role : appearanceData.role}
                age={isEditMode ? basicDraft.age : appearanceData.age}
                greeting={
                  isEditMode
                    ? (Array.isArray(basicDraft.greeting) ? basicDraft.greeting[0] : basicDraft.greeting)
                    : backgroundData.brief_introduction
                }
                artStyle={modules.art?.fullbody_style || undefined}
                tags={isEditMode ? null : currentTags}
                editValues={basicDraft}
                onEditChange={handleBasicDraftChange}
                onGenerateAvatar={handleGenerateAvatar}
                onGenerateProfileImage={handleGenerateProfile}
                onOpenAvatarSetting={handleOpenAvatarSetting}
                onUploadAvatar={handleHeaderUploadAvatar}
                onSelectFromGallery={handleHeaderSelectFromGallery}
                isGeneratingProfile={isGeneratingProfile}
                visualDraft={visualDraft}
                onVisualDraftChange={(updates) =>
                  setVisualDraft((prev) => ({ ...prev, ...updates }))
                }
                tagsNode={tagsNode}
                avatarUrl={avatarDisplayUrl || null}
                profileImageUrl={effectivePrimaryPortraitUrl}
                creator={creator}
                worldName={currentWorld.name}
                worldNode={null}
                isOwner={isOwner}
                isEditMode={isEditMode}
                pageData={pageData}
                onShare={() => setShareOpen(true)}
                variant="overlay"
              >
                {!isEditMode && (
                  <div className="mt-1">
                    <ActionBar
                      characterUuid={character.uuid}
                      characterName={character.name}
                      isOwner={isOwner}
                      isEditMode={isEditMode}
                      isPublic={isPublic}
                      likeCount={character.like_count || 0}
                      favoriteCount={character.favorite_count || 0}
                      userHasLiked={userHasLiked}
                      userHasFavorited={userHasFavorited}
                      locale={locale}
                      pageData={pageData}
                      onExportCard={handleOpenShareDialog}
                      onExportLongImage={handleExportLongImage}
                      variant="ghost"
                    />
                  </div>
                )}
              </CharacterHeader>
            </div>
          </BackgroundCustomizer>
          <div className="h-16 relative flex items-center justify-center pointer-events-none">
            {!isEditMode && creator && (
              <div className="absolute left-4 sm:left-6 bottom-[calc(50%+14px)] sm:bottom-[calc(50%+2px)] z-20 pointer-events-auto flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 pointer-events-none whitespace-nowrap">
                  {pageData.info?.created_by || ""}
                </span>
                <Link href={`/user/${creator.uuid}`}>
                  <Avatar className="h-5 w-5 border border-white/10 shadow-sm">
                    <AvatarImage src={creator.avatar_url || ""} />
                    <AvatarFallback className="text-[8px] bg-primary/10">
                      {creator.display_name?.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-px w-full top-1/2"></div>
            <div className="relative z-10 flex items-center gap-3 px-4 bg-card/60 backdrop-blur-sm border border-border/40 rounded-full h-5">
              <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              <div className="w-1.5 h-1.5 rotate-45 border border-primary/40"></div>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              <div className="w-1 h-1 rounded-full bg-secondary animate-pulse"></div>
            </div>
          </div>
          <div className="p-3 sm:p-6 pt-0 sm:pt-1 relative z-10">
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none overflow-hidden">
              <div
                className="absolute top-0 left-0 w-full h-full"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, currentColor 1px, transparent 1px), linear-gradient(-45deg, currentColor 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              ></div>
            </div>
            <ModuleDisplayTabs
              characterUuid={character.uuid}
              appearance={moduleAppearanceData}
              personality={personalityData}
              background={backgroundData}
              skills={skillsData}
              extendedAttributes={extendedAttributes}
              galleryImages={galleryImages}
              primaryPortraitUuid={effectivePrimaryPortraitUuid}
              onPrimaryPortraitChange={handlePrimaryPortraitChange}
              onGalleryImagesChange={handleGalleryImagesChange}
              onGalleryUpload={handleGalleryUpload}
              onGallerySelectFromArtworks={handleOpenGalleryDialog}
              pageData={pageData}
              isEditMode={isEditMode}
              isOwner={isOwner}
              onGenerateProfileImage={handleGenerateProfile}
              backgroundStoryDraft={backgroundStoryDraft}
              onBackgroundStoryDraftChange={setBackgroundStoryDraft}
              backgroundSegmentsDraft={backgroundSegmentsDraft}
              onBackgroundSegmentsDraftChange={setBackgroundSegmentsDraft}
              locale={locale}
              visualDraft={visualDraft}
              onVisualDraftChange={handleVisualDraftChange}
              personalityDraft={personalityDraft}
              onPersonalityDraftChange={handlePersonalityDraftChange}
              extendedAttributesDraft={extendedAttributesDraft}
              onExtendedAttributesDraftChange={setExtendedAttributesDraft}
              skillsDraft={skillsDraft}
              onSkillsDraftChange={setSkillsDraft}
              themeColor={mergedTheme?.primary}
              visualArchiveLimit={visualArchiveLimit}
            />
          </div>
        </div>
        {!isEditMode && (
          <div className="space-y-8 pt-4">
            <OCCreations
              characterUuid={character.uuid}
              pageData={pageData}
              locale={locale}
              initialCreations={initialCreationsByType}
            />
            <OCRecommendation
              characterUuid={character.uuid}
              artStyle={modules.art?.fullbody_style || null}
              species={modules.appearance?.species || character.species || null}
              pageData={pageData}
            />
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-0">
              <div className="rounded-3xl p-6 sm:p-8 shadow-none bg-muted/20">
                <CommentSection
                  artId={character.uuid}
                  artType="character"
                  commentCount={character.comment_count || 0}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <ShareCardDialog
        open={isShareOpen}
        onOpenChange={setShareOpen}
        character={{ uuid: character.uuid, name: character.name }}
        modules={modules}
        avatarUrl={avatarDisplayUrl || null}
        profileImageUrl={effectivePrimaryPortraitUrl}
        pageData={pageData}
        themeColor={mergedTheme?.primary || undefined}
        locale={locale}
      />
      <AvatarCropDialog
        open={isCropDialogOpen}
        onOpenChange={setIsCropDialogOpen}
        imageUrl={cropImageUrl || ""}
        onConfirm={handleConfirmCrop}
        title={pageData.portrait_generation?.crop_from_fullbody || ""}
        copy={pageData.portrait_generation}
      />
      <GenerationStatusModal
        open={isGenerationStatusOpen}
        onOpenChange={setIsGenerationStatusOpen}
        status={generationStatusType}
        message={generationStatus?.message}
        error={generationPollingError || generationError}
        previewUrl={generationResults?.[0]?.image_url}
      />
      <ArtworkGalleryDialog
        open={isGalleryDialogOpen}
        onOpenChange={setIsGalleryDialogOpen}
        onConfirm={() => {}}
        onConfirmItems={handleGalleryConfirmFromArtworksItems}
        maxSelect={
          gallerySelectionType === "avatar"
            ? 1
            : Math.max(0, visualArchiveLimit - galleryImages.length)
        }
      />
    </WorldThemeProvider>
  );
}

function extractTheme(world?: Serializedworld | null): WorldTheme | null {
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

function resolveCropImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(trimmed);
  } catch (error) {
    return trimmed;
  }

  if (parsedUrl.pathname.startsWith("/api/images/proxy")) {
    return trimmed;
  }

  const currentOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : null;

  if (!currentOrigin || parsedUrl.origin === currentOrigin) {
    return trimmed;
  }

  return `/api/images/proxy?url=${encodeURIComponent(trimmed)}`;
}

function normalizeExtendedAttributes(
  raw: any,
): Record<string, string> | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const result: Record<string, string> = {};
    raw.forEach((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        const key = String(item[0]);
        result[key] = String(item[1]);
      } else if (item && typeof item === "object" && item.key) {
        const key = String(item.key);
        result[key] = String(item.value ?? "");
      }
    });
    return Object.keys(result).length ? result : undefined;
  }
  if (typeof raw === "object") {
    const entries = Object.entries(raw).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        acc[key] =
          typeof value === "string"
            ? value
            : value != null
              ? String(value)
              : "";
        return acc;
      },
      {},
    );
    return Object.keys(entries).length ? entries : undefined;
  }
  return undefined;
}

function normalizeGalleryImages(raw: unknown): ImageItem[] {
  if (Array.isArray(raw)) {
    return raw
      .map((entry, index) => normalizeGalleryEntry(entry, `gallery-${index}`))
      .filter((item): item is ImageItem => !!item);
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>)
      .map(([key, value]) => normalizeGalleryEntry(value, key))
      .filter((item): item is ImageItem => !!item);
  }
  return [];
}

function normalizeGalleryEntry(
  entry: unknown,
  fallbackId: string,
): ImageItem | null {
  if (typeof entry === "string") {
    return {
      id: fallbackId,
      url: entry,
      type: "generation",
    };
  }
  if (Array.isArray(entry) && entry.length >= 2) {
    return normalizeGalleryEntry(entry[1], String(entry[0]));
  }
  if (!entry || typeof entry !== "object") return null;

  const record = entry as Record<string, unknown>;
  const url =
    typeof record.url === "string"
      ? record.url
      : typeof record.image_url === "string"
        ? record.image_url
        : typeof record.value === "string"
          ? record.value
          : null;
  if (!url) return null;

  const rawId =
    typeof record.id === "string" && record.id.trim() ? record.id.trim() : null;
  const rawType = typeof record.type === "string" ? record.type : "";
  const type = (
    ["generation", "user_upload", "design_sheet"] as const
  ).includes(rawType as ImageItem["type"])
    ? (rawType as ImageItem["type"])
    : rawType === "portrait" || rawType === "artwork"
      ? "generation"
      : rawType === "upload"
        ? "user_upload"
        : "generation";
  const label = typeof record.label === "string" ? record.label : undefined;
  const meta =
    record.meta &&
    typeof record.meta === "object" &&
    !Array.isArray(record.meta)
      ? Object.entries(record.meta).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            if (typeof value === "string") acc[key] = value;
            return acc;
          },
          {},
        )
      : undefined;
  const value =
    typeof record.value === "string" && record.value.trim()
      ? record.value.trim()
      : undefined;
  const resolvedMeta = { ...(meta || {}) };
  const resolvedId = rawId || fallbackId;
  if (value && resolvedId === "breakdown_sheet" && !resolvedMeta.image_uuid) {
    resolvedMeta.image_uuid = value;
  }

  return {
    id: resolvedId,
    url,
    type,
    label,
    meta: Object.keys(resolvedMeta).length ? resolvedMeta : undefined,
  };
}

function buildGalleryPayload(images: ImageItem[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  images.forEach((image, index) => {
    const key = image.id || `gallery-${index}`;
    const entry: Record<string, unknown> = {
      id: image.id || key,
      url: image.url,
      type: image.type,
    };
    if (image.label) entry.label = image.label;
    if (image.meta && Object.keys(image.meta).length) entry.meta = image.meta;
    if (key === "breakdown_sheet") {
      const imageUuid = image.meta?.image_uuid;
      if (imageUuid) entry.value = imageUuid;
    }
    const imageUuid = image.meta?.image_uuid;
    if (imageUuid && !entry.value) {
      entry.value = imageUuid;
    } else if (!entry.value && isImageUuid(image.url)) {
      entry.value = image.url;
    }
    record[key] = entry;
  });
  return record;
}

type BackgroundSegmentDraft = {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  image_uuid?: string;
};

function createBackgroundSegmentId() {
  if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
    const cryptoValue = (globalThis as any).crypto as Crypto | undefined;
    if (cryptoValue?.randomUUID) return cryptoValue.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBackgroundSegmentsDraft(
  segments: unknown,
): BackgroundSegmentDraft[] {
  if (typeof segments === "string") {
    try {
      const parsed = JSON.parse(segments) as unknown;
      if (Array.isArray(parsed)) {
        return normalizeBackgroundSegmentsDraft(parsed);
      }
    } catch {
      return [];
    }
  }
  if (!Array.isArray(segments)) return [];
  const normalized: BackgroundSegmentDraft[] = [];
  segments.forEach((segment) => {
    if (!segment || typeof segment !== "object") return;
    const id =
      typeof (segment as any).id === "string" && (segment as any).id.trim()
        ? (segment as any).id.trim()
        : createBackgroundSegmentId();
    const title =
      typeof (segment as any).title === "string"
        ? (segment as any).title
        : "";
    const content =
      typeof (segment as any).content === "string"
        ? (segment as any).content
        : "";
    const image_url =
      typeof (segment as any).image_url === "string"
        ? (segment as any).image_url
        : undefined;
    const image_uuid =
      typeof (segment as any).image_uuid === "string"
        ? (segment as any).image_uuid
        : undefined;
    normalized.push({
      id,
      title,
      content,
      image_url,
      image_uuid,
    });
  });
  return normalized;
}

function normalizeTemplateLocale(locale?: string | null): string {
  const normalizedLocale = locale?.trim().toLowerCase() || "en";
  return normalizedLocale.split("-")[0] || "en";
}

function resolveGalleryImageUuid(image: ImageItem): string | null {
  const rawValue = image.meta?.image_uuid || image.url;
  if (!rawValue) return null;
  return isImageUuid(rawValue) ? rawValue : null;
}

function isPrimaryCandidate(image: ImageItem): boolean {
  if (image.type === "design_sheet") return false;
  return Boolean(resolveGalleryImageUuid(image));
}

function resolvePrimaryPortraitUuid(input: {
  images: ImageItem[];
  currentPrimaryUuid: string | null;
}): string | null {
  if (
    input.currentPrimaryUuid &&
    input.images.some(
      (image) =>
        resolveGalleryImageUuid(image) === input.currentPrimaryUuid &&
        isPrimaryCandidate(image),
    )
  ) {
    return input.currentPrimaryUuid;
  }
  const fallbackImage = input.images.find((image) => isPrimaryCandidate(image));
  return fallbackImage ? resolveGalleryImageUuid(fallbackImage) : null;
}

async function resolvePortraitReferenceUrl(input: {
  galleryImages: ImageItem[];
  primaryUuid?: string | null;
  fallbackUuid?: string | null;
  fallbackUrl?: string | null;
}): Promise<string | null> {
  const primaryImage = input.primaryUuid
    ? input.galleryImages.find(
        (item) => resolveGalleryImageUuid(item) === input.primaryUuid,
      )
    : null;
  const portrait =
    (primaryImage && isPrimaryCandidate(primaryImage) ? primaryImage : null) ||
    input.galleryImages.find((item) => isPrimaryCandidate(item));
  const rawReference =
    primaryImage?.meta?.image_uuid ||
    primaryImage?.url ||
    input.primaryUuid ||
    portrait?.meta?.image_uuid ||
    portrait?.url ||
    input.fallbackUuid ||
    input.fallbackUrl ||
    null;
  if (!rawReference) return null;
  if (isAbsoluteHttpUrl(rawReference)) return rawReference;
  const uuid = extractUuid(rawReference);
  if (!uuid) return null;
  return resolveGenerationImageUrl(uuid);
}

async function resolveGenerationImageUrl(uuid: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/generation/image-resolve/${uuid}`);
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.code !== 0 || !data?.data) return null;
    return data.data.resolved_url || data.data.original_url || null;
  } catch {
    return null;
  }
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function extractUuid(value: string): string | null {
  const uuidRegex =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = value.match(uuidRegex);
  return match ? match[0] : null;
}
