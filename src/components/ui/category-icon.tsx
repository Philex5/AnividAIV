"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface CategoryIconProps {
  name: "character" | "style" | "action" | "outfit" | "scene";
  className?: string;
  size?: number;
}

export function CategoryIcon({ name, className, size = 24 }: CategoryIconProps) {
  const [svgContent, setSvgContent] = useState<string>("");
  const { theme } = useTheme();

  useEffect(() => {
    const loadIcon = async () => {
      try {
        const response = await fetch(`/icons/${name}.svg`);
        if (response.ok) {
          const content = await response.text();
          setSvgContent(content);
        }
      } catch (error) {
        console.error(`Failed to load icon ${name}:`, error);
      }
    };

    loadIcon();
  }, [name]);

  if (!svgContent) {
    // Fallback loading state
    return (
      <div
        className={cn(
          "animate-pulse bg-muted rounded",
          className
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  // Parse SVG and update dimensions while preserving currentColor
  const updatedSvgContent = svgContent
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`);

  return (
    <div
      className={cn("inline-flex items-center justify-center", className)}
      dangerouslySetInnerHTML={{ __html: updatedSvgContent }}
      style={{
        color: "inherit", // Use currentColor from parent
      }}
    />
  );
}