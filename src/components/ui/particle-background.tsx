'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  hue: number
  life: number
  maxLife: number
}

interface ParticleBackgroundProps {
  className?: string
  particleCount?: number
  speed?: number
  colors?: string[]
  interactive?: boolean
  style?: 'stars' | 'dots' | 'lines' | 'magical'
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  className,
  particleCount = 50,
  speed = 0.5,
  colors = ['#FF9800', '#FFC107', '#FF5722', '#4CAF50'],
  interactive = true,
  style = 'magical'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })

  // 将颜色转换为HSL值
  const getHueFromColor = useCallback((color: string): number => {
    const colorMap: { [key: string]: number } = {
      '#FF9800': 36,  // 温暖橙
      '#FFC107': 45,  // 金黄色
      '#FF5722': 14,  // 深橙色
      '#4CAF50': 122, // 自然绿
    }
    return colorMap[color] || Math.random() * 360
  }, [])

  // 创建粒子
  const createParticle = useCallback((canvas: HTMLCanvasElement): Particle => {
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      hue: getHueFromColor(randomColor),
      life: 0,
      maxLife: Math.random() * 200 + 100
    }
  }, [colors, speed, getHueFromColor])

  // 初始化粒子
  const initParticles = useCallback((canvas: HTMLCanvasElement) => {
    particlesRef.current = []
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(createParticle(canvas))
    }
  }, [particleCount, createParticle])

  // 更新粒子
  const updateParticle = useCallback((particle: Particle, canvas: HTMLCanvasElement) => {
    particle.x += particle.vx
    particle.y += particle.vy
    particle.life++

    // 边界检测
    if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
    if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

    // 生命周期
    if (particle.life > particle.maxLife) {
      Object.assign(particle, createParticle(canvas))
    }

    // 交互效果
    if (interactive) {
      const dx = mouseRef.current.x - particle.x
      const dy = mouseRef.current.y - particle.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 100) {
        const force = (100 - distance) / 100
        particle.vx -= (dx / distance) * force * 0.01
        particle.vy -= (dy / distance) * force * 0.01
        particle.opacity = Math.min(1, particle.opacity + force * 0.02)
      }
    }
  }, [interactive, createParticle])

  // 绘制粒子
  const drawParticle = useCallback((
    ctx: CanvasRenderingContext2D, 
    particle: Particle
  ) => {
    ctx.save()
    ctx.globalAlpha = particle.opacity

    switch (style) {
      case 'stars':
        // 星星效果
        ctx.fillStyle = `hsl(${particle.hue}, 80%, 60%)`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        
        // 添加闪烁效果
        if (Math.random() < 0.1) {
          ctx.shadowBlur = 10
          ctx.shadowColor = `hsl(${particle.hue}, 80%, 60%)`
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2)
          ctx.fill()
        }
        break

      case 'dots':
        // 简单圆点
        ctx.fillStyle = `hsl(${particle.hue}, 70%, 50%)`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'lines':
        // 线条效果
        ctx.strokeStyle = `hsl(${particle.hue}, 70%, 50%)`
        ctx.lineWidth = particle.size * 0.5
        ctx.beginPath()
        ctx.moveTo(particle.x, particle.y)
        ctx.lineTo(particle.x + particle.vx * 10, particle.y + particle.vy * 10)
        ctx.stroke()
        break

      case 'magical':
      default:
        // 魔法粒子效果
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        )
        gradient.addColorStop(0, `hsla(${particle.hue}, 80%, 60%, ${particle.opacity})`)
        gradient.addColorStop(0.5, `hsla(${particle.hue}, 70%, 50%, ${particle.opacity * 0.5})`)
        gradient.addColorStop(1, `hsla(${particle.hue}, 60%, 40%, 0)`)
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2)
        ctx.fill()
        
        // 核心发光点
        ctx.fillStyle = `hsl(${particle.hue}, 90%, 80%)`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2)
        ctx.fill()
        break
    }
    
    ctx.restore()
  }, [style])

  // 连接线效果（仅在magical模式下）
  const drawConnections = useCallback((ctx: CanvasRenderingContext2D) => {
    if (style !== 'magical') return

    for (let i = 0; i < particlesRef.current.length; i++) {
      for (let j = i + 1; j < particlesRef.current.length; j++) {
        const p1 = particlesRef.current[i]
        const p2 = particlesRef.current[j]
        
        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 120) {
          const opacity = (120 - distance) / 120 * 0.1
          ctx.strokeStyle = `rgba(255, 152, 0, ${opacity})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
      }
    }
  }, [style])

  // 动画循环
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 更新和绘制粒子
    particlesRef.current.forEach(particle => {
      updateParticle(particle, canvas)
      drawParticle(ctx, particle)
    })

    // 绘制连接线
    drawConnections(ctx)

    animationRef.current = requestAnimationFrame(animate)
  }, [updateParticle, drawParticle, drawConnections])

  // 处理鼠标移动
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    mouseRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }, [])

  // 处理窗口大小变化
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    
    initParticles(canvas)
  }, [initParticles])

  // 初始化
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    handleResize()
    animate()

    window.addEventListener('resize', handleResize)
    if (interactive) {
      canvas.addEventListener('mousemove', handleMouseMove)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', handleResize)
      if (interactive) {
        canvas.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [handleResize, animate, interactive, handleMouseMove])

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ 
          background: 'transparent',
          pointerEvents: interactive ? 'auto' : 'none'
        }}
      />
    </div>
  )
}

// 预设配置
export const ParticlePresets = {
  warmAnime: {
    particleCount: 80,
    speed: 0.3,
    colors: ['#FF9800', '#FFC107', '#FF5722'],
    style: 'magical' as const,
    interactive: true
  },
  golden: {
    particleCount: 60,
    speed: 0.8,
    colors: ['#FFC107', '#FFB300', '#FF8F00'],
    style: 'dots' as const,
    interactive: true
  },
  starfield: {
    particleCount: 100,
    speed: 0.2,
    colors: ['#FF9800', '#FFC107', '#FF5722', '#4CAF50'],
    style: 'stars' as const,
    interactive: false
  },
  energyFlow: {
    particleCount: 40,
    speed: 1.2,
    colors: ['#FF5722', '#FF9800'],
    style: 'lines' as const,
    interactive: false
  }
}

export default ParticleBackground
