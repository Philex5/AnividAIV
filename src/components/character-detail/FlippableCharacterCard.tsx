"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import characterColors from "@/configs/colors/character-colors.json";
import { GenderIcon } from "@/components/icon/gender-icon";
import type { ReactElement } from "react";

interface BackgroundSegment {
  id?: string;
  title: string;
  content: string;
}

type ExtendedAttributePrimitive = string | number | boolean | null | undefined;

type ExtendedAttributeTuple = [string, ExtendedAttributePrimitive];

interface ExtendedAttributeObject {
  id?: string | number | null;
  key?: string | null;
  value?: ExtendedAttributePrimitive;
}

export type ExtendedAttributesInput =
  | Record<string, ExtendedAttributePrimitive>
  | Array<ExtendedAttributeTuple | ExtendedAttributeObject>;

interface NormalizedExtendedAttribute {
  id?: string | number | null;
  key: string;
  value: string;
}

interface FlippableCharacterCardProps {
  // Basic character info
  name: string;
  gender: string;
  age?: number;
  role?: string; // 角色身份/职业/定位
  species?: string;

  // Images
  characterImageUrl?: string;
  avatarImageUrl?: string;

  // Character details
  personalityTags?: string[];
  extendedAttributes?: ExtendedAttributesInput;
  briefIntroduction?: string;

  // Visual features
  bodyType?: string;
  hairStyle?: string;
  hairColor?: string;
  eyeColor?: string;
  artStyle?: string;
  outfitStyle?: string;
  apperanceFeatures?: string;
  accessories?: string[];

  // Background
  backgroundStory?: string;
  backgroundSegments?: BackgroundSegment[];

  // Interaction
  onClick?: () => void;

  // Styling
  className?: string;
}

export function FlippableCharacterCard({
  name,
  gender,
  age,
  role,
  species,
  characterImageUrl,
  avatarImageUrl,
  personalityTags = [],
  extendedAttributes,
  briefIntroduction,
  bodyType,
  hairStyle,
  hairColor,
  eyeColor,
  artStyle,
  outfitStyle,
  apperanceFeatures,
  accessories = [],
  onClick,
  className = "",
}: FlippableCharacterCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // 使用翻译系统
  const tSpecies = useTranslations("species");
  const tPersonality = useTranslations("personality");
  const tAccessories = useTranslations("accessories");
  const tAnimeStyles = useTranslations("anime_styles");
  const tRole = useTranslations("role");

  // Safe translation helper - returns original value if key not found
  const safeTranslate = useCallback((translator: any, key: string): string => {
    // Check if translator has the 'has' method to avoid MISSING_MESSAGE errors
    if (typeof translator.has === "function" && !translator.has(key)) {
      return key;
    }
    try {
      const result = translator(key);
      return result;
    } catch {
      return key;
    }
  }, []);

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
    [normalizeHex]
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
          item.code.toLowerCase() === trimmed.toLowerCase()
      );

      return match ? normalizeHex(match.code) : null;
    },
    [isHexColor, normalizeHex]
  );

  const hairColorCode = resolveColorCode(hairColor, "hair");
  const eyeColorCode = resolveColorCode(eyeColor, "eye");

  const renderColorSwatch = (
    label: string,
    colorCode: string | null
  ): ReactElement | null => {
    if (!colorCode) return null;
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/80 px-1.5 py-[1px] text-[8px] font-medium text-foreground">
        <span className="capitalize">{label}</span>
        <span
          className="h-2.5 w-2.5 rounded-full border border-border"
          style={{ backgroundColor: colorCode }}
          aria-label={`${label} color preview`}
        />
      </span>
    );
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const normalizedExtendedAttributes = useMemo(() => {
    const result: NormalizedExtendedAttribute[] = [];

    const normalizeValue = (
      value: ExtendedAttributePrimitive
    ): string | null => {
      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }

      if (typeof value === "boolean") {
        return value ? "true" : "false";
      }

      return String(value);
    };

    const pushEntry = (
      rawKey: unknown,
      rawValue: ExtendedAttributePrimitive,
      id?: string | number | null
    ) => {
      if (rawKey === null || rawKey === undefined) {
        return;
      }

      const key = String(rawKey).trim();
      if (!key) {
        return;
      }

      const normalizedValue = normalizeValue(rawValue);
      if (normalizedValue === null) {
        return;
      }

      result.push({ key, value: normalizedValue, id });
    };

    const source = extendedAttributes;

    if (!source) {
      return result;
    }

    if (Array.isArray(source)) {
      source.forEach((item) => {
        if (!item) {
          return;
        }

        if (Array.isArray(item)) {
          const [rawKey, rawValue] = item;
          pushEntry(rawKey, rawValue);
          return;
        }

        if (typeof item === "object") {
          const {
            id,
            key: rawKey,
            value: rawValue,
          } = item as ExtendedAttributeObject;
          pushEntry(rawKey, rawValue, id);
        }
      });
    } else if (typeof source === "object") {
      Object.entries(source).forEach(([rawKey, rawValue]) => {
        pushEntry(rawKey, rawValue);
      });
    }

    return result;
  }, [extendedAttributes]);

  return (
    <div
      className={`relative h-full w-full cursor-pointer ${className}`}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={handleCardClick}
      style={{ minHeight: "250px" }}
      // 临时调试：添加边界显示
      // style={{ minHeight: '300px', border: '2px dashed red' }}
    >
      <div
        className={`relative w-full h-full transition-transform duration-[2500ms] ease-[cubic-bezier(0.77,0,0.175,1)] transform-style-3d cursor-pointer group ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front: Character Image with Beautiful Border */}
        <div className="absolute inset-0 backface-hidden pointer-events-none">
          <div className="relative w-full h-full">
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-secondary/30 to-accent/40 rounded-2xl p-1">
              <div className="w-full h-full bg-card rounded-xl overflow-hidden shadow-2xl">
                {characterImageUrl ? (
                  <div className="w-full h-full relative">
                    <img
                      src={characterImageUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                    {/* Character Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                      <h3 className="font-bold text-lg truncate text-foreground">
                        {name}
                      </h3>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl font-bold">
                          {name.charAt(0)}
                        </span>
                      </div>
                      <p className="font-semibold">{name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
        </div>

        {/* Back: Character Info Card - Matching CharacterPreview Layout */}
        <div
          className={`absolute inset-0 backface-hidden rotate-y-180 ${
            isFlipped ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="relative w-full h-full">
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-secondary/30 to-accent/40 rounded-2xl p-1">
              <div className="w-full h-full bg-card rounded-xl overflow-hidden shadow-2xl">
                <div className="p-2 h-full flex flex-col min-h-[240px]">
                  {/* 固定内容区域 - 头像和基本信息 */}
                  <div className="flex-shrink-0">
                    {/* 头像和基本信息区 - 完全匹配CharacterPreview样式 */}
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-1 sm:p-1.5">
                      <div className="flex gap-2.5 sm:gap-3">
                        {/* 头像 */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-muted/30 rounded-lg border overflow-hidden">
                            {avatarImageUrl ? (
                              <img
                                src={avatarImageUrl}
                                alt="Character avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <span className="text-xl sm:text-2xl font-bold">
                                  {name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 基本信息 */}
                        <div className="flex-1 space-y-2">
                          <h3
                            className="text-sm sm:text-base md:text-lg font-bold"
                            style={{ fontFamily: "var(--font-anime, inherit)" }}
                          >
                            {name}
                          </h3>
                          {/* Row 1: Gender | Age | Species (no labels) */}
                          {(gender || age || species) && (
                            <div className="text-xs text-foreground/80 flex items-center gap-1">
                              {gender && (
                                <GenderIcon
                                  gender={gender}
                                  className="inline-block"
                                />
                              )}
                              {(gender && age) || (gender && species) ? (
                                <span>|</span>
                              ) : null}
                              {age && <span>Age {age}</span>}
                              {(age && species) ||
                              (gender && species && !age) ? (
                                <span>|</span>
                              ) : null}
                              {species && (
                                <span>{safeTranslate(tSpecies, species)}</span>
                              )}
                            </div>
                          )}
                          {/* Row 2: Role (with label) */}
                          {role && (
                            <div className="text-xs text-foreground/80">
                              Role: {safeTranslate(tRole, role)}
                            </div>
                          )}
                          {/* Row 4: Personality traits tags - 不显示标题 */}
                          {personalityTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {personalityTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 bg-primary/15 text-primary rounded text-[10px]"
                                >
                                  {safeTranslate(tPersonality, tag)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visual Features - 自适应高度，内容超长时滚动 */}
                    <div className="space-y-1.5 rounded-lg border border-border/40 bg-muted/20 p-1 sm:p-1.5 mt-4">
                      <h4 className="text-sm font-semibold text-foreground/80 mb-1">
                        Visual Features
                      </h4>
                      <div className="max-h-[6rem] lg:max-h-[8rem] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
                        <div className="space-y-1.5">
                          {/* Body Type, Hair, Eye badges in single row */}
                          {(bodyType ||
                            hairStyle ||
                            hairColorCode ||
                            eyeColorCode) && (
                            <div className="flex flex-wrap gap-1">
                              {bodyType && (
                                <span className="inline-flex items-center px-1 py-[1px] bg-secondary/30 text-secondary-foreground rounded text-[8px] font-medium leading-none">
                                  {bodyType} body
                                </span>
                              )}
                              {hairStyle && (
                                <span className="inline-flex items-center px-1 py-[1px] bg-secondary/30 text-secondary-foreground rounded text-[8px] font-medium leading-none">
                                  {hairStyle} hair
                                </span>
                              )}
                              {renderColorSwatch("hair", hairColorCode)}
                              {renderColorSwatch("eye", eyeColorCode)}
                            </div>
                          )}

                          {/* Other features as key-value */}
                          <div className="space-y-1 text-xs text-foreground/80">
                            {outfitStyle && (
                              <div className="flex flex-wrap items-baseline gap-1">
                                <span className="font-semibold text-foreground">
                                  Outfit Style:
                                </span>
                                <span className="text-foreground/80">
                                  {outfitStyle}
                                </span>
                              </div>
                            )}
                            {apperanceFeatures && (
                              <div className="flex flex-wrap items-baseline gap-1">
                                <span className="font-semibold text-foreground">
                                  Apperance Features:
                                </span>
                                <span className="text-foreground/80">
                                  {apperanceFeatures}
                                </span>
                              </div>
                            )}
                            {accessories.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                <span className="font-semibold text-foreground">
                                  Accessories:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {accessories.map((accessory, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 bg-accent/30 text-accent-foreground rounded text-[10px]"
                                    >
                                      {safeTranslate(tAccessories, accessory)}
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
                              !apperanceFeatures &&
                              accessories.length === 0 && (
                                <span className="text-[10px] text-muted-foreground italic">
                                  No visual features set
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Attributes - 自适应高度，内容超长时滚动 */}
                    <div className="space-y-1.5 rounded-lg border border-border/40 bg-muted/20 p-1 sm:p-1.5 mt-4">
                      <h4 className="text-sm font-semibold text-foreground/80 mb-1">
                        Attributes
                      </h4>
                      <div className="max-h-[6rem] lg:max-h-[8rem] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
                        <div className="space-y-1 text-xs text-foreground/80">
                          {normalizedExtendedAttributes.length > 0 ? (
                            normalizedExtendedAttributes.map(
                              ({ id, key: attributeKey, value }, index) => (
                                <div
                                  key={id ?? `${attributeKey}-${index}`}
                                  className="flex items-baseline gap-2 text-foreground/80"
                                >
                                  <span className="font-semibold text-foreground">
                                    {attributeKey}
                                    {attributeKey?.trim().endsWith(":")
                                      ? ""
                                      : ":"}
                                  </span>
                                  <span>{value}</span>
                                </div>
                              )
                            )
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">
                              Doesn't want others to know secrets
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 弹性间隔 - 将简介推到底部 */}
                  <div className="flex-1 min-h-1"></div>

                  {/* Brief Introduction - 固定在底部，最小2行高度，内部滚动条 */}
                  <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-1.5 sm:p-2 border-l-2 border-primary/30 flex-shrink-0 mb-1">
                    <div className="min-h-[3.2rem] max-h-[4.5rem] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
                      {briefIntroduction ? (
                        <p className="text-xs leading-[1.6] text-foreground/90 whitespace-pre-line">
                          {briefIntroduction}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No introduction written yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
