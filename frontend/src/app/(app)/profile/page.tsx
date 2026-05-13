'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { updateUserProfile } from '@/services/userService';
import { uploadImage } from '@/services/storageService';
import { toast } from 'sonner';
import { getUserAvatar, DEFAULT_AVATAR } from '@/utils/avatar';
import { getRegisteredEvents } from '@/services/eventService';
import { getUserDonations, DonationRecord } from '@/services/donationService';
import { useWallet } from '@/hooks/useWallet';
import { BadgeDisplay } from '@/components/web3/BadgeDisplay';
import { RollingCounter } from '@/components/ui/RollingCounter';
import { BrowserProvider, formatEther, parseEther, Contract } from 'ethers';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const { address, signer, isConnecting, isLinking, isLinked, connect, linkWallet } = useWallet();

  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [volunteerHours, setVolunteerHours] = useState(0);
  const [tipAmount, setTipAmount] = useState('0.01');
  const [isTipping, setIsTipping] = useState(false);
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState('');
  const [equipment, setEquipment] = useState('');
  const [travelRadius, setTravelRadius] = useState(10);
  const [availability, setAvailability] = useState('anytime');

  // Sync state initially
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setSkills(profile.skills ? profile.skills.join(', ') : '');
      setEquipment(profile.equipment ? profile.equipment.join(', ') : '');
      setTravelRadius(profile.travelRadius || 10);
      setAvailability(profile.availability || 'anytime');
      setVolunteerHours(profile.volunteerHours || 0);
    }
  }, [profile, isEditing]);

  // Fetch volunteer hours + donation history in parallel (was two separate waterfalls)
  useEffect(() => {
    if (!user) return;
    setLoadingDonations(true);
    Promise.all([
      getRegisteredEvents(user.uid),
      getUserDonations(user.uid),
    ])
      .then(([events, donations]) => {
        // Mock: each event attended is 5 hours
        const realHours = events.length * 5;
        if (realHours > volunteerHours) setVolunteerHours(realHours);
        setDonationHistory(donations);
      })
      .catch(err => console.error('Failed to fetch profile data:', err))
      .finally(() => setLoadingDonations(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!address || !window.ethereum) return;
      try {
        const provider = new BrowserProvider(window.ethereum, 'any');
        const bal = await provider.getBalance(address);
        setWalletBalance(parseFloat(formatEther(bal)).toFixed(4));
      } catch {
        setWalletBalance(null);
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [address]);

  // Quick tip/donate to the NexusDonate contract
  const handleQuickTip = async () => {
    if (!user) {
      toast.error('Please sign in to send a donation');
      return;
    }

    if (!signer || !address) {
      toast.error('Connect your wallet first');
      return;
    }
    const contractAddr = process.env.NEXT_PUBLIC_DONATE_CONTRACT;
    if (!contractAddr) {
      toast.error('Donate contract not configured');
      return;
    }

    setIsTipping(true);
    const loadingToast = toast.loading(`Sending ${tipAmount} ETH...`);
    try {
      const tx = await signer.sendTransaction({
        to: contractAddr,
        value: parseEther(tipAmount),
      });
      await tx.wait();
      
      // ── Sync with Firestore ──
      try {
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'increment-donations', 
            userId: user.uid, 
            data: { amount: parseFloat(tipAmount) * 2500 } // Mock conversion 1 ETH = $2500
          }),
        });
      } catch (err) {
        console.error("Failed to sync donation to profile:", err);
      }

      toast.success(`Sent ${tipAmount} ETH! Tx: ${tx.hash.slice(0, 10)}…`, { id: loadingToast });
      // Refresh balance
      const provider = new BrowserProvider(window.ethereum!, 'any');
      const bal = await provider.getBalance(address);
      setWalletBalance(parseFloat(formatEther(bal)).toFixed(4));
    } catch (err: any) {
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected', { id: loadingToast });
      } else {
        toast.error(`Failed: ${err.message?.slice(0, 80)}`, { id: loadingToast });
      }
    } finally {
      setIsTipping(false);
    }
  };

  if (!user || !profile) {
    return (
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full pb-28 md:pb-10 flex justify-center items-center">
        {!user ? (
          <p className="text-on-surface-variant font-medium">Please sign in to view your profile.</p>
        ) : (
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <div className="absolute inset-0 rounded-full animate-subtle-pulse" style={{ boxShadow: '0 0 30px rgba(59,107,74,0.15)' }} />
          </div>
        )}
      </main>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      const url = await uploadImage(file, `avatars/${user.uid}`);
      await updateUserProfile(user.uid, { avatarUrl: url });
      toast.success('Profile photo updated!');
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error('Failed to upload image. Please check permissions.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!user) return;
    setUploadingImage(true);
    try {
      await updateUserProfile(user.uid, { avatarUrl: '' });
      toast.success('Profile photo removed!');
    } catch (err) {
      console.error("Error removing image:", err);
      toast.error('Failed to remove image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        equipment: equipment.split(',').map(s => s.trim()).filter(Boolean),
        travelRadius,
        availability,
        profileComplete: true
      });
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentAvatar = getUserAvatar(profile?.avatarUrl, profile?.displayName);

  const inputStyle = {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
  };

  if (isEditing) {
    return (
      <main className="flex-grow w-full max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-12 pb-24 md:pb-12">
        <div className="md:hidden mb-6 flex items-center justify-between">
          <button onClick={() => setIsEditing(false)} aria-label="Go back" className="text-primary p-2 -ml-2 rounded-full hover:bg-surface-variant/40 transition-colors">
            <span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-on-surface">Edit Profile</h1>
          <div className="w-10"></div>
        </div>

        <div className="hidden md:block mb-10 text-center animate-fade-in-up">
          <h1 className="text-4xl font-bold text-gradient-earth mb-2 font-headline">Edit Profile</h1>
          <p className="text-on-surface-variant text-lg">Keep your profile current so neighbors can find and trust your support.</p>
        </div>
        <form onSubmit={handleSave} className="space-y-8 premium-glass-strong p-6 md:p-10 animate-fade-in-up delay-100">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-8" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <div className="relative group">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden relative flex items-center justify-center" style={{ border: '4px solid var(--color-surface-base)', background: 'var(--glass-bg)' }}>
                {uploadingImage ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                ) : (
                  <Image src={currentAvatar} alt={profile.displayName || 'User'} className="w-full h-full object-cover" fill unoptimized />
                )}
              </div>
            </div>
            <div className="text-center sm:text-left flex-1 mt-2 sm:mt-0">
              <h2 className="text-lg font-bold text-on-surface mb-1">Profile Photo</h2>
              <p className="text-sm text-on-surface-variant mb-4 max-w-sm">A clear, friendly photo helps build trust within the NexusAid community. Max size 5MB.</p>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <label
                  className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(59,107,74,0.1)',
                    color: 'var(--color-primary-base)',
                  }}
                >
                  Upload New
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
                {profile.avatarUrl && (
                  <button onClick={handleRemoveImage} disabled={uploadingImage} className="px-4 py-2 bg-transparent text-error border border-error/20 rounded-lg text-sm font-semibold hover:bg-error/5 transition-colors" type="button">
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2" htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                className="w-full rounded-xl border-0 py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/50"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2" htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the community a bit about yourself and why you're here..."
                rows={4}
                className="w-full rounded-xl border-0 py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/50 resize-y"
                style={inputStyle}
              />
              <p className="text-xs text-on-surface-variant mt-2 text-right">{bio.length} / 300 characters</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2" htmlFor="location">Location</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">location_on</span>
                </span>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, State or Region"
                  className="w-full rounded-xl border-0 py-3 pl-11 pr-4 text-on-surface focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/50"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2" htmlFor="skills">Skills (comma separated)</label>
              <input
                id="skills"
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. Carpentry, First Aid, Cooking"
                className="w-full rounded-xl border-0 py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/50"
                style={inputStyle}
              />
              <p className="text-xs text-on-surface-variant mt-2">These help us match you with relevant impact opportunities.</p>
            </div>

            {/* Equipment */}
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2" htmlFor="equipment">Equipment You Can Provide (comma separated)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant">
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px]">build</span>
                </span>
                <input
                  id="equipment"
                  type="text"
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="e.g. Truck, Generator, Medical Kit, Tent"
                  className="w-full rounded-xl border-0 py-3 pl-11 pr-4 text-on-surface focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/50"
                  style={inputStyle}
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-2">Resources you can bring to relief efforts.</p>
            </div>

            {/* Travel Radius */}
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2" htmlFor="travelRadius">
                Travel Radius: <span style={{ color: 'var(--color-primary-base)' }}>{travelRadius} km</span>
              </label>
              <input
                id="travelRadius"
                type="range"
                min={0}
                max={100}
                step={5}
                value={travelRadius}
                onChange={(e) => setTravelRadius(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                style={{ background: `linear-gradient(to right, var(--color-primary-base) 0%, var(--color-primary-base) ${travelRadius}%, var(--color-surface-container-base) ${travelRadius}%, var(--color-surface-container-base) 100%)` }}
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant mt-1 font-semibold">
                <span>0 km</span>
                <span>25 km</span>
                <span>50 km</span>
                <span>75 km</span>
                <span>100 km</span>
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-bold text-on-surface mb-3">Availability</label>
              <div className="flex flex-wrap gap-2">
                {(['weekdays', 'weekends', 'evenings', 'anytime'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAvailability(opt)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 capitalize ${
                      availability === opt
                        ? 'text-on-primary shadow-md'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    style={availability === opt ? {
                      background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                      boxShadow: '0 2px 8px rgba(59,107,74,0.25)',
                    } : {
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    {opt === 'anytime' ? '🕐 Anytime' : opt === 'weekdays' ? '📅 Weekdays' : opt === 'weekends' ? '🌴 Weekends' : '🌙 Evenings'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <button onClick={() => setIsEditing(false)} disabled={loading} className="premium-button-muted font-bold text-center sm:w-auto w-full" type="button">
              Cancel
            </button>
            <button
              disabled={loading}
              className="px-6 py-3 md:py-2.5 rounded-full font-bold text-on-primary text-center sm:w-auto w-full disabled:opacity-50 transition-all duration-300 hover:-translate-y-0.5"
              type="submit"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                boxShadow: '0 4px 14px rgba(59,107,74,0.25)',
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-28 md:pb-12 w-full">
      {/* Profile Header */}
      <section className="grid grid-cols-1 gap-6 animate-fade-in-up">
        <div
          className="rounded-[24px] p-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden"
          style={{
            background: 'var(--glass-bg-strong)',
            backdropFilter: 'blur(24px) saturate(1.4)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {/* Decorative gradient */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(59,107,74,0.05), transparent, rgba(139,109,46,0.03))' }} />

          <div className="relative">
            <div
              className="w-32 h-32 rounded-full overflow-hidden z-10 relative flex justify-center items-center"
              style={{
                border: '4px solid var(--color-surface-base)',
                boxShadow: '0 4px 20px rgba(42,45,43,0.1)',
                background: 'var(--glass-bg)',
              }}
            >
              <Image src={currentAvatar} alt={profile.displayName || 'User'} className="w-full h-full object-cover" fill unoptimized />
            </div>
            {profile.profileComplete && (
              <div
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center z-20"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                  color: 'var(--color-on-primary-base)',
                  border: '2px solid var(--color-surface-base)',
                  boxShadow: '0 2px 8px rgba(59,107,74,0.2)',
                }}
              >
                <span className="material-symbols-outlined text-sm">verified</span>
              </div>
            )}
          </div>

          <div className="text-center md:text-left flex-1 z-10">
            <h1 className="font-headline text-3xl font-bold text-on-surface mb-1">{profile.displayName || 'Anonymous'}</h1>
            <p className="font-body font-semibold mb-3 flex items-center justify-center md:justify-start gap-1" style={{ color: 'var(--color-primary-base)' }}>
              <span className="material-symbols-outlined text-base">volunteer_activism</span>
              {profile.role === 'organizer' ? 'Community Organizer' : 'Community Volunteer'}
            </p>
            {profile.location && (
              <p className="font-body text-on-surface-variant text-sm flex items-center justify-center md:justify-start gap-1 mb-4">
                <span className="material-symbols-outlined text-sm">public</span>
                {profile.location}
              </p>
            )}
            {profile.bio && (
              <p className="font-body text-on-surface-variant text-sm mb-4 max-w-xl leading-relaxed">
                {profile.bio}
              </p>
            )}

            {profile.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 mb-4 justify-center md:justify-start">
                {profile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: 'rgba(59,107,74,0.1)',
                      color: 'var(--color-primary-base)',
                      border: '1px solid rgba(59,107,74,0.15)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Equipment Tags */}
            {profile.equipment && profile.equipment.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                {profile.equipment.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1"
                    style={{
                      background: 'rgba(212,168,82,0.12)',
                      color: 'var(--color-warm-amber)',
                      border: '1px solid rgba(212,168,82,0.2)',
                    }}
                  >
                    <span className="material-symbols-outlined text-[14px]">build</span>
                    {item}
                  </span>
                ))}
              </div>
            )}

            {/* Resource Info Chips */}
            {(profile.travelRadius > 0 || profile.availability) && (
              <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                {profile.travelRadius > 0 && (
                  <span
                    className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                    style={{
                      background: 'rgba(59,107,74,0.08)',
                      color: 'var(--color-primary-base)',
                      border: '1px solid rgba(59,107,74,0.12)',
                    }}
                  >
                    <span className="material-symbols-outlined text-[14px]">near_me</span>
                    Within {profile.travelRadius} km
                  </span>
                )}
                {profile.availability && profile.availability !== 'anytime' && (
                  <span
                    className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                    style={{
                      background: 'rgba(139,109,46,0.08)',
                      color: 'var(--color-tertiary-base)',
                      border: '1px solid rgba(139,109,46,0.12)',
                    }}
                  >
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {profile.availability.charAt(0).toUpperCase() + profile.availability.slice(1)}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 rounded-full font-semibold text-on-primary transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                  boxShadow: '0 4px 14px rgba(59,107,74,0.25)',
                }}
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Cards */}
      <section className="animate-fade-in-up delay-200">
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ color: 'var(--color-primary-base)' }}>monitoring</span>
          Your Impact
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Hours Card */}
          <div
            className="premium-glass rounded-xl p-6 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(59,107,74,0.1)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary-base)' }}>schedule</span>
              </div>
            </div>
            <p className="text-on-surface-variant text-sm font-medium mb-1">Hours Volunteered</p>
            <p className="font-headline text-3xl font-bold text-on-surface">
              <RollingCounter value={volunteerHours} />
            </p>
          </div>

          {/* Donated Card */}
          <div
            className="premium-glass rounded-xl p-6 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(139,109,46,0.1)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-warm-amber)' }}>favorite</span>
              </div>
            </div>
            <p className="text-on-surface-variant text-sm font-medium mb-1">Total Donated</p>
            <p className="font-headline text-3xl font-bold text-on-surface">
              <RollingCounter value={profile.totalDonated || 0} isCurrency />
            </p>
          </div>
        </div>
      </section>

      {/* Digital Wallet & On-Chain Reputation */}
      <section className="animate-fade-in-up delay-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary-base)' }}>account_balance_wallet</span>
            Digital Wallet & Reputation
          </h2>
          {isLinked && (
            <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              Verified On-Chain
            </div>
          )}
        </div>

        {/* Row 1: Wallet Identity + MATIC Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Wallet Connection Card */}
          <div 
            className="premium-glass rounded-[24px] p-6 flex flex-col justify-between"
            style={{ background: 'linear-gradient(145deg, var(--glass-bg), rgba(59,107,74,0.05))' }}
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Polygon Identity</p>
              
              {(address || profile?.walletAddress) ? (
                <div className="space-y-4">
                  <div 
                    className="p-4 rounded-2xl bg-surface-container/30 border border-glass cursor-pointer group"
                    onClick={() => {
                      const addr = address || profile?.walletAddress;
                      if (addr) {
                        navigator.clipboard.writeText(addr);
                        toast.success('Address copied!');
                      }
                    }}
                  >
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Wallet Address</p>
                    <p className="font-mono text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {address || profile?.walletAddress}
                    </p>
                  </div>
                  
                  {!isLinked && address && (
                    <button
                      onClick={linkWallet}
                      disabled={isLinking}
                      className="w-full py-3 rounded-xl text-sm font-bold text-on-primary transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))' }}
                    >
                      {isLinking ? 'Linking...' : 'Link Wallet to Profile'}
                    </button>
                  )}
                  
                  <a 
                    href={`https://amoy.polygonscan.com/address/${address || profile?.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl text-sm font-bold text-on-surface bg-surface-container/50 border border-glass flex items-center justify-center gap-2 hover:bg-surface-container transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    View on PolygonScan
                  </a>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-surface-container rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-3xl">🦊</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-2">Wallet Not Connected</h3>
                  <p className="text-xs text-on-surface-variant mb-6">
                    Connect your wallet to claim on-chain badges for your contributions.
                  </p>
                  <button
                    onClick={connect}
                    disabled={isConnecting}
                    className="w-full py-3 rounded-xl text-sm font-bold text-on-primary transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))' }}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                  </button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-on-surface-variant/60 mt-6 italic">
              NexusAid uses Soulbound Tokens (SBTs) to create an immutable reputation for disaster responders.
            </p>
          </div>

          {/* MATIC / ETH Balance & Quick Donate Panel */}
          <div
            className="premium-glass rounded-[24px] p-6 flex flex-col justify-between relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, var(--glass-bg), rgba(130, 71, 229, 0.06))' }}
          >
            {/* Decorative polygon icon */}
            <div className="absolute -top-6 -right-6 text-[120px] opacity-[0.04] leading-none pointer-events-none select-none">
              ⬡
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Wallet Balance</p>

              {(address || profile?.walletAddress) ? (
                <div className="space-y-5">
                  {/* Balance Display */}
                  <div className="text-center py-4">
                    <p className="font-headline text-5xl font-black text-on-surface mb-1">
                      {walletBalance !== null ? walletBalance : '—'}
                    </p>
                    <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#8247e5' }}>
                      ETH / MATIC
                    </p>
                  </div>

                  {/* Quick Tip Amounts */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Quick Donate</p>
                    <div className="grid grid-cols-4 gap-2">
                      {['0.001', '0.01', '0.05', '0.1'].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setTipAmount(amt)}
                          className="py-2.5 rounded-lg text-sm font-bold transition-all duration-200 hover:-translate-y-0.5"
                          style={tipAmount === amt ? {
                            background: 'linear-gradient(135deg, #8247e5, #6c3bbf)',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(130,71,229,0.3)',
                          } : {
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--color-on-surface)',
                          }}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom amount + Send */}
                  <div className="flex gap-3">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      className="flex-1 min-w-0 rounded-xl border-0 py-3 px-4 text-sm font-mono font-bold text-on-surface focus:ring-2 focus:ring-purple-500/30 transition-all"
                      style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                      }}
                    />
                    <button
                      onClick={handleQuickTip}
                      disabled={isTipping || !signer}
                      className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 whitespace-nowrap"
                      style={{
                        background: 'linear-gradient(135deg, #8247e5, #6c3bbf)',
                        boxShadow: '0 3px 12px rgba(130,71,229,0.25)',
                      }}
                    >
                      {isTipping ? (
                        <span className="animate-spin inline-block">⬡</span>
                      ) : (
                        '⬡ Send'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(130,71,229,0.1)' }}>
                    <span className="text-3xl">⬡</span>
                  </div>
                  <h3 className="text-sm font-bold text-on-surface mb-2">No Wallet Connected</h3>
                  <p className="text-xs text-on-surface-variant">
                    Connect wallet to view balance and make quick donations
                  </p>
                </div>
              )}
            </div>

            <p className="text-[10px] text-on-surface-variant/60 mt-5 italic relative z-10">
              Testnet tokens have no real value. Use Polygon faucet for test MATIC.
            </p>
          </div>
        </div>

        {/* Row 2: Badges — Full Width */}
        <div className="premium-glass rounded-[24px] p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Earned Badges (SBTs)</p>
            {isLinked && (
              <button 
                onClick={() => window.location.href = '/dashboard/blockchain'}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
              >
                Manage Badges →
              </button>
            )}
          </div>
          
          {(address || profile?.walletAddress) ? (
            <BadgeDisplay walletAddress={(address || profile?.walletAddress) as string} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10 border border-glass border-dashed rounded-[20px]">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20 mb-3">military_tech</span>
              <p className="text-sm font-medium text-on-surface-variant">
                Connect your wallet to view your reputation badges
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Donation History ─── */}
      <section className="animate-fade-in-up delay-400">
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ color: 'var(--color-primary-base)' }}>receipt_long</span>
          Donation History
        </h2>

        {loadingDonations ? (
          <div className="premium-glass rounded-[24px] p-8 flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            <span className="text-on-surface-variant text-sm">Loading history...</span>
          </div>
        ) : donationHistory.length === 0 ? (
          <div className="premium-glass rounded-[24px] p-10 flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20 mb-3">volunteer_activism</span>
            <p className="text-sm font-medium text-on-surface-variant">No donations recorded yet.</p>
            <p className="text-xs text-on-surface-variant/60 mt-1">Your fiat and crypto donations will appear here after you donate.</p>
          </div>
        ) : (
          <div className="premium-glass rounded-[24px] overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/20">
              <div className="col-span-2">Method</div>
              <div className="col-span-4">Campaign</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2">Receipt</div>
              <div className="col-span-2 text-right">Date</div>
            </div>

            {donationHistory.map((don, idx) => {
              const isRazorpay = don.method === 'razorpay';
              const amountLabel = isRazorpay
                ? `₹${don.amount.toLocaleString('en-IN')}`
                : `${don.amount} ${don.currency}`;
              const dateLabel = don.createdAt
                ? new Date((don.createdAt as any).toDate?.() ?? don.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—';

              return (
                <div
                  key={don.id ?? idx}
                  className="grid grid-cols-12 gap-2 px-5 py-4 items-center text-sm border-b border-outline-variant/10 last:border-0 hover:bg-surface-variant/20 transition-colors"
                >
                  {/* Method */}
                  <div className="col-span-2">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
                      style={isRazorpay
                        ? { background: 'rgba(59,107,74,0.1)', color: 'var(--color-primary-base)' }
                        : { background: 'rgba(130,71,229,0.1)', color: '#8247e5' }
                      }
                    >
                      {isRazorpay ? '₹ Fiat' : '⬡ Crypto'}
                    </span>
                  </div>

                  {/* Campaign */}
                  <div className="col-span-4 font-medium text-on-surface truncate text-xs">
                    {don.eventTitle}
                  </div>

                  {/* Amount */}
                  <div className="col-span-2 text-right font-bold text-on-surface">
                    {amountLabel}
                  </div>

                  {/* Receipt */}
                  <div className="col-span-2">
                    <span className="font-mono text-[10px] text-on-surface-variant bg-surface-variant/40 px-1.5 py-0.5 rounded">
                      {don.receiptId}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 text-right text-xs text-on-surface-variant">
                    {dateLabel}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
