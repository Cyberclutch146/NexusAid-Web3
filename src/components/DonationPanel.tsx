'use client';

import { EventNeeds } from '@/types';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateDonation, addVolunteerSignup, getUserPledge } from '@/services/eventService';
import { toast } from 'sonner';
import { VolunteerModal } from './VolunteerModal';
import { GoodsPledgeModal } from './GoodsPledgeModal';

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
  onActionComplete?: () => void;
}

export function DonationPanel({ 
  eventId, 
  eventTitle, 
  eventDescription,
  eventLocation,
  eventTime,
  enrolledCount,
  needs, 
  onActionComplete 
}: DonationPanelProps) {
  const { user, profile } = useAuth();
  const [pledged, setPledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVolunteerModalOpen, setIsVolunteerModalOpen] = useState(false);
  const [isGoodsPledgeModalOpen, setIsGoodsPledgeModalOpen] = useState(false);
  const [goodsPledged, setGoodsPledged] = useState(false);
  const [donationAmount, setDonationAmount] = useState(50);
  const [activeTab, setActiveTab] = useState<'funds' | 'volunteers' | 'goods'>(
    needs.funds ? 'funds' : needs.volunteers ? 'volunteers' : 'goods'
  );

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
      // Create payment order on server
      const response = await fetch('/api/create-payment-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: donationAmount, 
          eventId,
          eventTitle 
        }),
      });
      
      const order = await response.json();
      
      if (!order.id) {
        throw new Error('Failed to create payment order');
      }
      
      // Open Razorpay checkout
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
          // Payment successful - update donation in database
          try {
            await updateDonation(eventId, donationAmount);
            setPledged(true);
            toast.success(`Thank you for your ₹${donationAmount} donation!`);
            onActionComplete?.();
          } catch (err) {
            console.error('Error updating donation:', err);
            toast.error('Payment successful but failed to update. Contact support.');
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
