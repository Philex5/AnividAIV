"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaSource } from './MediaDisplay';

export interface AdaptiveCarouselProps {
  images: MediaSource[];
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
}

export const AdaptiveCarousel: React.FC<AdaptiveCarouselProps> = ({
  images,
  autoPlay = true,
  interval = 3000,
  showDots = true,
  showArrows = true,
  className
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 自动播放逻辑
  useEffect(() => {
    if (!isPlaying || isHovered || images.length <= 1) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, interval);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, isHovered, interval, images.length]);

  const goToPrevious = () => {
    setCurrentIndex(prev => 
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % images.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    return (
      <div className={cn("adaptive-carousel single-image", className)}>
        <div className="carousel-container relative">
          <Image
            src={images[0].url}
            alt={images[0].alt}
            width={600}
            height={400}
            className="w-full h-auto rounded-xl shadow-lg"
            style={{ width: '100%', height: 'auto' }}
          />
          {images[0].caption && (
            <p className="carousel-caption mt-2 text-sm text-muted-foreground text-center">
              {images[0].caption}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("adaptive-carousel", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="carousel-container relative overflow-hidden rounded-xl">
        {/* 图片轨道 */}
        <div 
          className="carousel-track flex transition-transform duration-500 ease-in-out"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {images.map((image, index) => (
            <div key={index} className="carousel-slide flex-shrink-0 w-full">
              <Image 
                src={image.url} 
                alt={image.alt}
                width={600}
                height={400}
                priority={index === 0}
                className="w-full h-auto"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
          ))}
        </div>
        
        {/* 导航箭头 */}
        {showArrows && images.length > 1 && (
          <>
            <button 
              className="carousel-arrow carousel-prev absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-background hover:scale-110 transition-all duration-200 flex items-center justify-center"
              onClick={goToPrevious}
              aria-label="Previous image"
            >
              <ChevronLeftIcon className="w-4 h-4 text-foreground" />
            </button>
            <button 
              className="carousel-arrow carousel-next absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-background hover:scale-110 transition-all duration-200 flex items-center justify-center"
              onClick={goToNext}
              aria-label="Next image"
            >
              <ChevronRightIcon className="w-4 h-4 text-foreground" />
            </button>
          </>
        )}
        
        {/* 播放/暂停指示器 */}
        {autoPlay && images.length > 1 && (
          <div className="absolute top-2 right-2">
            <button
              className="w-6 h-6 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background/80 transition-colors"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause autoplay" : "Resume autoplay"}
            >
              {isPlaying ? (
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              ) : (
                <div className="w-2 h-2 bg-muted-foreground rounded-full" />
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* 图片说明 */}
      {images[currentIndex].caption && (
        <p className="carousel-caption mt-2 text-sm text-muted-foreground text-center">
          {images[currentIndex].caption}
        </p>
      )}
      
      {/* 导航点 */}
      {showDots && images.length > 1 && (
        <div className="carousel-dots flex justify-center mt-4 space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              className={cn(
                "carousel-dot w-2 h-2 rounded-full transition-all duration-200",
                index === currentIndex 
                  ? "bg-primary scale-125" 
                  : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
              )}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};