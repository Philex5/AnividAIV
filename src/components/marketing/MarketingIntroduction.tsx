"use client";

import React from "react";
import { getCreamyDecorationUrl } from "@/lib/asset-loader";

interface MarketingIntroductionProps {
  title: string;
  description: string;
  tagline: string;
  decorationIcon?: string;
  image?: {
    src: string;
    alt: string;
  };
  className?: string;
}

export function MarketingIntroduction({
  title,
  description,
  tagline,
  decorationIcon = "bow_tile",
  image,
  className = "",
}: MarketingIntroductionProps) {
  return (
    <div className={`py-32 max-w-5xl mx-auto text-center space-y-12 mt-10 px-4 ${className}`}>
      {/* Badge */}
      <div className="inline-flex items-center gap-3 px-6 py-2 glass-card rounded-full text-primary text-base font-bold mx-auto border-refined shadow-sm hover:shadow-md transition-shadow">
        <img
          src={getCreamyDecorationUrl(decorationIcon)}
          alt="Decorative icon"
          width="28"
          height="18"
          className="animate-pulse"
        />
        <span className="tracking-wide uppercase text-xs">{tagline}</span>
      </div>

      {/* Title */}
      <h2 className="text-4xl lg:text-5xl font-bold font-anime text-foreground leading-[1.2] tracking-tight">
        {title}
      </h2>

      {/* Description */}
      <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-4xl mx-auto">
        {description}
      </p>

      {/* Feature Image */}
      {image?.src && (
        <div className="flex justify-center items-center mt-20">
          <div className="relative max-w-4xl w-full group">
            <div className="absolute -inset-4 bg-gradient-sunset opacity-20 blur-2xl rounded-[var(--radius-xl)] group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative space-y-4">
              <img
                src={image.src}
                alt={image.alt || "Feature Image"}
                className="w-full h-auto rounded-[var(--radius-xl)] shadow-2xl border-refined relative z-10"
              />
              {image.alt && (
                <p className="text-base text-muted-foreground text-center font-medium italic">
                  — {image.alt}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
