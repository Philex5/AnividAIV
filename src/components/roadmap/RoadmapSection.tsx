"use client";

import React from "react";
import { motion } from "framer-motion";
import RoadmapClient from "./RoadmapClient";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { RiArrowRightLine } from "react-icons/ri";

interface RoadmapItem {
  id: string;
  cover_url: string;
  gen_type?: string;
  badge?: string;
  title: string;
  desc: string;
}

interface TimelineSection {
  period: string;
  status: string;
  periodDisplay: string;
  statusDisplay: string;
  phaseName?: string;
  items: RoadmapItem[];
}

interface RoadmapSectionProps {
  title?: string;
  subtitle?: string;
  timeline: TimelineSection[];
  className?: string;
  showFullLink?: boolean;
}

export default function RoadmapSection({
  title = "The Future of AnividAI",
  subtitle = "Our journey to build the ultimate AI anime ecosystem.",
  timeline,
  className,
  showFullLink = true,
}: RoadmapSectionProps) {
  return (
    <section className={cn("py-4 relative overflow-hidden", className)}>
      {/* Refined Background Glows - Creamier and softer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1400px] bg-primary/[0.03] blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute -bottom-24 left-1/4 w-[500px] h-[500px] bg-blue-500/[0.02] blur-[100px] rounded-full -z-10 pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-12 h-[2px] bg-primary/40" />
              <span className="text-primary font-bold tracking-[0.3em] uppercase text-xs">Roadmap</span>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black font-anime mb-6 leading-[1.1] tracking-tighter bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent"
            >
              {title}
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground/80 leading-relaxed font-medium"
            >
              {subtitle}
            </motion.p>
          </div>

          {showFullLink && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Link 
                href="/roadmap"
                className="group flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-primary/10 border border-white/10 rounded-2xl transition-all duration-300"
              >
                <span className="text-sm font-bold">View Full Roadmap</span>
                <RiArrowRightLine className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          )}
        </div>

        {/* The Roadmap Component with improved transitions */}
        <div className="relative">
            {/* Smoother side masks */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background via-background/80 to-transparent z-20 pointer-events-none hidden md:block" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background via-background/80 to-transparent z-20 pointer-events-none hidden md:block" />
            
            <RoadmapClient timeline={timeline} />
        </div>
      </div>
    </section>
  );
}