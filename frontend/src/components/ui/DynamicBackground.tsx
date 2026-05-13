'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

/**
 * DynamicBackground
 *
 * Performance fix: instead of calling setState on every mousemove (which
 * triggers a React re-render of the entire app subtree), we write the cursor
 * position directly to CSS custom properties on the DOM node via a ref.
 * CSS then reads these variables in the gradient, producing the same visual
 * effect with zero React re-renders.
 *
 * Hydration fix: next-themes resolves the theme client-side only.
 * We track `mounted` so that server and client both render a transparent
 * background initially, avoiding the SSR/CSR attribute mismatch warning.
 */
export default function DynamicBackground({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Track mouse position via CSS custom properties — no setState, no re-renders
  useEffect(() => {
    let rafId: number

    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        if (overlayRef.current) {
          overlayRef.current.style.setProperty('--mouse-x', `${(e.clientX / window.innerWidth) * 100}%`)
          overlayRef.current.style.setProperty('--mouse-y', `${(e.clientY / window.innerHeight) * 100}%`)
        }
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  // Before mount: render transparent bg so SSR and CSR output match exactly.
  // After mount: apply the full gradient (client-only, no hydration mismatch).
  const bgStyle = mounted
    ? (isDark
        ? `
          radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(142,207,158,0.06), transparent 30%),
          radial-gradient(ellipse at 20% 10%, rgba(59,107,74,0.05), transparent 45%),
          radial-gradient(ellipse at 80% 85%, rgba(139,109,46,0.04), transparent 40%),
          radial-gradient(circle at 60% 40%, rgba(194,113,91,0.02), transparent 35%),
          var(--color-background)
        `
        : `
          radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59,107,74,0.07), transparent 28%),
          radial-gradient(ellipse at 15% 8%, rgba(59,107,74,0.05), transparent 40%),
          radial-gradient(ellipse at 85% 90%, rgba(139,109,46,0.05), transparent 35%),
          radial-gradient(circle at 50% 50%, rgba(194,113,91,0.03), transparent 40%),
          var(--color-background)
        `)
    : 'var(--color-background)' // matches server render exactly

  return (
    <div className="relative min-h-screen flex flex-col w-full">
      {/* Animated gradient background layer — mouse position via CSS vars */}
      <div
        ref={overlayRef}
        className="fixed inset-0 pointer-events-none z-[-1]"
        style={{
          background: bgStyle,
          transition: mounted ? 'background 0.6s ease-out' : undefined,
          willChange: 'background',
        }}
      />
      {children}
    </div>
  )
}