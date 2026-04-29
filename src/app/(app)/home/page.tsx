'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Plus, Calendar, MapPin, Users, Mail, Loader2 } from 'lucide-react'
import { getEvents } from '@/services/eventService'
import { useAuth } from '@/context/AuthContext'
import { CommunityEvent } from '@/types'
import { SentinelAlert } from '@/types/sentinel'
import MapWrapper from '@/components/MapWrapper'
import SkillMatchBanner from '@/components/SkillMatchBanner'
import { EventCard } from '@/components/EventCard'
import { getRecommendedEvents } from '@/services/recommendationService'
import { getUserProfile } from '@/services/userService'
export default function HomePage() {
  const router = useRouter()
  const { profile } = useAuth()

  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [alerts, setAlerts] = useState<SentinelAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [organizerEmail, setOrganizerEmail] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [{ events: data }, sentinelData] = await Promise.all([
          getEvents(),
          fetch('/api/sentinel').then(res => res.ok ? res.json() : [])
        ])
        setEvents(data)
        setAlerts(sentinelData)
      } catch (err) {
        console.error('Failed to load events:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Pick a featured event: prefer the first 'high' urgency active event, else the newest
  const featured = events.find(e => e.urgency === 'high' && e.status === 'active') ?? events[0] ?? null

  useEffect(() => {
    if (featured?.organizerId) {
      getUserProfile(featured.organizerId)
        .then(profile => {
          if (profile?.email) {
            setOrganizerEmail(profile.email)
          }
        })
        .catch(err => console.error("Failed to fetch organizer profile:", err))
    }
  }, [featured?.organizerId])

  const recommendedEvents = getRecommendedEvents(profile?.skills ?? [], events, 4, profile?.equipment ?? [])
    .map(({ event }) => event)
    .filter(event => event.id !== featured?.id)
    .slice(0, 3)

  const handleContactOrganizer = (eventTitle: string) => {
    if (organizerEmail) {
      window.location.href = `mailto:${organizerEmail}?subject=Regarding Event: ${encodeURIComponent(eventTitle)}`;
    } else {
      alert("Organizer contact information is currently unavailable.");
    }
  };

  // Helper: format a Firestore Timestamp/Date for display
  const formatDate = (ts: CommunityEvent['createdAt']) => {
    if (!ts) return 'TBD'
    const date = typeof (ts as { toDate?: () => Date }).toDate === 'function'
      ? (ts as { toDate: () => Date }).toDate()
      : new Date(ts as unknown as string)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // --------------- Loading State ---------------
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="absolute inset-0 w-8 h-8 rounded-full animate-subtle-pulse" style={{ boxShadow: '0 0 20px rgba(59,107,74,0.2)' }} />
        </div>
      </div>
    )
  }

  // --------------- Empty State ---------------
  if (events.length === 0) {
    return (
      <div className="flex-1 flex flex-col text-on-surface">
        <div className="px-8 md:px-10 mt-10 flex justify-between items-start animate-fade-in-up">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif tracking-tight text-gradient-earth">Upcoming Events</h1>
            <p className="mt-3 text-on-surface-variant max-w-xl leading-relaxed">
              Join local community efforts and coordination meetings. Your participation makes a tangible difference.
            </p>
          </div>
          <div className="mt-6 flex gap-4">
            <button onClick={() => router.push('/create')} className="premium-button-primary text-sm tracking-wide gap-2">
              <Plus size={16} />
              Create Event
            </button>
          </div>
        </div>

        <div className="px-10 mt-20 flex flex-col items-center justify-center text-center gap-4 animate-fade-in-up delay-200">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <Calendar size={36} strokeWidth={1.2} className="text-on-surface-variant/50" />
          </div>
          <p className="text-xl font-serif text-on-surface">No events yet</p>
          <p className="text-on-surface-variant max-w-sm">Be the first to create an event and rally your community.</p>
        </div>
      </div>
    )
  }

  // --------------- Volunteer progress helpers ---------------
  const volCurrent = featured?.needs?.volunteers?.current ?? 0
  const volGoal = featured?.needs?.volunteers?.goal ?? 1
  const volPercent = Math.min(Math.round((volCurrent / volGoal) * 100), 100)

  return (
    <main className="flex-1 flex flex-col text-on-surface w-full pb-32 md:pb-10">
      <div className="max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="px-6 md:px-8 mt-8 md:mt-12 flex flex-col gap-6 lg:flex-row lg:items-center justify-between pb-8 animate-fade-in-up" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-serif tracking-tight text-gradient-earth">Upcoming Events</h1>
          <p className="mt-3 text-on-surface-variant leading-relaxed max-w-xl">
            Join local community efforts and coordination meetings. Your participation makes a tangible difference.
          </p>
        </div>

        <div className="mt-2 flex w-full justify-end gap-3 lg:mt-0 lg:w-auto lg:flex-wrap lg:items-center">
          <button 
            onClick={() => router.push('/create')}
            className="premium-button-primary text-sm tracking-wide gap-2"
          >
            <Plus size={16} />
            Create Event
          </button>
        </div>
      </div>

      {/* Skill-Based Recommendations */}
      

      {/* Main Section */}
      <div className="px-6 md:px-10 mt-4 grid grid-cols-1 gap-6 items-start lg:grid-cols-3">

        {/* Large Featured Card — links to the event detail page */}
        <div className="lg:col-span-2 animate-fade-in-up delay-200">
          <EventCard event={featured!} featured />
        </div>

        {/* Details Card */}
        <div className="flex flex-col gap-4 animate-fade-in-up delay-300">

          {/* Main Details */}
          <div className="premium-glass-strong p-6">
            <h3 className="text-lg font-serif font-semibold mb-5 text-on-surface">Event Details</h3>

            <div className="space-y-5 text-sm">

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,107,74,0.1)' }}>
                  <Calendar size={18} className="text-primary/80" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="font-medium">{formatDate(featured!.createdAt)}</p>
                  <p className="text-on-surface-variant text-xs">{featured!.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(194,113,91,0.1)' }}>
                  <MapPin size={18} style={{ color: 'var(--color-terracotta)' }} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="font-medium">{featured!.location}</p>
                  <p className="text-on-surface-variant text-xs">{featured!.distance || 'Nearby'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,109,46,0.1)' }}>
                  <Users size={18} style={{ color: 'var(--color-warm-amber)' }} strokeWidth={1.8} />
                </div>
                <div className="w-full">
                  <p className="font-medium">{volCurrent} / {volGoal} Volunteers Needed</p>
                  <div className="w-full h-2 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--color-surface-variant-base)' }}>
                    <div className="h-full rounded-full transition-all duration-700 ease-out progress-glow" style={{ width: `${volPercent}%`, background: 'linear-gradient(90deg, var(--color-primary-base), var(--color-sage))' }} />
                  </div>
                </div>
              </div>

            </div>

            <button
              onClick={() => router.push(`/event/${featured!.id}`)}
              className="mt-6 w-full py-2.5 rounded-xl font-semibold text-on-primary transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-base) 0%, var(--color-moss) 100%)',
                boxShadow: '0 4px 14px rgba(59,107,74,0.25)',
              }}
            >
              Sign Up to Help
            </button>
          </div>

          {/* Organizer Card */}
          <div className="premium-glass p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full" style={{ background: 'linear-gradient(135deg, var(--color-primary-container-base), var(--color-sage))' }}></div>
              <div>
                <p className="text-xs text-on-surface-variant">Organized by</p>
                <p className="font-medium text-sm">{featured!.organizer || 'Community Organizer'}</p>
              </div>
            </div>

            <button
              onClick={() => handleContactOrganizer(featured!.title)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-on-primary transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                boxShadow: '0 2px 8px rgba(59,107,74,0.2)',
              }}
              title="Contact Organizer"
            >
              <Mail size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* Interactive Map Section */}
      <div className="px-6 md:px-10 mt-14 pb-4 animate-fade-in-up delay-400">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-serif font-semibold text-gradient-earth">Explore on Map</h2>
        </div>
        <div
          className="h-[400px] w-full rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}
        >
          <MapWrapper events={events} alerts={alerts} />
        </div>
      </div>

      {/* Recommended for You */}
      {recommendedEvents.length > 0 && (
        <div className="px-6 md:px-10 mt-16 pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-semibold text-gradient-earth">Recommended for You</h2>
            <button
              onClick={() => router.push('/feed')}
              className="text-sm font-semibold text-primary hover:text-primary/80 active:scale-95 transition-all duration-200 ease-out"
            >
              View All →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {recommendedEvents.map((evt) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        </div>
      )}

      </div>
    </main>
  )
}
