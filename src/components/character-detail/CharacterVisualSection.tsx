"use client";

import type { CharacterDetailPage } from "@/types/pages/landing";
import characterColors from "@/configs/colors/character-colors.json";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Info,
  RefreshCw,
  Plus,
  X,
  Wand2,
  Loader2,
  ChevronDown,
  Palette,
} from "lucide-react";
import characterOptions from "@/configs/characters/characters.json";
import characterStyles from "@/configs/styles/character_styles.json";
import { getImageUrl, getCreamyCharacterUrl } from "@/lib/asset-loader";
import { useTranslations } from "next-intl";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";

interface CharacterVisualSectionProps {
  name: string;
  characterImageUrl?: string | null;
  bodyType?: string;
  hairStyle?: string;
  hairColor?: string;
  eyeColor?: string;
  outfitStyle?: string;
  artStyle?: string;
  apperanceFeatures?: string[];
  accessories?: string[];
  pageData: CharacterDetailPage;
  isOwner?: boolean;
  isEditMode?: boolean;
  onGenerate?: (options?: { skipDialog?: boolean }) => void;
  onRandomize?: () => void;
  isGenerating?: boolean;
  hideImage?: boolean;
  hideTitle?: boolean;
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
  onVisualDraftChange?: (
    updates: Partial<{
      body_type: string;
      hair_style: string;
      hair_color: string;
      eye_color: string;
      outfit_style: string;
      art_style: string;
      appearance_features: string[];
      accessories: string[];
    }>,
  ) => void;
}

function LabelWithHelp({
  label,
  description,
  examples,
  examplesLabel,
}: {
  label: string;
  description?: string;
  examples?: string;
  examplesLabel?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
        {label}
      </label>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3 h-3 text-muted-foreground/40 cursor-help hover:text-primary transition-colors" />
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="w-fit max-w-[180px] px-2.5 py-2 rounded-xl border-border/50 bg-popover/95 backdrop-blur-md shadow-xl"
          >
            <div className="space-y-1">
              {description && (
                <p className="text-[10px] font-bold leading-tight text-foreground/90">
                  {description}
                </p>
              )}
              {examples && (
                <div className="pt-1 border-t border-border/40">
                  <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/50 block mb-0.5">
                    {examplesLabel || ""}
                  </span>
                  <p className="text-[9px] italic text-primary/80 leading-snug font-medium">
                    {examples}
                  </p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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

  const add = () => {
    if (!input.trim()) return;
    if (values.includes(input.trim())) {
      setInput("");
      return;
    }
    onChange([...values, input.trim()]);
    setInput("");
  };

  const remove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-6 text-[10px] px-2 bg-background/50 border-border/60"
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={add}
          className="h-6 w-6 p-0 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v, i) => (
            <Badge
              key={`${v}-${i}`}
              variant="secondary"
              className="text-[9px] px-1.5 py-0 h-5 gap-1 hover:bg-secondary/80 font-normal group"
            >
              {v}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  remove(i);
                }}
                className="hover:text-destructive transition-colors focus:outline-none"
              >
                <X className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function CharacterVisualSection({
  name,
  characterImageUrl,
  bodyType,
  hairStyle,
  hairColor,
  eyeColor,
  outfitStyle,
  artStyle,
  apperanceFeatures = [],
  accessories = [],
  pageData,
  isOwner,
  isEditMode,
  onGenerate,
  isGenerating = false,
  hideImage = false,
  hideTitle = false,
  visualDraft,
  onVisualDraftChange,
}: CharacterVisualSectionProps) {
  const tCharacterStyles = useTranslations("character_styles");
  const visualsCopy = pageData.visuals || {};
  const visualLabels = visualsCopy.labels || {};
  const visualDescriptions = visualsCopy.descriptions || {};
  const visualExamples = visualsCopy.examples || {};
  const visualPlaceholders = visualsCopy.placeholders || {};
  const visualStatus = visualsCopy.status || {};
  const visualAria = visualsCopy.aria || {};
  const [isExpanded, setIsExpanded] = useState(false);
  const bodyTypeOptions = characterOptions.appearance_options.body_types.map(
    (item) => item.key,
  );
  const hairStyleOptions = characterOptions.appearance_options.hair_styles.map(
    (item) => item.key,
  );
  const artStyleOptions = useMemo(
    () =>
      (characterStyles?.items || [])
        .filter((item) => item?.status === "active")
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999)),
    [],
  );
  const selectedArtStyle = artStyleOptions.find(
    (item) => item.key === visualDraft?.art_style,
  );
  const resolveStyleName = (style?: (typeof artStyleOptions)[number]) => {
    if (!style) return "";
    const key = `${style.key}.name`;
    if (typeof tCharacterStyles.has === "function" && !tCharacterStyles.has(key)) {
      return style.name;
    }
    try {
      return tCharacterStyles(key);
    } catch {
      return style.name;
    }
  };
  const selectedArtStyleName = resolveStyleName(selectedArtStyle);
  const { displayUrl: resolvedCharacterImageUrl, isLoading: isResolvingImage } =
    useResolvedImageUrl(characterImageUrl);
  const hasPortrait = Boolean(
    resolvedCharacterImageUrl || characterImageUrl || isGenerating,
  );

  const normalizeHex = useCallback((hex: string): string => {
    if (!hex) return "";
    const trimmed = hex.trim();
    if (!trimmed) return "";
    const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    return prefixed.toLowerCase();
  }, []);

  const isHexColor = useCallback(
    (hex: string | null | undefined) =>
      !!hex && /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(normalizeHex(hex || "")),
    [normalizeHex],
  );

  const resolveColorCode = useMemo(
    () => (color: string | null | undefined, type: "hair" | "eye") => {
      if (!color) return null;
      const trimmed = color.trim();
      if (!trimmed) return null;

      if (isHexColor(trimmed)) {
        return normalizeHex(trimmed);
      }

      const palette =
        type === "hair"
          ? characterColors.hair_colors
          : characterColors.eye_colors;

      const match = palette.find(
        (item: { key: string; code: string }) =>
          item.key.toLowerCase() === trimmed.toLowerCase() ||
          item.code.toLowerCase() === trimmed.toLowerCase(),
      );

      return match ? normalizeHex(match.code) : null;
    },
    [isHexColor, normalizeHex],
  );

  const hairColorCode = resolveColorCode(hairColor, "hair");
  const eyeColorCode = resolveColorCode(eyeColor, "eye");

  const renderColorSwatch = (label: string, colorCode: string | null) => {
    if (!colorCode) return null;
    return (
      <span className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 px-2.5 py-1 text-[10px] font-bold text-foreground uppercase tracking-wider max-w-[140px]">
        <span className="truncate">{label}</span>
        <span
          className="h-3 w-3 shrink-0 rounded-md border border-white/20 shadow-sm"
          style={{ backgroundColor: colorCode }}
          aria-label={
            visualAria?.color_preview
              ? visualAria.color_preview.replace("{label}", label)
              : ""
          }
        />
      </span>
    );
  };

  // Always show features in display mode as requested
  const showFeatures = true;

  return (
    <div className="flex flex-col gap-2">
      {hasPortrait && !hideImage && (
        <div className="relative w-full overflow-visible pt-1">
          <div className="group relative z-0 aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted/20 animate-in fade-in zoom-in duration-500 transition-transform duration-500 will-change-transform hover:z-20 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/25">
            {isGenerating ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/40 backdrop-blur-sm transition-all">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-primary/70 animate-pulse text-center px-4">
                  {visualStatus.generating_portrait || ""}
                </p>
              </div>
            ) : null}

            {isResolvingImage && !resolvedCharacterImageUrl ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            ) : null}

            {resolvedCharacterImageUrl ? (
              <img
                src={resolvedCharacterImageUrl}
                alt={name}
                className={cn(
                  "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
                  isGenerating && "opacity-50 blur-sm",
                )}
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Smooth Animated Content Area */}
      <div
        className={cn(
          "grid transition-all duration-500 ease-in-out",
          showFeatures
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "rounded-2xl border border-border/40 bg-muted/10 p-5 mb-4",
              hideImage && "border-none bg-transparent p-0 mt-0",
            )}
          >
            <div
              className={cn(
                "max-h-[35rem] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden",
                hideImage && "max-h-none overflow-visible",
              )}
            >
              {isEditMode && visualDraft && onVisualDraftChange ? (
                <div className="space-y-4 p-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                    {/* Body Type */}
                    <div className="space-y-2">
                      <LabelWithHelp
                        label={visualLabels.body_type || ""}
                        description={visualDescriptions.body_type || ""}
                        examples={visualExamples.body_type || ""}
                        examplesLabel={visualLabels.examples || ""}
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="flex items-center gap-1.5 bg-background/50 border border-border/60 rounded-xl px-2.5 h-9 w-full cursor-pointer hover:bg-background/80 transition-all">
                            <span className="h-full w-full flex items-center text-[12px] font-medium text-foreground/80 capitalize truncate">
                              {visualDraft.body_type || visualLabels.body_type_auto_balanced || ""}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground/40" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-3 rounded-xl bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl"
                          align="start"
                        >
                          <div className="space-y-3">
                            <Input
                              value={visualDraft.body_type}
                              onChange={(e) =>
                                onVisualDraftChange({
                                  body_type: e.target.value,
                                })
                              }
                              placeholder={visualPlaceholders.body_type || ""}
                              className="h-8 text-xs px-3 bg-muted/50 border-none rounded-lg"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onVisualDraftChange({ body_type: "" })
                                }
                                className="px-2 py-1 text-[10px] rounded-md border border-border/40 text-muted-foreground/70 hover:bg-muted/40"
                              >
                                {visualLabels.auto || ""}
                              </button>
                              {bodyTypeOptions.map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() =>
                                    onVisualDraftChange({ body_type: item })
                                  }
                                  className="px-2 py-1 text-[10px] rounded-md border border-border/40 text-foreground/80 hover:bg-muted/40 capitalize"
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Hair Style */}
                    <div className="space-y-2">
                      <LabelWithHelp
                        label={visualLabels.hair_style || ""}
                        description={visualDescriptions.hair_style || ""}
                        examples={visualExamples.hair_style || ""}
                        examplesLabel={visualLabels.examples || ""}
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="flex items-center gap-1.5 bg-background/50 border border-border/60 rounded-xl px-2.5 h-9 w-full cursor-pointer hover:bg-background/80 transition-all">
                            <span className="h-full w-full flex items-center text-[12px] font-medium text-foreground/80 capitalize truncate">
                              {visualDraft.hair_style || visualLabels.hair_style_auto_default || ""}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground/40" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-3 rounded-xl bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl"
                          align="start"
                        >
                          <div className="space-y-3">
                            <Input
                              value={visualDraft.hair_style}
                              onChange={(e) =>
                                onVisualDraftChange({
                                  hair_style: e.target.value,
                                })
                              }
                              placeholder={visualPlaceholders.hair_style || ""}
                              className="h-8 text-xs px-3 bg-muted/50 border-none rounded-lg"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              {hairStyleOptions.map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() =>
                                    onVisualDraftChange({ hair_style: item })
                                  }
                                  className="px-2 py-1 text-[10px] rounded-md border border-border/40 text-foreground/80 hover:bg-muted/40 capitalize"
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                      <div className="space-y-2">
                      <LabelWithHelp
                        label={visualLabels.hair_color || ""}
                        description={visualDescriptions.hair_color || ""}
                        examples={visualExamples.hair_color || ""}
                        examplesLabel={visualLabels.examples || ""}
                      />
                        <Popover>
                          <PopoverTrigger asChild>
                          <button className="flex items-center justify-between gap-3 bg-background/50 border border-border/60 rounded-xl px-3 h-9 w-full overflow-hidden">
                              <span className="text-[12px] font-medium text-foreground/80 capitalize truncate">
                                {visualDraft.hair_color || visualLabels.select_color || ""}
                              </span>
                              <div
                              className="w-4 h-4 shrink-0 rounded-full border border-border/50 shadow-sm flex items-center justify-center overflow-hidden"
                                style={{
                                  backgroundColor:
                                    resolveColorCode(
                                      visualDraft.hair_color,
                                      "hair",
                                    ) || "transparent",
                                }}
                              >
                                {!resolveColorCode(
                                  visualDraft.hair_color,
                                  "hair",
                                ) && (
                                  <div className="w-full h-px bg-foreground/20 rotate-45" />
                                )}
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 rounded-2xl bg-popover/95 backdrop-blur-xl border-border/50">
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Input
                                  value={visualDraft.hair_color}
                                  onChange={(e) =>
                                    onVisualDraftChange({
                                      hair_color: e.target.value,
                                    })
                                  }
                                  placeholder={visualPlaceholders.hair_color || ""}
                                  className="h-7 text-xs bg-muted/50 border-none rounded-lg flex-1"
                                />
                                <div className="relative">
                                  <input
                                    type="color"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    value={
                                      resolveColorCode(
                                        visualDraft.hair_color,
                                        "hair",
                                      ) || "#000000"
                                    }
                                    onChange={(e) =>
                                      onVisualDraftChange({
                                        hair_color: e.target.value,
                                      })
                                    }
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 bg-muted/50 hover:bg-muted/80 rounded-lg"
                                  >
                                    <Palette className="w-4 h-4 text-primary" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-5 gap-1.5">
                                {characterColors.hair_colors.map((c) => (
                                  <button
                                    key={c.key}
                                    type="button"
                                    className={cn(
                                      "w-7 h-7 rounded-lg border-2 border-transparent transition-all hover:scale-110",
                                      visualDraft.hair_color === c.key &&
                                        "border-primary",
                                    )}
                                    style={{ backgroundColor: c.code }}
                                    onClick={() =>
                                      onVisualDraftChange({ hair_color: c.key })
                                    }
                                    title={c.key}
                                  />
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                      <LabelWithHelp
                        label={visualLabels.eye_color || ""}
                        description={visualDescriptions.eye_color || ""}
                        examples={visualExamples.eye_color || ""}
                        examplesLabel={visualLabels.examples || ""}
                      />
                        <Popover>
                          <PopoverTrigger asChild>
                          <button className="flex items-center justify-between gap-3 bg-background/50 border border-border/60 rounded-xl px-3 h-9 w-full overflow-hidden">
                              <span className="text-[12px] font-medium text-foreground/80 capitalize truncate">
                                {visualDraft.eye_color || visualLabels.select_color || ""}
                              </span>
                              <div
                              className="w-4 h-4 shrink-0 rounded-full border border-border/50 shadow-sm flex items-center justify-center overflow-hidden"
                                style={{
                                  backgroundColor:
                                    resolveColorCode(
                                      visualDraft.eye_color,
                                      "eye",
                                    ) || "transparent",
                                }}
                              >
                                {!resolveColorCode(
                                  visualDraft.eye_color,
                                  "eye",
                                ) && (
                                  <div className="w-full h-px bg-foreground/20 rotate-45" />
                                )}
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 rounded-2xl bg-popover/95 backdrop-blur-xl border-border/50">
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <Input
                                  value={visualDraft.eye_color}
                                  onChange={(e) =>
                                    onVisualDraftChange({
                                      eye_color: e.target.value,
                                    })
                                  }
                                  placeholder={visualPlaceholders.eye_color || ""}
                                  className="h-7 text-xs bg-muted/50 border-none rounded-lg flex-1"
                                />
                                <div className="relative">
                                  <input
                                    type="color"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    value={
                                      resolveColorCode(
                                        visualDraft.eye_color,
                                        "eye",
                                      ) || "#000000"
                                    }
                                    onChange={(e) =>
                                      onVisualDraftChange({
                                        eye_color: e.target.value,
                                      })
                                    }
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 bg-muted/50 hover:bg-muted/80 rounded-lg"
                                  >
                                    <Palette className="w-4 h-4 text-primary" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-5 gap-1.5">
                                {characterColors.eye_colors.map((c) => (
                                  <button
                                    key={c.key}
                                    type="button"
                                    className={cn(
                                      "w-7 h-7 rounded-lg border-2 border-transparent transition-all hover:scale-110",
                                      visualDraft.eye_color === c.key &&
                                        "border-primary",
                                    )}
                                    style={{ backgroundColor: c.code }}
                                    onClick={() =>
                                      onVisualDraftChange({ eye_color: c.key })
                                    }
                                    title={c.key}
                                  />
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <LabelWithHelp
                      label={visualLabels.outfit_style || ""}
                      description={visualDescriptions.outfit_style || ""}
                      examples={visualExamples.outfit_style || ""}
                      examplesLabel={visualLabels.examples || ""}
                    />
                    <Input
                      value={visualDraft.outfit_style}
                      onChange={(e) =>
                        onVisualDraftChange({ outfit_style: e.target.value })
                      }
                      placeholder={visualPlaceholders.outfit_style || ""}
                      className="h-9 text-sm px-3 bg-background/50 border-border/60 rounded-xl focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <LabelWithHelp
                        label={visualLabels.special_features || ""}
                        description={visualDescriptions.special_features || ""}
                        examples={visualExamples.special_features || ""}
                        examplesLabel={visualLabels.examples || ""}
                      />
                      <ListEditor
                        values={visualDraft.appearance_features}
                        onChange={(newValues) =>
                          onVisualDraftChange({
                            appearance_features: newValues,
                          })
                        }
                        placeholder={visualPlaceholders.feature || ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <LabelWithHelp
                        label={visualLabels.accessories || ""}
                        description={visualDescriptions.accessories || ""}
                        examples={visualExamples.accessories || ""}
                        examplesLabel={visualLabels.examples || ""}
                      />
                      <ListEditor
                        values={visualDraft.accessories}
                        onChange={(newValues) =>
                          onVisualDraftChange({ accessories: newValues })
                        }
                        placeholder={visualPlaceholders.accessory || ""}
                      />
                    </div>
                  </div>

                  {/* New Actions Row */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                        {visualLabels.style || ""}
                      </span>
                      <Select
                        value={visualDraft.art_style}
                        onValueChange={(value) =>
                          onVisualDraftChange({ art_style: value })
                        }
                      >
                        <SelectTrigger className="h-10 w-[200px] rounded-xl border border-border/60 bg-background/50 px-2.5 hover:bg-background/80 transition-all">
                          {selectedArtStyle ? (
                            <div className="flex items-center gap-2">
                              {selectedArtStyle.thumbnail_url ? (
                                <div className="h-9 w-7 overflow-hidden rounded-md border border-border/40">
                                  <img
                                    src={getImageUrl(
                                      selectedArtStyle.thumbnail_url,
                                    )}
                                    alt={selectedArtStyleName}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : null}
                              <span className="text-[11px] font-semibold text-foreground/80 truncate">
                                {selectedArtStyleName}
                              </span>
                            </div>
                          ) : (
                            <SelectValue placeholder={visualLabels.select_style || ""} />
                          )}
                        </SelectTrigger>
                        <SelectContent className="min-w-[220px] max-h-[220px] overflow-y-auto pr-1">
                          {artStyleOptions.map((option) => {
                            const optionName = resolveStyleName(option);
                            return (
                              <SelectItem
                                key={option.key}
                                value={option.key}
                                className="py-1.5"
                              >
                                <div className="flex items-center gap-4">
                                  {option.thumbnail_url ? (
                                    <div className="h-12 w-9 flex-shrink-0 overflow-hidden rounded-md border border-border/50">
                                      <img
                                        src={getImageUrl(option.thumbnail_url)}
                                        alt={optionName}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : null}
                                  <span className="font-bold">{optionName}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      onClick={() => onGenerate?.({ skipDialog: true })}
                      disabled={isGenerating || !onGenerate}
                      className="ml-auto gap-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-black px-4 h-9 shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                      <div className="flex items-center gap-1.5">
                        {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span className="text-[10px] uppercase tracking-wider">
                          {isGenerating
                            ? visualStatus.generating || ""
                            : visualLabels.generate || ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5">
                        <img src={getCreamyCharacterUrl("meow_coin")} className="w-3 h-3" alt="" />
                        <span className="text-[10px] font-black text-white">30</span>
                      </div>
                    </Button>
                  </div>
                  {pageData.portrait_generation?.generate_description && (
                    <p className="text-[10px] text-muted-foreground/60 text-right mt-2 px-1 leading-tight italic">
                      {pageData.portrait_generation.generate_description}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {(bodyType || hairStyle || hairColorCode || eyeColorCode) && (
                    <div className="flex flex-wrap gap-1.5">
                      {bodyType && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-muted border border-border/50 text-foreground/70 rounded-full text-[9px] font-medium leading-none uppercase tracking-wider max-w-[120px]">
                          <span className="truncate">
                            {(visualLabels.body_suffix || "{value}").replace(
                              "{value}",
                              bodyType,
                            )}
                          </span>
                        </span>
                      )}
                      {hairStyle && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-muted border border-border/50 text-foreground/70 rounded-full text-[9px] font-medium leading-none uppercase tracking-wider max-w-[120px]">
                          <span className="truncate">
                            {(visualLabels.hair_suffix || "{value}").replace(
                              "{value}",
                              hairStyle,
                            )}
                          </span>
                        </span>
                      )}
                      {renderColorSwatch(visualLabels.hair_swatch || "", hairColorCode)}
                      {renderColorSwatch(visualLabels.eye_swatch || "", eyeColorCode)}
                    </div>
                  )}

                  <div className="space-y-4">
                    {outfitStyle && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-primary/40" />
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">
                            {pageData.appearance?.outfit_style || ""}
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-foreground/90 leading-relaxed pl-2.5 border-l border-primary/10">
                          {outfitStyle}
                        </p>
                      </div>
                    )}

                    {apperanceFeatures.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-primary/40" />
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">
                            {pageData.appearance?.appearance_features || ""}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-2.5">
                          {apperanceFeatures.map((feature, index) => (
                            <span
                              key={`${feature}-${index}`}
                              className="px-2 py-0.5 bg-secondary/30 text-foreground border border-secondary/30 rounded-lg text-[10px] font-bold truncate max-w-[120px]"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {accessories.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-primary/40" />
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">
                            {pageData.appearance?.accessories || ""}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-2.5">
                          {accessories.map((accessory, index) => (
                            <span
                              key={`${accessory}-${index}`}
                              className="px-2 py-0.5 bg-accent/30 text-foreground border border-accent/30 rounded-lg text-[10px] font-bold truncate max-w-[120px]"
                            >
                              {accessory}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!bodyType &&
                      !hairStyle &&
                      !hairColorCode &&
                      !eyeColorCode &&
                      !outfitStyle &&
                      apperanceFeatures.length === 0 &&
                      accessories.length === 0 && (
                        <div className="py-4 text-center border border-dashed border-border/50 rounded-2xl">
                          <span className="text-[11px] text-muted-foreground/50 font-medium italic uppercase tracking-widest">
                            {visualStatus.no_visuals || ""}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
