"use client";

import React from "react";
import { ArrowRight, Upload, Settings, Download } from "lucide-react";

interface ActionFigureHowToUseProps {
  pageData: any;
}

export function ActionFigureHowToUse({ pageData }: ActionFigureHowToUseProps) {
  // Visual elements mapping for each step
  const stepVisuals = [
    {
      icon: <Upload className="w-8 h-8" />,
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      icon: <Settings className="w-8 h-8" />,
      color: "bg-purple-500/10 text-purple-500",
    },
    {
      icon: <ArrowRight className="w-8 h-8" />,
      color: "bg-pink-500/10 text-pink-500",
    },
    {
      icon: <Download className="w-8 h-8" />,
      color: "bg-green-500/10 text-green-500",
    },
  ];

  const steps = pageData.howToUse.steps.map((step: any, index: number) => ({
    ...stepVisuals[index],
    title: step.title,
    description: step.description,
  }));

  return (
    <section className="py-16 bg-muted/30 mb-16">
      <div className="container">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {pageData.howToUse.title}
            </h2>
            {pageData.howToUse.subtitle && (
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {pageData.howToUse.subtitle}
              </p>
            )}
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step: any, index: number) => (
              <div key={index} className="relative">
                {/* Step Card */}
                <div className="p-6 rounded-2xl bg-background border border-border hover:shadow-lg transition-shadow">
                  {/* Step Number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mb-4 mt-2`}>
                    {step.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Arrow (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-muted-foreground">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
