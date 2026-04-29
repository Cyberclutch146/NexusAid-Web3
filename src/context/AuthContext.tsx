'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { subscribeToUserProfile } from '@/services/userService';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<FirebaseUser>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        unsubscribeProfile = subscribeToUserProfile(user.uid, async (userProfile) => {
          if (!userProfile) {
            // Hotfix: Auto-create a missing profile if the user account exists
            // This prevents the app from infinitely spinning on null profiles.
            const { createUserProfile } = await import('@/services/userService');
            await createUserProfile(user.uid, {
              email: user.email || '',
              displayName: user.displayName || 'Volunteer',
              bio: '',
              location: '',
              phone: '',
              skills: [],
              equipment: [],
              travelRadius: 0,
              availability: 'anytime',
              avatarUrl: '',
              role: 'volunteer',
              volunteerHours: 0,
              totalDonated: 0,
              profileComplete: false
            });
            // The missing snapshot will fire again upon creation.
          } else {
            setProfile(userProfile);
            setLoading(false);
          }
        });
      } else {
        setProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
