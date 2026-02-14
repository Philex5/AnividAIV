"use client";

import { useEffect, useMemo, useState } from "react";
import type { CharacterDetailPage } from "@/types/pages/landing";
import { WorldTheme } from "@/contexts/WorldContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Palette,
  Sparkles,
  Image as ImageIcon,
  PaintBucket,
} from "lucide-react";
import { ReferenceImageUpload } from "@/components/anime-generator/ReferenceImageUpload";
import themePalette from "@/configs/colors/theme-palette.json";

type HslTuple = { h: number; s: number; l: number };

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isHexColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
  );
}

function parseCssHslTuple(raw: string): HslTuple | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/^hsl\(/i, "")
    .replace(/\)$/i, "")
    .replace(/[,\s/]+/g, " ")
    .trim();
  if (!normalized) return null;

  const parts = normalized.split(" ");
  if (parts.length < 3) return null;

  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", ""));
  const l = Number(parts[2].replace("%", ""));

  if (
    Number.isNaN(h) ||
    Number.isNaN(s) ||
    Number.isNaN(l) ||
    !Number.isFinite(h) ||
    !Number.isFinite(s) ||
    !Number.isFinite(l)
  ) {
    return null;
  }

  return { h, s, l };
}

function hslToHex({ h, s, l }: HslTuple): string {
  const sNorm = clampNumber(s, 0, 100) / 100;
  const lNorm = clampNumber(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const hh = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (value: number) => {
    const channel = Math.round((value + m) * 255);
    return clampNumber(channel, 0, 255).toString(16).padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function normalizeColorCandidate(value: unknown): string | null {
  if (isHexColor(value)) return value.trim();
  if (typeof value !== "string") return null;
  const parsed = parseCssHslTuple(value);
  if (!parsed) return null;
  return hslToHex(parsed);
}

function loadThemeColorPalette(theme?: WorldTheme | null) {
  const palette = [theme?.primary, ...themePalette.palette]
    .map(normalizeColorCandidate)
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return Array.from(new Set(palette));
}

interface BackgroundCustomizerProps {
  backgroundUrl?: string | null;
  themeColor?: string | null;
  isOwner: boolean;
  isEditMode: boolean;
  onBackgroundChange: (next: string | null) => Promise<void> | void;
  onGenerateBackground?: (sceneDescription: string) => Promise<void> | void;
  pageData?: CharacterDetailPage;
  theme?: WorldTheme | null;
  children?: React.ReactNode;
}

export function BackgroundCustomizer({
  backgroundUrl,
  themeColor,
  isOwner,
  isEditMode,
  onBackgroundChange,
  onGenerateBackground,
  pageData,
  theme,
  children,
}: BackgroundCustomizerProps) {
  const [sceneDescription, setSceneDescription] = useState("");
  const normalizedThemeColor = useMemo(
    () => normalizeColorCandidate(themeColor),
    [themeColor],
  );

  const backgroundStyle = useMemo(() => {
    const style: React.CSSProperties & { [key: string]: string | undefined } =
      {};

    // Set character theme color variable
    if (normalizedThemeColor) {
      style["--character-theme-color"] = normalizedThemeColor;
    }

    if (backgroundUrl && !isHexColor(backgroundUrl)) {
      style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%), url(${backgroundUrl})`;
      style.backgroundSize = "cover";
      style.backgroundPosition = "center";
    } else {
      style.background = "transparent";
    }

    return style;
  }, [backgroundUrl, normalizedThemeColor]);

  const copy = pageData?.background_controls;

  const handleResetBackground = async () => {
    await onBackgroundChange(null);
  };

  const handleGenerate = async () => {
    if (!sceneDescription.trim() || !onGenerateBackground) return;
    await onGenerateBackground(sceneDescription.trim());
  };

  // Determine active tab based on background state
  const [activeTab, setActiveTab] = useState("background");

  return (
    <div className="relative">
      <div
        className="relative w-full flex flex-col justify-center overflow-hidden"
        style={backgroundStyle}
      >
        <div className="relative z-10 w-full h-full flex flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
