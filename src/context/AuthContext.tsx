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
  const [user, setUser] = useState<FirebaseUser | null>({
    uid: 'mock-uid-sagoto',
    email: 'sagoto@example.com',
    displayName: 'Sagoto',
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'mock-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
    metadata: {},
    providerId: 'firebase'
  } as FirebaseUser);

  const [profile, setProfile] = useState<UserProfile | null>({
    id: 'mock-uid-sagoto',
    email: 'sagoto@example.com',
    displayName: 'Sagoto',
    bio: 'Sandbox Test User',
    location: 'Global',
    phone: '123-456-7890',
    skills: ['Blockchain', 'Disaster Relief'],
    equipment: ['Truck', 'First Aid Kit'],
    travelRadius: 50,
    availability: 'anytime',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sagoto',
    role: 'volunteer',
    volunteerHours: 42,
    totalDonated: 500,
    profileComplete: true,
    createdAt: null,
    updatedAt: null,
    walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Hardhat Account #0
    badges: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auth bypass explicitly requested.
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    console.log('Mock login bypassed.');
  };

  const register = async (email: string, pass: string) => {
    console.log('Mock register bypassed.');
    return user!;
  };

  const loginWithGoogle = async () => {
    console.log('Mock google login bypassed.');
  };

  const logout = async () => {
    console.log('Mock logout bypassed.');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
