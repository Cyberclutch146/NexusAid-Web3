"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Sparkles, ExternalLink, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  action?: {
    type: 'navigate' | 'signed_up' | 'confirm_signup' | 'search_results';
    url?: string;
    eventId?: string;
    eventTitle?: string;
    results?: Array<{ id: string; title: string; category: string; location: string }>;
  };
};

// Simple markdown-ish renderer: bold, line breaks
function renderMessageContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    // Split by newlines
    const lines = part.split('\n');
    return lines.map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  });
}

export default function AIChatWidget() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<{ eventId: string; eventTitle: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    // Add a greeting if opening for the first time
    if (!isOpen && messages.length === 0) {
      const greeting = user && profile
        ? `Hi ${profile.displayName?.split(' ')[0] || 'there'}! 👋 I'm the NexusAid AI assistant. I can help you find events, sign you up to volunteer, and navigate the platform. What would you like to do?`
        : 'Hi there! 👋 I\'m the NexusAid AI assistant. How can I help you today?';
      setMessages([
        { role: 'assistant', content: greeting }
      ]);
    }
  };

  const handleNavigate = (url: string) => {
    router.push(url);
    setIsOpen(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: inputMessage.trim() };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          userId: user?.uid || '',
          userName: profile?.displayName || 'Volunteer',
          userEmail: user?.email || '',
          userSkills: profile?.skills || [],
          userEquipment: profile?.equipment || [],
          userAvailability: profile?.availability || 'anytime',
          userTravelRadius: profile?.travelRadius || 0,
          pendingSignup: pendingSignup || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get a response');
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply,
        action: data.action || undefined,
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Handle side effects from actions
      if (data.action?.type === 'confirm_signup') {
        setPendingSignup({
          eventId: data.action.eventId || '',
          eventTitle: data.action.eventTitle || '',
        });
      } else if (data.action?.type === 'signed_up') {
        setPendingSignup(null);
        toast.success(`🎉 You've been signed up for ${data.action.eventTitle}!`, {
          duration: 5000,
          action: {
            label: 'View Event',
            onClick: () => router.push(data.action.url),
          },
        });
      }
    } catch (error: any) {
      const isRateLimit = error.message?.includes('Rate limits hit');
      
      if (!isRateLimit) {
        console.error('Chat error:', error);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error.message || 'Sorry, I\'m having trouble connecting right now. Please try again later.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-8 z-[60] p-4 rounded-full text-on-primary transition-all duration-300 transform hover:scale-105 active:scale-95 group"
        aria-label="Toggle AI Chat"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-base) 0%, var(--color-moss) 100%)',
          boxShadow: '0 8px 28px rgba(59, 107, 74, 0.35), 0 2px 8px rgba(59, 107, 74, 0.15)',
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 md:bottom-24 md:right-8 z-[60] w-[calc(100vw-32px)] md:w-[420px] h-[540px] max-h-[calc(100vh-7rem-env(safe-area-inset-bottom))] md:max-h-[calc(100vh-120px)] rounded-2xl flex flex-col overflow-hidden"
            style={{
              background: 'var(--glass-bg-strong)',
              backdropFilter: 'blur(32px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow-lg)',
            }}
          >
            {/* Header */}
            <div
              className="p-4 text-on-primary flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-base) 0%, var(--color-moss) 100%)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">NexusAid AI Assistant</h3>
                  <div className="flex items-center gap-1 text-on-primary/70 text-[10px]">
                    <Sparkles size={10} />
                    <span>Can search, sign up & navigate</span>
                  </div>
                </div>
              </div>
              <button onClick={toggleChat} className="text-on-primary/80 hover:text-on-primary transition-colors p-1 rounded-full hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'var(--color-surface-container-lowest-base)' }}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm text-on-primary'
                        : 'rounded-tl-sm text-on-surface'
                    }`}
                    style={msg.role === 'user' ? {
                      background: 'linear-gradient(135deg, var(--color-primary-base) 0%, var(--color-moss) 100%)',
                      boxShadow: '0 2px 8px rgba(59,107,74,0.2)',
                    } : {
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {renderMessageContent(msg.content)}
                    </div>

                    {/* Action Buttons */}
                    {msg.action && (
                      <div className="mt-2.5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        {msg.action.type === 'navigate' && msg.action.url && (
                          <button
                            onClick={() => handleNavigate(msg.action!.url!)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                          >
                            <ExternalLink size={12} />
                            View Page
                          </button>
                        )}

                        {msg.action.type === 'signed_up' && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(59,107,74,0.15)', color: 'var(--color-primary-base)' }}>
                              <CheckCircle2 size={12} />
                              Signed up!
                            </span>
                            {msg.action.url && (
                              <button
                                onClick={() => handleNavigate(msg.action!.url!)}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                                style={{ background: 'rgba(59,107,74,0.1)', color: 'var(--color-primary-base)' }}
                              >
                                <ExternalLink size={12} />
                                View Event
                              </button>
                            )}
                          </div>
                        )}

                        {msg.action.type === 'search_results' && msg.action.results && msg.action.results.length > 0 && (
                          <div className="space-y-1.5 mt-1">
                            {msg.action.results.slice(0, 3).map((r) => (
                              <button
                                key={r.id}
                                onClick={() => handleNavigate(`/event/${r.id}`)}
                                className="w-full text-left text-xs px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-between group"
                              >
                                <div>
                                  <span className="font-medium">{r.title}</span>
                                  <span className="text-current/60 ml-1.5">• {r.category}</span>
                                </div>
                                <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        )}

                        {msg.action.type === 'confirm_signup' && (
                          <span className="inline-flex items-center gap-1 text-xs text-current/60 italic">
                            💬 Reply &quot;yes&quot; to confirm
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl rounded-tl-sm p-3.5 flex items-center gap-2 text-on-surface"
                    style={{
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 flex gap-2"
              style={{ borderTop: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={user ? "Ask me anything..." : "Log in for full features..."}
                className="flex-1 rounded-full px-4 py-2.5 text-sm focus:outline-none text-on-surface placeholder:text-on-surface-variant/50"
                style={{
                  background: 'var(--color-surface-container-lowest-base)',
                  border: '1px solid var(--glass-border)',
                }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 rounded-full text-on-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-base) 0%, var(--color-moss) 100%)',
                  boxShadow: inputMessage.trim() ? '0 2px 8px rgba(59,107,74,0.25)' : 'none',
                }}
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
