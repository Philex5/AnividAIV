'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DuangEffectProps {
  children: React.ReactNode
  triggerOnMount?: boolean
  delay?: number
  className?: string
  effectType?: 'explosion' | 'bubble' | 'flash'
}

export const DuangEffect: React.FC<DuangEffectProps> = ({
  children,
  triggerOnMount = false,
  delay = 0,
  className,
  effectType = 'explosion'
}) => {
  const [isVisible, setIsVisible] = useState(!triggerOnMount)
  const [showEffect, setShowEffect] = useState(false)

  useEffect(() => {
    if (triggerOnMount) {
      const timer = setTimeout(() => {
        setShowEffect(true)
        setIsVisible(true)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [triggerOnMount, delay])

  const getEffectClasses = () => {
    if (!showEffect) return 'opacity-0 scale-0'

    switch (effectType) {
      case 'explosion':
        return 'animate-bounce opacity-100 scale-100'
      case 'bubble':
        return 'animate-pulse opacity-100 scale-100'
      case 'flash':
        return 'animate-ping opacity-100 scale-100'
      default:
        return 'animate-bounce opacity-100 scale-100'
    }
  }

  return (
    <div className={cn('relative inline-block', className)}>
      {/* 主要内容 */}
      <div
        className={cn(
          'transition-all duration-700 ease-out',
          getEffectClasses()
        )}
      >
        {children}
      </div>

      {/* 特效层 */}
      {showEffect && (
        <>
          {effectType === 'explosion' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* 爆炸环 */}
              <div className="absolute inset-0 rounded-full border-4 border-warm-orange animate-ping opacity-75" />
              <div className="absolute inset-0 rounded-full border-2 border-golden-yellow animate-ping opacity-50" style={{ animationDelay: '0.2s' }} />
              <div className="absolute inset-0 rounded-full border-1 border-vibrant-orange animate-ping opacity-25" style={{ animationDelay: '0.4s' }} />

              {/* 星星粒子 */}
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-golden-yellow rounded-full animate-bounce opacity-80" />
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-warm-orange rounded-full animate-bounce opacity-60" style={{ animationDelay: '0.1s' }} />
              <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-vibrant-orange rounded-full animate-bounce opacity-60" style={{ animationDelay: '0.2s' }} />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-nature-green rounded-full animate-bounce opacity-80" style={{ animationDelay: '0.3s' }} />
            </div>
          )}

          {effectType === 'bubble' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-warm-orange/20 to-golden-yellow/20 rounded-full animate-pulse" />
              <div className="absolute inset-2 bg-gradient-to-r from-golden-yellow/30 to-vibrant-orange/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          )}

          {effectType === 'flash' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-40" />
              <div className="absolute inset-0 bg-golden-yellow rounded-full animate-ping opacity-20" style={{ animationDelay: '0.1s' }} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// 预设DUANG特效组件
export const ExplosionDuang: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0
}) => (
  <DuangEffect effectType="explosion" triggerOnMount delay={delay}>
    {children}
  </DuangEffect>
)

export const BubbleDuang: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0
}) => (
  <DuangEffect effectType="bubble" triggerOnMount delay={delay}>
    {children}
  </DuangEffect>
)

export const FlashDuang: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0
}) => (
  <DuangEffect effectType="flash" triggerOnMount delay={delay}>
    {children}
  </DuangEffect>
)

export default DuangEffect