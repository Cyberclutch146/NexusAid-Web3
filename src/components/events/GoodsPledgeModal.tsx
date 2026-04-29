'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { pledgeGoods } from '@/services/eventService';
import { useAuth } from '@/context/AuthContext';

interface GoodsPledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  goodsList: string[];
  onPledgeComplete: () => void;
}

export function GoodsPledgeModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  goodsList,
  onPledgeComplete,
}: GoodsPledgeModalProps) {
  const { user, profile } = useAuth();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [otherItems, setOtherItems] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleItem = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const hasSelection = selectedItems.length > 0 || otherItems.trim().length > 0;

  const handleSubmit = async () => {
    if (!user || !profile) {
      toast.info('Please sign in to contribute.');
      return;
    }
    if (!hasSelection) {
      toast.warning('Please select at least one item or type something in "Other".');
      return;
    }

    setLoading(true);
    try {
      await pledgeGoods(
        eventId,
        user.uid,
        profile.displayName || user.displayName || 'Anonymous',
        selectedItems,
        otherItems.trim()
      );
      toast.success('Thank you for your pledge!');
      onPledgeComplete();
      onClose();
    } catch (err) {
      console.error('Pledge failed:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-surface-bright rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">
                    Contribute Goods
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    for {eventTitle}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-surface-variant/50 transition-colors text-on-surface-variant"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Requested Items */}
              <div>
                <p className="text-sm font-semibold text-on-surface mb-3">
                  Select items you can bring:
                </p>
                <div className="space-y-2">
                  {goodsList.map((item) => {
                    const isSelected = selectedItems.includes(item);
                    return (
                      <button
                        key={item}
                        onClick={() => toggleItem(item)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'border-primary bg-primary/8 text-primary shadow-sm'
                            : 'border-outline-variant/30 text-on-surface hover:border-outline-variant/60 hover:bg-surface-container'
                        }`}
                      >
                        {/* Checkbox */}
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-outline-variant'
                          }`}
                        >
                          {isSelected && (
                            <motion.svg
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </motion.svg>
                          )}
                        </span>
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-on-surface-variant/60 uppercase tracking-widest font-medium">
                <span className="flex-1 h-px bg-outline-variant/30" />
                or
                <span className="flex-1 h-px bg-outline-variant/30" />
              </div>

              {/* Other Items */}
              <div>
                <label
                  htmlFor="other-items"
                  className="text-sm font-semibold text-on-surface mb-2 block"
                >
                  Something else?
                </label>
                <textarea
                  id="other-items"
                  value={otherItems}
                  onChange={(e) => setOtherItems(e.target.value)}
                  placeholder="e.g. First Aid Kit, Sleeping Bags, Tarps..."
                  rows={3}
                  className="w-full rounded-xl border-2 border-outline-variant/30 bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none transition-colors"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container/30">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm text-on-surface-variant border border-outline-variant/30 hover:bg-surface-variant/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !hasSelection}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-primary text-on-primary shadow hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Confirm Contribution'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
