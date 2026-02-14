"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useOCMakerContext } from "@/contexts/oc-maker";
import { getImageUrl, getR2Url } from "@/lib/asset-loader";
import { GenderIcon } from "@/components/icon/gender-icon";
import speciesConfig from "@/configs/characters/species.json";
import characterStylesConfig from "@/configs/styles/character_styles.json";
import { useTranslations } from "next-intl";

type SpeciesConfigItem = (typeof speciesConfig)["items"][number];
type CharacterStyleConfigItem = (typeof characterStylesConfig)["items"][number];

interface QuickOptionsBarProps {
  genderLabel?: string;
  artStyleLabel?: string;
  speciesLabel?: string;
  genderPlaceholder?: string;
  artStylePlaceholder?: string;
  speciesPlaceholder?: string;
  speciesCustomLabel?: string;
  speciesCustomPlaceholder?: string;
  genderOptionLabels?: Partial<Record<"female" | "male" | "other", string>>;
}

export function QuickOptionsBar({
  genderLabel,
  artStyleLabel,
  speciesLabel,
  genderPlaceholder,
  artStylePlaceholder,
  speciesPlaceholder,
  speciesCustomLabel,
  speciesCustomPlaceholder,
  genderOptionLabels,
}: QuickOptionsBarProps) {
  const {
    gender,
    setGender,
    artStyle,
    setArtStyle,
    species,
    setSpecies,
  } = useOCMakerContext();
  const tCharacterStyles = useTranslations("character_styles");

  const resolveStyleName = (style?: CharacterStyleConfigItem | null): string => {
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

  const genderOptions: Array<{ value: "female" | "male" | "other"; label: string }> =
    [
      {
        value: "female",
        label: genderOptionLabels?.female || "female",
      },
      {
        value: "male",
        label: genderOptionLabels?.male || "male",
      },
      {
        value: "other",
        label: genderOptionLabels?.other || "other",
      },
    ];

  const styleOptions: CharacterStyleConfigItem[] = (
    characterStylesConfig?.items || []
  )
    .filter((item) => item?.status === "active")
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  const speciesOptions: SpeciesConfigItem[] = speciesConfig?.items || [];

  const selectedStyle = styleOptions.find((item) => item.key === artStyle);
  const selectedStyleName = resolveStyleName(selectedStyle);
  const selectedSpecies = speciesOptions.find((item) => item.key === species);
  const customSpeciesValue = "__custom__";
  const speciesSelectValue = selectedSpecies ? selectedSpecies.key : customSpeciesValue;
  const isCustomSpecies = speciesSelectValue === customSpeciesValue;
  const customSpeciesIconUrl = getImageUrl("/assets/species/custom.webp");

  const labelClassName = "text-sm font-semibold text-muted-foreground whitespace-nowrap";
  const triggerClassName = "h-10 w-auto !bg-transparent !border-none !shadow-none p-0 px-1 gap-2 hover:!bg-transparent hover:text-primary transition-all focus:ring-0";

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
      {/* Gender Select */}
      <div className="flex items-center gap-1">
        <span className={labelClassName}>{genderLabel || "Gender"}:</span>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger className={triggerClassName}>
            <div className="flex items-center justify-center">
              <GenderIcon gender={gender} className="h-5 w-5" />
            </div>
            {/* Hidden value ensures text doesn't show in trigger */}
            <div className="hidden">
              <SelectValue placeholder={genderPlaceholder} />
            </div>
          </SelectTrigger>
          <SelectContent className="min-w-[140px]">
            {genderOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <GenderIcon gender={option.value} className="h-4 w-4" />
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Art Style Select */}
      <div className="flex items-center gap-1">
        <span className={labelClassName}>{artStyleLabel || "Style"}:</span>
        <Select value={artStyle} onValueChange={setArtStyle}>
          <SelectTrigger className={triggerClassName}>
            {selectedStyle ? (
              <div className="flex items-center justify-center">
                {selectedStyle.thumbnail_url ? (
                  <div className="h-8 w-6 overflow-hidden rounded-md">
                    <img
                      src={getImageUrl(selectedStyle.thumbnail_url)}
                      alt={selectedStyleName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="w-6 h-8 bg-muted/20 rounded-md" />
            )}
            <div className="hidden">
              <SelectValue placeholder={artStylePlaceholder} />
            </div>
          </SelectTrigger>
          <SelectContent className="min-w-[260px]">
            {styleOptions.map((option) => {
              const optionName = resolveStyleName(option);
              return (
              <SelectItem key={option.key} value={option.key} className="py-2">
                <div className="flex items-center gap-4">
                  {option.thumbnail_url ? (
                    <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-md border border-border/50">
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

      {/* Species Select */}
      <div className="flex items-center gap-1">
        <span className={labelClassName}>{speciesLabel || "Species"}:</span>
        <Select
          value={speciesSelectValue}
          onValueChange={(value) => {
            if (value === customSpeciesValue) {
              if (selectedSpecies) {
                setSpecies("");
              }
              return;
            }
            setSpecies(value);
          }}
        >
          <SelectTrigger className={triggerClassName}>
            {selectedSpecies || isCustomSpecies ? (
              <div className="flex items-center justify-center">
                {selectedSpecies?.icon_url ? (
                  <img
                    src={getR2Url(selectedSpecies.icon_url)}
                    alt={selectedSpecies.name}
                    className="h-5 w-5 object-contain"
                  />
                ) : customSpeciesIconUrl ? (
                  <img
                    src={customSpeciesIconUrl}
                    alt={speciesCustomLabel || speciesLabel || ""}
                    className="h-5 w-5 object-contain"
                  />
                ) : null}
              </div>
            ) : (
              <div className="w-5 h-5 bg-muted/20 rounded-full" />
            )}
            <div className="hidden">
              <SelectValue placeholder={speciesPlaceholder} />
            </div>
          </SelectTrigger>
          <SelectContent className="min-w-[180px]">
            {speciesOptions.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                <div className="flex items-center gap-2">
                  {option.icon_url ? (
                    <img
                      src={getR2Url(option.icon_url)}
                      alt={option.name}
                      className="h-4 w-4 object-contain"
                    />
                  ) : null}
                  <span>{option.name}</span>
                </div>
              </SelectItem>
            ))}
            <SelectItem value={customSpeciesValue}>
              <div className="flex items-center gap-2">
                {customSpeciesIconUrl ? (
                  <img
                    src={customSpeciesIconUrl}
                    alt={speciesCustomLabel || speciesLabel || ""}
                    className="h-4 w-4 object-contain"
                  />
                ) : null}
                <span>{speciesCustomLabel || speciesLabel || ""}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {speciesSelectValue === customSpeciesValue ? (
          <Input
            value={species}
            onChange={(event) => setSpecies(event.target.value)}
            placeholder={speciesCustomPlaceholder || speciesPlaceholder || ""}
            className="h-9 w-36 sm:w-44 bg-transparent border-border/40 text-xs font-semibold"
          />
        ) : null}
      </div>
    </div>
  );
}
