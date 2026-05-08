import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { UserProfile, UserProfileCreate } from '@/types';

const USERS_COLLECTION = 'users';

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const userSnapshot = await getDoc(userDocRef);

  if (userSnapshot.exists()) {
    return { id: userSnapshot.id, ...userSnapshot.data() } as UserProfile;
  }
  
  return null;
};

export const subscribeToUserProfile = (userId: string, callback: (profile: UserProfile | null) => void) => {
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  return onSnapshot(userDocRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as UserProfile);
    } else {
      callback(null);
    }
  });
};

export const createUserProfile = async (userId: string, data: UserProfileCreate): Promise<void> => {
  const response = await fetch('/api/user/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', userId, data }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create profile');
  }
};

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>): Promise<void> => {
  const response = await fetch('/api/user/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', userId, data }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update profile');
  }
};

// ─── Global Leaderboard ──────────────────────────────────
export interface LeaderboardEntry {
  id: string;
  displayName: string;
  avatarUrl: string;
  volunteerHours: number;
  totalDonated: number;
  skills: string[];
  location: string;
  impactScore: number; // Computed composite score
}

export const getGlobalLeaderboard = async (topN: number = 50): Promise<LeaderboardEntry[]> => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    const entries: LeaderboardEntry[] = snapshot.docs
      .map(doc => {
        const data = doc.data() as UserProfile;
        // Composite impact score: hours * 10 + donations * 1 + skills * 5
        const impactScore = (data.volunteerHours || 0) * 10 + (data.totalDonated || 0) + (data.skills?.length || 0) * 5;
        return {
          id: doc.id,
          displayName: data.displayName || 'Anonymous Hero',
          avatarUrl: data.avatarUrl || '',
          volunteerHours: data.volunteerHours || 0,
          totalDonated: data.totalDonated || 0,
          skills: data.skills || [],
          location: data.location || '',
          impactScore,
        };
      })
      .filter(entry => entry.impactScore > 0) // Only include active users
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, topN);

    return entries;
  } catch (error) {
    console.error('Failed to fetch global leaderboard:', error);
    return [];
  }
};

export const getLeaderboardStats = async (): Promise<{
  totalVolunteers: number;
  totalHours: number;
  totalDonated: number;
}> => {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    let totalHours = 0;
    let totalDonated = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totalHours += data.volunteerHours || 0;
      totalDonated += data.totalDonated || 0;
    });

    return {
      totalVolunteers: snapshot.docs.length,
      totalHours,
      totalDonated,
    };
  } catch (error) {
    console.error('Failed to fetch leaderboard stats:', error);
    return { totalVolunteers: 0, totalHours: 0, totalDonated: 0 };
  }
};

