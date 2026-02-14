"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tag as TagIcon, Plus } from "lucide-react";
import {
  MAX_TAGS_PER_CHARACTER,
  normalizeTag,
  normalizeTagKey,
  TagValidationError,
} from "@/lib/tag-normalizer";
import { getRecommendedTags } from "@/lib/tag-recommender";
import type { TagPresetCategory, TagPresetItem } from "@/types/tag";

interface TagEditorCopy {
  placeholder?: string;
  helper?: string;
  suggestionsLabel?: string;
  recommendedLabel?: string;
  emptyState?: string;
  maxReached?: string;
  inputAriaLabel?: string;
  removeAriaLabel?: string;
  duplicateLabel?: string;
  savingLabel?: string;
  loadError?: string;
  addError?: string;
}

interface TagEditorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  readOnly?: boolean;
  helperText?: string;
  isBusy?: boolean;
  showSuggestions?: boolean;
  allowCustom?: boolean;
  copy?: TagEditorCopy;
  onTagClick?: (tag: string) => void;
}

interface TagPresetResponse {
  categories: TagPresetCategory[];
  popular: TagPresetItem[];
}

export function TagEditor({
  value,
  onChange,
  maxTags = MAX_TAGS_PER_CHARACTER,
  readOnly = false,
  helperText,
  isBusy = false,
  showSuggestions = true,
  allowCustom = true,
  copy,
  onTagClick,
}: TagEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [presetData, setPresetData] = useState<TagPresetResponse | null>(null);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPresets() {
      try {
        setIsLoadingPresets(true);
        const response = await fetch("/api/tags/presets");
        if (!response.ok) {
          throw new Error(copy?.loadError || "");
        }
        const json = await response.json();
        if (!isMounted) return;
        setPresetData(json.data || json);
      } catch (error) {
        console.error("Failed to load preset tags", error);
      } finally {
        if (isMounted) {
          setIsLoadingPresets(false);
        }
      }
    }

    loadPresets();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedValue = useMemo(() => value || [], [value]);
  const normalizedValueKeys = useMemo(
    () => normalizedValue.map((tag) => normalizeTagKey(tag)),
    [normalizedValue],
  );

  const presetList = useMemo(() => {
    if (!presetData) return [] as string[];
    const byCategory = presetData.categories?.flatMap((category) => category.tags) || [];
    const popular = presetData.popular?.map((item) => item.tag) || [];
    return Array.from(new Set([...popular, ...byCategory]));
  }, [presetData]);

  const matchingSuggestions = useMemo(() => {
    if (!showSuggestions || !inputValue || !presetList.length) return [];
    const inputKey = normalizeTagKey(inputValue);
    return presetList
      .filter(
        (tag) =>
          normalizeTagKey(tag).includes(inputKey) &&
          !normalizedValueKeys.includes(normalizeTagKey(tag))
      )
      .slice(0, 5);
  }, [inputValue, presetList, normalizedValueKeys, showSuggestions]);

  const recommendedTags = useMemo(() => {
    if (!showSuggestions || !presetList.length || !isFocused) return [];
    return getRecommendedTags(normalizedValue)
      .filter((tag) => presetList.includes(tag))
      .filter((tag) => !normalizedValueKeys.includes(normalizeTagKey(tag)));
  }, [normalizedValue, normalizedValueKeys, presetList, showSuggestions, isFocused]);

  const maxReached = normalizedValue.length >= maxTags;

  const handleAddTag = (rawTag: string) => {
    if (readOnly) return;
    if (!rawTag) return;

    try {
      const normalized = normalizeTag(rawTag);
      const normalizedKey = normalizeTagKey(normalized);
      if (normalizedValueKeys.includes(normalizedKey)) {
        toast.info(copy?.duplicateLabel || "");
        setInputValue("");
        return;
      }
      if (normalizedValue.length >= maxTags) {
        toast.error(copy?.maxReached || "");
        return;
      }
      onChange([...normalizedValue, normalized]);
      setInputValue("");
    } catch (error) {
      if (error instanceof TagValidationError) {
        toast.error(error.message);
      } else {
        console.error("Failed to add tag", error);
        toast.error(copy?.addError || "");
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (readOnly) return;
    onChange(normalizedValue.filter((item) => item !== tag));
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      handleAddTag(inputValue);
    } else if (event.key === "Backspace" && !inputValue) {
      handleRemoveTag(normalizedValue[normalizedValue.length - 1]);
    }
  };

  const handleSuggestionClick = (tag: string) => {
    if (readOnly) {
      onTagClick?.(tag);
      return;
    }
    handleAddTag(tag);
  };

  const showEmptyState = normalizedValue.length === 0 && copy?.emptyState;

  const helperMessage = helperText || copy?.helper;

  return (
    <div className="space-y-2">
      {helperMessage && !readOnly && (
        <p className="text-[10px] text-muted-foreground italic uppercase tracking-wider">{helperMessage}</p>
      )}

      {/* Tag badges */}
      <div className="flex flex-wrap gap-1.5 items-center justify-center">
        <TagIcon className="w-3 h-3 text-muted-foreground/30 mr-1" />
        {normalizedValue.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="flex items-center gap-1 py-0 px-2 h-6 border-primary/20 bg-primary/5 text-primary/70 rounded-md"
            onClick={() => onTagClick?.(tag)}
          >
            <span className="text-[10px] font-bold tracking-wider">#{tag}</span>
            {!readOnly && (
              <button
                type="button"
                aria-label={
                  copy?.removeAriaLabel
                    ? copy.removeAriaLabel.replace("{tag}", tag)
                    : ""
                }
                className="text-primary/40 hover:text-destructive transition-colors ml-0.5"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemoveTag(tag);
                }}
              >
                ×
              </button>
            )}
          </Badge>
        ))}

        {!readOnly && !maxReached && allowCustom && (
          <div className="flex items-center">
            {isInputVisible || inputValue ? (
              <Input
                autoFocus
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsInputVisible(false);
                    setInputValue("");
                  }
                  handleInputKeyDown(e);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  // Delay blur to allow clicking suggestions
                  setTimeout(() => {
                    setIsFocused(false);
                    if (!inputValue) setIsInputVisible(false);
                  }, 200);
                }}
                placeholder={copy?.placeholder || "Add tag..."}
                aria-label={copy?.inputAriaLabel || ""}
                className="w-24 h-6 px-2 text-[10px] bg-background/50 border-border/40 focus:border-primary/30 rounded-md"
                disabled={isBusy}
              />
            ) : (
              <button
                type="button"
                className="h-6 w-6 rounded-full border border-dashed border-border/40 flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:border-primary/40 transition-all active:scale-95"
                onClick={() => setIsInputVisible(true)}
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {showEmptyState && (
        <p className="text-[10px] text-muted-foreground">{copy?.emptyState}</p>
      )}

      {/* Suggestions - only show when focused or typing */}
      {showSuggestions && !readOnly && !maxReached && (isFocused || inputValue) && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {matchingSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mr-1">
                {copy?.suggestionsLabel || ""}:
                </span>
              {matchingSuggestions.map((tag) => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 py-0 text-[9px] font-bold text-primary/60 hover:bg-primary/10 rounded"
                  onClick={() => handleSuggestionClick(tag)}
                >
                  + {tag}
                </Button>
              ))}
            </div>
          )}

          {recommendedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mr-1">
                {copy?.recommendedLabel || ""}:
                </span>
              {recommendedTags.slice(0, 5).map((tag) => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 py-0 text-[9px] font-bold text-muted-foreground/60 hover:bg-muted/80 rounded"
                  onClick={() => handleSuggestionClick(tag)}
                >
                  + {tag}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {isBusy && (
        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest" aria-live="polite">
          {copy?.savingLabel || ""}
        </p>
      )}
    </div>
  );
}
