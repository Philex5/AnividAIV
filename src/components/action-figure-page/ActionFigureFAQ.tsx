"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ActionFigureFAQProps {
  pageData: any;
}

export function ActionFigureFAQ({ pageData }: ActionFigureFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = pageData.faq.items;

  return (
    <section className="py-16 bg-muted/30 mb-16">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {pageData.faq.title}
            </h2>
            {pageData.faq.subtitle && (
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {pageData.faq.subtitle}
              </p>
            )}
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq: any, index: number) => (
              <div
                key={index}
                className="rounded-2xl bg-background border border-border overflow-hidden"
              >
                <button
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                >
                  <span className="text-lg font-semibold text-foreground pr-4">
                    {faq.question}
                  </span>
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-5">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
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
