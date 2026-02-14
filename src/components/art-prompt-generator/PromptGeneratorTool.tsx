"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArtPromptGeneratorPage } from "@/types/pages/art-prompt-generator";
import { cn } from "@/lib/utils";
import wordBankData from "@/configs/prompts/art-prompt-generator.json";
import {
  LockState,
  PromptDimensionKey,
  PromptItem,
  PromptState,
  WordBank,
} from "./types";
import { PromptDimensionCard } from "./PromptDimensionCard";
import { GeneratedPromptDisplay } from "./GeneratedPromptDisplay";

const dimensionOrder: PromptDimensionKey[] = [
  "subject",
  "action",
  "setting",
  "style",
  "modifier",
];

const initialPromptState: PromptState = {
  subject: null,
  action: null,
  setting: null,
  style: null,
  modifier: null,
};

const initialLockState: LockState = {
  subject: false,
  action: false,
  setting: false,
  style: false,
  modifier: false,
};

const wordBank = wordBankData as WordBank;

const getListByDimension = (
  dimension: PromptDimensionKey
): PromptItem[] => {
  switch (dimension) {
    case "subject":
      return wordBank.subjects;
    case "action":
      return wordBank.actions;
    case "setting":
      return wordBank.settings;
    case "style":
      return wordBank.styles;
    case "modifier":
      return wordBank.modifiers;
  }
};

const getRandomItem = (items: PromptItem[]): PromptItem => {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  const random = Math.random() * totalWeight;
  let accumulated = 0;

  for (const item of items) {
    accumulated += item.weight ?? 1;
    if (random <= accumulated) {
      return item;
    }
  }

  return items[items.length - 1];
};

const assemblePrompt = (state: PromptState): string => {
  const parts: string[] = [];

  if (state.subject?.text) {
    parts.push(state.subject.text);
  }
  if (state.action?.text) {
    parts.push(state.action.text);
  }
  if (state.setting?.text) {
    parts.push(state.setting.text);
  }
  if (state.style?.text) {
    parts.push(`${state.style.text} style`);
  }
  if (state.modifier?.text) {
    parts.push(state.modifier.text);
  }

  if (!parts.length) {
    return "";
  }

  const body = parts.join(", ");
  return state.subject ? `A ${body}` : body;
};

interface PromptGeneratorToolProps {
  pageData: ArtPromptGeneratorPage;
  className?: string;
}

export function PromptGeneratorTool({
  pageData,
  className,
}: PromptGeneratorToolProps) {
  const router = useRouter();
  const [promptState, setPromptState] =
    useState<PromptState>(initialPromptState);
  const [lockState, setLockState] = useState<LockState>(initialLockState);
  const [animationState, setAnimationState] = useState<{
    isGenerating: boolean;
    currentDimension: PromptDimensionKey | null;
  }>({
    isGenerating: false,
    currentDimension: null,
  });
  const [animationTokens, setAnimationTokens] = useState<
    Record<PromptDimensionKey, number>
  >(() => ({
    subject: 0,
    action: 0,
    setting: 0,
    style: 0,
    modifier: 0,
  }));
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearScheduledAnimations = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current = [];
  }, []);

  useEffect(
    () => () => {
      clearScheduledAnimations();
    },
    [clearScheduledAnimations]
  );

  const dimensionLabels = pageData.tool?.dimensions;

  const assembledPrompt = useMemo(
    () => assemblePrompt(promptState),
    [promptState]
  );

  const handleLockToggle = useCallback((dimension: PromptDimensionKey) => {
    setLockState((prev) => ({
      ...prev,
      [dimension]: !prev[dimension],
    }));
  }, []);

  const runSlotSequence = useCallback(
    (finalState: PromptState) => {
      clearScheduledAnimations();
      const animationDuration = 900;
      const gap = 200;
      let delay = 0;
      let totalDuration = 0;
      let hasAnimated = false;

      dimensionOrder.forEach((dimension, index) => {
        if (lockState[dimension]) {
          return;
        }

        hasAnimated = true;
        const startDelay = delay;
        const startTimeout = setTimeout(() => {
          setAnimationState({
            isGenerating: true,
            currentDimension: dimension,
          });
          setAnimationTokens((prev) => ({
            ...prev,
            [dimension]: Date.now(),
          }));
        }, startDelay);
        timeoutsRef.current.push(startTimeout);

        const finishTimeout = setTimeout(() => {
          setPromptState((prev) => ({
            ...prev,
            [dimension]: finalState[dimension],
          }));
        }, startDelay + animationDuration);
        timeoutsRef.current.push(finishTimeout);

        delay += animationDuration + gap;
        totalDuration = startDelay + animationDuration;
      });

      const completeTimeout = setTimeout(() => {
        setAnimationState({
          isGenerating: false,
          currentDimension: null,
        });
        setPromptState((prev) => ({
          ...prev,
          ...finalState,
        }));
      }, totalDuration + 20);
      timeoutsRef.current.push(completeTimeout);

      if (!hasAnimated) {
        setAnimationState({
          isGenerating: false,
          currentDimension: null,
        });
      }
    },
    [clearScheduledAnimations, lockState]
  );

  const handleGenerate = useCallback(() => {
    if (animationState.isGenerating) {
      return;
    }

    const selectableDimensions = dimensionOrder.filter(
      (dimension) => !lockState[dimension]
    );

    if (!selectableDimensions.length) {
      toast.info(
        pageData.tool?.unlock_notice ||
          "Unlock at least one dimension to generate a new prompt."
      );
      return;
    }

    const nextState = dimensionOrder.reduce<PromptState>((acc, dimension) => {
      if (lockState[dimension]) {
        acc[dimension] = promptState[dimension];
      } else {
        const items = getListByDimension(dimension);
        acc[dimension] = getRandomItem(items);
      }
      return acc;
    }, {} as PromptState);

    runSlotSequence(nextState);
  }, [
    animationState.isGenerating,
    lockState,
    pageData.tool?.unlock_notice,
    promptState,
    runSlotSequence,
  ]);

  const handleCopy = useCallback(() => {
    if (!assembledPrompt) return;
    navigator.clipboard
      .writeText(assembledPrompt)
      .then(() => {
        toast.success(
          pageData.tool?.copy_success ||
            pageData.generated_prompt?.copied ||
            "Prompt copied"
        );
      })
      .catch(() => {
        toast.error(
          pageData.tool?.copy_failed ||
            pageData.showcase?.copy_failed ||
            "Failed to copy prompt"
        );
      });
  }, [assembledPrompt, pageData.generated_prompt?.copied, pageData.tool]);

  const handleUseInGenerator = useCallback(() => {
    if (!assembledPrompt) return;
    const params = new URLSearchParams({
      prompt: assembledPrompt,
      preset: "none",
    });
    router.push(`/ai-anime-generator?${params.toString()}`);
  }, [assembledPrompt, router]);

  return (
    <section
      className={cn(
        "w-full rounded-[32px] border bg-muted/20 p-4 lg:p-8",
        className
      )}
    >
      <div className="flex flex-col gap-6 lg:gap-8 h-full">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wide">
              {pageData.hero?.eyebrow || "Creative Tools"}
            </p>
            <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
              {pageData.tool?.title || "Prompt Playground"}
            </h1>
            <p className="mt-1 lg:mt-2 text-xs lg:text-sm text-muted-foreground">
              {pageData.tool?.description ||
                "Combine dimensions like a slot machine and discover new prompts."}
            </p>
          </div>
        </div>

        {/* Top: Dimension Cards */}
        <div className="grid grid-cols-1 gap-3 lg:gap-4 md:grid-cols-2 lg:grid-cols-5">
          {dimensionOrder.map((dimension) => (
            <PromptDimensionCard
              key={dimension}
              label={
                dimensionLabels?.[dimension] ||
                dimension.charAt(0).toUpperCase() + dimension.slice(1)
              }
              value={promptState[dimension]}
              isLocked={lockState[dimension]}
              onLockToggle={() => handleLockToggle(dimension)}
              isAnimating={
                animationState.isGenerating &&
                animationState.currentDimension === dimension
              }
              animationToken={animationTokens[dimension]}
              items={getListByDimension(dimension)}
              lockTooltip={pageData.tool?.lock_tooltip}
              unlockTooltip={pageData.tool?.unlock_tooltip}
              disabled={animationState.isGenerating}
            />
          ))}
        </div>

        {/* Bottom: 8:2 Split */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6 items-stretch flex-1 min-h-0">
          <div className="lg:col-span-8 min-h-[200px] lg:min-h-0">
            <GeneratedPromptDisplay
              title={pageData.generated_prompt?.title || "Generated Prompt"}
              subtitle={pageData.generated_prompt?.subtitle}
              prompt={assembledPrompt}
              placeholder={
                pageData.generated_prompt?.placeholder ||
                pageData.tool?.empty_state ||
                "Spin the prompt slot machine to get started."
              }
              className="h-full"
            />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-2 lg:gap-3">
            <Button
              type="button"
              size="lg"
              className="w-full h-full min-h-[50px] lg:h-auto lg:flex-1"
              onClick={handleGenerate}
              disabled={animationState.isGenerating}
            >
              {animationState.isGenerating
                ? pageData.tool?.generating || "Generating..."
                : pageData.tool?.generate_button || "Generate Inspiration"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full py-2 lg:py-3"
              onClick={handleCopy}
              disabled={!assembledPrompt || animationState.isGenerating}
            >
              {pageData.tool?.copy_prompt || "Copy Prompt"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full py-2 lg:py-3"
              onClick={handleUseInGenerator}
              disabled={!assembledPrompt || animationState.isGenerating}
            >
              {pageData.tool?.use_in_generator ||
                pageData.generated_prompt?.use_button ||
                "Use in AI Generator"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
