'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CommunityEvent } from '@/types';
import { SentinelAlert } from '@/types/sentinel';

interface EventCardProps {
  event: CommunityEvent;
  featured?: boolean;
  sentinelAlerts?: SentinelAlert[];
  recommendationScore?: number;
  recommendationPercentage?: number;
  matchedSkills?: string[];
}

export function EventCard({
  event,
  featured = false,
  sentinelAlerts = [],
  recommendationPercentage,
  matchedSkills = [],
}: EventCardProps) {
  const hasAlerts = sentinelAlerts.length > 0;
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [descriptionLineClamp, setDescriptionLineClamp] = useState(featured ? 3 : 2);

  useEffect(() => {
    if (featured || !titleRef.current) {
      return;
    }

    const titleElement = titleRef.current;

    const updateDescriptionClamp = () => {
      const computedStyle = window.getComputedStyle(titleElement);
      const lineHeight = Number.parseFloat(computedStyle.lineHeight);

      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        setDescriptionLineClamp(2);
        return;
      }

      const titleLines = Math.max(1, Math.round(titleElement.getBoundingClientRect().height / lineHeight));
      setDescriptionLineClamp(Math.max(1, 4 - titleLines));
    };

    updateDescriptionClamp();

    const resizeObserver = new ResizeObserver(updateDescriptionClamp);
    resizeObserver.observe(titleElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [event.title, featured]);

  const badge = (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        color: 'var(--color-on-surface-variant-base)',
      }}
    >
      <span className="truncate">{event.urgency === 'high' ? 'Urgent' : event.category}</span>
    </span>
  );

  if (featured) {
    return (
      <article
        className="group overflow-hidden rounded-[28px] transition-all duration-500 ease-out hover:-translate-y-1.5"
        style={{
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        <div className="relative h-56 overflow-hidden sm:h-64 md:h-72">
          <Image
            alt={event.title}
            src={event.imageUrl || event.image || '/logo.svg'}
            fill
            className="object-cover transition-transform duration-700 will-change-transform group-hover:scale-105"
            style={{ transform: 'translateZ(0)' }}
          />
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 sm:bottom-6 sm:left-6 sm:gap-2.5">
            {badge}
            {hasAlerts && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/90 px-3 py-1 text-[11px] font-bold text-white" style={{ boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)' }}>
                <span className="material-symbols-outlined text-[12px]">warning</span>
                Alert Zone
              </span>
            )}
          </div>
        </div>

        <div className="relative -mt-6 flex flex-col gap-4 px-4 pb-5 pt-8 sm:-mt-10 sm:gap-5 sm:px-7 sm:pb-7 sm:pt-12">
          <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant sm:gap-3">
            <span className="font-semibold text-on-surface">{event.organizer}</span>
            <span className="opacity-40">•</span>
            <span>{event.distance}</span>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold leading-tight tracking-tight text-on-surface sm:text-2xl md:text-3xl">{event.title}</h3>
            <p className="line-clamp-3 text-sm leading-relaxed text-on-surface-variant">{event.description}</p>
          </div>

        </div>
      </article>
    );
  }

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-[22px] transition-all duration-500 ease-out hover:-translate-y-1.5 sm:rounded-[24px]"
      style={{
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      <div className="relative h-40 overflow-hidden min-[430px]:h-44 sm:h-56">
        <Image
          src={event.imageUrl || event.image || '/logo.svg'}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
          style={{ transform: 'translateZ(0)' }}
        />
        <div className="absolute left-4 right-14 top-4 sm:left-5 sm:top-5">{badge}</div>
        {hasAlerts && (
          <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/90 px-2.5 py-1 text-[10px] font-bold text-white" style={{ boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}>
              <span className="material-symbols-outlined text-[11px]">warning</span>
              Alert
            </span>
          </div>
        )}
      </div>
      <div className="relative -mt-4 flex flex-1 flex-col gap-3 px-3.5 pb-3.5 pt-5 min-[430px]:-mt-6 min-[430px]:px-4 min-[430px]:pb-4 min-[430px]:pt-6 sm:-mt-8 sm:gap-4 sm:px-6 sm:pb-6 sm:pt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant sm:gap-3">
            <span className="font-semibold text-on-surface">{event.organizer}</span>
            <span className="opacity-40">•</span>
            <span>{event.distance}</span>
          </div>
          {recommendationPercentage !== undefined && (
            <div
              className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(59,107,74,0.12), rgba(59,107,74,0.06))',
                color: 'var(--color-primary-base)',
                border: '1px solid rgba(59,107,74,0.2)',
              }}
            >
              <span>{recommendationPercentage}% match</span>
            </div>
          )}
        </div>

        {matchedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  background: 'rgba(212,168,82,0.12)',
                  color: 'var(--color-warm-amber)',
                  border: '1px solid rgba(212,168,82,0.2)',
                }}
              >
                {skill}
              </span>
            ))}
            {matchedSkills.length > 3 && (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  background: 'rgba(212,168,82,0.08)',
                  color: 'var(--color-warm-amber)',
                }}
              >
                +{matchedSkills.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex-1 space-y-2">
          <h3 ref={titleRef} className="text-lg font-semibold leading-tight tracking-tight text-on-surface sm:text-xl">{event.title}</h3>
          <p
            className="overflow-hidden text-sm leading-relaxed text-on-surface-variant"
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: descriptionLineClamp,
            }}
          >
            {event.description}
          </p>
        </div>

        <div className="grid gap-2.5 min-[430px]:gap-3 sm:grid-cols-2">
          <div className="rounded-xl p-3 text-sm text-on-surface-variant min-[430px]:p-3.5" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface">Goal Progress</div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-surface-variant-base)' }}>
              <div className="progress-glow h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${event.progress}%`, background: 'linear-gradient(90deg, var(--color-primary-base), var(--color-sage))' }} />
            </div>
            <div className="mt-1.5 text-xs font-medium">{event.progress ?? 0}% complete</div>
          </div>
          <div className="rounded-xl p-3 text-sm text-on-surface-variant min-[430px]:p-3.5" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface">Needs</div>
            <div className="flex flex-wrap gap-1.5">
              {event.needs?.goods && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(194,113,91,0.12)', color: 'var(--color-terracotta)' }}>Goods</span>}
              {event.needs?.volunteers && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(59,107,74,0.12)', color: 'var(--color-primary-base)' }}>Volunteers</span>}
              {event.needs?.funds && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(139,109,46,0.12)', color: 'var(--color-tertiary-base)' }}>Funds</span>}
              {!event.needs && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: 'var(--glass-bg)' }}>Needs review</span>}
            </div>
          </div>
        </div>

        <Link
          href={`/event/${event.id}`}
          className="inline-flex w-full items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold text-on-primary transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-base) 0%, var(--color-moss) 100%)',
            boxShadow: '0 4px 14px rgba(59, 107, 74, 0.25), 0 1px 3px rgba(59, 107, 74, 0.1)',
          }}
        >
          View Details
        </Link>
      </div>
    </article>
  );
}
