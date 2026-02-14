"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Edit2,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CharacterDetailPage } from "@/types/pages/landing";
import { assetLoader } from "@/lib/asset-loader";
import {
  normalizeSkillType,
  resolveSkillIconName,
  SKILL_TYPE_OPTIONS,
} from "@/lib/skills";
import type { SkillTypeOption } from "@/lib/skills";

interface Skill {
  id: string;
  name: string;
  level?: number;
  description?: string;
  type?: SkillTypeOption | string;
  icon?: string; // R2 filename without extension
}

interface Stat {
  label: string;
  value: number;
}

interface SkillsTabContentProps {
  stats: Stat[];
  abilities: Skill[];
  isEditMode?: boolean;
  onStatsChange?: (stats: Stat[]) => void;
  onAbilitiesChange?: (abilities: Skill[]) => void;
  pageData: any;
  themeColor?: string | null;
}

const DEFAULT_STATS: Stat[] = [
  { label: "STR", value: 0 },
  { label: "INT", value: 0 },
  { label: "AGI", value: 0 },
  { label: "VIT", value: 0 },
  { label: "DEX", value: 0 },
  { label: "LUK", value: 0 },
];

const SLIDER_INPUT_CLASSNAME = [
  "absolute w-full appearance-none bg-transparent cursor-pointer z-10",
  "[&::-webkit-slider-runnable-track]:appearance-none",
  "[&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:h-4",
  "[&::-webkit-slider-thumb]:w-4",
  "[&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:bg-background",
  "[&::-webkit-slider-thumb]:border-2",
  "[&::-webkit-slider-thumb]:shadow-md",
  "[&::-webkit-slider-thumb]:transition-transform",
  "[&::-webkit-slider-thumb]:active:scale-125",
  "[&::-moz-range-thumb]:appearance-none",
  "[&::-moz-range-thumb]:h-4",
  "[&::-moz-range-thumb]:w-4",
  "[&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:bg-background",
  "[&::-moz-range-thumb]:border-2",
  "[&::-moz-range-thumb]:shadow-md",
].join(" ");

const getSkillIconUrl = (icon?: string, type?: string) =>
  assetLoader.getAssetUrl(
    `skills/${resolveSkillIconName(icon, type)}.webp`,
  );

export function SkillsTabContent({
  stats,
  abilities,
  isEditMode,
  onStatsChange,
  onAbilitiesChange,
  pageData,
  themeColor,
}: SkillsTabContentProps) {
  const [editingAbilityId, setEditingAbilityId] = useState<string | null>(null);

  const primaryColor = themeColor || "var(--primary)";

  const handleAddStat = () => {
    if (onStatsChange) {
      onStatsChange([
        ...stats,
        { label: pageData.skills?.new_stat || "", value: 5 },
      ]);
    }
  };

  const handleRemoveStat = (index: number) => {
    if (onStatsChange) {
      onStatsChange(stats.filter((_, i) => i !== index));
    }
  };

  const handleStatChange = (index: number, updates: Partial<Stat>) => {
    if (onStatsChange) {
      const currentStats = stats.length > 0 ? stats : DEFAULT_STATS;
      const next = [...currentStats];
      next[index] = { ...next[index], ...updates };
      onStatsChange(next);
    }
  };

  const handleAddAbility = () => {
    if (onAbilitiesChange) {
      const createId = () => {
        if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
          const cryptoValue = (globalThis as any).crypto as Crypto | undefined;
          if (cryptoValue?.randomUUID) return cryptoValue.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      };

      const newAbility: Skill = {
        id: createId(),
        name: pageData.skills?.new_ability || "",
        level: 1,
        description: "",
      };
      onAbilitiesChange([newAbility, ...abilities]);
      setEditingAbilityId(newAbility.id);
    }
  };

  const handleRemoveAbility = (id: string) => {
    if (onAbilitiesChange) {
      onAbilitiesChange(abilities.filter((a) => a.id !== id));
    }
  };

  const handleAbilityChange = (id: string, updates: Partial<Skill>) => {
    if (onAbilitiesChange) {
      onAbilitiesChange(
        abilities.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      );
    }
  };

  // Prepare data for RadarChart
  const hasStats = stats.length > 0;
  const showRadar = isEditMode || hasStats;
  const chartData = hasStats ? stats : DEFAULT_STATS;
  const editorStats = hasStats ? stats : DEFAULT_STATS;

  return (
    <div
      className={cn(
        "grid gap-4 items-start transition-all duration-500",
        showRadar
          ? "lg:grid-cols-[1fr_1.5fr]"
          : "grid-cols-1 max-w-4xl mx-auto w-full",
      )}
    >
      {/* Left Column: Radar Chart & Stats Editor */}
      {showRadar && (
        <div className="bg-card rounded-3xl border border-border/40 p-4 lg:p-5 shadow-sm space-y-6 h-full animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
              {pageData.skills?.stats_title || ""}
              <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent"></div>
            </h3>
          </div>

          <div className="aspect-square w-full max-w-[340px] mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{
                    fill: "var(--foreground)",
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 10]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name={pageData.skills?.radar_label || ""}
                  dataKey="value"
                  stroke={primaryColor}
                  fill={primaryColor}
                  fillOpacity={0.5}
                  dot={{
                    r: 4,
                    fill: "var(--background)",
                    stroke: primaryColor,
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: primaryColor,
                    stroke: "var(--background)",
                    strokeWidth: 2,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {isEditMode && (
            <div className="space-y-4 pt-4 border-t border-border/20">
              <div className="grid gap-3">
                {editorStats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <Input
                      value={stat.label}
                      onChange={(e) =>
                        handleStatChange(index, { label: e.target.value })
                      }
                      className="h-8 text-[10px] font-black uppercase w-24 bg-background/40 focus:bg-background/60 border-border/20 transition-all text-muted-foreground focus:text-foreground"
                      placeholder={pageData.skills?.stat_placeholder || ""}
                    />
                    <div className="flex-1 flex items-center gap-4 group/slider">
                      <div className="flex-1 relative flex items-center h-5">
                        <div
                          className="absolute w-full h-1.5 rounded-full border"
                          style={{
                            backgroundColor: primaryColor,
                            borderColor: primaryColor,
                            opacity: 0.15,
                          }}
                        />
                        <div
                          className="absolute h-1.5 rounded-full transition-all pointer-events-none shadow-sm"
                          style={{
                            width: `${(stat.value / 10) * 100}%`,
                            backgroundColor: primaryColor,
                            opacity: 0.9,
                          }}
                        />
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={stat.value}
                          onChange={(e) =>
                            handleStatChange(index, {
                              value: parseInt(e.target.value),
                            })
                          }
                          className={SLIDER_INPUT_CLASSNAME}
                          style={
                            {
                              "--thumb-border-color": primaryColor,
                            } as React.CSSProperties
                          }
                        />
                        <style jsx>{`
                          input[type="range"]::-webkit-slider-thumb {
                            border-color: ${primaryColor} !important;
                          }
                          input[type="range"]::-moz-range-thumb {
                            border-color: ${primaryColor} !important;
                          }
                        `}</style>
                      </div>
                      <span
                        className="text-[11px] font-black w-5 text-center"
                        style={{ color: primaryColor }}
                      >
                        {stat.value}
                      </span>
                    </div>
                    {hasStats && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveStat(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-dashed py-5 hover:bg-primary/5 hover:border-primary/50 transition-all"
                onClick={handleAddStat}
              >
                <Plus className="h-4 w-4 mr-2" />{" "}
                {pageData.skills?.add_stat || ""}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Right Column: Abilities Cards Area */}
      <div
        className={cn(
          "space-y-4 transition-all duration-500",
          !showRadar && "animate-in fade-in slide-in-from-bottom-4",
        )}
      >
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-3">
            {pageData.skills?.abilities_title || ""}
            <div className="h-px w-12 bg-gradient-to-r from-border/50 to-transparent"></div>
          </h3>
          {isEditMode && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-full border-border/60 text-[9px] font-bold"
              onClick={handleAddAbility}
            >
              <Plus className="h-3 w-3 mr-1" />{" "}
              {pageData.skills?.add_skill || ""}
            </Button>
          )}
        </div>

        <div className="grid gap-2">
          {abilities.map((ability) => (
            <AbilityCard
              key={ability.id}
              ability={ability}
              isEditMode={isEditMode}
              isEditing={editingAbilityId === ability.id}
              onEdit={() => setEditingAbilityId(ability.id)}
              onSave={() => setEditingAbilityId(null)}
              onRemove={() => handleRemoveAbility(ability.id)}
              onChange={(updates) => handleAbilityChange(ability.id, updates)}
              pageData={pageData}
            />
          ))}
          {abilities.length === 0 && (
            <div className="py-16 text-center border border-dashed border-border/40 rounded-[2rem] bg-background/5">
              <span className="text-[10px] text-muted-foreground/50 font-medium italic uppercase tracking-widest">
                {pageData.skills?.empty_skills || ""}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AbilityCard({
  ability,
  isEditMode,
  isEditing,
  onEdit,
  onSave,
  onRemove,
  onChange,
  pageData,
}: {
  ability: Skill;
  isEditMode?: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onRemove: () => void;
  onChange: (updates: Partial<Skill>) => void;
  pageData: any;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = useTranslations();

  const iconUrl = getSkillIconUrl(ability.icon, ability.type);
  const selectedIconKey = resolveSkillIconName(ability.icon, ability.type);

  if (isEditing && isEditMode) {
    return (
      <Card className="bg-card border-primary/30 rounded-2xl overflow-hidden shadow-lg animate-in fade-in zoom-in duration-200">
        <CardHeader className="px-3 py-1.5 pb-1">
          <div className="flex gap-2.5">
            {/* Icon Selector */}
            <div className="flex-shrink-0">
              <Label className="text-[8px] uppercase font-black text-muted-foreground/60 px-0.5 mb-1 block">
                {pageData.skills?.icon || ""}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-10 h-10 rounded-lg p-0 overflow-hidden border-2 border-dashed border-border/40 hover:border-primary/50 transition-all bg-background/40"
                  >
                    <img
                      src={iconUrl}
                      alt={ability.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          getSkillIconUrl("Default");
                      }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <TooltipProvider>
                    <ScrollArea className="h-48">
                      <div className="grid grid-cols-5 gap-1.5 p-1">
                        {SKILL_TYPE_OPTIONS.map((iconName) => (
                          <Tooltip key={iconName}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "h-10 w-10 p-1 rounded-md border-2 transition-all",
                                  selectedIconKey === normalizeSkillType(iconName)
                                    ? "border-primary bg-primary/5"
                                    : "border-transparent hover:border-border/40 hover:bg-muted/30",
                                )}
                                onClick={() =>
                                  onChange({
                                    icon: normalizeSkillType(iconName),
                                    type: normalizeSkillType(iconName),
                                  })
                                }
                              >
                                <img
                                  src={getSkillIconUrl(iconName)}
                                  alt={iconName}
                                  className="w-full h-full object-contain"
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="text-[10px] font-bold"
                            >
                              {t(`skill_icons.${iconName}`)}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </ScrollArea>
                  </TooltipProvider>
                </PopoverContent>
              </Popover>
            </div>

            {/* Basic Info */}
            <div className="flex-1 space-y-1.5">
              <div className="flex gap-2.5">
                <div className="grid gap-0.5 flex-1">
                  <Label className="text-[8px] uppercase font-black text-muted-foreground/60 px-0.5">
                    {pageData.skills?.skill_name || ""}
                  </Label>
                  <Input
                    value={ability.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    className="h-7 bg-background/40 font-bold text-xs px-2"
                  />
                </div>
                <div className="grid gap-0.5">
                  <Label className="text-[8px] uppercase font-black text-muted-foreground/60 px-0.5">
                    {pageData.skills?.level || ""}
                  </Label>
                  <div className="flex items-center gap-0.5 h-7 px-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-3 w-3 cursor-pointer transition-all",
                          star <= (ability.level || 1)
                            ? "fill-primary text-primary"
                            : "text-muted-foreground/30 hover:text-primary/50",
                        )}
                        onClick={() => onChange({ level: star })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 py-1 pt-0 space-y-2">
          <div className="grid gap-1">
            <Label className="text-[8px] uppercase font-black text-muted-foreground/60 px-0.5">
              {pageData.skills?.description || ""}
            </Label>
            <Textarea
              value={ability.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="min-h-[50px] bg-background/40 text-[10px] px-2 py-1.5 resize-none leading-normal"
            />
          </div>
          <div className="flex justify-end gap-2 pt-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[9px] font-bold text-destructive px-2"
              onClick={onRemove}
            >
              <Trash2 className="h-2.5 w-2.5 mr-1" />{" "}
              {pageData.actions?.delete || ""}
            </Button>
            <Button
              size="sm"
              className="h-6 px-3 text-[9px] font-bold rounded-full"
              onClick={onSave}
            >
              {pageData.actions?.save || ""}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "bg-card border-border/40 rounded-2xl overflow-hidden group hover:border-primary/30 transition-all shadow-sm",
        ability.description && "cursor-pointer hover:bg-muted/50",
      )}
      onClick={() => ability.description && setIsExpanded(!isExpanded)}
    >
      <div className="px-2 py-1 flex gap-2.5">
        {/* Left: Icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-background/40 border border-border/20 shadow-inner group-hover:border-primary/20 transition-all">
            <img
              src={iconUrl}
              alt={ability.name}
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getSkillIconUrl("Default");
              }}
            />
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[12px] font-bold text-foreground mr-auto tracking-tight break-words">
              {ability.name}
            </h3>

            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              {/* Level Stars - Moved to right */}
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-2 w-2",
                      star <= (ability.level || 1)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/20",
                    )}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5">
                {isEditMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    <Edit2 className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Simple Description (Preview) */}
          {!isExpanded && ability.description && (
            <p className="text-[9px] text-muted-foreground line-clamp-2 leading-normal mt-0.5 opacity-80 break-words">
              {ability.description}
            </p>
          )}

          {/* Expanded Description */}
          {isExpanded && (
            <div className="mt-1.5 pt-1.5 border-t border-border/5 animate-in slide-in-from-top-1 duration-200">
              <p className="text-[9px] text-muted-foreground leading-normal whitespace-pre-wrap opacity-90 break-words">
                {ability.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
