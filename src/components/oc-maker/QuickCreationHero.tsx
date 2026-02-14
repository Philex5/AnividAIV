"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { OCMakerPage } from "@/types/pages/landing";
import { useOCMakerContext } from "@/contexts/oc-maker";
import { useAppContext } from "@/contexts/app";
import { Card } from "@/components/ui/card";
import { SearchPromptInput } from "./SearchPromptInput";
import { QuickOptionsBar } from "./QuickOptionsBar";
import { RandomSuggestions } from "./RandomSuggestions";
import { GenerationProgress, GenerationStep } from "./GenerationProgress";
import ocMakerSuggestions from "@/configs/suggestions/oc-maker.json";
import { OC_QUICK_GENERATION_CREDITS } from "@/configs/generation/credits";

type OCSuggestionConfigItem = (typeof ocMakerSuggestions)["items"][number];

interface SuggestionPresetConfig {
  gender?: string | null;
  art_style?: string | null;
  species?: string | null;
}

const POLLING_INTERVAL = 3000; // 3 seconds
const MAX_POLLING_ATTEMPTS = 60; // 3 minutes max for portrait
const MAX_AVATAR_POLLING_ATTEMPTS = 100; // 5 minutes max for avatar (100 * 3s = 300s)

type QuickGenerateResponse = {
  code: number;
  message: string;
  data?: {
    character: any;
    generation_task: { uuid: string; status: string } | null;
  };
};
type GenerationStatusResult = {
  image_uuid?: string;
  id?: string | number;
};

interface QuickCreationHeroProps {
  pageData?: OCMakerPage;
  onAuthRequired?: () => void;
  locale?: string;
}

export function QuickCreationHero({
  pageData,
  onAuthRequired,
}: QuickCreationHeroProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progressSteps, setProgressSteps] = useState<GenerationStep[]>([]);
  const [characterUuid, setCharacterUuid] = useState<string | null>(null);
  const [generationUuid, setGenerationUuid] = useState<string | null>(null);
  const { user, credits, isLoadingCredits, refreshCredits } = useAppContext();
  const {
    description,
    gender,
    artStyle,
    species,
    suggestions,
    refreshSuggestions,
    applyPreset,
  } = useOCMakerContext();

  const quickGenText = pageData?.quick_gen;
  const heroText = pageData?.hero;
  const ideaSparkExamples = pageData?.hero?.idea_sparks?.examples;
  const ocLimitFallbackMessage = useMemo(
    () =>
      pageData?.upgrade_prompts?.oc_limit_reached ||
      pageData?.oc_limit?.warning ||
      pageData?.errors?.create_character_failed ||
      quickGenText?.errors?.failed ||
      "",
    [
      pageData?.errors?.create_character_failed,
      pageData?.oc_limit?.warning,
      pageData?.upgrade_prompts?.oc_limit_reached,
      quickGenText?.errors?.failed,
    ],
  );
  const handleOcLimitReached = useCallback(
    (message?: string) => {
      const toastMessage =
        message ||
        ocLimitFallbackMessage ||
        pageData?.errors?.create_character_failed ||
        quickGenText?.errors?.failed ||
        "Failed to create character";
      setShowProgress(false);
      setProgressSteps([]);
      setCharacterUuid(null);
      setGenerationUuid(null);
      toast.error(toastMessage);
      router.push("/oc-maker");
    },
    [
      ocLimitFallbackMessage,
      pageData?.errors?.create_character_failed,
      quickGenText?.errors?.failed,
      router,
    ],
  );
  const suggestionConfigMap = useMemo(() => {
    const map = new Map<string, SuggestionPresetConfig>();
    const normalize = (value?: string | null) =>
      typeof value === "string" ? value.trim().toLowerCase() : "";
    const registerAlias = (
      aliasValue?: string | null,
      preset?: SuggestionPresetConfig,
    ) => {
      const normalized = normalize(aliasValue);
      if (!normalized || !preset || map.has(normalized)) {
        return;
      }
      map.set(normalized, preset);
    };

    (ideaSparkExamples ?? []).forEach((example) => {
      const preset: SuggestionPresetConfig = {
        gender: example.gender,
        art_style: example.art_style,
        species: example.species,
      };

      registerAlias(example.prompt, preset);
      registerAlias(example.title, preset);
    });

    ((ocMakerSuggestions?.items || []) as OCSuggestionConfigItem[]).forEach(
      (item) => {
        const preset: SuggestionPresetConfig = {
          gender: item.gender,
          art_style: item.art_style,
          species: item.species,
        };

        registerAlias(item.prompt, preset);
        if (item.aliases && typeof item.aliases === "object") {
          Object.values(item.aliases).forEach((alias) =>
            registerAlias(alias, preset),
          );
        }
        if (Array.isArray(item.extra_aliases)) {
          item.extra_aliases.forEach((alias) => registerAlias(alias, preset));
        }
      },
    );

    return map;
  }, [ideaSparkExamples]);

  const handleSuggestionPreset = useCallback(
    (value: string) => {
      if (!value) {
        return;
      }
      const preset = suggestionConfigMap.get(value.trim().toLowerCase());
      if (preset) {
        applyPreset({
          gender: preset.gender || undefined,
          artStyle: preset.art_style || undefined,
          species: preset.species || undefined,
        });
        return;
      }

      const message =
        heroText?.suggestion_applied || quickGenText?.toast?.suggestion_applied;
      if (message) {
        toast.message(message);
      }
    },
    [
      applyPreset,
      heroText?.suggestion_applied,
      quickGenText?.toast?.suggestion_applied,
      suggestionConfigMap,
    ],
  );

  const canSubmit = useMemo(() => description.trim().length > 0, [description]);

  const ensureCanQuickGenerate = useCallback(() => {
    if (!user) {
      onAuthRequired?.();
      return false;
    }

    if (!isLoadingCredits && credits < OC_QUICK_GENERATION_CREDITS) {
      const message =
        quickGenText?.errors?.insufficient_credits ||
        quickGenText?.errors?.failed;
      if (message) {
        toast.error(message);
      }
      return false;
    }

    return true;
  }, [
    credits,
    isLoadingCredits,
    onAuthRequired,
    quickGenText?.errors?.failed,
    quickGenText?.errors?.insufficient_credits,
    user,
  ]);

  // Poll generation status
  const pollGenerationStatus = useCallback(
    async (
      genUuid: string,
    ): Promise<{ status: string; error?: string; results?: GenerationStatusResult[] }> => {
      try {
        const response = await fetch(`/api/generation/status/${genUuid}`);
        const data = await response.json();

        if (!response.ok) {
          return {
            status: "failed",
            error: data.message || "Failed to check status",
          };
        }

        return {
          status: data.data?.status || data.status || "unknown",
          error: data.data?.error_message || data.error_message,
          results: data.data?.results || data.results,
        };
      } catch (error) {
        console.error("Failed to poll generation status:", error);
        return { status: "failed", error: "Network error" };
      }
    },
    [],
  );

  /**
   * Wait for avatar generation to complete by polling character avatar status
   * Backend webhook will automatically create avatar generation task after portrait completes
   */
  const waitForAvatarGeneration = useCallback(
    async (charUuid: string): Promise<{ success: boolean; timeout: boolean }> => {
      const maxAttempts = MAX_AVATAR_POLLING_ATTEMPTS;
      let attempts = 0;

      while (attempts < maxAttempts) {
        attempts++;

        try {
          const characterRes = await fetch(`/api/oc-maker/characters/${charUuid}`);
          if (!characterRes.ok) {
            await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
            continue;
          }

          const characterJson = await characterRes.json();
          const avatarUuid = characterJson?.data?.avatar_generation_image_uuid;

          if (avatarUuid) {
            console.log(`[waitForAvatarGeneration] Avatar generated for character ${charUuid}: ${avatarUuid}`);
            return { success: true, timeout: false };
          }

          await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
        } catch (error) {
          console.error("[waitForAvatarGeneration] Error checking avatar status:", error);
          await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
        }
      }

      console.warn(`[waitForAvatarGeneration] Avatar generation timeout for character ${charUuid}`);
      return { success: false, timeout: true };
    },
    [],
  );

  const handleQuickGenerate = async () => {
    if (!canSubmit || isGenerating) return;
    if (!ensureCanQuickGenerate()) return;

    setIsGenerating(true);

    // Initialize progress steps
    const initialSteps: GenerationStep[] = [
      {
        id: "parsing",
        label:
          quickGenText?.progress?.parsing_description ||
          "Parsing character description...",
        status: "processing",
      },
      {
        id: "creating",
        label:
          quickGenText?.progress?.creating_character ||
          "Creating character data...",
        status: "pending",
      },
      {
        id: "generating",
        label:
          quickGenText?.progress?.generating_portrait ||
          "Generating character portrait...",
        status: "pending",
      },
      {
        id: "finalizing",
        label: quickGenText?.progress?.setting_avatar || "Setting up avatar...",
        status: "pending",
      },
    ];

    setProgressSteps(initialSteps);
    setShowProgress(true);

    try {
      // Step 1: Create character
      setProgressSteps((steps) =>
        steps.map((s) =>
          s.id === "parsing" ? { ...s, status: "processing" } : s,
        ),
      );

      const response = await fetch("/api/oc-maker/quick-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          gender,
          art_style: artStyle,
          species,
          auto_generate_image: true,
        }),
      });

      if (response.status === 401) {
        onAuthRequired?.();
        setShowProgress(false);
        return;
      }

      const json = (await response.json()) as QuickGenerateResponse;

      if (response.status === 402) {
        const message =
          (json as any)?.error ||
          json.message ||
          quickGenText?.errors?.insufficient_credits ||
          quickGenText?.errors?.failed;
        throw new Error(message || "Insufficient credits");
      }

      if (response.status === 403) {
        handleOcLimitReached(json?.message);
        return;
      }

      if (!response.ok || json.code !== 0 || !json.data?.character) {
        const errMsg =
          (json as any)?.error ||
          json.message ||
          quickGenText?.errors?.failed ||
          "Generation failed";
        throw new Error(errMsg);
      }

      // Step 2: Character created
      setProgressSteps((steps) =>
        steps.map((s) =>
          s.id === "parsing"
            ? { ...s, status: "completed" }
            : s.id === "creating"
              ? { ...s, status: "completed" }
              : s,
        ),
      );

      const charUuid = json.data.character.uuid;
      const genUuid = json.data.generation_task?.uuid;

      setCharacterUuid(charUuid);
      setGenerationUuid(genUuid || null);

      if (user) {
        refreshCredits(true);
      }

      // If no generation task, skip to completion
      if (!genUuid) {
        setProgressSteps((steps) =>
          steps.map((s) => ({ ...s, status: "completed" })),
        );
        setTimeout(() => {
          router.push(`/characters/${charUuid}`);
        }, 1000);
        return;
      }

      // Step 3: Poll for generation completion
      setProgressSteps((steps) =>
        steps.map((s) =>
          s.id === "generating" ? { ...s, status: "processing" } : s,
        ),
      );

      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;

        if (attempts > MAX_POLLING_ATTEMPTS) {
          clearInterval(pollInterval);
          setProgressSteps((steps) =>
            steps.map((s) =>
              s.id === "generating" ? { ...s, status: "failed" } : s,
            ),
          );
          toast.error(
            quickGenText?.errors?.generation_timeout ||
              "Generation timeout. Please check the character detail page.",
          );
          setTimeout(() => {
            router.push(`/characters/${charUuid}`);
          }, 2000);
          return;
        }

        const { status, error, results } = await pollGenerationStatus(genUuid);

        if (status === "completed") {
          clearInterval(pollInterval);

          // Step 4: Finalize - wait for avatar generation
          setProgressSteps((steps) =>
            steps.map((s) =>
              s.id === "generating"
                ? { ...s, status: "completed" }
                : s.id === "finalizing"
                  ? { ...s, status: "processing" }
                  : s,
            ),
          );

          // Wait for avatar generation (backend will auto-create avatar task via webhook)
          const avatarResult = await waitForAvatarGeneration(charUuid);

          setProgressSteps((steps) =>
            steps.map((s) =>
              s.id === "finalizing" ? { ...s, status: "completed" } : s,
            ),
          );

          if (avatarResult.timeout) {
            console.warn("[handleQuickGenerate] Avatar generation timeout, navigating anyway");
            // Still navigate even if avatar generation times out
          }

          // Navigate after a short delay
          setTimeout(() => {
            router.push(`/characters/${charUuid}`);
          }, 1000);
        } else if (status === "failed") {
          clearInterval(pollInterval);
          setProgressSteps((steps) =>
            steps.map((s) =>
              s.id === "generating" ? { ...s, status: "failed" } : s,
            ),
          );
          toast.error(
            error ||
              quickGenText?.errors?.generation_failed ||
              "Portrait generation failed",
          );

          // Still navigate to character page after delay
          setTimeout(() => {
            router.push(`/characters/${charUuid}`);
          }, 2000);
        }
      }, POLLING_INTERVAL);
    } catch (error) {
      console.error("Quick generation failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : quickGenText?.errors?.failed || "Generation failed",
      );
      setShowProgress(false);
      setProgressSteps([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualCreate = async () => {
    setIsGenerating(true);
    try {
      const unnamedCharacterName =
        pageData?.character_card?.unnamed_character || "Unnamed Character";

      // Create a blank character
      const response = await fetch("/api/oc-maker/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: unnamedCharacterName,
          gender: "other",
          modules: {
            appearance: {},
            personality: {},
            background: {},
            art: {},
          },
        }),
      });

      if (response.status === 401) {
        onAuthRequired?.();
        return;
      }

      const json = await response.json();
      if (response.status === 403) {
        handleOcLimitReached(json?.message);
        return;
      }

      if (!response.ok || json?.code !== 0 || !json?.data?.uuid) {
        throw new Error(
          json?.message ||
            pageData?.errors?.create_character_failed ||
            "Failed to create character",
        );
      }

      toast.success(
        heroText?.manual_mode ||
          quickGenText?.toast?.manual_mode ||
          "Manual creation mode activated",
      );

      // Navigate to create mode
      router.push(`/characters/${json.data.uuid}?mode=create`);
    } catch (error) {
      console.error("Manual creation failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : pageData?.errors?.create_character_failed ||
              "Failed to create character",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {showProgress && (
        <GenerationProgress
          steps={progressSteps}
          title={quickGenText?.progress?.title || "Creating Your Character"}
          subtitle={
            quickGenText?.progress?.subtitle ||
            "Please wait while we bring your OC to life..."
          }
          onComplete={() => {
            if (characterUuid) {
              router.push(`/characters/${characterUuid}`);
            }
          }}
        />
      )}

      <div
        className="w-full max-w-5xl mx-auto px-4 py-8 lg:py-12"
        id="oc-maker-hero"
      >
        <div className="text-center mb-8 space-y-3">
          {heroText?.title && (
            <h2 className="text-3xl lg:text-5xl font-anime font-bold text-foreground drop-shadow-sm">
              {heroText.title}
            </h2>
          )}
          {heroText?.subtitle && (
            <p className="text-muted-foreground text-base lg:text-xl font-medium opacity-80">
              {heroText.subtitle}
            </p>
          )}
        </div>

        <div className="relative group">
          <div className="relative group/card">
            <Card
              variant="glass"
              radius="xl"
              className="p-5 sm:p-8 relative overflow-hidden"
            >
              {/* Subtle Grid Background */}
              <div
                className="absolute inset-0 opacity-[0.05] dark:opacity-[0.05] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, currentColor 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              ></div>

              <div className="relative space-y-6">
                <div className="space-y-4">
                  <SearchPromptInput
                    label={heroText?.description_label}
                    placeholder={heroText?.description_placeholder}
                    buttonLabel={heroText?.generate_button}
                    generatingLabel={quickGenText?.button?.generating}
                    descriptionHelper={heroText?.description_helper}
                    creditsCost={OC_QUICK_GENERATION_CREDITS}
                    onSubmit={handleQuickGenerate}
                    isGenerating={isGenerating}
                    maxLength={500}
                  />

                  <div className="px-1">
                    <QuickOptionsBar
                      genderLabel={heroText?.gender_label}
                      artStyleLabel={heroText?.art_style_label}
                      speciesLabel={heroText?.species_label}
                      genderPlaceholder={heroText?.gender_placeholder}
                      artStylePlaceholder={heroText?.art_style_placeholder}
                      speciesPlaceholder={heroText?.species_placeholder}
                      speciesCustomLabel={heroText?.species_custom}
                      speciesCustomPlaceholder={heroText?.species_custom_placeholder}
                      genderOptionLabels={heroText?.gender_options}
                    />
                  </div>
                </div>

                <div className="relative h-px">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border border-primary/30 bg-primary/20 backdrop-blur-[1px]" />
                </div>

                <RandomSuggestions
                  label={
                    heroText?.suggestions?.label || heroText?.suggestions_label
                  }
                  refreshLabel={heroText?.suggestions?.refresh}
                  manualButton={heroText?.manual_button}
                  suggestions={suggestions}
                  onManualCreate={handleManualCreate}
                  onRefresh={refreshSuggestions}
                  onSuggestionSelect={handleSuggestionPreset}
                />
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 w-full max-w-md">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/50" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 whitespace-nowrap">
              {quickGenText?.or || "OR"}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/50" />
          </div>

          <button
            onClick={handleManualCreate}
            disabled={isGenerating}
            className="group relative flex items-center gap-3 px-8 py-3 bg-secondary/10 hover:bg-secondary/20 border-2 border-secondary/30 rounded-2xl transition-all duration-300 shadow-[4px_4px_0px_0px_color-mix(in_srgb,var(--color-secondary),black_10%)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:scale-95 active:translate-x-1 active:translate-y-1"
          >
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold text-secondary-foreground uppercase tracking-wide">
                {heroText?.manual_button || "Start from scratch"}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {heroText?.suggestions?.manual_hint ||
                  "Manually edit every detail of your OC"}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-secondary/20 group-hover:bg-secondary/30 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-secondary transition-transform group-hover:translate-x-1"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {heroText?.info_text && (
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>{heroText.info_text}</p>
          </div>
        )}
      </div>
    </>
  );
}
