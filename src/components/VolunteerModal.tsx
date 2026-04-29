'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface VolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (name: string, email: string, ticketId: string) => Promise<void>;
  eventTitle: string;
  eventDescription: string;
  eventLocation: string;
  eventTime: string;
  enrolledCount: number;
}

export function VolunteerModal({ 
  isOpen, 
  onClose, 
  onRegister, 
  eventTitle,
  eventDescription,
  eventLocation,
  eventTime,
  enrolledCount
}: VolunteerModalProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    otp: ''
  });
  const [ticketId, setTicketId] = useState('');

  // Pre-fill user data
  useEffect(() => {
    if (profile && isOpen) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || profile.displayName || '',
        email: prev.email || profile.email || ''
      }));
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.otp) {
      toast.error('Please fill all fields');
      return;
    }

    if (!otpSent) {
      toast.error('Please verify your email first by clicking the Verify button.');
      return;
    }

    setLoading(true);
    try {
      // Verify OTP on the server
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: formData.otp,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        toast.error(verifyData.error || 'Invalid verification code.');
        setLoading(false);
        return;
      }

      const newTicketId = Math.random().toString(36).substring(2, 12).toUpperCase();
      await onRegister(formData.name, formData.email, newTicketId);
      
      // Send confirmation email with QR code
      try {
        await fetch('/api/auth/confirm-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            eventTitle,
            ticketId: newTicketId
          }),
        });
      } catch (emailErr) {
        console.error("Failed to send confirmation email:", emailErr);
        // We don't block the success UI if just the email fails
      }

      setTicketId(newTicketId);
      setStep('success');
      toast.success('Successfully registered! Digital ticket sent to your email.');
    } catch (err) {
      console.error(err);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      toast.error('Please enter your email first');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingOtp(true);
    try {
      // OTP is now generated entirely on the server
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          eventTitle
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.details || "Failed to send verification email");
      }

      setOtpSent(true);
      toast.success("Verification Code Sent!", {
        description: `Check your email (${formData.email}) for the code.`,
      });
    } catch (err) {
      console.error("OTP Error:", err);
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const copyTicketId = () => {
    navigator.clipboard.writeText(ticketId);
    toast.success('Ticket ID copied to clipboard');
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketId)}`;

  const calendarUrl = (() => {
    const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    const text = encodeURIComponent(`Volunteer: ${eventTitle}`);
    const details = encodeURIComponent(eventDescription);
    const location = encodeURIComponent(eventLocation);
    // Use a real date if possible, fallback to tomorrow
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const startDate = date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dates = `${startDate}/${endDate}`;
    return `${baseUrl}&text=${text}&details=${details}&location=${location}&dates=${dates}`;
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative bg-surface-bright w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-primary via-tertiary to-secondary" />
        
        <div className="p-8 md:p-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
              {step === 'form' ? 'Be a Hero' : 'You\'re All Set!'}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surface-variant rounded-full transition-all hover:rotate-90 active:scale-90"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          {step === 'form' ? (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-secondary uppercase tracking-widest ml-1" htmlFor="name">
                  Full Name
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">person</span>
                  <input
                    id="name"
                    type="text"
                    required
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-secondary uppercase tracking-widest ml-1" htmlFor="email">
                  Email Address
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">mail</span>
                    <input
                      id="email"
                      type="email"
                      required
                      className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || !formData.email}
                    className="px-5 bg-secondary text-on-secondary rounded-2xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap shadow-sm shadow-secondary/20"
                  >
                    {sendingOtp ? '...' : 'Verify'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-secondary uppercase tracking-widest ml-1" htmlFor="otp">
                  Verification Code
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">lock</span>
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono tracking-[0.5em] text-center text-lg"
                    placeholder="000000"
                    value={formData.otp}
                    onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                {otpSent && (
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-1 ml-1 animate-pulse">
                    Code sent! Check your email inbox.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !otpSent}
                className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale mt-4 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">volunteer_activism</span>
                    Confirm Registration
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8 relative inline-block">
                <div className="bg-primary/10 p-5 rounded-full relative z-10">
                  <span className="material-symbols-outlined text-5xl text-primary animate-bounce">verified_user</span>
                </div>
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-125 opacity-20" />
              </div>
              
              <h3 className="text-2xl font-bold text-on-surface mb-3 tracking-tight">Registration Confirmed</h3>
              <p className="text-on-surface-variant text-base mb-8 leading-relaxed">
                Thank you for joining <br />
                <span className="font-bold text-primary text-lg">{eventTitle}</span>
              </p>

              <div className="bg-surface-container-low p-6 rounded-[24px] border border-outline-variant/30 mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-6xl">qr_code_2</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                  <div className="text-left">
                    <span className="block text-[10px] uppercase tracking-widest font-black text-secondary mb-1">Queue Pos</span>
                    <span className="text-xl font-bold text-on-surface">#{enrolledCount + 1}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase tracking-widest font-black text-secondary mb-1">Time</span>
                    <span className="text-sm font-bold text-on-surface leading-tight block">{eventTime}</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl inline-block shadow-lg mb-4 border border-outline-variant/10 hover:scale-105 transition-transform cursor-pointer">
                  <img src={qrUrl} alt="Ticket QR Code" className="w-36 h-36" />
                </div>

                <div className="flex items-center justify-center gap-2">
                  <code className="bg-surface-container-high px-4 py-2 rounded-xl text-primary font-mono font-bold tracking-widest text-sm">
                    {ticketId}
                  </code>
                  <button 
                    onClick={copyTicketId}
                    className="p-2 hover:bg-surface-container-high rounded-lg text-secondary transition-colors"
                    title="Copy ID"
                  >
                    <span className="material-symbols-outlined text-lg">content_copy</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <a 
                  href={qrUrl} 
                  download={`volunteer-ticket-${ticketId}.png`}
                  className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-container hover:text-on-primary-container transition-all"
                >
                  <span className="material-symbols-outlined">download</span>
                  Save Digital Ticket
                </a>

                <a 
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-surface-container-high text-on-surface-variant py-4 rounded-2xl font-bold hover:bg-surface-variant hover:text-on-surface transition-all"
                >
                  <span className="material-symbols-outlined">calendar_add_on</span>
                  Sync to Calendar
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
