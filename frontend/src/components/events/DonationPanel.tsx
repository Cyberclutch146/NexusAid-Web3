'use client';

import { EventNeeds } from '@/types';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addVolunteerSignup, getUserPledge, ADMIN_EMAILS } from '@/services/eventService';
import { toast } from 'sonner';
import { VolunteerModal } from './VolunteerModal';
import { GoodsPledgeModal } from './GoodsPledgeModal';
import { DonateWithCrypto } from '../web3/DonateWithCrypto';
import { CampaignStats } from './CampaignStats';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface DonationPanelProps {
  eventId: string;
  eventTitle: string;
  eventDescription: string;
  eventLocation: string;
  eventTime: string;
  enrolledCount: number;
  needs: EventNeeds;
  onChainCampaignId?: number | null;
  onActionComplete?: () => void;
  organizerId?: string; // to allow event organizer to record cash
}

export function DonationPanel({
  eventId,
  eventTitle,
  eventDescription,
  eventLocation,
  eventTime,
  enrolledCount,
  needs,
  onChainCampaignId,
  onActionComplete,
  organizerId,
}: DonationPanelProps) {
  const { user, profile } = useAuth();
  const [pledged, setPledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
  const [isGoodsPledgeModalOpen, setIsGoodsPledgeModalOpen] = useState(false);
  const [goodsPledged, setGoodsPledged] = useState(false);
  const [donationAmount, setDonationAmount] = useState(50);

  // Cash donation state
  const [cashDonorName, setCashDonorName] = useState('');
  const [cashDonorEmail, setCashDonorEmail] = useState('');
  const [cashAmount, setCashAmount] = useState(500);
  const [cashLoading, setCashLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'funds' | 'volunteers' | 'goods'>(
    needs.funds ? 'funds' : needs.volunteers ? 'volunteers' : 'goods'
  );

  // Determine if current user can record cash (admin or organizer)
  const isAdmin = ADMIN_EMAILS.includes(user?.email || '');
  const isOrganizer = organizerId ? user?.uid === organizerId : false;
  const canRecordCash = isAdmin || isOrganizer;

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Check if the user already pledged goods for this event
  useEffect(() => {
    if (!user) return;
    getUserPledge(eventId, user.uid).then((pledge) => {
      if (pledge) setGoodsPledged(true);
    });
  }, [user, eventId]);

  const handleDonate = async () => {
    if (!user) { toast.info('Please sign in to donate'); return; }
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch('/api/create-payment-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: donationAmount, eventId, eventTitle }),
      });

      const order = await response.json();

      if (!order.id) throw new Error('Failed to create payment order');

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'Community Event',
        description: `Donation for ${eventTitle}`,
        prefill: {
          name: profile?.displayName || user.displayName || '',
          email: user.email || '',
        },
        handler: async (paymentResponse: any) => {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                method: 'razorpay',
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpaySignature: paymentResponse.razorpay_signature,
                amount: donationAmount,
                eventId,
                eventTitle,
                userId: user!.uid,
                userName: profile?.displayName || user!.displayName || 'Anonymous',
                userEmail: user!.email || '',
              }),
            });
            const result = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(result.error || 'Verification failed');
            setPledged(true);
            toast.success(`Thank you! Receipt: ${result.receiptId}`);
            onActionComplete?.();
          } catch (err) {
            console.error('Error recording donation:', err);
            toast.error('Payment received but receipt failed. Contact support with your payment ID.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info('Payment cancelled');
          },
        },
      });

      razorpay.open();
    } catch (err) {
      console.error(err);
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCashDonate = async () => {
    if (!user) { toast.info('Please sign in'); return; }
    if (!cashDonorName.trim()) { toast.error('Enter donor name'); return; }
    if (cashAmount < 1) { toast.error('Enter a valid amount'); return; }
    setCashLoading(true);

    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'cash',
          amount: cashAmount,
          eventId,
          eventTitle,
          userId: user.uid,
          userName: cashDonorName.trim(),
          userEmail: cashDonorEmail.trim() || (user.email || ''),
          recordedByEmail: user.email || '',
          recordedByUid: user.uid,
          recordedByName: profile?.displayName || user.displayName || 'Organizer',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to record donation');
      toast.success(`✅ Cash donation recorded! Receipt: ${result.receiptId}`);
      setCashDonorName('');
      setCashDonorEmail('');
      setCashAmount(500);
      onActionComplete?.();
    } catch (err: any) {
      console.error('Cash donation error:', err);
      toast.error(err.message || 'Failed to record cash donation');
    } finally {
      setCashLoading(false);
    }
  };

  const handleVolunteerClick = () => {
    if (!user || !profile) {
      toast.info('Please sign in to volunteer');
      return;
    }
    setIsVolunteerModalOpen(true);
  };

  const handleVolunteerRegister = async (name: string, email: string, ticketId: string) => {
    if (!user) return;
    await addVolunteerSignup(eventId, user.uid, name, email, ticketId);
    setPledged(true);
    onActionComplete?.();
  };

  return (
    <>
      <div className="bg-surface-bright rounded-2xl p-6 md:p-8 shadow-sm border border-outline-variant/30 sticky top-24">
        <h3 className="font-headline text-xl font-bold text-on-surface mb-6">How You Can Help</h3>

        <div className="flex gap-2 mb-6 border-b border-outline-variant/30 pb-2">
          {needs.funds && (
            <button
              onClick={() => setActiveTab('funds')}
              className={`pb-2 px-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'funds' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-surface'}`}
            >
              Donate Funds
            </button>
          )}
          {needs.volunteers && (
            <button
              onClick={() => setActiveTab('volunteers')}
              className={`pb-2 px-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'volunteers' ? 'border-tertiary text-tertiary' : 'border-transparent text-secondary hover:text-on-surface'}`}
            >
              Volunteer Time
            </button>
          )}
          {needs.goods && (
            <button
              onClick={() => setActiveTab('goods')}
              className={`pb-2 px-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'goods' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-surface'}`}
            >
              Contribute Goods
            </button>
          )}
        </div>

        {activeTab === 'funds' && needs.funds && (
          <div className="animate-fade-in text-center">
            <p className="text-on-surface-variant text-sm flex mb-6 text-left">
              Your donation goes directly to the organizer to fulfill the goals of this event.
            </p>

            {/* Donation Amount Slider */}
            <div className="mb-6">
              <label className="text-sm font-medium text-on-surface block mb-2">
                Donation Amount
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(Number(e.target.value))}
                  className="flex-1 h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-lg font-bold text-primary min-w-[70px] text-right">
                  ₹{donationAmount}
                </span>
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant mt-1">
                <span>₹50</span>
                <span>₹2000</span>
              </div>
            </div>

            {!pledged ? (
              <button
                onClick={handleDonate}
                disabled={loading || !user}
                className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold shadow hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Processing...' : user ? `Donate ₹${donationAmount} Now` : 'Sign in to Donate'}
              </button>
            ) : (
              <div className="bg-primary-fixed text-on-primary-fixed p-4 rounded-xl flex items-center justify-center gap-2 font-semibold">
                <span className="material-symbols-outlined">check_circle</span>
                Thank you for your donation!
              </div>
            )}

            {/* ─── Web3 Crypto Donation ─── */}
            <DonateWithCrypto
              campaignId={onChainCampaignId ?? 0}
              eventId={eventId}
              eventTitle={eventTitle}
              onSuccess={onActionComplete}
            />

            {/* ─── On-chain Transparency Panel ─── */}
            {onChainCampaignId != null && (
              <CampaignStats campaignId={onChainCampaignId} />
            )}

            {/* ─── Admin / Organizer: Record Cash Donation ─── */}
            {canRecordCash && (
              <div
                className="mt-6 rounded-2xl p-5 text-left"
                style={{
                  background: 'rgba(139,109,46,0.06)',
                  border: '1px dashed rgba(139,109,46,0.3)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="material-symbols-outlined text-[18px] p-1 rounded-lg"
                    style={{ background: 'rgba(139,109,46,0.12)', color: 'var(--color-warm-amber)' }}
                  >
                    payments
                  </span>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-warm-amber)' }}>
                    Record Cash Donation
                  </p>
                  <span
                    className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: 'rgba(139,109,46,0.15)', color: 'var(--color-warm-amber)' }}
                  >
                    {isAdmin ? 'Admin' : 'Organizer'}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mb-4">
                  Record an offline / cash donation received at the event. This will be tracked in the donation ledger and a receipt will be emailed to the donor.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Donor Name *</label>
                    <input
                      type="text"
                      value={cashDonorName}
                      onChange={(e) => setCashDonorName(e.target.value)}
                      placeholder="Full name of donor"
                      className="w-full rounded-xl border border-outline-variant/40 px-3 py-2 text-sm bg-surface outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Donor Email (optional)</label>
                    <input
                      type="email"
                      value={cashDonorEmail}
                      onChange={(e) => setCashDonorEmail(e.target.value)}
                      placeholder="For receipt delivery"
                      className="w-full rounded-xl border border-outline-variant/40 px-3 py-2 text-sm bg-surface outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant block mb-1">Amount (₹) *</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="50"
                        max="5000"
                        step="50"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(Number(e.target.value))}
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: 'var(--color-warm-amber)' }}
                      />
                      <span className="font-bold min-w-[60px] text-right text-sm" style={{ color: 'var(--color-warm-amber)' }}>
                        ₹{cashAmount}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-on-surface-variant mt-1">
                      <span>₹50</span>
                      <span>₹5000</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCashDonate}
                    disabled={cashLoading || !cashDonorName.trim()}
                    className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139,109,46,0.85), rgba(212,168,82,0.85))',
                      color: '#1a1206',
                    }}
                  >
                    {cashLoading ? 'Recording...' : `Record ₹${cashAmount} Cash Donation`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'volunteers' && needs.volunteers && (
          <div className="animate-fade-in">
            <p className="text-on-surface-variant text-sm mb-6">
              Sign up for a shift. The organizer will contact you with details and waivers if necessary.
            </p>
            {!pledged ? (
              <button
                onClick={handleVolunteerClick}
                disabled={loading || !user}
                className="w-full bg-tertiary text-on-tertiary py-3.5 rounded-xl font-bold shadow hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                {user ? 'Sign Up to Volunteer' : 'Sign in to Volunteer'}
              </button>
            ) : (
              <div className="bg-tertiary-fixed text-on-tertiary-fixed p-4 rounded-xl flex items-center justify-center gap-2 font-semibold">
                <span className="material-symbols-outlined">how_to_reg</span>
                You are signed up!
              </div>
            )}
          </div>
        )}

        {activeTab === 'goods' && needs.goods && (
          <div className="animate-fade-in">
            <p className="text-on-surface-variant text-sm mb-4">
              We are looking for these specific items in new or gently used condition:
            </p>
            <ul className="list-disc pl-5 mb-6 text-sm text-on-surface font-medium space-y-1">
              {needs.goods.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
            {!goodsPledged ? (
              <button
                onClick={() => {
                  if (!user) { toast.info('Please sign in to contribute'); return; }
                  setIsGoodsPledgeModalOpen(true);
                }}
                className="w-full border-2 border-primary text-primary py-3 rounded-xl font-bold hover:bg-primary/5 transition-colors active:scale-[0.98]"
              >
                I Can Bring Something
              </button>
            ) : (
              <div className="bg-primary-fixed/20 text-primary p-4 rounded-xl flex items-center justify-center gap-2 font-semibold border border-primary/30">
                <span className="material-symbols-outlined">check_circle</span>
                Thank you for pledging!
              </div>
            )}
          </div>
        )}
      </div>

      <VolunteerModal
        isOpen={isVolunteerModalOpen}
        onClose={() => setIsVolunteerModalOpen(false)}
        onRegister={handleVolunteerRegister}
        eventTitle={eventTitle}
        eventDescription={eventDescription}
        eventLocation={eventLocation}
        eventTime={eventTime}
        enrolledCount={enrolledCount}
      />

      <GoodsPledgeModal
        isOpen={isGoodsPledgeModalOpen}
        onClose={() => setIsGoodsPledgeModalOpen(false)}
        eventId={eventId}
        eventTitle={eventTitle}
        goodsList={needs.goods || []}
        onPledgeComplete={() => {
          setGoodsPledged(true);
          onActionComplete?.();
        }}
      />
    </>
  );
}
