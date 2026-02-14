"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { RiArrowRightLine, RiPlayCircleLine } from "react-icons/ri";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface HeroVideoProps {
  title?: string;
  description?: string;
  highlight_text?: string;
  ctaText?: string;
  ctaLink?: string;
}

export default function HeroVideo({
  title = "Your AI Studio for Anime Worlds",
  description = "The Character-Driven AI Anime World Building Engine",
  highlight_text = "your characters",
  ctaText = "Start with your first OC",
  ctaLink = "/oc-maker",
}: HeroVideoProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);

  // Helper to highlight text
  const renderTitle = () => {
    if (!highlight_text) return title;

    // 使用正则进行不区分大小写的分割
    const regex = new RegExp(`(${highlight_text})`, "gi");
    const parts = title.split(regex);

    if (parts.length < 2) return title;

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight_text.toLowerCase() ? (
            <span
              key={i}
              className="text-primary drop-shadow-[0_0_15px_rgba(255,149,0,0.4)] dark:drop-shadow-[0_0_15px_rgba(255,179,71,0.4)]"
            >
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </>
    );
  };

  return (
    <section className="relative w-full h-svh min-h-150 flex items-center justify-center overflow-hidden bg-background">
      {/* 1. Video Background Layer */}
      <div className="absolute inset-0 z-0">
        {/* Poster Image for instant visual */}
        <img
          src="https://artworks.anividai.com/assets/hero-poster.webp"
          alt="Hero poster: Anime character artwork showcase with vibrant colors and dynamic poses"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${videoLoaded ? "opacity-0" : "opacity-100"}`}
          onLoad={() => setPosterLoaded(true)}
          loading="eager"
          fetchPriority="high"
        />
        <video
          preload="auto"
          autoPlay
          loop
          muted
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
          onCanPlay={() => setVideoLoaded(true)}
        >
          <source
            src="https://artworks.anividai.com/assets/hero_video_smaller.mp4"
            type="video/mp4"
          />
        </video>

        {/* Theme-based Overlay: Glassy Darkening */}
        <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px]" />

        {/* Gradient Overlay for Readability (Bottom to Top) */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Bottom Fade - ensuring smooth transition to next sections */}
        <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* 2. Content Layer */}
      <div className="relative z-10 container mx-auto px-4 translate-y-20 md:translate-y-32">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
          <div className="space-y-2 md:space-y-3">
            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-anime text-foreground leading-[1.2] tracking-tight drop-shadow-sm"
            >
              {renderTitle()}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="text-sm sm:text-base md:text-lg text-muted-foreground/90 leading-relaxed font-medium max-w-3xl mx-auto drop-shadow-sm"
            >
              {description}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-1 md:pt-2"
            >
              <Link href={ctaLink}>
                <Button
                  size="lg"
                  className={cn(
                    "h-10 md:h-12 px-6 md:px-8 rounded-full text-sm md:text-base font-bold",
                    "bg-primary/90 backdrop-blur-md border border-white/10 dark:border-white/5",
                    "text-primary-foreground transition-all duration-300",
                    "shadow-[0_8px_20px_-8px_rgba(var(--primary),0.4)]",
                    "hover:bg-primary hover:shadow-[0_12px_25px_-8px_rgba(var(--primary),0.5)]",
                    "hover:-translate-y-0.5 active:scale-95",
                  )}
                >
                  {ctaText}
                  <RiArrowRightLine className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
