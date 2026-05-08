'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export default function DynamicBackground({ children }: { children: React.ReactNode }) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let rafId: number

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100

      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setMousePos({ x, y })
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  const bgStyle = isDark
    ? {
        background: `
          radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(142,207,158,0.06), transparent 30%),
          radial-gradient(ellipse at 20% 10%, rgba(59,107,74,0.05), transparent 45%),
          radial-gradient(ellipse at 80% 85%, rgba(139,109,46,0.04), transparent 40%),
          radial-gradient(circle at 60% 40%, rgba(194,113,91,0.02), transparent 35%),
          var(--color-background)
        `,
      }
    : {
        background: `
          radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(59,107,74,0.07), transparent 28%),
          radial-gradient(ellipse at 15% 8%, rgba(59,107,74,0.05), transparent 40%),
          radial-gradient(ellipse at 85% 90%, rgba(139,109,46,0.05), transparent 35%),
          radial-gradient(circle at 50% 50%, rgba(194,113,91,0.03), transparent 40%),
          var(--color-background)
        `,
      }

  return (
    <div className="relative min-h-screen flex flex-col w-full">
      {/* Animated gradient background layer */}
      <div
        className="fixed inset-0 pointer-events-none z-[-1]"
        style={{
          ...bgStyle,
          transition: 'background 0.6s ease-out',
          willChange: 'background',
        }}
      />
      {children}
    </div>
  )
}