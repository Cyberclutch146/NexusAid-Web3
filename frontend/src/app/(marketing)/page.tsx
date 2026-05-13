"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const primaryHref = user ? '/home' : '/register';
  const primaryLabel = user ? 'Home' : 'Join Us';

  return (
    <div className="min-h-screen bg-background text-on-background font-body relative overflow-x-hidden selection:bg-primary/20">
      {/* Grain texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay z-50 dark:opacity-[0.05]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 512 512\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}></div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[-8%] top-[-4%] h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute right-[-10%] top-[10%] h-80 w-80 rounded-full bg-tertiary/12 blur-3xl" />
        <div className="absolute bottom-[12%] left-[18%] h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* HERO */}
      <section className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col justify-center px-8 md:px-16 lg:px-20 relative z-10 py-12"
        >
          <div className="absolute top-8 left-8 right-8 md:left-16 md:right-16 lg:left-20 lg:right-20 flex items-start justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div>
                <p
                  className="text-[30px] font-semibold tracking-tight text-on-background"
                  style={{ fontFamily: 'var(--font-elms-sans), "Segoe UI", sans-serif' }}
                >
                  NexusAid Platform
                </p>
              </div>
            </Link>
            <ThemeToggle />
          </div>
          <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-tertiary mb-8 flex items-center gap-3 mt-12 md:mt-0">
            <span className="w-8 h-[1px] bg-tertiary"></span>
            Decentralized Community Relief
          </span>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-[88px] font-light leading-[1.05] tracking-tight text-on-background mb-10">
            Rooted in<br />
            community,<br />
            <em className="italic text-primary">secured by blockchain.</em>
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg font-light leading-relaxed max-w-md mb-14">
            Empowering our neighbors through transparent, immutable relief efforts. Every donation, every milestone, every impact tracked on-chain. Join NexusAid in making a difference with accountability.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href={primaryHref} className="inline-flex items-center gap-3 px-8 py-4 bg-on-background text-background font-medium text-[13px] tracking-widest uppercase hover:bg-primary hover:text-on-primary transition-all duration-300 transform hover:-translate-y-1 shadow-[0_16px_34px_rgba(42,45,43,0.12)]">
              {primaryLabel}
              <ArrowRight size={14} />
            </Link>
            {!user && !loading && (
              <Link href="/login" className="inline-flex items-center gap-2 px-0 py-4 bg-transparent text-on-surface-variant font-medium text-[13px] tracking-wider uppercase hover:text-on-background transition-colors group">
                Login
                <ArrowRight size={14} className="transform transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <div className="rounded-full border border-outline-variant/40 bg-surface/70 px-4 py-2 text-xs uppercase tracking-[0.16em] text-on-surface-variant backdrop-blur-sm">
              On-chain transparency
            </div>
            <div className="rounded-full border border-outline-variant/40 bg-surface/70 px-4 py-2 text-xs uppercase tracking-[0.16em] text-on-surface-variant backdrop-blur-sm">
              Crypto donations
            </div>
            <div className="rounded-full border border-outline-variant/40 bg-surface/70 px-4 py-2 text-xs uppercase tracking-[0.16em] text-on-surface-variant backdrop-blur-sm">
              Verified milestones
            </div>
          </motion.div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative h-[60vh] lg:h-full overflow-hidden"
        >
          <Image
            src="https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&q=80"
            alt="Community hands"
            fill
            className="object-cover saturate-[0.85] brightness-90 dark:brightness-75 hover:scale-105 transition-transform duration-[8s] ease-out"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/30 dark:from-background/60 to-transparent pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="absolute right-6 top-6 rounded-2xl border border-white/15 bg-black/30 px-5 py-4 text-white backdrop-blur-md"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">Response Pulse</p>
            <p className="mt-1 text-lg font-medium">Fast-moving, calm, local</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="absolute bottom-6 left-6 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-white backdrop-blur-md"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">Built for action</p>
            <p className="mt-1 text-sm leading-6 max-w-xs text-white/90">Discover events, coordinate help, and keep communities informed in one place.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* WAYS TO HELP */}
      <section className="py-32 px-8 md:px-16 lg:px-20 max-w-[1400px] mx-auto overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 text-[11px] font-medium tracking-[0.18em] uppercase text-tertiary mb-6">
            <span>How to Contribute</span>
            <span className="flex-1 h-[1px] bg-outline-variant max-w-[80px]"></span>
          </div>
          <h2 className="font-serif text-4xl md:text-6xl font-light leading-tight tracking-tight text-on-background max-w-2xl mb-6">
            Make impact.<br /><em className="italic text-primary">Make it permanent.</em>
          </h2>
          <p className="text-on-surface-variant font-light leading-relaxed max-w-lg">
            Support through time, resources, or crypto—every contribution is tracked, verified, and celebrated on-chain through our blockchain-powered system.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[2px] bg-outline-variant/30">
          {/* Volunteer */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-surface p-10 md:p-16 relative overflow-hidden group transition-colors hover:bg-surface-container"
          >
            <div className="absolute top-0 left-0 w-1 h-0 bg-tertiary transition-all duration-500 group-hover:h-full"></div>
            <span className="absolute top-8 right-10 font-serif text-8xl md:text-[120px] font-light text-outline-variant/30 dark:text-outline-variant/10 tracking-tighter transition-colors group-hover:text-outline-variant/50 pointer-events-none select-none">01</span>
            
            <svg className="w-12 h-12 mb-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8l-2-2a2 2 0 0 0-2.83 0l.83.83L6 19a5 5 0 0 0 5 3h2a5 5 0 0 0 5-5v-5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v1"/>
            </svg>
            <h3 className="font-serif text-3xl text-on-background mb-4 relative z-10">Volunteer Your Time</h3>
            <p className="text-on-surface-variant font-light leading-relaxed mb-10 max-w-sm relative z-10">
              Join our team of active volunteers. Every hour logged earns you reputation points and blockchain-verified badges to showcase your impact.
            </p>
            <Link href="/register" className="inline-flex items-center gap-3 text-[12px] font-medium tracking-[0.1em] uppercase text-on-background border-b border-on-background pb-1 hover:text-tertiary hover:border-tertiary hover:gap-5 transition-all relative z-10">
              Browse Opportunities
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </motion.div>

          {/* Donate */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-surface p-10 md:p-16 relative overflow-hidden group transition-colors hover:bg-surface-container"
          >
            <div className="absolute top-0 left-0 w-1 h-0 bg-tertiary transition-all duration-500 group-hover:h-full"></div>
            <span className="absolute top-8 right-10 font-serif text-8xl md:text-[120px] font-light text-outline-variant/30 dark:text-outline-variant/10 tracking-tighter transition-colors group-hover:text-outline-variant/50 pointer-events-none select-none">02</span>
            
            <svg className="w-12 h-12 mb-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <h3 className="font-serif text-3xl text-on-background mb-4 relative z-10">Support Financially</h3>
            <p className="text-on-surface-variant font-light leading-relaxed mb-10 max-w-sm relative z-10">
              Donate ETH, MATIC, or INR. Every contribution is immutably recorded on-chain. Milestone-based escrow ensures funds are released only when impact goals are achieved.
            </p>
            <Link href="/register" className="inline-flex items-center gap-3 text-[12px] font-medium tracking-[0.1em] uppercase text-on-background border-b border-on-background pb-1 hover:text-tertiary hover:border-tertiary hover:gap-5 transition-all relative z-10">
              Start Your Donation
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </motion.div>

          {/* Earn Badges */}
          <motion.div 
            initial={{ opacity: 0, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-surface p-10 md:p-16 relative overflow-hidden group transition-colors hover:bg-surface-container"
          >
            <div className="absolute top-0 left-0 w-1 h-0 bg-tertiary transition-all duration-500 group-hover:h-full"></div>
            <span className="absolute top-8 right-10 font-serif text-8xl md:text-[120px] font-light text-outline-variant/30 dark:text-outline-variant/10 tracking-tighter transition-colors group-hover:text-outline-variant/50 pointer-events-none select-none">03</span>
            
            <svg className="w-12 h-12 mb-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M12 2v4m6.22 1.78l-2.83 2.83M20 12h4m-1.78 6.22l-2.83-2.83M12 20v4m-6.22-1.78l2.83-2.83M4 12H0m1.78-6.22l2.83 2.83M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
            </svg>
            <h3 className="font-serif text-3xl text-on-background mb-4 relative z-10">Earn Recognition</h3>
            <p className="text-on-surface-variant font-light leading-relaxed mb-10 max-w-sm relative z-10">
              Unlock blockchain-verified soulbound badges as you grow your impact. Display your achievements and prove your commitment to the community.
            </p>
            <Link href="/dashboard/blockchain" className="inline-flex items-center gap-3 text-[12px] font-medium tracking-[0.1em] uppercase text-on-background border-b border-on-background pb-1 hover:text-tertiary hover:border-tertiary hover:gap-5 transition-all relative z-10">
              View Your Badges
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* BLOCKCHAIN BENEFITS */}
      <section className="py-8 px-8 md:px-16 lg:px-20 max-w-[1400px] mx-auto overflow-hidden bg-background">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="flex items-center gap-4 text-[11px] font-medium tracking-[0.18em] uppercase text-tertiary mb-6">
            <span>Blockchain Powered</span>
            <span className="flex-1 h-[1px] bg-outline-variant max-w-[80px]"></span>
          </div>
          <h2 className="font-serif text-4xl md:text-6xl font-light leading-tight tracking-tight text-on-background max-w-3xl mb-6">
            Transparency that<br /><em className="italic text-primary">builds trust.</em>
          </h2>
          <p className="text-on-surface-variant font-light leading-relaxed max-w-lg">
            Every donation, every milestone, every contribution is permanently recorded on the blockchain—creating an immutable record of community impact.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Immutable Records */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 11l3 3L22 4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="font-serif text-xl text-on-background mb-3">Immutable Records</h3>
            <p className="text-on-surface-variant font-light leading-relaxed">
              All transactions and milestones are permanently recorded on-chain, creating an audit trail that cannot be altered or disputed.
            </p>
          </motion.div>

          {/* Verified Impact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 className="font-serif text-xl text-on-background mb-3">Verified Impact</h3>
            <p className="text-on-surface-variant font-light leading-relaxed">
              Milestone-based escrow ensures funds are released only when goals are demonstrated, with complete transparency every step.
            </p>
          </motion.div>

          {/* Your Reputation Counts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 6V4m0 2a2 2 0 100 4 2 2 0 000-4zm0 0a2 2 0 100 4 2 2 0 000-4zm7.07.07a2 2 0 11-2.83-2.83 2 2 0 012.83 2.83zM12 12a2 2 0 100 4 2 2 0 000-4zm7 0a2 2 0 100 4 2 2 0 000-4zm-14 0a2 2 0 100 4 2 2 0 000-4zM4.93 19.07a2 2 0 112.83-2.83 2 2 0 01-2.83 2.83zm14.14 0a2 2 0 112.83-2.83 2 2 0 01-2.83 2.83z"/>
              </svg>
            </div>
            <h3 className="font-serif text-xl text-on-background mb-3">Your Reputation Counts</h3>
            <p className="text-on-surface-variant font-light leading-relaxed">
              Earn soulbound badges that prove your contributions and build your digital reputation across the community.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-on-primary py-32 px-8 md:px-16 lg:px-20 relative overflow-hidden mt-32">
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full border border-on-primary/10 pointer-events-none"></div>
        <div className="absolute -bottom-40 right-20 w-[380px] h-[380px] rounded-full border border-on-primary/5 pointer-events-none"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10"
        >
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-on-primary/60 mb-6">Join the Movement</p>
            <h2 className="font-serif text-4xl md:text-6xl lg:text-[72px] font-light leading-[1.05] tracking-tight mb-6">
              Ready to make<br />
              <em className="italic text-on-primary/80">a transparent difference?</em>
            </h2>
            <p className="text-on-primary/80 font-light leading-relaxed max-w-md">
              Join a blockchain-powered relief network where every action is verified, every milestone is tracked, and community trust is built on immutable records. Together, we're reshaping disaster relief.
            </p>
          </div>
          <div className="flex flex-col gap-4 lg:w-max lg:ml-auto">
            <Link href={primaryHref} className="inline-flex items-center justify-center gap-2 px-12 py-5 bg-on-primary text-primary font-medium text-[13px] tracking-wider uppercase hover:bg-background transition-colors">
              {user ? 'Go to Dashboard' : 'Join the Network'}
              <ArrowRight size={14} />
            </Link>
            {!user && !loading && (
              <Link href="/login" className="inline-flex items-center justify-center gap-2 px-12 py-5 border border-on-primary/20 text-on-primary font-medium text-[13px] tracking-wider uppercase hover:bg-white/8 transition-colors">
                Login
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
