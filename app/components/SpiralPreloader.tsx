'use client'

import { useEffect, useRef } from 'react'

const N = 600
const DOT_RADIUS = 2
const MARGIN = 2
const DURATION = 3
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const DEFAULT_COLORS = ['#fb923c', '#f97316', '#ea580c'] as const

function getThemeColors(): string[] {
  if (typeof document === 'undefined') return [...DEFAULT_COLORS]
  const root = document.documentElement
  const style = getComputedStyle(root)
  const primary = style.getPropertyValue('--primary').trim() || DEFAULT_COLORS[1]
  return [DEFAULT_COLORS[0], primary, DEFAULT_COLORS[2]]
}

type SpiralPreloaderProps = {
  size?: number
  className?: string
}

export default function SpiralPreloader({ size = 400, className = '' }: SpiralPreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const svgNS = 'http://www.w3.org/2000/svg'
    const CENTER = size / 2
    const MAX_RADIUS = CENTER - MARGIN - DOT_RADIUS
    const colors = getThemeColors()

    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)

    for (let i = 0; i < N; i++) {
      const idx = i + 0.5
      const frac = idx / N
      const r = Math.sqrt(frac) * MAX_RADIUS
      const theta = idx * GOLDEN_ANGLE
      const x = CENTER + r * Math.cos(theta)
      const y = CENTER + r * Math.sin(theta)

      const c = document.createElementNS(svgNS, 'circle')
      c.setAttribute('cx', String(x))
      c.setAttribute('cy', String(y))
      c.setAttribute('r', String(DOT_RADIUS))
      c.setAttribute('fill', colors[i % colors.length])

      const animR = document.createElementNS(svgNS, 'animate')
      animR.setAttribute('attributeName', 'r')
      animR.setAttribute(
        'values',
        `${DOT_RADIUS * 0.5};${DOT_RADIUS * 1.5};${DOT_RADIUS * 0.5}`
      )
      animR.setAttribute('dur', `${DURATION}s`)
      animR.setAttribute('begin', `${frac * DURATION}s`)
      animR.setAttribute('repeatCount', 'indefinite')
      animR.setAttribute('calcMode', 'spline')
      animR.setAttribute('keySplines', '0.4 0 0.6 1;0.4 0 0.6 1')
      c.appendChild(animR)

      svg.appendChild(c)
    }

    const wrapper = document.createElement('div')
    wrapper.setAttribute('class', 'spiral-preloader-svg')
    wrapper.appendChild(svg)
    container.appendChild(wrapper)
    return () => {
      container.removeChild(wrapper)
    }
  }, [size])

  return (
    <div
      ref={containerRef}
      className={`flex min-h-screen w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: 'var(--background)' }}
      aria-busy="true"
      aria-label="Loading"
    />
  )
}
