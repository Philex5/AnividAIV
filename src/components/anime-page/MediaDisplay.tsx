"use client";

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AdaptiveCarousel } from './AdaptiveCarousel';

export interface MediaSource {
  url: string;
  alt: string;
  caption?: string;
}

export interface MediaDisplayProps {
  type: 'gif' | 'single-png' | 'multi-png';
  src?: string;
  sources?: MediaSource[];
  alt: string;
  className?: string;
  autoPlay?: boolean;
  interval?: number;
  controls?: boolean;
  priority?: boolean;
}

export const MediaDisplay: React.FC<MediaDisplayProps> = ({ 
  type, 
  src, 
  sources, 
  alt, 
  className,
  autoPlay = true,
  interval = 3000,
  priority = false,
  ...props 
}) => {
  const baseClasses = "w-full h-auto rounded-xl shadow-lg";
  
  switch (type) {
    case 'gif':
      if (!src) {
        console.warn('MediaDisplay: src is required for gif type');
        return null;
      }
      return (
        <div className={cn("media-display gif-container", className)}>
          <img 
            src={src} 
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            className={baseClasses}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      );
    
    case 'single-png':
      if (!src) {
        console.warn('MediaDisplay: src is required for single-png type');
        return null;
      }
      return (
        <div className={cn("media-display image-container", className)}>
          <Image 
            src={src} 
            alt={alt}
            width={600}
            height={400}
            priority={priority}
            className={baseClasses}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
      );
    
    case 'multi-png':
      if (!sources || sources.length === 0) {
        console.warn('MediaDisplay: sources is required for multi-png type');
        return null;
      }
      return (
        <div className={cn("media-display carousel-container", className)}>
          <AdaptiveCarousel 
            images={sources}
            autoPlay={autoPlay}
            interval={interval}
          />
        </div>
      );
    
    default:
      console.warn(`MediaDisplay: Unknown type "${type}"`);
      return null;
  }
};