'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getEventById, getEventVolunteers, updateVolunteerStatus, EventVolunteer, ADMIN_EMAILS } from '@/services/eventService';
import { CommunityEvent } from '@/types';
import { ArrowLeft, Users, CheckCircle, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Dynamically import ScannerView to avoid SSR issues with html5-qrcode
const ScannerView = dynamic(() => import('@/components/ScannerView'), { ssr: false });

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [volunteers, setVolunteers] = useState<EventVolunteer[]>([]); 
  const [loading, setLoading] = useState(true);
  const [checkedInCount, setCheckedInCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [eventData, volunteerData] = await Promise.all([
          getEventById(eventId),
          getEventVolunteers(eventId),
        ]);

        if (eventData?.organizerId !== user.uid && !ADMIN_EMAILS.includes(user.email || '')) {
          toast.error('You do not have permission to access this page.');
          router.push('/dashboard');
          return;
        }

        setEvent(eventData);
        setVolunteers(volunteerData);
        setCheckedInCount(volunteerData.filter(v => v.attended).length);
      } catch (err) {
        console.error('Failed to load scan data:', err);
        toast.error('Could not load event data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, user, router]);

  const handleScanSuccess = async (scannedTicketId: string) => {
    // Find the volunteer whose userId or ticket matches the scanned data
    // The QR code contains the ticket ID
    const volunteer = volunteers.find(
      v => v.id === scannedTicketId || (v as any).ticketId === scannedTicketId
    );

    if (!volunteer) {
      throw new Error(`Ticket "${scannedTicketId}" not found in volunteer roster.`);
    }

    if (volunteer.attended) {
      throw new Error(`${volunteer.userName} is already checked in.`);
    }

    await updateVolunteerStatus(eventId, volunteer.id, true);

    // Update local state
    setVolunteers(prev =>
      prev.map(v => v.id === volunteer.id ? { ...v, attended: true } : v)
    );
    setCheckedInCount(prev => prev + 1);

    toast.success(`✅ ${volunteer.userName} checked in!`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 rounded-full animate-subtle-pulse" style={{ boxShadow: '0 0 30px rgba(59,107,74,0.15)' }} />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const totalVolunteers = volunteers.length;
  const checkInProgress = totalVolunteers > 0 ? Math.round((checkedInCount / totalVolunteers) * 100) : 0;

  return (
    <main className="flex-1 p-4 md:p-10 max-w-3xl mx-auto w-full pb-28 md:pb-10">
      <button
        onClick={() => router.push(`/dashboard/event/${eventId}`)}
        className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface mb-6 transition-colors font-semibold animate-fade-in-up"
      >
        <ArrowLeft size={20} />
        Back to Event Dashboard
      </button>

      {/* Header */}
      <div className="mb-8 animate-fade-in-up delay-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-2xl" style={{ background: 'rgba(59,107,74,0.1)' }}>
            <QrCode size={24} style={{ color: 'var(--color-primary-base)' }} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-serif font-bold text-gradient-earth tracking-tight">QR Check-in</h1>
            <p className="text-on-surface-variant text-sm font-medium">{event.title}</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 mb-8 animate-fade-in-up delay-200">
        <div className="premium-glass p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} style={{ color: 'var(--color-primary-base)' }} />
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Volunteers</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-primary-base)' }}>{totalVolunteers}</p>
        </div>
        <div className="premium-glass p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} style={{ color: 'var(--color-warm-amber)' }} />
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Checked In</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-warm-amber)' }}>
            {checkedInCount}
            <span className="text-sm font-normal text-on-surface-variant ml-1">({checkInProgress}%)</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 animate-fade-in-up delay-300">
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-variant-base)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${checkInProgress}%`,
              background: 'linear-gradient(90deg, var(--color-primary-base), var(--color-warm-amber))',
              boxShadow: '0 0 12px rgba(59,107,74,0.3)',
            }}
          />
        </div>
      </div>

      {/* Scanner */}
      <div className="animate-fade-in-up delay-400">
        <ScannerView eventId={eventId} onScanSuccess={handleScanSuccess} />
      </div>

      {/* Recent check-ins */}
      {volunteers.filter(v => v.attended).length > 0 && (
        <div className="mt-8 premium-glass-strong overflow-hidden animate-fade-in-up delay-500">
          <div className="p-5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <h3 className="font-serif text-lg font-bold text-on-surface flex items-center gap-2">
              <CheckCircle size={20} style={{ color: 'var(--color-primary-base)' }} />
              Recently Checked In
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
            {volunteers.filter(v => v.attended).slice(0, 10).map(vol => (
              <div key={vol.id} className="flex items-center gap-3 px-5 py-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary-container-base), var(--color-sage))',
                    color: 'var(--color-on-primary-container-base)',
                  }}
                >
                  {vol.userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-surface">{vol.userName}</p>
                </div>
                <span className="material-symbols-outlined text-lg" style={{ color: 'var(--color-primary-base)', fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
