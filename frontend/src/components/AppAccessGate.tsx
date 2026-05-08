'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useAuth } from '@/context/AuthContext'

export default function AppAccessGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublicAppRoute = pathname === '/about'

  useEffect(() => {
    if (!loading && !user && !isPublicAppRoute) {
      router.replace('/')
    }
  }, [isPublicAppRoute, loading, router, user])

  if (isPublicAppRoute) {
    return <>{children}</>
  }

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <div
            className="absolute inset-0 rounded-full animate-subtle-pulse"
            style={{ boxShadow: '0 0 30px rgba(59,107,74,0.15)' }}
          />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
