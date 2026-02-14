"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { getCreamyDecorationUrl } from "@/lib/asset-loader";

interface MarketingCTAProps {
  title: string;
  description: string;
  buttonText: string;
  onButtonClick?: () => void;
  className?: string;
}

export function MarketingCTA({
  title,
  description,
  buttonText,
  onButtonClick,
  className = "",
}: MarketingCTAProps) {
  const handleDefaultClick = () => {
    // Default behavior: scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className={`py-32 ${className}`}>
      <div className="container px-4 mx-auto">
        <div className="glass-card rounded-[var(--radius-xl)] p-12 lg:p-20 text-center space-y-10 border-refined shadow-2xl relative overflow-hidden group">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-500" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors duration-500" />

          <div className="space-y-6 relative z-10">
            <h2 className="text-3xl lg:text-4xl font-bold font-anime text-foreground leading-tight">
              {title}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex justify-center relative z-10">
            <Button
              size="lg"
              className="min-w-56 h-14 text-lg rounded-full shadow-lg hover-float"
              onClick={onButtonClick || handleDefaultClick}
            >
              <img
                src={getCreamyDecorationUrl("pad")}
                alt="AnividAI icon"
                width="56"
                height="56"
                className="mr-1"
              />
              {buttonText}
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
