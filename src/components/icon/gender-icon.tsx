"use client";

import { getPublicAssetUrl } from "@/lib/asset-loader";

interface GenderIconProps {
  gender: string;
  className?: string;
}

/**
 * GenderIcon component - displays SVG icons for different genders
 * Place SVG files in public/imgs/icons/gender/ directory:
 * - male.svg
 * - female.svg
 * - transgender.svg
 */
export function GenderIcon({ gender, className = "" }: GenderIconProps) {
  const normalizeGender = (g: string): string => {
    return g.toLowerCase().trim();
  };

  const getGenderIcon = (g: string): string => {
    const normalized = normalizeGender(g);

    // Map gender values to icon names
    if (normalized === "male" || normalized === "m") {
      return getPublicAssetUrl("imgs/icons/gender/male.svg");
    } else if (normalized === "female" || normalized === "f") {
      return getPublicAssetUrl("imgs/icons/gender/female.svg");
    } else if (normalized === "transgender" || normalized === "non-binary" || normalized === "other") {
      return getPublicAssetUrl("imgs/icons/gender/transgender.svg");
    }

    // Default fallback
    return "";
  };

  const iconSrc = getGenderIcon(gender);

  if (!iconSrc) {
    return null;
  }

  return (
    <img
      src={iconSrc}
      alt={`${gender} icon`}
      className={`inline-block ${className}`}
      style={{ width: "1em", height: "1em" }}
    />
  );
}

export default GenderIcon;
