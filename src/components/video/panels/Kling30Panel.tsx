"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ReferenceImageUpload } from "@/components/anime-generator/ReferenceImageUpload";
import type { AnimeGeneratorPage } from "@/types/pages/landing";
import { PlusIcon, Trash2Icon } from "lucide-react";

export type Kling30Segment = {
  prompt: string;
  duration: number;
};

interface Kling30PanelProps {
  pageData: AnimeGeneratorPage;
  disabled?: boolean;
  supportsMultiShot?: boolean;
  soundEnabled: boolean;
  isMultiShotMode: boolean;
  startFrameImage: string[];
  endFrameImage: string[];
  segments: Kling30Segment[];
  maxTotalDuration: number;
  onAuthError?: () => void;
  onSoundChange: (checked: boolean) => void;
  onToggleMultiShot: (checked: boolean) => void;
  onStartFrameChange: (images: string[]) => void;
  onEndFrameChange: (images: string[]) => void;
  onSegmentsChange: (segments: Kling30Segment[]) => void;
  onPrimaryPromptChange: (value: string) => void;
}

const MAX_SEGMENTS = 8;
const NON_MULTI_SHOT_MIN_DURATION = 3;
const NON_MULTI_SHOT_MAX_DURATION = 15;
const MULTI_SHOT_MIN_DURATION = 3;
const MULTI_SHOT_MAX_DURATION = 12;

export function Kling30Panel({
  pageData,
  disabled = false,
  supportsMultiShot = false,
  soundEnabled,
  isMultiShotMode,
  startFrameImage,
  endFrameImage,
  segments,
  maxTotalDuration,
  onAuthError,
  onSoundChange,
  onToggleMultiShot,
  onStartFrameChange,
  onEndFrameChange,
  onSegmentsChange,
  onPrimaryPromptChange,
}: Kling30PanelProps) {
  const safeSegments =
    segments.length > 0 ? segments : [{ prompt: "", duration: 5 }];
  const displaySegments = isMultiShotMode ? safeSegments : [safeSegments[0]];
  const resolvedSoundEnabled = isMultiShotMode ? true : soundEnabled;
  const durationOptions = isMultiShotMode
    ? Array.from(
        { length: MULTI_SHOT_MAX_DURATION - MULTI_SHOT_MIN_DURATION + 1 },
        (_, i) => MULTI_SHOT_MIN_DURATION + i,
      )
    : Array.from(
        {
          length: NON_MULTI_SHOT_MAX_DURATION - NON_MULTI_SHOT_MIN_DURATION + 1,
        },
        (_, i) => NON_MULTI_SHOT_MIN_DURATION + i,
      );

  const updateSegment = (index: number, next: Partial<Kling30Segment>) => {
    const nextSegments = safeSegments.map((item, segIdx) =>
      segIdx === index ? { ...item, ...next } : item,
    );
    onSegmentsChange(nextSegments);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">
            {pageData?.reference?.["start-frame"] || "Start Frame(optional)"}
          </label>
          <ReferenceImageUpload
            value={startFrameImage}
            onChange={(images) => onStartFrameChange(images.slice(0, 1))}
            disabled={disabled}
            pageData={pageData}
            maxImages={1}
            showTitle={false}
            previewVariant="cover"
            coverHeightClassName="h-24"
            onAuthError={onAuthError}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">
            {pageData?.reference?.["end-frame"] || "End Frame(optional)"}
          </label>
          <ReferenceImageUpload
            value={endFrameImage}
            onChange={(images) => onEndFrameChange(images.slice(0, 1))}
            disabled={disabled || isMultiShotMode}
            disabledReason={
              isMultiShotMode
                ? pageData?.reference?.["end-frame-disabled-multi-shot"] ||
                  "End frame is disabled in multi-shot mode."
                : undefined
            }
            pageData={pageData}
            maxImages={1}
            showTitle={false}
            previewVariant="cover"
            coverHeightClassName="h-24"
            onAuthError={onAuthError}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-md border border-border/70 p-2">
          <div>
            <p className="text-xs font-medium">
              {pageData?.parameters?.sound || "Sound"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {pageData?.parameters?.sound_description ||
                "Enable model-generated sound for this video."}
            </p>
          </div>
          <Switch
            checked={resolvedSoundEnabled}
            onCheckedChange={onSoundChange}
            disabled={disabled || isMultiShotMode}
          />
        </div>

        {supportsMultiShot && (
          <div className="flex items-center justify-between rounded-md border border-border/70 p-2">
            <div>
              <p className="text-xs font-medium">
                {pageData?.parameters?.multi_shots || "Multi Shots"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {pageData?.parameters?.["multi_shot_switch_hint"] ||
                  "Enable to configure multiple prompt and duration segments."}
              </p>
            </div>
            <Switch
              checked={isMultiShotMode}
              onCheckedChange={onToggleMultiShot}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {isMultiShotMode && (
        <p className="text-[11px] text-muted-foreground">
          {pageData?.reference?.["multi-shots-first-frame-only"] ||
            "Multi-shots is enabled. Only the first frame image will be used."}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground block">
            {pageData?.parameters?.["multi_shot_script"] || "Multi-Shot Script"}
          </label>
          {isMultiShotMode && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() =>
                onSegmentsChange([...safeSegments, { prompt: "", duration: 3 }])
              }
              disabled={disabled || safeSegments.length >= MAX_SEGMENTS}
            >
              <PlusIcon className="h-3.5 w-3.5 mr-1" />
              {pageData?.parameters?.["add-shot"] || "Add Shot"}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {displaySegments.map((segment, index) => (
            <div
              key={`kling-shot-${index}`}
              className="rounded-md border border-border/70 p-2 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {isMultiShotMode
                    ? (
                        pageData?.parameters?.["shot-label"] || "Shot {index}"
                      ).replace("{index}", String(index + 1))
                    : pageData?.parameters?.["single-shot-label"] ||
                      pageData?.prompt?.label ||
                      "Prompt"}
                </span>
                {isMultiShotMode && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    disabled={disabled || safeSegments.length <= 1}
                    onClick={() =>
                      onSegmentsChange(
                        safeSegments.filter((_, segIdx) => segIdx !== index),
                      )
                    }
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <Textarea
                value={segment.prompt}
                onChange={(event) => {
                  const nextPrompt = event.target.value;
                  updateSegment(index, { prompt: nextPrompt });
                  if (index === 0) {
                    onPrimaryPromptChange(nextPrompt);
                  }
                }}
                rows={2}
                className="text-sm resize-none"
                placeholder={
                  pageData?.parameters?.["multi_shot_prompt_placeholder"] ||
                  "Describe this shot..."
                }
                disabled={disabled}
              />

              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0">
                  {pageData?.parameters?.duration || "Duration"}
                </label>
                <Select
                  value={String(segment.duration)}
                  onValueChange={(value) =>
                    updateSegment(index, { duration: Number(value) })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((seconds) => (
                      <SelectItem
                        key={`kling-duration-${seconds}`}
                        value={String(seconds)}
                      >
                        {seconds}s
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground">
          {(
            pageData?.parameters?.["multi_shot_total_duration"] ||
            "Total duration: {current}/{max} seconds"
          )
            .replace(
              "{current}",
              String(
                safeSegments.reduce(
                  (sum, segment) => sum + (Number(segment.duration) || 0),
                  0,
                ),
              ),
            )
            .replace("{max}", String(maxTotalDuration))}
        </p>
      </div>
    </div>
  );
}
