'use client'

import { Lora } from 'next/font/google'
import { useRouter, usePathname } from 'next/navigation'
import { Search, Bell, X, Sun, Moon, User, LogOut, Info, ChevronDown, CheckCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { AnimatePresence, motion } from 'framer-motion'
import { getUserAvatar } from '@/lib/avatar'
import { NotificationData } from '@/types'
import { subscribeToNotifications, markAsRead, markAllAsRead } from '@/services/notificationService'
import { SentinelAlert } from '@/types/sentinel'

const lora = Lora({ subsets: ['latin'], weight: ['400', '600', '700'] })

/** Format a Firestore timestamp into a human-readable "time ago" string */
function timeAgo(ts: any): string {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NavbarTop() {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, logout } = useAuth()
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [localNotifications, setLocalNotifications] = useState<NotificationData[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus()
  }, [searchOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Real-time Firestore notifications ──
  useEffect(() => {
    if (!profile?.id) {
      setNotifications([])
      return
    }

    const unsubscribe = subscribeToNotifications(profile.id, (firestoreNotifs) => {
      setNotifications(firestoreNotifs)
    })

    return () => unsubscribe()
  }, [profile?.id])

  // ── Local / ephemeral notifications (sentinel + profile) ──
  useEffect(() => {
    const cancelled = { current: false }

    const loadLocal = async () => {
      const items: NotificationData[] = []

      if (!profile?.profileComplete) {
        items.push({
          id: 'complete-profile',
          title: 'Complete your profile',
          body: 'Add your skills and location to unlock better event matching.',
          path: '/profile',
          type: 'profile',
          tone: 'info',
          read: false,
          createdAt: null,
        })
      }

      try {
        const res = await fetch('/api/sentinel')
        if (res.ok) {
          const alerts: SentinelAlert[] = await res.json()
          alerts
            .filter((a) => a.severity === 'Extreme' || a.severity === 'Severe')
            .slice(0, 2)
            .forEach((alert) => {
              items.push({
                id: `sentinel-${alert.id}`,
                title: `${alert.severity} ${alert.type.toLowerCase()} alert`,
                body: alert.title,
                path: '/dashboard/sentinel',
                type: 'sentinel',
                tone: 'alert',
                read: false,
                createdAt: null,
              })
            })
        }
      } catch {
        // sentinel unavailable — skip silently
      }

      if (!cancelled.current) setLocalNotifications(items)
    }

    loadLocal()
    return () => { cancelled.current = true }
  }, [profile?.profileComplete])

  // ── Merge: persistent first, then local ──
  const allNotifications = [...notifications, ...localNotifications]

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/feed?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Add hysteresis to prevent flicker
      if (currentScrollY > 20 && !scrolled) {
        setScrolled(true)
      } else if (currentScrollY < 10 && scrolled) {
        setScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrolled])

  const navLinks = [
    { label: 'Home', path: '/home' },
    { label: 'Events', path: '/feed' },
    { label: 'Organize', path: '/create' },
    { label: 'Dashboard', path: '/dashboard', exact: true },
    { label: 'Sentinel', path: '/dashboard/sentinel' },
    { label: 'Leaderboard', path: '/leaderboard' },
  ]

  const isLinkActive = (link: typeof navLinks[0]) => {
    if (link.exact) return pathname === link.path
    return pathname.startsWith(link.path)
  }

  const unreadCount = allNotifications.filter((n) => !n.read).length

  const handleMarkAllRead = useCallback(async () => {
    if (!profile?.id) return
    await markAllAsRead(profile.id)
    // Also clear local unread flags
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [profile?.id])

  const handleNotificationClick = useCallback(async (notification: NotificationData) => {
    setNotificationMenuOpen(false)
    // Mark persistent ones as read
    if (profile?.id && !notification.id.startsWith('complete-profile') && !notification.id.startsWith('sentinel-')) {
      markAsRead(profile.id, notification.id)
    }
    router.push(notification.path)
  }, [profile?.id, router])

  const notificationToneStyles: Record<NotificationData['tone'], { accent: string; background: string; border: string }> = {
    alert: {
      accent: 'var(--color-error-base)',
      background: 'rgba(184,50,48,0.08)',
      border: 'rgba(184,50,48,0.14)',
    },
    info: {
      accent: 'var(--color-primary-base)',
      background: 'rgba(59,107,74,0.08)',
      border: 'rgba(59,107,74,0.14)',
    },
    success: {
      accent: 'var(--color-warm-amber)',
      background: 'rgba(212,168,82,0.1)',
      border: 'rgba(212,168,82,0.16)',
    },
  }

  return (
    <div
      className={`fixed inset-x-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        scrolled
          ? 'top-3 mx-4 rounded-[24px] lg:inset-x-auto lg:left-1/2 lg:mx-0 lg:w-[min(calc(100vw-2rem),1200px)] lg:-translate-x-1/2'
          : 'top-0 lg:inset-x-auto lg:left-1/2 lg:w-full lg:-translate-x-1/2'
      }`}
      style={{
        background: scrolled
          ? 'var(--glass-bg)'
          : 'var(--glass-bg-strong)',
        backdropFilter: scrolled ? 'blur(28px) saturate(1.6)' : 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: scrolled ? 'blur(28px) saturate(1.6)' : 'blur(20px) saturate(1.3)',
        border: `1px solid var(--glass-border)`,
        boxShadow: scrolled
          ? 'var(--glass-shadow-lg)'
          : '0 1px 3px rgba(42, 45, 43, 0.04)',
      }}
    >
      <div className={`mx-auto flex items-center justify-between max-w-7xl transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        scrolled ? 'px-5 py-2' : 'px-10 py-3.5'
      }`}>
        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className={`font-semibold ${lora.className} text-on-surface tracking-tight transition-all duration-300 hover:opacity-80 ${
            scrolled ? 'text-[17px]' : 'text-[22px]'
          }`}
        >
          <span className="text-gradient-earth">NexusAid</span>
        </button>

        {/* Nav Links */}
        <div className={`flex items-center ${scrolled ? 'gap-1' : 'gap-1.5'}`}>
          {navLinks.map((link) => {
            const active = isLinkActive(link)
            return (
              <button
                key={link.path}
                onClick={() => router.push(link.path)}
                className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ease-out ${
                  active
                    ? 'text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
                }`}
                style={active ? {
                  background: 'linear-gradient(135deg, var(--color-primary-base) 0%, var(--color-moss) 100%)',
                  boxShadow: '0 2px 8px rgba(59, 107, 74, 0.25)',
                } : undefined}
              >
                {link.label}
              </button>
            )
          })}
        </div>

        {/* Right Section */}
        <div className={`flex items-center ${scrolled ? 'gap-2' : 'gap-3'} text-on-surface`}>
          {searchOpen ? (
            <div
              className="flex items-center gap-2 rounded-full px-3.5 py-2 animate-in fade-in duration-200"
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 2px 12px rgba(59, 107, 74, 0.08)',
              }}
            >
              <Search size={15} className="text-on-surface-variant" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search events…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="bg-transparent outline-none text-sm w-44 text-on-surface placeholder:text-on-surface-variant/60"
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery('') }} className="hover:scale-110 active:scale-95 transition-all p-0.5 rounded-full hover:bg-surface-variant/50">
                <X size={14} className="text-on-surface-variant" />
              </button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="p-2 rounded-full hover:bg-surface-container/50 transition-all duration-200 active:scale-95">
              <Search size={scrolled ? 16 : 17} />
            </button>
          )}

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setNotificationMenuOpen((open) => !open)}
              className="p-2 rounded-full hover:bg-surface-container/50 transition-all duration-200 active:scale-95 relative"
            >
              <Bell size={scrolled ? 16 : 17} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[0.5rem] h-2 rounded-full bg-[var(--color-terracotta)] ring-2 ring-[var(--glass-bg-strong)] px-1 text-[9px] leading-none flex items-center justify-center text-white font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notificationMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 mt-3 w-[21rem] overflow-hidden rounded-[28px] z-50 origin-top-right"
                  style={{
                    background: 'var(--color-surface-base)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow-lg)',
                  }}
                >
                  <div className="p-3">
                    <div
                      className="rounded-[22px] p-4"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,107,74,0.16), rgba(139,109,46,0.1) 55%, color-mix(in srgb, var(--color-surface-base) 92%, transparent) 100%)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Notifications</p>
                          <p className="mt-1 text-base font-semibold text-on-surface">What needs your attention</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }}
                              className="rounded-full p-1.5 transition-all duration-200 hover:scale-110 active:scale-95"
                              style={{ background: 'rgba(59,107,74,0.12)', color: 'var(--color-primary-base)' }}
                              title="Mark all as read"
                            >
                              <CheckCheck size={14} />
                            </button>
                          )}
                          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: 'rgba(59,107,74,0.08)', color: 'var(--color-primary-base)', border: '1px solid rgba(59,107,74,0.12)' }}>
                            {allNotifications.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {allNotifications.length === 0 ? (
                        <div className="rounded-[20px] p-4 text-center" style={{ background: 'rgba(212,168,82,0.1)', border: '1px solid rgba(212,168,82,0.16)' }}>
                          <p className="text-sm font-semibold text-on-surface">All quiet for now</p>
                          <p className="mt-1 text-[11px] text-on-surface-variant">No new notifications. You&apos;re all caught up!</p>
                        </div>
                      ) : (
                        allNotifications.map((notification) => {
                          const tone = notificationToneStyles[notification.tone]
                          return (
                            <button
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className="w-full rounded-[20px] p-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                              style={{
                                background: tone.background,
                                border: `1px solid ${tone.border}`,
                                opacity: notification.read ? 0.65 : 1,
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                                  style={{ background: 'color-mix(in srgb, var(--color-surface-bright-base) 82%, transparent)', color: tone.accent, border: `1px solid ${tone.border}` }}
                                >
                                  <Bell size={15} />
                                  {!notification.read && (
                                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-terracotta)] ring-2 ring-[var(--color-surface-base)]" />
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline justify-between gap-2">
                                    <p className="text-sm font-semibold text-on-surface truncate">{notification.title}</p>
                                    {notification.createdAt && (
                                      <span className="shrink-0 text-[10px] text-on-surface-variant">{timeAgo(notification.createdAt)}</span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">{notification.body}</p>
                                </div>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setNotificationMenuOpen(false)
                        router.push('/dashboard/sentinel')
                      }}
                      className="mt-3 w-full rounded-[20px] px-4 py-3 text-sm font-semibold text-on-primary transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                        boxShadow: '0 4px 14px rgba(59,107,74,0.22)',
                      }}
                    >
                      Open Sentinel Center
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className={`${scrolled ? 'w-8 h-8' : 'w-9 h-9'} rounded-full overflow-hidden transition-all duration-300 ease-out ring-2 ring-transparent hover:ring-primary/40 focus:ring-primary/40 flex items-center justify-center`}
              style={{ boxShadow: '0 2px 8px rgba(42, 45, 43, 0.1)' }}
            >
              {profileMenuOpen ? (
                <ChevronDown size={scrolled ? 18 : 20} className="text-on-surface" />
              ) : (
                <img
                  src={getUserAvatar(profile?.avatarUrl, profile?.displayName)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              )}
            </button>

            <AnimatePresence>
              {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 mt-3 w-[17.5rem] overflow-hidden rounded-[28px] z-50 origin-top-right"
                style={{
                  background: 'var(--color-surface-base)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--glass-shadow-lg)',
                }}
              >
                <div className="relative z-10 p-3">
                  <div
                    className="overflow-hidden rounded-[22px] p-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59,107,74,0.16), rgba(139,109,46,0.1) 55%, color-mix(in srgb, var(--color-surface-base) 92%, transparent) 100%)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl"
                        style={{ boxShadow: '0 6px 18px rgba(42,45,43,0.12)', border: '1px solid var(--glass-border)' }}
                      >
                        <img
                          src={getUserAvatar(profile?.avatarUrl, profile?.displayName)}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Signed in</p>
                        <p className="mt-1 text-base font-semibold text-on-surface truncate">{profile?.displayName || 'User'}</p>
                        <p className="text-xs text-on-surface-variant truncate">{profile?.email || ''}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                      className="col-span-2 rounded-[20px] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        background: 'color-mix(in srgb, var(--color-primary-base) 10%, var(--color-surface-container-high-base) 90%)',
                        border: '1px solid color-mix(in srgb, var(--color-primary-base) 18%, var(--glass-border) 82%)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{ background: 'color-mix(in srgb, var(--color-surface-bright-base) 82%, transparent)', border: '1px solid var(--glass-border)' }}
                        >
                          {mounted && resolvedTheme === 'dark' ? <Sun size={17} className="text-on-surface-variant" /> : <Moon size={17} className="text-on-surface-variant" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{mounted && resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</p>
                          <p className="text-[11px] text-on-surface-variant">Switch the vibe instantly</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setProfileMenuOpen(false); router.push('/profile'); }}
                      className="rounded-[20px] px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        background: 'color-mix(in srgb, var(--color-surface-container-high-base) 84%, transparent)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <User size={17} className="text-on-surface-variant mb-3" />
                      <p className="text-sm font-semibold text-on-surface">Profile</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Your public card</p>
                    </button>

                    <button
                      onClick={() => { setProfileMenuOpen(false); router.push('/about'); }}
                      className="rounded-[20px] px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                      style={{
                        background: 'color-mix(in srgb, var(--color-surface-container-high-base) 84%, transparent)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <Info size={17} className="text-on-surface-variant mb-3" />
                      <p className="text-sm font-semibold text-on-surface">About</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Mission and team</p>
                    </button>
                  </div>

                  <div className="my-3 mx-1" style={{ height: '1px', background: 'var(--glass-border)' }} />

                  <button
                    onClick={async () => {
                      setProfileMenuOpen(false);
                      await logout();
                      router.push('/');
                    }}
                    className="w-full rounded-[20px] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: 'color-mix(in srgb, var(--color-error-base) 10%, var(--color-surface-container-high-base) 90%)',
                      border: '1px solid color-mix(in srgb, var(--color-error-base) 18%, var(--glass-border) 82%)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ background: 'color-mix(in srgb, var(--color-surface-bright-base) 82%, transparent)', border: '1px solid color-mix(in srgb, var(--color-error-base) 15%, var(--glass-border) 85%)' }}
                      >
                        <LogOut size={17} className="text-error" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-error">Log Out</p>
                        <p className="text-[11px] text-on-surface-variant">End this session</p>
                      </div>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
