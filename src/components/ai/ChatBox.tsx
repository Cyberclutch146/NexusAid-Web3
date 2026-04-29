"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeToMessages, sendMessage } from '@/services/chatService';
import { ChatMessage } from '@/types';

export function ChatBox({ eventId }: { eventId?: string }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eventId) return;
    
    // Subscribe to real-time messages
    const unsubscribe = subscribeToMessages(eventId, (fetchedMessages) => {
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [eventId]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !eventId || sending) return;

    setSending(true);
    const displayName = profile?.displayName || user?.displayName || 'Anonymous';
    
    try {
      await sendMessage(eventId, user.uid, displayName, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!eventId) return null;

  return (
    <div className="flex flex-col h-[500px] rounded-2xl border border-outline-variant/30 bg-surface-bright shadow-[0_4px_20px_rgba(46,50,48,0.04)] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-surface-bright to-surface-container-lowest p-4 border-b border-outline-variant/30 flex items-center justify-between">
        <h3 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-container/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[18px]">forum</span>
          </div>
          Community Chat
        </h3>
        <span className="text-xs font-semibold text-secondary bg-secondary-container/50 text-on-secondary-container px-3 py-1.5 rounded-full border border-secondary-container">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-surface-container-low">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-on-surface-variant/60">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">chat_bubble_outline</span>
            </div>
            <p className="text-sm font-medium">No messages yet.</p>
            <p className="text-xs mt-1">Be the first to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = user?.uid === msg.userId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-bold mr-2.5 flex-shrink-0 mt-0.5 shadow-sm">
                    {msg.userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[11px] font-semibold text-on-surface-variant ml-1 mb-1">{msg.userName}</span>}
                  <div 
                    className={`px-4 py-2.5 text-sm shadow-sm ${
                      isMe 
                        ? 'bg-primary text-on-primary rounded-2xl rounded-tr-sm' 
                        : 'bg-surface-container-highest border border-outline-variant/30 text-on-surface rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface border-t border-outline-variant/30 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        {!user ? (
          <div className="text-center p-3.5 bg-surface-container-lowest border border-outline-variant/50 rounded-xl text-sm text-on-surface-variant">
            Please <a href="/login" className="text-primary font-bold hover:underline">log in</a> to participate in the community discussion.
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message here..."
              disabled={sending}
              className="flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-on-surface disabled:opacity-50 shadow-sm transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-container hover:text-on-primary-container transition-all shadow-md hover:shadow-lg flex-shrink-0 active:scale-95"
              aria-label="Send message"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-[20px] ml-1">send</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}