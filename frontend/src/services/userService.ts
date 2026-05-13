import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
