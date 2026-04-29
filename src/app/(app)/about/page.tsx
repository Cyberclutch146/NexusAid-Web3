'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Globe, Shield, Code, Briefcase, HeartHandshake, Sparkles, ArrowUpRight } from 'lucide-react'

const TEAM_MEMBERS = [
  {
    name: 'Swagata Ganguly',
    role: 'Full Stack Web and MLOps Engineer',
    summary: 'Leads backend architecture, managing databases, APIs, and map integrations to ensure scalable AI powered features for reliable system performance.',
    linkedin: 'https://www.linkedin.com/in/swagata-ganguly-453aa6327',
    github: 'https://github.com/Cyberclutch146',
    gradient: 'linear-gradient(135deg, rgba(194,113,91,0.18), rgba(231,162,144,0.08))',
    accentColor: 'var(--color-terracotta)',
  },
  {
    name: 'Anuvab Das',
    role: 'Full Stack App/Web Developer',
    summary: 'Drives UI/UX design, implements payment system integration, and refines backend logic for seamless user experience and performance.',
    linkedin: 'https://www.linkedin.com/in/anv-dev/',
    github: 'https://github.com/Stewy8506',
    gradient: 'linear-gradient(135deg, rgba(59,107,74,0.18), rgba(96,160,118,0.08))',
    accentColor: 'var(--color-primary-base)',
  },
  {
    name: 'Debadree Sekhar Das',
    role: 'AI Specialist & Integration',
    summary: 'Develops and integrates AI-driven features, powering intelligent search, content generation, and contextual automation across the platform.',
    linkedin: 'https://www.linkedin.com/in/swagata-ganguly-453aa6327',
    github: 'https://github.com/Cyberclutch146',
    gradient: 'linear-gradient(135deg, rgba(212,168,82,0.18), rgba(139,109,46,0.08))',
    accentColor: 'var(--color-warm-amber)',
  },
  {
    name: 'Dhritiman Siva',
    role: 'Backend Developer',
    summary: 'Builds and maintains core backend services including authentication, messaging systems, email workflows, and server-side operations.',
    linkedin: 'https://www.linkedin.com/in/dhritiman-siva-8501b9324/',
    github: 'https://github.com/Dhritiman-Siva',
    gradient: 'linear-gradient(135deg, rgba(127,164,146,0.2), rgba(93,135,118,0.08))',
    accentColor: 'var(--color-sage)',
  }
]

const VALUES = [
  {
    icon: Users,
    title: 'Community First',
    desc: 'Every interaction is built to reduce friction between people who need help and people ready to step in.',
    tone: 'rgba(59,107,74,0.12)',
    accent: 'var(--color-primary-base)',
  },
  {
    icon: Globe,
    title: 'Local, Not Distant',
    desc: 'We focus on neighborhood-scale coordination so support stays immediate, visible, and actionable.',
    tone: 'rgba(212,168,82,0.12)',
    accent: 'var(--color-warm-amber)',
  },
  {
    icon: Shield,
    title: 'Trust Through Clarity',
    desc: 'Transparent organizers, visible needs, and live safety context help people act with confidence.',
    tone: 'rgba(194,113,91,0.12)',
    accent: 'var(--color-terracotta)',
  },
]

// --- Sub-components for better structure ---

function ValueCard({ card, index }: { card: typeof VALUES[0], index: number }) {
  return (
    <div
      className="rounded-[28px] p-7 transition-all duration-300 hover:-translate-y-1.5 animate-fade-in-up"
      style={{
        background: 'var(--glass-bg-strong)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        animationDelay: `${200 + index * 100}ms`,
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: card.tone, color: card.accent }}
      >
        <card.icon size={28} />
      </div>
      <h3 className="text-xl font-semibold text-on-surface mb-3">{card.title}</h3>
      <p className="text-on-surface-variant leading-relaxed">{card.desc}</p>
    </div>
  )
}

function TeamMemberCard({ member, index }: { member: typeof TEAM_MEMBERS[0], index: number }) {
  return (
    <div
      className="group relative overflow-hidden rounded-[28px] transition-all duration-300 hover:-translate-y-1.5 animate-fade-in-up"
      style={{
        background: 'var(--glass-bg-strong)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        animationDelay: `${300 + index * 100}ms`,
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: member.gradient }} />

      <div className="relative z-10 flex flex-col h-full p-6">
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-on-surface"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 4px 14px rgba(42,45,43,0.06)',
            }}
          >
            {member.name.charAt(0)}
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ background: 'rgba(255,255,255,0.46)', color: member.accentColor, border: '1px solid var(--glass-border)' }}
          >
            Core
          </span>
        </div>

        <h3 className="mt-6 text-lg font-semibold text-on-surface">{member.name}</h3>
        <p className="mt-1 text-sm font-semibold" style={{ color: member.accentColor }}>
          {member.role}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-on-surface-variant flex-1">
          {member.summary}
        </p>

        <div className="mt-6 flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'var(--glass-bg)', color: 'var(--color-on-surface-base)', border: '1px solid var(--glass-border)' }}
            title="LinkedIn Profile"
          >
            <Briefcase size={16} />
            LinkedIn
          </a>
          <a
            href={member.github.includes('github.com') ? member.github : `https://${member.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'var(--glass-bg)', color: 'var(--color-on-surface-base)', border: '1px solid var(--glass-border)' }}
            title="GitHub Profile"
          >
            <Code size={16} />
            GitHub
          </a>
        </div>
      </div>
    </div>
  )
}

export default function AboutPage() {
  const router = useRouter()

  return (
    <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full pb-24">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-on-surface-variant font-semibold mb-10 hover:text-on-surface transition-all animate-fade-in-up"
        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <section
        className="relative overflow-hidden rounded-[32px] p-6 md:p-8 lg:p-10 animate-fade-in-up"
        style={{
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'blur(24px) saturate(1.35)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.35)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow-lg)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 14% 18%, rgba(59,107,74,0.16), transparent 28%),
              radial-gradient(circle at 84% 20%, rgba(212,168,82,0.14), transparent 24%),
              linear-gradient(135deg, rgba(255,255,255,0.06), transparent 55%)
            `,
          }}
        />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ background: 'rgba(59,107,74,0.08)', color: 'var(--color-primary-base)', border: '1px solid rgba(59,107,74,0.12)' }}
            >
              <HeartHandshake size={14} />
              Our mission
            </div>

            <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-serif tracking-tight text-gradient-earth">
              Building calmer, faster community response.
            </h1>

            <p className="mt-4 max-w-3xl text-lg md:text-xl text-on-surface-variant leading-relaxed">
              NexusAid helps communities organize support, surface urgent needs, and respond with more clarity when time matters most.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <Sparkles size={15} style={{ color: 'var(--color-warm-amber)' }} />
                Human-centered coordination
              </span>
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <Shield size={15} style={{ color: 'var(--color-primary-base)' }} />
                Trusted local action
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Designed For', value: 'Local response', tone: 'rgba(59,107,74,0.12)', accent: 'var(--color-primary-base)' },
              { label: 'Core Focus', value: 'Urgent relief', tone: 'rgba(212,168,82,0.12)', accent: 'var(--color-warm-amber)' },
              { label: 'Approach', value: 'Direct support', tone: 'rgba(194,113,91,0.12)', accent: 'var(--color-terracotta)' },
              { label: 'Experience', value: 'Premium by design', tone: 'rgba(127,164,146,0.14)', accent: 'var(--color-sage)' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] p-4"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--glass-shadow)',
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{item.label}</p>
                <p className="mt-2 text-xl md:text-2xl font-semibold tracking-tight" style={{ color: item.accent }}>{item.value}</p>
                <div className="mt-3 h-1.5 rounded-full" style={{ background: item.tone }} />
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="mt-10 animate-fade-in-up delay-200">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Principles</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-serif tracking-tight text-gradient-earth">The values behind every interaction.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VALUES.map((card, i) => (
            <ValueCard key={card.title} card={card} index={i} />
          ))}
        </div>
      </section>

      <section className="mt-14 pt-10 animate-fade-in-up delay-300" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">The team</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-serif tracking-tight text-gradient-earth">The people shaping the platform.</h2>
          <p className="mt-3 text-on-surface-variant text-lg max-w-2xl">
            A focused team of builders working across interface design, intelligence, systems, and local response tooling.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {TEAM_MEMBERS.map((member, index) => (
            <TeamMemberCard key={member.name} member={member} index={index} />
          ))}
        </div>
      </section>

      <section
        className="mt-12 rounded-[30px] p-6 md:p-8 animate-fade-in-up delay-500"
        style={{
          background: 'linear-gradient(135deg, rgba(59,107,74,0.12), rgba(139,109,46,0.08), var(--glass-bg-strong))',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Join the mission</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-serif tracking-tight text-gradient-earth">Turn local intent into coordinated action.</h2>
            <p className="mt-3 text-on-surface-variant leading-relaxed">
              Explore live events, volunteer where you can help most, and build stronger community response together.
            </p>
          </div>

          <button
            onClick={() => router.push('/feed')}
            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-on-primary transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
              boxShadow: '0 4px 14px rgba(59,107,74,0.24)',
            }}
          >
            Explore the platform
            <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
    </main>
  )
}
