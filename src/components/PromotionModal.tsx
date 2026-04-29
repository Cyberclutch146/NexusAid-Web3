'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { X, Send, FileUp, Loader2 } from 'lucide-react';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId?: string;
}

export default function PromotionModal({ isOpen, onClose, campaignId }: PromotionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log('PromotionModal Render - File:', file?.name);

  if (!isOpen) return null;

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !message) {
      toast.error('Please provide both a CSV file and a message.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('message', message);
      if (campaignId) {
        formData.append('campaignId', campaignId);
      }

      const response = await fetch('/api/promote', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Promotion sent! Success: ${data.success}, Failed: ${data.failed}`);
        onClose();
        setFile(null);
        setMessage('');
      } else {
        toast.error(data.error || 'Failed to send promotion.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while sending promotions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-high w-full max-w-md rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-outline-variant/30 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
          <h3 className="text-xl font-bold text-on-surface">Promote Event</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handlePromote} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">Upload Email List (CSV)</label>
            <div className="relative">
              <div 
                onClick={handleBoxClick}
                className={`flex flex-col items-center justify-center w-full h-40 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${file ? 'shadow-inner' : 'border-dashed border-outline-variant/50 hover:bg-surface-variant/20'}`}
                style={file ? { borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)' } : {}}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {file ? (
                    <>
                      <div className="bg-green-500/20 p-3 rounded-full mb-3 animate-bounce" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}>
                        <Send size={28} style={{ color: '#22c55e' }} />
                      </div>
                      <p className="text-sm font-bold mb-1" style={{ color: '#22c55e' }}>
                        File Ready!
                      </p>
                      <p className="text-xs text-on-surface-variant max-w-[200px] truncate">
                        {file.name}
                      </p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="mt-3 text-[10px] uppercase tracking-wider font-bold text-error hover:underline"
                      >
                        Remove File
                      </button>
                    </>
                  ) : (
                    <>
                      <FileUp size={32} className="text-on-surface-variant mb-2" />
                      <p className="text-sm font-semibold text-on-surface">
                        Click to upload email list
                      </p>
                      <p className="text-xs text-on-surface-variant/60 mt-1">
                        CSV or Excel file with 'email' column
                      </p>
                    </>
                  )}
                </div>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv, .xlsx"
                className="hidden" 
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] || null;
                  if (selectedFile) {
                    const fileName = selectedFile.name.toLowerCase();
                    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
                      toast.error('Please select a valid CSV or Excel file.');
                      e.target.value = '';
                      return;
                    }
                    console.log('File selected:', selectedFile.name);
                    setFile(selectedFile);
                    toast.success(`File selected: ${selectedFile.name}`);
                  }
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface">Invitation Message</label>
            <textarea
              required
              rows={4}
              className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface resize-none"
              placeholder="Enter the message for your community..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file || !message}
              className="flex-2 flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              {loading ? 'Sending...' : 'Send Invitations'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
