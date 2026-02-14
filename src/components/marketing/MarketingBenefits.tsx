"use client";

import React from "react";
import { assetLoader } from "@/lib/asset-loader";
import Icon from "@/components/icon";

export interface BenefitItem {
  icon: string;
  title: string;
  description: string;
}

interface MarketingBenefitsProps {
  title: string;
  subtitle?: string;
  benefits: BenefitItem[];
  className?: string;
}

export function MarketingBenefits({
  title,
  subtitle,
  benefits,
  className = "",
}: MarketingBenefitsProps) {
  return (
    <section className={`py-16 mb-16 ${className}`}>
      <div className="container px-4 mx-auto">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold font-anime text-foreground mb-6">
              {title}
            </h2>
            {subtitle && (
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="glass-card group p-6 sm:p-8 rounded-[var(--radius-lg)] border-refined hover-float transition-all duration-300"
              >
                {/* Title with optional icon */}
                {benefit.icon ? (
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mr-3 sm:mr-4 group-hover:scale-110 transition-transform duration-300 shrink-0">
                      {benefit.icon.includes("/") || benefit.icon.includes(".") ? (
                        <img
                          src={benefit.icon.startsWith('http') ? benefit.icon : assetLoader.getImageUrl(benefit.icon)}
                          alt={benefit.title}
                          width="80"
                          height="80"
                          className="object-contain w-12 h-12 sm:w-16 sm:h-16"
                        />
                      ) : (
                        <div className="text-primary">
                          <Icon name={benefit.icon} className="w-12 h-12 sm:w-16 sm:h-16" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground font-display">
                      {benefit.title}
                    </h3>
                  </div>
                ) : (
                  <h3 className="text-lg sm:text-xl font-bold text-foreground font-display mb-4">
                    {benefit.title}
                  </h3>
                )}
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
