"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import type { AnimeGeneratorPage } from '@/types/pages/landing';
import { MediaDisplay, type MediaSource } from './MediaDisplay';
import { cn } from '@/lib/utils';
import { WandIcon, PaletteIcon, ZapIcon, ArrowRightIcon } from 'lucide-react';

interface FeatureData {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'media-left' | 'media-right';
  title: string;
  description: string;
  features: string[];
  cta: string;
  media: {
    type: 'gif' | 'single-png' | 'multi-png';
    src?: string;
    sources?: MediaSource[];
    alt: string;
  };
}

interface FeatureSectionProps {
  feature: FeatureData;
  index: number;
}

const FeatureSection: React.FC<FeatureSectionProps> = ({ feature, index }) => {
  
  const Icon = feature.icon;
  
  return (
    <div 
      className={cn(
        "feature-section mb-16 lg:mb-24 last:mb-0",
        "lg:grid lg:grid-cols-5 lg:gap-12 lg:items-center",
        feature.variant === 'media-left' && "lg:grid-cols-5"
      )}
    >
      {/* 内容区域 */}
      <div 
        className={cn(
          "feature-content space-y-6 mb-8 lg:mb-0",
          feature.variant === 'media-left' 
            ? "lg:col-span-3 lg:order-2" 
            : "lg:col-span-3 lg:order-1"
        )}
      >
        {/* 图标和标题 */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-foreground">
            {feature.title}
          </h3>
        </div>
        
        {/* 描述 */}
        <p className="text-lg text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
        
        {/* 特性列表 */}
        <div className="space-y-3">
          {feature.features?.map((featureText, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <span className="text-foreground">{featureText}</span>
            </div>
          ))}
        </div>
        
        {/* CTA按钮 */}
        <div className="pt-2">
          <Button 
            variant="outline" 
            className="group hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            {feature.cta}
            <ArrowRightIcon className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
      
      {/* 媒体区域 */}
      <div 
        className={cn(
          "feature-media",
          feature.variant === 'media-left' 
            ? "lg:col-span-2 lg:order-1" 
            : "lg:col-span-2 lg:order-2"
        )}
      >
        <MediaDisplay
          type={feature.media.type}
          src={feature.media.src}
          sources={feature.media.sources}
          alt={feature.media.alt}
          priority={index === 0}
          className="transform hover:scale-105 transition-transform duration-300"
        />
      </div>
    </div>
  );
};

interface FeatureShowcaseProps {
  pageData: AnimeGeneratorPage;
}

export const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({ pageData }) => {
  
  // 特性数据配置 - 使用pageData
  const features: FeatureData[] = [
    {
      id: 'intelligent_prompts',
      icon: WandIcon,
      variant: 'media-right',
      title: pageData.features?.intelligent_prompts?.title || 'Intelligent Prompts',
      description: pageData.features?.intelligent_prompts?.description || 'AI-powered prompt optimization for better results',
      features: [
        pageData.features?.intelligent_prompts?.features?.[0] || 'Smart prompt suggestions',
        pageData.features?.intelligent_prompts?.features?.[1] || 'Auto-optimization',
        pageData.features?.intelligent_prompts?.features?.[2] || 'Style enhancement',
        pageData.features?.intelligent_prompts?.features?.[3] || 'Quality improvement'
      ],
      cta: pageData.features?.intelligent_prompts?.cta || 'Try Now',
      media: {
        type: 'gif',
        src: '/features/prompt-optimization.gif',
        alt: pageData.features?.intelligent_prompts?.media_alt || 'Prompt optimization'
      }
    },
    {
      id: 'diverse_styles',
      icon: PaletteIcon,
      variant: 'media-left',
      title: pageData.features?.diverse_styles?.title || 'Diverse Styles',
      description: pageData.features?.diverse_styles?.description || 'Multiple artistic styles to choose from',
      features: [
        pageData.features?.diverse_styles?.features?.[0] || 'Studio Ghiblio style',
        pageData.features?.diverse_styles?.features?.[1] || 'Pixar 3D style',
        pageData.features?.diverse_styles?.features?.[2] || 'Watercolor style',
        pageData.features?.diverse_styles?.features?.[3] || 'Manga style'
      ],
      cta: pageData.features?.diverse_styles?.cta || 'Explore Styles',
      media: {
        type: 'multi-png',
        sources: [
          { 
            url: '/styles/ghiblio-example.png', 
            alt: pageData.features?.diverse_styles?.features?.[0] || 'Studio Ghiblio style',
            caption: 'Studio Ghiblio'
          },
          { 
            url: '/styles/pixar-example.png', 
            alt: pageData.features?.diverse_styles?.features?.[1] || 'Pixar 3D style',
            caption: 'Pixar 3D'
          },
          { 
            url: '/styles/watercolor-example.png', 
            alt: pageData.features?.diverse_styles?.features?.[2] || 'Watercolor style',
            caption: 'Watercolor'
          },
          { 
            url: '/styles/manga-example.png', 
            alt: pageData.features?.diverse_styles?.features?.[3] || 'Manga style',
            caption: 'Manga Style'
          }
        ],
        alt: pageData.features?.diverse_styles?.media_alt || 'Various art styles'
      }
    },
    {
      id: 'rapid_generation',
      icon: ZapIcon,
      variant: 'media-right',
      title: pageData.features?.rapid_generation?.title || 'Rapid Generation',
      description: pageData.features?.rapid_generation?.description || 'Fast and efficient image generation',
      features: [
        pageData.features?.rapid_generation?.features?.[0] || 'Lightning fast processing',
        pageData.features?.rapid_generation?.features?.[1] || 'High quality output',
        pageData.features?.rapid_generation?.features?.[2] || 'Batch processing',
        pageData.features?.rapid_generation?.features?.[3] || 'Real-time preview'
      ],
      cta: pageData.features?.rapid_generation?.cta || 'Start Creating',
      media: {
        type: 'single-png',
        src: '/features/generation-speed.png',
        alt: pageData.features?.rapid_generation?.media_alt || 'Fast generation'
      }
    }
  ];

  return (
    <section className="feature-showcase py-16 lg:py-24">
      <div className="container max-w-6xl mx-auto px-4">
        {/* 节标题 */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {pageData.features?.section_title || 'Amazing Features'}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {pageData.features?.section_subtitle || 'Discover powerful tools for creating stunning anime art'}
          </p>
        </div>
        
        {/* 特性列表 */}
        <div className="space-y-0">
          {features.map((feature, index) => (
            <FeatureSection 
              key={feature.id} 
              feature={feature} 
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};