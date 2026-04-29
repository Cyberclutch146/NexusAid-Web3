"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createUserProfile } from '@/services/userService';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 7000);
    return () => clearTimeout(timer);
  }, [error]);

  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('You must agree to the Terms.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await register(email, password);
      await createUserProfile(user.uid, {
        displayName: fullName,
        email,
        location,
        role: 'volunteer',
        skills: [],
        equipment: [],
        travelRadius: 0,
        availability: 'anytime',
        bio: '',
        phone: '',
        avatarUrl: '',
        volunteerHours: 0,
        totalDonated: 0,
        profileComplete: false
      });
      router.replace('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!agreed) {
      setError('You must agree to the Terms.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      router.replace('/home');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-background text-on-background selection:bg-primary/20">
      <div className="w-full max-w-5xl bg-surface border border-outline-variant/30 grid grid-cols-1 md:grid-cols-2 rounded-[20px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:shadow-[0_30px_80px_rgba(0,0,0,0.12)] dark:shadow-none transition-shadow duration-500">
        
        {/* Left Side */}
        <div className="flex flex-col justify-start p-10 md:p-14 lg:p-20">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-[12px] font-medium tracking-[0.12em] uppercase text-on-surface-variant transition-colors hover:text-primary">
            ← Back to homepage
          </Link>
          <h1 className="font-serif text-4xl md:text-5xl font-light leading-tight mb-3 text-on-surface">Join NexusAid.</h1>
          <p className="text-on-surface-variant text-[15px] mb-10 max-w-[380px]">
            Create your volunteer account and start making an impact in your community.
          </p>

          <form onSubmit={handleRegister} className="flex flex-col">
            <input
              className="w-full pt-[14px] pb-2 border-b border-outline-variant/50 bg-transparent text-[14px] outline-none mb-6 transition-colors focus:border-primary focus:shadow-[0_2px_0_0_var(--color-primary)] placeholder:text-outline"
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
            />

            <input
              className="w-full pt-[14px] pb-2 border-b border-outline-variant/50 bg-transparent text-[14px] outline-none mb-6 transition-colors focus:border-primary focus:shadow-[0_2px_0_0_var(--color-primary)] placeholder:text-outline"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />

            <input
              className="w-full pt-[14px] pb-2 border-b border-outline-variant/50 bg-transparent text-[14px] outline-none mb-6 transition-colors focus:border-primary focus:shadow-[0_2px_0_0_var(--color-primary)] placeholder:text-outline"
              type="text"
              placeholder="Primary Location (City, Country)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
              required
            />

            <input
              className="w-full pt-[14px] pb-2 border-b border-outline-variant/50 bg-transparent text-[14px] outline-none mb-8 transition-colors focus:border-primary focus:shadow-[0_2px_0_0_var(--color-primary)] placeholder:text-outline"
              type="password"
              placeholder="Password (at least 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={8}
            />

            <div className="flex items-center mb-8 text-[13px] text-on-surface-variant">
              <input 
                type="checkbox" 
                checked={agreed} 
                onChange={(e) => setAgreed(e.target.checked)} 
                disabled={loading} 
                className="mr-3 w-4 h-4 accent-primary"
                required
              />
              <span>
                I agree to the <a href="#" className="text-on-surface underline hover:text-primary transition-colors">Terms of Service</a> and <a href="#" className="text-on-surface underline hover:text-primary transition-colors">Privacy Policy</a>.
              </span>
            </div>

            <button 
              className="w-full p-4 bg-on-surface text-surface text-[13px] tracking-[0.14em] uppercase rounded-md transition-all hover:bg-primary hover:shadow-lg active:shadow-inner disabled:opacity-50"
              type="submit" 
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Join NexusAid'}
            </button>

            <div className="flex items-center gap-3 my-6 text-outline text-[12px] tracking-[0.1em] uppercase before:flex-1 before:h-px before:bg-outline-variant/30 after:flex-1 after:h-px after:bg-outline-variant/30">
              or sign up with
            </div>

            <button 
              type="button" 
              className="flex items-center justify-center gap-2.5 p-3.5 border border-outline-variant/50 bg-transparent text-[12px] font-medium tracking-[0.06em] uppercase rounded-lg transition-colors hover:border-on-surface hover:bg-surface-container disabled:opacity-50"
              onClick={handleGoogleSignIn} 
              disabled={loading}
            >
              <img className="w-4 h-4" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google logo" />
              Google
            </button>
          </form>

          <div className="mt-8 text-[13px] text-on-surface-variant">
            Already have an account? <Link href="/login" className="text-on-surface underline hover:text-primary transition-colors">Log in here</Link>
          </div>
        </div>

        {/* Right Side */}
        <div className="relative hidden md:block h-full">
          <img 
            className="w-full h-full object-cover brightness-90 dark:brightness-75"
            src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&q=80" 
            alt="Community"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
        </div>

      </div>

      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface px-5 py-3.5 text-[13px] tracking-[0.04em] rounded-lg shadow-2xl z-50 animate-in slide-in-from-bottom-5">
          {error}
        </div>
      )}
    </div>
  );
}
