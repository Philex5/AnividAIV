"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { RiArrowRightLine, RiPlayFill } from "react-icons/ri";
import { getImageUrl, getR2ImageUrl } from "@/lib/asset-loader";
import { motion } from "framer-motion";
import { OCMakerBentoLayout } from "./oc-maker-bento";
import { OCAppsBentoLayout } from "./oc-apps-bento";

interface FeatureMedia {
  type: 'image' | 'video' | 'generation-demo' | 'editing-demo' | 'before-after' | 'stacked-images';
  src?: string;
  images?: string[];
  aspect?: 'portrait' | 'landscape';
  before_src?: string;
  after_src?: string;
  poster?: string;
  alt?: string;
}

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  link?: string;
  media?: FeatureMedia;
  ctaText?: string;
  isComingSoon?: boolean;
}

interface FeaturesProps {
  title?: string;
  description?: string;
  features?: FeatureItem[];
}

const StackedImages = ({ images, alt, aspect = 'portrait' }: { images: string[]; alt?: string; aspect?: 'portrait' | 'landscape' }) => {
  const displayImages = images.slice(0, 3).reverse();
  const isPortrait = aspect === 'portrait';

  // Variants for fan-out effect
  const containerVariants = {
    initial: {},
    hover: {}
  };

  const itemVariants = (index: number) => {
    const originalIndex = 2 - index; // 0, 1, 2
    const rotations = isPortrait ? [-8, 6, 0] : [-5, 3, 0];
    const xOffsets = isPortrait ? [-20, 15, 0] : [-10, 8, 0];
    
    return {
      initial: { 
        rotate: rotations[originalIndex], 
        x: xOffsets[originalIndex],
        y: 0,
        scale: 1
      },
      hover: { 
        rotate: isPortrait ? (originalIndex - 1) * 12 : (originalIndex - 1) * 8, 
        x: (originalIndex - 1) * (isPortrait ? 45 : 60),
        y: isPortrait ? -15 : (originalIndex === 1 ? -20 : -5),
        scale: 1.05,
        transition: { type: "spring" as const, stiffness: 300, damping: 20 }
      }
    };
  };

  return (
    <motion.div 
      variants={containerVariants}
      className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden"
    >
      <div className={cn(
        "relative w-full",
        isPortrait ? "aspect-[3/4] max-w-[180px]" : "aspect-[16/10] max-w-[240px]"
      )}>
        {displayImages.map((src, i) => {
          const originalIndex = 2 - i;
          return (
            <motion.div
              key={src}
              variants={itemVariants(i)}
              className={cn(
                "absolute inset-0 rounded-xl overflow-hidden border-2 border-white shadow-xl bg-muted",
                originalIndex === 2 && "shadow-2xl"
              )}
              style={{ zIndex: originalIndex }}
            >
              <img
                src={getR2ImageUrl(src)}
                alt={`${alt} - ${originalIndex + 1}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

const FeatureCard = ({ feature, index }: { feature: FeatureItem; index: number }) => {
  // Identify the two main 2x2 anchor cards
  const isOCMaker = !feature.isComingSoon && (
    feature.title.toLowerCase().includes("oc maker") || 
    feature.title.toLowerCase().includes("character creator")
  );

  const isOCApps = !feature.isComingSoon && (
    feature.title.toLowerCase().includes("studio tools") || 
    feature.title.toLowerCase().includes("oc apps") || 
    feature.title.toLowerCase().includes("world crafts")
  );

  let gridSpans = "col-span-1 row-span-1 h-[240px] lg:h-[260px]";
  
  if (isOCMaker || isOCApps) {
    gridSpans = "md:col-span-2 md:row-span-2 h-[504px] lg:h-[544px]";
  }

  const positioning = isOCApps ? "lg:col-start-2" : "";

  const comingSoonStyles = feature.isComingSoon 
    ? "bg-muted/5 border border-white/5 opacity-60 grayscale hover:opacity-80" 
    : "bg-muted/10 border border-white/10 dark:border-white/5 hover:border-primary/50 hover:shadow-[0_0_40px_-10px_rgba(var(--primary),0.3)]";

  const mediaSrc = feature.media?.src ? getImageUrl(feature.media.src) : "";
  const posterSrc = feature.media?.poster ? getImageUrl(feature.media.poster) : "";

  return (
    <motion.div
      initial="initial"
      whileHover="hover"
      animate="initial"
      viewport={{ once: true }}
      className={cn(
        "group relative flex flex-col justify-end overflow-hidden rounded-3xl transition-all duration-700",
        comingSoonStyles,
        gridSpans,
        positioning
      )}
    >
      {!feature.isComingSoon && (
        <Link href={feature.link || "#"} className="absolute inset-0 z-40 focus:outline-none">
          <span className="sr-only">View {feature.title}</span>
        </Link>
      )}

      {/* Background Media */}
      <div className="absolute inset-0 z-0 bg-muted/20">
        {isOCMaker ? (
          <OCMakerBentoLayout />
        ) : isOCApps ? (
          <OCAppsBentoLayout />
        ) : feature.media?.type === 'video' ? (
          <motion.video
            src={mediaSrc}
            variants={{
              initial: { scale: 1 },
              hover: { scale: 1.05 }
            }}
            transition={{ duration: 1 }}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={posterSrc}
          />
        ) : feature.media?.type === 'stacked-images' && feature.media?.images ? (
          <StackedImages 
            images={feature.media.images} 
            alt={feature.media.alt || feature.title} 
            aspect={feature.media.aspect}
          />
        ) : (
          <motion.img
            src={mediaSrc}
            alt={feature.media?.alt || feature.title}
            variants={{
              initial: { scale: 1 },
              hover: { scale: 1.05 }
            }}
            transition={{ duration: 1 }}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
        
        {/* Overlays */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent transition-opacity duration-500",
          feature.isComingSoon ? "opacity-90" : "opacity-70 group-hover:opacity-90"
        )} />
        
        {feature.isComingSoon && (
          <div className="absolute inset-0 z-10 flex items-start justify-end p-6">
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Soon</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-20 p-6 md:p-8 flex flex-col h-full justify-between pointer-events-none">
        {/* Top: Action Icons */}
        <div className="flex justify-end items-start">
          {feature.media?.type === 'video' && !feature.isComingSoon && (
             <div className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 group-hover:bg-primary/20 transition-colors">
                <RiPlayFill className="w-4 h-4 text-white" />
             </div>
          )}
        </div>

        {/* Bottom: Text & Action */}
        <div className={cn(
           "transition-all duration-500",
           !feature.isComingSoon && "transform translate-y-4 group-hover:translate-y-0"
        )}>
          <h3 className={cn(
            "font-black font-anime mb-1 leading-tight tracking-tight transition-all duration-500",
            feature.isComingSoon ? "text-base text-white/40" : ((isOCMaker || isOCApps) ? "text-2xl md:text-4xl text-white" : "text-lg md:text-xl text-white")
          )}>
            {feature.title}
          </h3>
          <p className={cn(
            "line-clamp-2 transition-colors duration-500",
            feature.isComingSoon ? "text-[10px] text-white/20" : ((isOCMaker || isOCApps) ? "text-sm md:text-base text-white/70 max-w-[90%]" : "text-xs text-white/70 group-hover:text-white")
          )}>
            {feature.description}
          </p>
          
          {!feature.isComingSoon && (
            <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em] opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 delay-100 mt-4">
               {feature.ctaText || "Explore"} 
               <RiArrowRightLine className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function Features({
  title = "Unlock Your Creativity",
  description = "Powerful tools to bring your imagination to life.",
  features = []
}: FeaturesProps) {
  
  if (!features || features.length === 0) return null;

  return (
    <section className="py-20 md:py-24 relative overflow-hidden">
      {/* Background decorative elements - Softened for better transition */}
      <div className="absolute top-0 -left-1/4 w-[600px] h-[600px] bg-primary/[0.03] blur-[140px] rounded-full -z-10" />
      <div className="absolute bottom-0 -right-1/4 w-[600px] h-[600px] bg-blue-500/[0.03] blur-[140px] rounded-full -z-10" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="w-12 h-[2px] bg-primary" />
            <span className="text-primary font-bold tracking-[0.3em] uppercase text-xs">Capabilities</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl lg:text-6xl font-black font-anime mb-6 leading-[1] tracking-tighter"
          >
            {title}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium"
          >
            {description}
          </motion.p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:auto-rows-min">
          {features.map((feature, idx) => (
             <FeatureCard key={feature.id} feature={feature} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}
