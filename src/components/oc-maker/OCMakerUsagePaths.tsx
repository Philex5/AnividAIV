"use client";

import React from "react";
import { motion } from "framer-motion";
import { Hammer, ArrowRight, Save, Zap, CheckCircle2 } from "lucide-react";

interface PathData {
  title: string;
  description: string;
  steps: string[];
}

interface OCMakerUsagePathsProps {
  title: string;
  subtitle: string;
  pathA: PathData;
  pathB: PathData;
}

export function OCMakerUsagePaths({
  title,
  subtitle,
  pathA,
  pathB,
}: OCMakerUsagePathsProps) {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl lg:text-4xl font-bold font-anime text-foreground mb-6"
          >
            {title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto"
          >
            {subtitle}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Path A: Quick Summon */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/30 to-accent/30 rounded-[var(--radius-2xl)] blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="relative h-full glass-card group p-8 md:p-10 rounded-[var(--radius-xl)] border-refined hover-float transition-all duration-300 flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-3 text-foreground font-display">
                {pathA.title}
                <span className="text-[10px] uppercase tracking-widest bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                  Instant
                </span>
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-8 text-sm lg:text-base">
                {pathA.description}
              </p>
              
              <div className="space-y-4">
                {pathA.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground/90 text-sm md:text-base font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Path B: Master Smith */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-br from-secondary/30 to-accent/30 rounded-[var(--radius-2xl)] blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="relative h-full glass-card group p-8 md:p-10 rounded-[var(--radius-xl)] border-refined hover-float transition-all duration-300 flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6 border border-secondary/20 group-hover:scale-110 transition-transform duration-300">
                <Hammer className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-3 text-foreground font-display">
                {pathB.title}
                <span className="text-[10px] uppercase tracking-widest bg-secondary/20 text-secondary px-2 py-0.5 rounded-full border border-secondary/30">
                  Precision
                </span>
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-8 text-sm lg:text-base">
                {pathB.description}
              </p>

              <div className="space-y-4">
                {pathB.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground/90 text-sm md:text-base font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}