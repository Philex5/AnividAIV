"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/asset-loader";

interface RoadmapItem {
  id: string;
  cover_url: string;
  gen_type?: string;
  badge?: string;
  status?: string;
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

interface RoadmapClientProps {
  timeline: TimelineSection[];
  compact?: boolean;
}

export default function RoadmapClient({ timeline, compact = false }: RoadmapClientProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; // scroll-fast factor
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  // Center the current period if any
  useEffect(() => {
    if (scrollRef.current) {
      const inProgressIndex = timeline.findIndex(s => s.status === "in-progress");
      if (inProgressIndex !== -1) {
        const itemWidth = 280; // approximate width of a section including gap
        scrollRef.current.scrollLeft = Math.max(0, (inProgressIndex * itemWidth) - 100);
      }
    }
  }, [timeline]);

  return (
    <div className={cn("w-full relative", compact ? "py-2" : "py-6")}>
      {/* Horizontal Scroll Container */}
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={cn(
          "overflow-x-auto pb-6 scrollbar-hide select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="flex px-4 md:px-20 min-w-max gap-8 relative pt-4">
          {/* Connecting Line - More compact */}
          <div className="absolute top-[38px] left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent z-0 mx-20 rounded-full" />
          
          {timeline.map((section, sectionIndex) => (
            <div key={section.period} className="relative flex flex-col w-[240px] md:w-[260px]">
              {/* Timeline Header - More compact */}
              <div className="flex flex-col items-center mb-6 relative z-10 text-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center mb-2 transition-all duration-500 shadow-lg",
                    section.status === "completed" 
                      ? "bg-primary text-white shadow-primary/20 rotate-3" 
                      : section.status === "in-progress"
                      ? "bg-background border-2 border-primary text-primary shadow-primary/10 animate-pulse"
                      : "bg-muted/50 border border-border text-muted-foreground"
                  )}
                >
                  {section.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : section.status === "in-progress" ? (
                    <Rocket className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </motion.div>
                
                <h2 className="text-lg md:text-xl font-black font-anime tracking-tight text-foreground leading-tight">
                  {section.periodDisplay}
                </h2>
                <Badge 
                  variant="outline"
                  className={cn(
                    "mt-1 font-bold tracking-[0.05em] uppercase text-[9px] px-1.5 py-0 border-none h-4",
                    section.status === "completed" 
                      ? "bg-primary/10 text-primary" 
                      : section.status === "in-progress"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {section.statusDisplay}
                </Badge>

                {section.phaseName && (
                  <div className="mt-3 px-3 py-1 bg-primary/5 rounded-lg border border-primary/10 max-w-[90%]">
                    <span className="text-[11px] font-black text-primary uppercase tracking-wider">
                      {section.phaseName}
                    </span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <RoadmapCard 
                    key={item.id} 
                    item={item} 
                    index={itemIndex} 
                    sectionIndex={sectionIndex} 
                    sectionStatus={section.status}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoadmapCard({ 
  item, 
  index, 
  sectionIndex,
  sectionStatus
}: { 
  item: RoadmapItem; 
  index: number; 
  sectionIndex: number;
  sectionStatus: string;
}) {
  const isCompleted = item.status === "completed" || sectionStatus === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ 
        duration: 0.4, 
        delay: (sectionIndex * 0.08) + (index * 0.04) 
      }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="group"
    >
      <Card className={cn(
        "overflow-hidden transition-all duration-300 backdrop-blur-[6px]",
        isCompleted 
          ? "border-primary/20 bg-primary/[0.06] group-hover:bg-primary/[0.08] group-hover:shadow-[0_8px_30px_rgb(var(--primary-rgb),0.1)]" 
          : "border-white/10 bg-white/[0.04] group-hover:border-primary/20 group-hover:bg-white/[0.08] group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
      )}>
        <div className="flex flex-col p-3.5 gap-2 relative">
          {item.badge && (
            <div className={cn(
              "absolute top-0 right-0 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter rounded-bl-lg border-l border-b",
              isCompleted ? "bg-primary/20 text-primary border-primary/10" : "bg-primary/10 text-primary border-primary/10"
            )}>
              {item.badge}
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0 pr-6">
            <h3 className={cn(
              "text-[14px] md:text-[15px] font-bold mb-1 line-clamp-1 transition-colors duration-200 flex items-center gap-1.5",
              isCompleted ? "text-primary group-hover:text-primary/80" : "text-foreground/90 group-hover:text-primary"
            )}>
              {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
              {item.title}
            </h3>
            <p className={cn(
              "text-[11px] md:text-[12px] leading-relaxed line-clamp-2 font-medium transition-colors duration-200",
              isCompleted ? "text-primary/60 group-hover:text-primary/80" : "text-muted-foreground/70 group-hover:text-muted-foreground/90"
            )}>
              {item.desc}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
