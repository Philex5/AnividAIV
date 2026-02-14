"use client";

import { useMemo, useState } from "react";
import { Check, Info, Tags, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import worldTypes from "@/configs/worlds/world-types.json";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface GenreSelectorProps {
  selectedGenre?: string;
  selectedTags: string[];
  onGenreChange: (genreId: string) => void;
  onTagsChange: (tags: string[]) => void;
  labels: {
    genre?: string;
    custom_genre?: string;
    tags?: string;
    custom_tag?: string;
    recommended?: string;
  };
}

export function GenreSelector({
  selectedGenre,
  selectedTags,
  onGenreChange,
  onTagsChange,
  labels,
}: GenreSelectorProps) {
  const t = useTranslations("worlds.genres");
  const [customTagInput, setCustomTagInput] = useState("");
  const [customGenreInput, setCustomGenreInput] = useState("");

  const isCustomGenre = useMemo(() => {
    return selectedGenre && !worldTypes.some(gt => gt.id === selectedGenre);
  }, [selectedGenre]);

  const currentGenreConfig = useMemo(() => {
    return worldTypes.find((gt) => gt.id === selectedGenre);
  }, [selectedGenre]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const tag = customTagInput.trim();
    if (tag && !selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag]);
      setCustomTagInput("");
    }
  };

  const handleAddCustomGenre = () => {
    const genre = customGenreInput.trim();
    if (genre) {
      onGenreChange(genre);
      setCustomGenreInput("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Genre Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-bold ml-1">{labels.genre || "Genre"}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {worldTypes.map((genre) => {
            const isSelected = selectedGenre === genre.id;
            return (
              <TooltipProvider key={genre.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onGenreChange(genre.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group min-h-[56px]",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border/40 bg-muted/5 hover:border-primary/40 hover:bg-muted/10"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-bold text-center leading-tight",
                        isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {t(`${genre.id}.name`)}
                      </span>
                      {isSelected && (
                        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                          <Check className="h-3 w-3 stroke-[4]" />
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] font-medium text-xs">
                    {t(`${genre.id}.description`)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}

          {/* Custom Genre Entry */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed transition-all group min-h-[56px]",
                  isCustomGenre
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border/40 bg-muted/5 hover:border-primary/40 hover:bg-muted/10"
                )}
              >
                <span className={cn(
                  "text-xs font-bold text-center leading-tight truncate w-full px-1",
                  isCustomGenre ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {isCustomGenre ? selectedGenre : <Plus className="w-5 h-5 mx-auto" />}
                </span>
                {isCustomGenre && (
                  <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Check className="h-3 w-3 stroke-[4]" />
                  </div>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 rounded-2xl border border-border shadow-xl" align="start">
              <div className="space-y-3">
                <Label className="text-xs font-bold">{labels.custom_genre || "Custom Genre"}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={labels.custom_genre || "Genre name..."}
                    value={customGenreInput}
                    onChange={(e) => setCustomGenreInput(e.target.value)}
                    className="h-9 rounded-xl text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomGenre();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomGenre}
                    className="bg-primary text-primary-foreground p-2 rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Suggested Tags based on Genre */}
      <div className="space-y-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Tags className="w-4 h-4" />
            <span className="text-xs font-bold">{labels.recommended || "Suggested Tags"}</span>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 hover:text-primary transition-colors">
                <Plus className="w-3 h-3" />
                {labels.custom_tag || "Custom Tag"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 rounded-2xl border border-border shadow-xl" align="end">
              <div className="space-y-3">
                <Label className="text-xs font-bold">{labels.custom_tag || "Custom Tag"}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={labels.custom_tag || "Tag name..."}
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    className="h-9 rounded-xl text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="bg-primary text-primary-foreground p-2 rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Suggested tags from current genre */}
          {currentGenreConfig?.suggested_tags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer px-3 py-1 rounded-lg transition-all border-primary/20",
                  !isSelected && "bg-background hover:bg-primary/5 hover:border-primary/40"
                )}
                onClick={() => toggleTag(tag)}
              >
                <span className="text-[10px] font-bold">{tag}</span>
                {isSelected && <Check className="ml-1 w-2.5 h-2.5 stroke-[3]" />}
              </Badge>
            );
          })}

          {/* User's custom tags that are not in suggested tags */}
          {selectedTags.filter(tag => !currentGenreConfig?.suggested_tags.includes(tag)).map((tag) => (
            <Badge
              key={tag}
              variant="default"
              className="cursor-pointer px-3 py-1 rounded-lg transition-all border-primary/20 bg-primary/20 text-primary hover:bg-primary/30"
            >
              <span className="text-[10px] font-bold" onClick={() => toggleTag(tag)}>{tag}</span>
              <button type="button" onClick={() => toggleTag(tag)} className="ml-1 hover:text-destructive transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
          
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-8 h-8 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 rounded-2xl border border-border shadow-xl" align="start">
              <div className="space-y-3">
                <Label className="text-xs font-bold">{labels.custom_tag || "Custom Tag"}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={labels.custom_tag || "Tag name..."}
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    className="h-9 rounded-xl text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="bg-primary text-primary-foreground p-2 rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
