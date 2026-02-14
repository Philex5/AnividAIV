"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from "lucide-react"; 

export interface FAQItem {
  question: string;
  answer: string;
}

interface MarketingFAQProps {
  title: string;
  subtitle?: string;
  items: FAQItem[];
  className?: string;
}

export const MarketingFAQ: React.FC<MarketingFAQProps> = ({ 
  title, 
  subtitle, 
  items,
  className = ""
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className={`py-20 ${className}`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold font-anime text-foreground mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className={`glass-card rounded-[var(--radius-lg)] border-refined transition-all duration-300 overflow-hidden ${
                openIndex === index ? 'shadow-xl' : 'hover:shadow-md'
              }`}
            >
              <div 
                className="flex items-center justify-between cursor-pointer select-none p-6" 
                onClick={() => toggle(index)}
              >
                <h3 className="text-xl font-bold text-foreground">
                  {item.question}
                </h3>
                <span className={`transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-6 h-6 text-primary" />
                </span>
              </div>
              <div 
                className={`transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6 text-base sm:text-lg text-muted-foreground leading-relaxed border-t border-border/10 pt-4">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
