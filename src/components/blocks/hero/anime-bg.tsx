'use client'

import React from 'react'
import { ParticleBackground, ParticlePresets } from '@/components/ui/particle-background'

export default function AnimeBg() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* 渐变背景层 */}
      <div className="absolute inset-0 bg-gradient-to-br from-warm-cream via-paper-white to-mist-gray" />

      {/* 装饰性渐变光晕 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-warm-orange/20 to-golden-yellow/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-vibrant-orange/15 to-nature-green/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* 温暖动漫风格粒子背景 */}
      <ParticleBackground
        {...ParticlePresets.warmAnime}
        className="opacity-60"
      />

      {/* 动态几何装饰 */}
      <div className="absolute inset-0 opacity-10">
        <svg
          className="w-full h-full"
          viewBox="0 0 1920 1080"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 动态圆形 */}
          <circle
            cx="200"
            cy="200"
            r="100"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-warm-orange animate-spin"
            style={{ animationDuration: '20s' }}
          />
          <circle
            cx="1600"
            cy="300"
            r="150"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-golden-yellow animate-spin"
            style={{ animationDuration: '25s', animationDirection: 'reverse' }}
          />

          {/* 动态多边形 */}
          <polygon
            points="300,800 400,700 500,800 450,900 350,900"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-vibrant-orange animate-pulse"
          />
          <polygon
            points="1400,700 1500,600 1600,700 1550,800 1450,800"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-nature-green animate-pulse"
            style={{ animationDelay: '2s' }}
          />

          {/* 流动线条 */}
          <path
            d="M100,500 Q500,300 900,500 T1700,500"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-warm-orange opacity-30"
          />
          <path
            d="M200,600 Q600,400 1000,600 T1800,600"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-golden-yellow opacity-20"
          />
        </svg>
      </div>

      {/* 顶部模糊遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20" />
    </div>
  )
}