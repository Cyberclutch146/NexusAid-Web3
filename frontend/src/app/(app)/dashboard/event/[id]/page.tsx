'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getEventById, getEventVolunteers, updateVolunteerStatus, EventVolunteer, deleteEvent, ADMIN_EMAILS, getEventGoodsPledges, addExpenditureLog, deleteExpenditureLog } from '@/services/eventService';
import { getEventDonations, DonationRecord, getPendingDonations, PendingDonation, rejectPendingDonation } from '@/services/donationService';
import { CommunityEvent, ExpenditureLog } from '@/types';
import { ArrowLeft, Users, Download, Calendar, Mail, CheckCircle, Circle, Trash2, Send, Pencil, AlertTriangle, QrCode, Package, Banknote, ShieldCheck, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import PromotionModal from '@/components/events/PromotionModal';
import { SentinelAlert } from '@/types/sentinel';
import { isPointInPolygon, getDistanceMiles } from '@/utils/geo';
import { MilestoneTracker } from '@/components/web3/MilestoneTracker';

export default function OrganizerEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useAuth();

  // Unwrap params using React.use()
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [volunteers, setVolunteers] = useState<EventVolunteer[]>([]);
  const [alerts, setAlerts] = useState<SentinelAlert[]>([]);
  const [goodsPledges, setGoodsPledges] = useState<Awaited<ReturnType<typeof getEventGoodsPledges>>>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'volunteers' | 'goods' | 'donations' | 'expenditures' | 'pending'>('volunteers');
  const [pendingDonations, setPendingDonations] = useState<PendingDonation[]>([]);
  const [expenditureDesc, setExpenditureDesc] = useState('');
  const [expenditureAmount, setExpenditureAmount] = useState('');
  const [smsNumber, setSmsNumber] = useState('');
  const [sendingSms, setSendingSms] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const [eventData, volunteerData, alertsData, pledgesData, donationData, pendingData] = await Promise.all([
          getEventById(eventId),
          getEventVolunteers(eventId),
          fetch('/api/sentinel').then(r => r.json()).catch(() => []),
          getEventGoodsPledges(eventId),
          getEventDonations(eventId),
          getPendingDonations(eventId),
        ]);

        if (eventData?.organizerId !== user.uid && !ADMIN_EMAILS.includes(user.email || '')) {
          toast.error('You do not have permission to view this event.');
          router.push('/dashboard');
          return;
        }

        setEvent(eventData);
        setVolunteers(volunteerData);
        setAlerts(alertsData);
        setGoodsPledges(pledgesData);
        setDonations(donationData);
        setPendingDonations(pendingData.filter(p => p.status === 'pending'));
      } catch (err) {
        console.error('Failed to load event data:', err);
        toast.error('Could not load event data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, user, router]);

  const handleToggleAttendance = async (volunteerId: string, currentStatus: boolean | undefined) => {
    try {
      const newStatus = !currentStatus;
      await updateVolunteerStatus(eventId, volunteerId, newStatus);
      setVolunteers(prev =>
        prev.map(v => v.id === volunteerId ? { ...v, attended: newStatus } : v)
      );
      toast.success(`Volunteer marked as ${newStatus ? 'attended' : 'not attended'}.`);
    } catch (error) {
      console.error('Failed to update attendance:', error);
      toast.error('Failed to update attendance.');
    }
  };

  const handleApprovePending = async (pending: PendingDonation) => {
    try {
      const res = await fetch('/api/approve-donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          pendingId: pending.id,
          adminEmail: user?.email,
          adminUid: user?.uid,
          adminName: user?.displayName || 'Admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Donation approved and receipt sent!');
      
      setPendingDonations(prev => prev.filter(p => p.id !== pending.id));
      
      const updatedDonations = await getEventDonations(eventId);
      setDonations(updatedDonations);
      
      const updatedEvent = await getEventById(eventId);
      setEvent(updatedEvent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve donation');
    }
  };

  const handleRejectPending = async (pendingId: string) => {
    if (!confirm('Are you sure you want to reject this claim?')) return;
    try {
      await rejectPendingDonation(eventId, pendingId);
      toast.success('Donation claim rejected');
      setPendingDonations(prev => prev.filter(p => p.id !== pendingId));
    } catch (err) {
      toast.error('Failed to reject donation claim');
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;

    try {
      await deleteEvent(eventId);
      toast.success('Event deleted successfully.');
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event.');
    }
  };

  const handleSendSms = async () => {
    if (!smsNumber.trim()) {
      toast.error('Please enter a phone number.');
      return;
    }

    if (!event) {
      toast.error('Event not loaded.');
      return;
    }

    setSendingSms(true);

    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: smsNumber,
          message: `Hi! You are invited to join "${event.title}" on NexusAid. Location: ${event.location}. Please open the platform to volunteer or support this event.`,
          url: window.location.href,
        }),
      });

      let data: any = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send SMS.');
      }

      toast.success('SMS sent successfully.');
      setSmsNumber('');
    } catch (error) {
      console.error('Failed to send SMS:', error);
      toast.error('Failed to send SMS.');
    } finally {
      setSendingSms(false);
    }
  };

  const handleEmailAll = async () => {
    const emails = volunteers
      .map(v => v.userEmail)
      .filter((email): email is string => Boolean(email));

    if (emails.length === 0) {
      toast.info('No volunteer emails to send.');
      return;
    }

    const subject = encodeURIComponent(`Update regarding ${event?.title || 'Community Event'}`);
    const mailtoLink = `mailto:?bcc=${emails.join(',')}&subject=${subject}`;

    // Trigger the mail client IMMEDIATELY so the browser doesn't block it due to async delay
    window.location.href = mailtoLink;

    try {
      await navigator.clipboard.writeText(emails.join(', '));
      toast.success('Opening mail client (and copied emails to clipboard just in case!)');
    } catch (err) {
      // ignore clipboard errors
    }
  };

  const handleExportCSV = () => {
    if (volunteers.length === 0) {
      toast.info('No volunteers to export.');
      return;
    }

    const headers = ['Name', 'Email/ID', 'Signed Up Date'];
    const rows = volunteers.map(v => [
      v.userName,
      v.userEmail || v.userId,
      v.signedUpAt?.toDate?.()?.toLocaleDateString() || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `event_${eventId}_volunteers.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Volunteer list exported successfully.');
  };

  const handleExportDonationsCSV = () => {
    if (donations.length === 0) { toast.info('No donations to export.'); return; }
    const headers = ['Receipt ID', 'Donor', 'Email', 'Amount', 'Currency', 'Method', 'Date', 'Recorded By'];
    const rows = donations.map(d => [
      d.receiptId,
      `"${d.userName}"`,
      d.userEmail,
      d.amount,
      d.currency,
      d.method,
      d.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A',
      d.recordedByName || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `event_${eventId}_donations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Donations exported successfully.');
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

  const eventLat = event.lat ?? 0;
  const eventLng = event.lng ?? 0;
  const currentVols = event.needs?.volunteers?.current || 0;
  const goalVols = event.needs?.volunteers?.goal || 1;
  const progress = Math.min(100, Math.round((currentVols / goalVols) * 100));
  const isAdmin = ADMIN_EMAILS.includes(user?.email || '');

  const intersectingAlerts = alerts.filter((alert: SentinelAlert) => {
    if (!eventLat || !eventLng) return false;

    if (alert.severity === 'Extreme' && alert.polygon && alert.polygon.length > 2) {
      if (isPointInPolygon({ lat: eventLat, lng: eventLng }, alert.polygon)) {
        return true;
      }
    }

    if (alert.coordinates?.lat && alert.coordinates?.lng) {
      const distance = getDistanceMiles(
        eventLat,
        eventLng,
        alert.coordinates.lat,
        alert.coordinates.lng
      );
      return distance <= 30;
    }

    return false;
  });

  return (
    <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full pb-28 md:pb-10">
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface mb-6 transition-colors font-semibold animate-fade-in-up"
      >
        <ArrowLeft size={20} />
        Back to Dashboard
      </button>

      <div className="flex flex-col gap-6 mb-10 animate-fade-in-up delay-100">
        <div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-gradient-earth mb-3 leading-tight tracking-tight">{event.title}</h1>
          <p className="text-on-surface-variant flex items-center gap-2 text-sm md:text-base font-medium">
            <Calendar size={18} style={{ color: 'var(--color-primary-base)' }} />
            {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : (event.createdAt?.toDate?.()?.toLocaleDateString() || 'TBD')} • {event.location}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <button
            onClick={() => router.push(`/dashboard/event/${eventId}/edit`)}
            className="premium-button-muted text-sm gap-2"
          >
            <Pencil size={16} />
            Edit Event
          </button>

          <button
            onClick={() => router.push(`/dashboard/event/${eventId}/scan`)}
            className="px-4 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-all text-sm hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
              color: 'var(--color-on-primary-base)',
              boxShadow: '0 3px 12px rgba(59, 107, 74, 0.25)',
            }}
          >
            <QrCode size={16} />
            Scan QR
          </button>

          <button
            onClick={() => setIsPromotionModalOpen(true)}
            className="premium-button-primary text-sm gap-2"
          >
            <Send size={16} />
            Promote Campaign
          </button>

          <button
            onClick={handleEmailAll}
            className="premium-button-muted text-sm gap-2"
          >
            <Mail size={16} />
            Email All
          </button>
          <div className="flex items-center gap-2">
            <input
              value={smsNumber}
              onChange={(e) => setSmsNumber(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="min-w-[190px] rounded-full border px-4 py-2.5 text-sm bg-surface-bright outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              onClick={handleSendSms}
              disabled={sendingSms}
              className="premium-button-muted text-sm gap-2 disabled:opacity-60"
            >
              <Send size={16} />
              {sendingSms ? 'Sending...' : 'Send SMS'}
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="premium-button-muted text-sm gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>

          <div className="flex-1 min-w-[20px] hidden md:block"></div>

          <button
            onClick={handleDeleteEvent}
            className="px-4 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-all text-sm mt-2 md:mt-0 hover:-translate-y-0.5"
            style={{
              background: 'rgba(184,50,48,0.06)',
              color: 'var(--color-error-base)',
              border: '1px solid rgba(184,50,48,0.15)',
            }}
          >
            <Trash2 size={16} />
            Delete Event
          </button>
        </div>
      </div>

      {intersectingAlerts.length > 0 && (
        <div
          className="mb-8 p-5 rounded-[20px] animate-fade-in-up delay-200"
          style={{
            background: 'rgba(212,168,82,0.06)',
            border: '1px solid rgba(212,168,82,0.2)',
            boxShadow: '0 4px 16px rgba(212,168,82,0.06)',
          }}
        >
          <div className="flex items-center gap-2 font-bold mb-3" style={{ color: 'var(--color-warm-amber)' }}>
            <AlertTriangle size={20} />
            <h3 className="text-lg">Sentinel Safety Awareness</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">
            The following alerts overlap with your event's location. Please review them and communicate any safety concerns or cancellations to your volunteers.
          </p>
          <div className="space-y-3">
            {intersectingAlerts.map(alert => (
              <div key={alert.id} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap w-fit ${alert.severity === 'Extreme' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    alert.severity === 'Severe' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}>
                  {alert.severity} • {alert.type}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-on-surface mb-0.5">{alert.title}</p>
                  <p className="text-xs text-on-surface-variant line-clamp-2">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleEmailAll}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5"
              style={{
                background: 'rgba(212,168,82,0.12)',
                color: 'var(--color-warm-amber)',
              }}
            >
              <Mail size={16} />
              Email Volunteers
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-fade-in-up delay-300">
        {/* Left Column: Stats */}
        <div className="md:col-span-1 space-y-6">

          {event.onChainCampaignId != null && (
            <div className="premium-glass p-6">
              <MilestoneTracker
                escrowCampaignId={event.onChainCampaignId}
                organizerId={event.organizerId}
                isAdmin={isAdmin}
              />
            </div>
          )}

          <div className="premium-glass p-6">
            <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2 text-on-surface">
              <Users size={20} style={{ color: 'var(--color-primary-base)' }} />
              Volunteer Progress
            </h3>
            <div className="text-3xl font-bold mb-2" style={{ color: 'var(--color-primary-base)' }}>
              {currentVols} <span className="text-sm font-normal text-on-surface-variant">/ {goalVols}</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-variant-base)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000 progress-glow"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--color-primary-base), var(--color-sage))' }}
              ></div>
            </div>
          </div>

          <div className="premium-glass p-6">
            <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2 text-on-surface">
              <CheckCircle size={20} style={{ color: 'var(--color-warm-amber)' }} />
              Checked In
            </h3>
            <div className="text-3xl font-bold mb-2" style={{ color: 'var(--color-warm-amber)' }}>
              {volunteers.filter(v => v.attended).length} <span className="text-sm font-normal text-on-surface-variant">/ {volunteers.length}</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-variant-base)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000 progress-glow-amber"
                style={{ width: `${Math.min(100, Math.round((volunteers.filter(v => v.attended).length / (volunteers.length || 1)) * 100))}%`, background: 'linear-gradient(90deg, var(--color-warm-amber), var(--color-earth-gold))' }}
              ></div>
            </div>
          </div>

          {/* Donations Stats Card */}
          <div className="premium-glass p-6">
            <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2 text-on-surface">
              <Banknote size={20} style={{ color: 'var(--color-terracotta)' }} />
              Donations
            </h3>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--color-terracotta)' }}>
              ₹{donations.filter(d => d.currency === 'INR').reduce((s, d) => s + d.amount, 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-on-surface-variant mb-3">
              from {donations.length} donation{donations.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-terracotta)' }}>
              <ShieldCheck size={14} />
              Immutable audit trail
            </div>
          </div>
        </div>

        {/* Right Column: Tabbed Roster */}
        <div className="md:col-span-3">
          <div className="premium-glass-strong overflow-hidden">
            {/* Tab Header */}
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-surface-variant-base)' }}>
                <button
                  onClick={() => setActiveTab('volunteers')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'volunteers'
                      ? 'bg-surface-bright text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  <Users size={15} />
                  Volunteers
                  <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'rgba(59,107,74,0.15)', color: 'var(--color-primary-base)' }}>
                    {volunteers.length}
                  </span>
                </button>
                {event.needs?.goods && event.needs.goods.length > 0 && (
                  <button
                    onClick={() => setActiveTab('goods')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'goods'
                        ? 'bg-surface-bright text-on-surface shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    <Package size={15} />
                    Goods Pledges
                    <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'rgba(59,107,74,0.15)', color: 'var(--color-primary-base)' }}>
                      {goodsPledges.length}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('donations')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'donations'
                      ? 'bg-surface-bright text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  <Banknote size={15} />
                  Donations
                  <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'rgba(194,113,91,0.15)', color: 'var(--color-terracotta)' }}>
                    {donations.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('expenditures')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'expenditures'
                      ? 'bg-surface-bright text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  <Receipt size={15} />
                  Expenditures
                  <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'rgba(128,128,128,0.15)', color: 'var(--color-on-surface)' }}>
                    {event.needs?.funds?.expenditureLogs?.length || 0}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pending'
                      ? 'bg-surface-bright text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  <ShieldCheck size={15} />
                  Verification
                  {pendingDonations.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      {pendingDonations.length}
                    </span>
                  )}
                </button>
              </div>
              <div>
                {activeTab === 'donations' && (
                  <button
                    onClick={handleExportDonationsCSV}
                    className="premium-button-muted text-sm gap-2"
                  >
                    <Download size={15} />
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            {/* Volunteers Tab */}
            {activeTab === 'volunteers' && (
              volunteers.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant">
                  <Users size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No volunteers have signed up yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)' }} className="text-sm text-on-surface-variant">
                        <th className="px-6 py-4 font-medium">Volunteer Name</th>
                        <th className="px-6 py-4 font-medium">Signed Up</th>
                        <th className="px-6 py-4 font-medium text-center">Attended</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {volunteers.map(vol => (
                        <tr key={vol.id} className="hover:bg-surface-container/30 transition-colors" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td className="px-6 py-4">
                            <div className="font-medium text-on-surface">{vol.userName}</div>
                            <div className="text-xs text-on-surface-variant font-mono">{vol.userId}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-on-surface-variant">
                            {vol.signedUpAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleAttendance(vol.id, vol.attended)}
                              className={`p-2 rounded-lg transition-all inline-block ${vol.attended ? 'hover:bg-primary/10' : 'hover:bg-surface-container/50'}`}
                              style={{ color: vol.attended ? 'var(--color-primary-base)' : 'var(--color-outline-base)' }}
                              title={vol.attended ? 'Mark as Not Attended' : 'Mark as Attended'}
                            >
                              {vol.attended ? <CheckCircle size={20} /> : <Circle size={20} />}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {vol.userEmail ? (
                              <a
                                href={`mailto:${vol.userEmail}`}
                                className="p-2 rounded-lg transition-all inline-block hover:bg-primary/10"
                                style={{ color: 'var(--color-primary-base)' }}
                                title="Contact Volunteer"
                              >
                                <Mail size={18} />
                              </a>
                            ) : (
                              <button
                                onClick={() => toast.info('No email provided for this volunteer.')}
                                className="p-2 rounded-lg transition-colors inline-block cursor-not-allowed"
                                style={{ color: 'var(--color-outline-base)' }}
                                title="No Email Available"
                              >
                                <Mail size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Goods Pledges Tab */}
            {activeTab === 'goods' && (
              goodsPledges.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant">
                  <Package size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No one has pledged goods yet.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
                  {goodsPledges.map(pledge => (
                    <div key={pledge.id} className="px-6 py-4 hover:bg-surface-container/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-on-surface">{pledge.userName}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {pledge.pledgedAt?.toDate?.()?.toLocaleDateString() || 'Date unknown'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end max-w-[60%]">
                          {pledge.items?.map((item: string) => (
                            <span
                              key={item}
                              className="px-2.5 py-1 text-xs font-semibold rounded-full"
                              style={{ background: 'rgba(59,107,74,0.1)', color: 'var(--color-primary-base)' }}
                            >
                              {item}
                            </span>
                          ))}
                          {pledge.otherItems && (
                            <span
                              className="px-2.5 py-1 text-xs font-semibold rounded-full"
                              style={{ background: 'rgba(212,168,82,0.12)', color: 'var(--color-warm-amber)' }}
                            >
                              + {pledge.otherItems}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Donations Tab — read-only, no edit/delete */}
            {activeTab === 'donations' && (
              donations.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant">
                  <Banknote size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-medium mb-1">No donations recorded yet.</p>
                  <p className="text-sm">Cash donations can be recorded from the event page (admin/organizer only).</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)' }} className="text-sm text-on-surface-variant">
                        <th className="px-6 py-4 font-medium">Donor</th>
                        <th className="px-6 py-4 font-medium">Amount</th>
                        <th className="px-6 py-4 font-medium">Method</th>
                        <th className="px-6 py-4 font-medium">Receipt ID</th>
                        <th className="px-6 py-4 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donations.map(don => {
                        const methodColors: Record<string, { bg: string; text: string }> = {
                          razorpay: { bg: 'rgba(59,107,74,0.12)', text: 'var(--color-primary-base)' },
                          crypto: { bg: 'rgba(29,161,242,0.12)', text: '#1DA1F2' },
                          cash: { bg: 'rgba(139,109,46,0.12)', text: 'var(--color-warm-amber)' },
                        };
                        const mc = methodColors[don.method] || methodColors.cash;
                        return (
                          <tr key={don.id} className="hover:bg-surface-container/30 transition-colors" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <td className="px-6 py-4">
                              <div className="font-medium text-on-surface">{don.userName}</div>
                              {don.recordedByName && (
                                <div className="text-xs text-on-surface-variant">Recorded by {don.recordedByName}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 font-bold" style={{ color: 'var(--color-terracotta)' }}>
                              {don.currency === 'INR' ? `₹${don.amount.toLocaleString('en-IN')}` : `${don.amount} ${don.currency}`}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold capitalize" style={{ background: mc.bg, color: mc.text }}>
                                {don.method}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs text-on-surface-variant">{don.receiptId}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-on-surface-variant">
                              {don.createdAt?.toDate?.()?.toLocaleDateString() || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-6 py-3 flex items-center gap-2 text-xs text-on-surface-variant" style={{ borderTop: '1px solid var(--glass-border)', background: 'rgba(59,107,74,0.03)' }}>
                    <ShieldCheck size={13} style={{ color: 'var(--color-primary-base)' }} />
                    These records are immutable and cannot be edited or deleted through the app.
                  </div>
                </div>
              )
            )}

            {/* Expenditures Tab */}
            {activeTab === 'expenditures' && (
              <div>
                <div className="p-6 bg-surface-container/20 border-b border-glass">
                  <h4 className="font-bold mb-3">Log New Expenditure</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Description (e.g., Food, Transport)"
                      className="flex-1 rounded-xl border border-glass px-4 py-2.5 text-sm bg-surface-bright outline-none focus:ring-2 focus:ring-primary"
                      value={expenditureDesc}
                      onChange={(e) => setExpenditureDesc(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      className="w-full sm:w-32 rounded-xl border border-glass px-4 py-2.5 text-sm bg-surface-bright outline-none focus:ring-2 focus:ring-primary"
                      value={expenditureAmount}
                      onChange={(e) => setExpenditureAmount(e.target.value)}
                    />
                    <button
                      onClick={async () => {
                        const amount = parseFloat(expenditureAmount);
                        if (!expenditureDesc.trim() || isNaN(amount) || amount <= 0) {
                          toast.error('Please enter a valid description and amount.');
                          return;
                        }
                        const newLog: ExpenditureLog = {
                          id: Math.random().toString(36).substring(2, 9),
                          description: expenditureDesc.trim(),
                          amount,
                          date: new Date().toISOString()
                        };
                        try {
                          await addExpenditureLog(event.id, newLog);
                          toast.success('Expenditure logged successfully');
                          setExpenditureDesc('');
                          setExpenditureAmount('');
                          const updatedLogs = [...(event.needs?.funds?.expenditureLogs || []), newLog];
                          setEvent({
                            ...event,
                            needs: {
                              ...event.needs,
                              funds: {
                                ...event.needs?.funds,
                                current: event.needs?.funds?.current || 0,
                                goal: event.needs?.funds?.goal || 0,
                                expended: updatedLogs.reduce((s, l) => s + l.amount, 0),
                                expenditureLogs: updatedLogs
                              }
                            }
                          });
                        } catch (e) {
                          toast.error('Failed to log expenditure');
                          console.error(e);
                        }
                      }}
                      className="px-6 py-2.5 rounded-xl font-bold transition-all"
                      style={{ background: 'var(--color-primary-base)', color: 'white' }}
                    >
                      Log
                    </button>
                  </div>
                </div>

                {!event.needs?.funds?.expenditureLogs || event.needs.funds.expenditureLogs.length === 0 ? (
                  <div className="p-12 text-center text-on-surface-variant">
                    <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No expenditures logged yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }} className="text-sm text-on-surface-variant">
                          <th className="px-6 py-4 font-medium">Description</th>
                          <th className="px-6 py-4 font-medium">Amount</th>
                          <th className="px-6 py-4 font-medium">Date</th>
                          <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {event.needs.funds.expenditureLogs.map(log => (
                          <tr key={log.id} className="hover:bg-surface-container/30 transition-colors" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <td className="px-6 py-4 font-medium">{log.description}</td>
                            <td className="px-6 py-4 font-bold text-on-surface">₹{log.amount.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm text-on-surface-variant">{new Date(log.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={async () => {
                                  if (!confirm('Delete this expenditure?')) return;
                                  try {
                                    await deleteExpenditureLog(event.id, log.id);
                                    toast.success('Deleted expenditure');
                                    const updatedLogs = event.needs!.funds!.expenditureLogs!.filter(l => l.id !== log.id);
                                    setEvent({
                                      ...event,
                                      needs: {
                                        ...event.needs,
                                        funds: {
                                          ...event.needs?.funds,
                                          current: event.needs?.funds?.current || 0,
                                          goal: event.needs?.funds?.goal || 0,
                                          expended: updatedLogs.reduce((s, l) => s + l.amount, 0),
                                          expenditureLogs: updatedLogs
                                        }
                                      }
                                    });
                                  } catch (e) {
                                    toast.error('Failed to delete');
                                    console.error(e);
                                  }
                                }}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Pending Verifications Tab */}
            {activeTab === 'pending' && (
              pendingDonations.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant">
                  <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No pending donations to verify.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)' }} className="text-sm text-on-surface-variant">
                        <th className="px-6 py-4 font-medium">Donor</th>
                        <th className="px-6 py-4 font-medium">Amount Claimed</th>
                        <th className="px-6 py-4 font-medium">Reference No.</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDonations.map(pending => (
                        <tr key={pending.id} className="hover:bg-surface-container/30 transition-colors" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td className="px-6 py-4">
                            <div className="font-medium text-on-surface">{pending.userName}</div>
                            <div className="text-xs text-on-surface-variant">{pending.userEmail}</div>
                          </td>
                          <td className="px-6 py-4 font-bold" style={{ color: 'var(--color-terracotta)' }}>
                            ₹{pending.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-semibold px-2 py-1 bg-surface-container rounded">{pending.reference}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprovePending(pending)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectPending(pending.id!)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <PromotionModal
        isOpen={isPromotionModalOpen}
        onClose={() => setIsPromotionModalOpen(false)}
        campaignId={eventId}
      />
    </main>
  );
}
