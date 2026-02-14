"use client";

import React from 'react';

export interface StepItem {
  number: string;
  title: string;
  description: string;
}

interface MarketingHowToUseProps {
  title: string;
  subtitle?: string;
  steps: StepItem[];
  className?: string;
}

const StepCard: React.FC<{ step: StepItem; index: number; totalSteps: number }> = ({ 
  step, 
  index, 
  totalSteps 
}) => {
  return (
    <div className="relative group glass-card p-10 rounded-[var(--radius-xl)] border-refined hover-float transition-all duration-300">
      {/* Connector line - only on desktop and not for the last card */}
      {index < totalSteps - 1 && (
        <div className="hidden lg:block absolute top-1/2 -right-8 xl:-right-12 transform -translate-y-1/2 z-0">
          <div className="w-16 xl:w-24 h-1 bg-gradient-to-r from-primary to-transparent opacity-30" />
        </div>
      )}
      
      <div className="text-center relative z-10">
        {/* Step Number */}
        <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center text-2xl font-bold shadow-xl mx-auto -mt-16 mb-8 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 border-4 border-background">
          {step.number}
        </div>
        
        {/* Content */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-foreground font-display group-hover:text-primary transition-colors">
            {step.title}
          </h3>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export const MarketingHowToUse: React.FC<MarketingHowToUseProps> = ({ 
  title, 
  subtitle, 
  steps,
  className = ""
}) => {
  return (
    <section className={`py-32 ${className}`}>
      <div className="container max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-24">
          <h2 className="text-3xl lg:text-4xl font-bold font-anime text-foreground mb-6">
            {title}
          </h2>
          {subtitle && (
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Steps Grid */}
        <div className={`grid gap-12 lg:gap-8 mb-16 relative ${
          steps.length === 3
            ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-3 max-w-5xl mx-auto'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        }`}>
          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} index={index} totalSteps={steps.length} />
          ))}
        </div>
      </div>
    </section>
  );
};
