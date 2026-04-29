import { Timestamp } from 'firebase/firestore';

// ─── User ───────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  bio: string;
  location: string;
  phone: string;
  skills: string[];
  equipment: string[];        // e.g. ["truck", "generator", "first aid kit"]
  travelRadius: number;       // km willing to travel (0 = not set)
  availability: string;       // "weekdays" | "weekends" | "evenings" | "anytime"
  avatarUrl: string;
  role: string;
  volunteerHours: number;
  totalDonated: number;
  profileComplete: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type UserProfileCreate = Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Event ──────────────────────────────────────────────
export interface EventNeeds {
  volunteers?: { current: number; goal: number };
  funds?: { current: number; goal: number };
  goods?: string[];
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  organizer: string;
  organizerId: string;
  location: string;
  distance: string;
  category: string;
  urgency: 'high' | 'normal';
  imageUrl: string;
  image?: string; // Fallback for inconsistent field naming in Firestore
  needs: EventNeeds;
  progress: number;
  status: 'active' | 'completed';
  lat?: number;
  lng?: number;
  eventDate?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type CommunityEventCreate = Omit<CommunityEvent, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'status'>;

// ─── Donation ───────────────────────────────────────────
export interface Donation {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  createdAt: Timestamp | null;
}

// ─── Signup ─────────────────────────────────────────────
export interface Signup {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  ticketId?: string;
  signedUpAt: Timestamp | null;
}

// ─── Message ────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Timestamp | null;
}

// ─── Goods Pledge ───────────────────────────────────────
export interface GoodsPledge {
  id: string;
  userId: string;
  userName: string;
  items: string[];        // items selected from the organizer's list
  otherItems: string;     // custom items typed by the user
  pledgedAt: Timestamp | null;
}

// ─── Notification ───────────────────────────────────────
export type NotificationType = 'event_join' | 'goods_pledge' | 'event_update' | 'sentinel' | 'profile' | 'general';
export type NotificationTone = 'alert' | 'info' | 'success';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  path: string;           // destination when clicked
  type: NotificationType;
  tone: NotificationTone;
  read: boolean;
  createdAt: Timestamp | null;
}
