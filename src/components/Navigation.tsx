'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { getUserAvatar } from '@/lib/avatar';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Info, LogOut, Moon, Sun, User } from 'lucide-react';

export function SideNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  
  const navItems = [
    { name: 'Feed', href: '/feed', icon: 'dashboard' },
    { name: 'Dashboard', href: '/dashboard', icon: 'volunteer_activism' },
    { name: 'Sentinel', href: '/dashboard/sentinel', icon: 'security' },
    { name: 'Leaderboard', href: '/leaderboard', icon: 'emoji_events' },
    { name: 'Create', href: '/create', icon: 'inventory_2' },
    { name: 'Profile', href: '/profile', icon: 'settings' },
  ];

  return (
    <nav
      className="hidden md:flex flex-col h-screen sticky top-0 py-8 w-64 flex-shrink-0"
      style={{
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        borderRight: '1px solid var(--glass-border)',
      }}
    >
      <Link href="/" className="px-6 mb-8 flex items-center gap-3 group">
        <div
          aria-label="Organization Logo"
          className="w-10 h-10 rounded-full flex items-center justify-center font-headline font-bold text-lg transition-transform duration-300 group-hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
            color: 'var(--color-on-primary-base)',
            boxShadow: '0 4px 14px rgba(59, 107, 74, 0.25)',
          }}
        >
          <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>energy_savings_leaf</span>
        </div>
        <div>
          <h1 className="font-headline text-lg font-bold tracking-tight text-gradient-earth">NexusAid</h1>
          <p className="font-body text-xs text-on-surface-variant">Local Response Team</p>
        </div>
      </Link>
      
      <ul className="flex flex-col gap-1.5 px-4 flex-grow">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.name}>
              <Link 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ease-out font-semibold text-sm ${
                  isActive 
                    ? 'text-on-primary' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, var(--color-primary-base) 0%, var(--color-moss) 100%)',
                  boxShadow: '0 3px 12px rgba(59, 107, 74, 0.25)',
                } : undefined}
              >
                <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"}}>{item.icon}</span>
                <span className="font-label">{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      
      <div className="px-5 mt-auto">
        <Link
          href="/profile"
          className="flex items-center gap-3 pt-4 hover:opacity-80 transition-all duration-200 rounded-xl px-2 py-2 hover:bg-surface-container/30"
          style={{ borderTop: '1px solid var(--glass-border)' }}
        >
          {profile?.avatarUrl ? (
            <Image alt={profile.displayName || 'User'} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20" src={getUserAvatar(profile.avatarUrl, profile.displayName)} width={36} height={36} />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-container-base), var(--color-sage))',
                color: 'var(--color-on-primary-container-base)',
              }}
            >
              {(profile?.displayName || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-on-surface">{profile?.displayName || 'User'}</p>
            <p className="text-xs text-on-surface-variant">{profile?.role || 'Volunteer'}</p>
          </div>
        </Link>
      </div>
    </nav>
  );
}

export function MobileHeader() {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-50 md:hidden sm:right-4 sm:top-4">
      <div className="pointer-events-auto relative" ref={menuRef}>
        <button
          onClick={() => setProfileMenuOpen((open) => !open)}
          className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition-all duration-300 ease-out hover:-translate-y-0.5 hover:ring-primary/40 focus:ring-primary/40"
          style={{
            background: 'linear-gradient(145deg, color-mix(in srgb, var(--glass-bg-strong) 88%, white 12%), var(--glass-bg-strong))',
            backdropFilter: 'blur(24px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
            border: '1px solid color-mix(in srgb, var(--glass-border) 78%, white 22%)',
            boxShadow: '0 14px 30px rgba(42, 45, 43, 0.18), 0 3px 10px rgba(59, 107, 74, 0.12), inset 0 1px 0 rgba(255,255,255,0.28)',
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[2px] rounded-full opacity-80"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.18), transparent 42%)',
            }}
          />
          {profileMenuOpen ? (
            <ChevronDown size={20} className="relative z-10 text-on-surface" />
          ) : (
            <img
              src={getUserAvatar(profile?.avatarUrl, profile?.displayName)}
              alt="Profile"
              className="relative z-10 h-full w-full object-cover"
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
              className="absolute right-0 mt-3 w-[17.5rem] overflow-hidden rounded-[28px] origin-top-right"
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
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Signed in</p>
                      <p className="mt-1 truncate text-base font-semibold text-on-surface">{profile?.displayName || 'User'}</p>
                      <p className="truncate text-xs text-on-surface-variant">{profile?.email || ''}</p>
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
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push('/profile');
                    }}
                    className="rounded-[20px] px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: 'color-mix(in srgb, var(--color-surface-container-high-base) 84%, transparent)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <User size={17} className="mb-3 text-on-surface-variant" />
                    <p className="text-sm font-semibold text-on-surface">Profile</p>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">Your public card</p>
                  </button>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push('/about');
                    }}
                    className="rounded-[20px] px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: 'color-mix(in srgb, var(--color-surface-container-high-base) 84%, transparent)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <Info size={17} className="mb-3 text-on-surface-variant" />
                    <p className="text-sm font-semibold text-on-surface">About</p>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">Mission and team</p>
                  </button>
                </div>

                <div className="mx-1 my-3" style={{ height: '1px', background: 'var(--glass-border)' }} />

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
                      <p className="text-sm font-semibold text-on-surface">Log out</p>
                      <p className="text-[11px] text-on-surface-variant">Sign out of your account</p>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Home', href: '/home', icon: 'home', exact: true },
    { name: 'Feed', href: '/feed', icon: 'dashboard', exact: true },
    { name: 'Create', href: '/create', icon: 'add_circle', exact: true },
    { name: 'Dashboard', href: '/dashboard', icon: 'volunteer_activism', exact: true },
    { name: 'Sentinel', href: '/dashboard/sentinel', icon: 'security' },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
      style={{
        pointerEvents: 'none',
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[32rem] items-center gap-1.5 rounded-[24px] p-2 shadow-[0_16px_40px_rgba(42,45,43,0.14)]"
        style={{
          pointerEvents: 'auto',
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'blur(28px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link 
              key={item.name}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2.5 text-[10px] font-semibold transition-all duration-300 ease-out active:scale-95 sm:text-[11px] ${
                isActive ? 'text-on-primary' : 'text-on-surface-variant'
              }`}
              style={isActive ? {
                background: 'linear-gradient(135deg, var(--color-primary-base) 0%, var(--color-moss) 100%)',
                boxShadow: '0 3px 12px rgba(59, 107, 74, 0.25)',
              } : undefined}
            >
              <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"}}>{item.icon}</span>
              <span className="truncate leading-none">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
