'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedTitleProps {
  text: string
  highlightText?: string
  className?: string
  animationType?: 'typewriter' | 'slide' | 'glow' | 'bounce'
  delay?: number
  speed?: number
}

export const AnimatedTitle: React.FC<AnimatedTitleProps> = ({
  text,
  highlightText,
  className,
  animationType = 'typewriter',
  delay = 0,
  speed = 100
}) => {
  const [displayText, setDisplayText] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (!isAnimating) return

    if (animationType === 'typewriter') {
      let currentIndex = 0
      const typeInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex))
          currentIndex++
        } else {
          clearInterval(typeInterval)
          setShowCursor(false)
        }
      }, speed)

      return () => clearInterval(typeInterval)
    } else {
      // 对于其他动画类型，直接显示完整文本
      setDisplayText(text)
      setShowCursor(false)
    }
  }, [isAnimating, text, animationType, speed])

  const renderText = () => {
    if (!highlightText) {
      return <span>{displayText}</span>
    }

    const parts = displayText.split(highlightText)
    if (parts.length < 2) {
      return <span>{displayText}</span>
    }

    return (
      <>
        {parts[0]}
        <span
          className="bg-clip-text text-transparent font-anime font-bold"
          style={{
            backgroundImage: 'linear-gradient(135deg, var(--color-warm-orange), var(--color-golden-yellow), var(--color-vibrant-orange))'
          }}
        >
          {displayText.includes(highlightText) ? highlightText : ''}
        </span>
        {parts[1]}
      </>
    )
  }

  const getAnimationClasses = () => {
    if (!isAnimating) return 'opacity-0'

    switch (animationType) {
      case 'slide':
        return 'animate-slide-in-from-left opacity-100'
      case 'glow':
        return 'animate-pulse opacity-100'
      case 'bounce':
        return 'animate-bounce opacity-100'
      default:
        return 'opacity-100'
    }
  }

  return (
    <div className={cn('relative', className)}>
      <h1
        className={cn(
          'mb-6 text-4xl font-bold lg:text-6xl xl:text-7xl leading-tight font-anime transition-all duration-500',
          getAnimationClasses()
        )}
      >
        {renderText()}
        {animationType === 'typewriter' && showCursor && (
          <span className="inline-block w-1 h-16 bg-warm-orange ml-1 animate-blink">|</span>
        )}
      </h1>

      {/* 发光效果背景 */}
      {isAnimating && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-warm-orange/5 via-golden-yellow/5 to-vibrant-orange/5 rounded-lg animate-pulse" />
        </div>
      )}
    </div>
  )
}

// 预设动画标题组件
export const TypewriterTitle: React.FC<{ text: string; highlightText?: string; className?: string }> = ({
  text,
  highlightText,
  className
}) => (
  <AnimatedTitle
    text={text}
    highlightText={highlightText}
    animationType="typewriter"
    className={className}
    delay={500}
    speed={80}
  />
)

export const SlideTitle: React.FC<{ text: string; highlightText?: string; className?: string }> = ({
  text,
  highlightText,
  className
}) => (
  <AnimatedTitle
    text={text}
    highlightText={highlightText}
    animationType="slide"
    className={className}
    delay={300}
  />
)

export const GlowTitle: React.FC<{ text: string; highlightText?: string; className?: string }> = ({
  text,
  highlightText,
  className
}) => (
  <AnimatedTitle
    text={text}
    highlightText={highlightText}
    animationType="glow"
    className={className}
    delay={200}
  />
)

export const BounceTitle: React.FC<{ text: string; highlightText?: string; className?: string }> = ({
  text,
  highlightText,
  className
}) => (
  <AnimatedTitle
    text={text}
    highlightText={highlightText}
    animationType="bounce"
    className={className}
    delay={400}
  />
)

export default AnimatedTitle