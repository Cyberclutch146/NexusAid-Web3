'use client';

import { useState, useEffect } from 'react';
import { getEventVolunteers, EventVolunteer } from '@/services/eventService';
import { motion } from 'framer-motion';

export function VolunteerLeaderboard({ eventId }: { eventId: string }) {
  const [volunteers, setVolunteers] = useState<EventVolunteer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const data = await getEventVolunteers(eventId);
        setVolunteers(data);
      } catch (err) {
        console.error('Failed to fetch volunteers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVolunteers();
  }, [eventId]);

  if (loading) {
    return (
      <div className="bg-surface-bright rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-surface-bright rounded-2xl p-6 shadow-sm border border-outline-variant/30">
      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined text-primary text-[24px]">group</span>
        <h3 className="font-headline text-xl font-bold text-on-surface">Community Heroes</h3>
      </div>
      
      {volunteers.length === 0 ? (
        <div className="text-center py-8 text-on-surface-variant">
          <p>Be the first to step up and make an impact!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {volunteers.slice(0, 5).map((volunteer, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={volunteer.id} 
              className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-on-surface text-sm">{volunteer.userName || 'Anonymous'}</p>
                  <p className="text-xs text-on-surface-variant">
                    Joined {volunteer.signedUpAt?.seconds ? new Date(volunteer.signedUpAt.seconds * 1000).toLocaleDateString() : 'recently'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
              </div>
            </motion.div>
          ))}
          {volunteers.length > 5 && (
            <div className="text-center mt-4">
              <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                + {volunteers.length - 5} more heroes joined
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
