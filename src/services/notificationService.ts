import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  writeBatch,
  getDocs,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { NotificationData, NotificationTone, NotificationType } from '@/types';

const USERS_COLLECTION = 'users';

// ─── Helpers ────────────────────────────────────────────

const getNotificationsRef = (userId: string) =>
  collection(db, `${USERS_COLLECTION}/${userId}/notifications`);

// ─── Create ─────────────────────────────────────────────

export const createNotification = async (
  userId: string,
  data: {
    title: string;
    body: string;
    path: string;
    type: NotificationType;
    tone: NotificationTone;
  }
): Promise<string> => {
  const notifRef = getNotificationsRef(userId);
  const docRef = await addDoc(notifRef, {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// ─── Mark as read ───────────────────────────────────────

export const markAsRead = async (
  userId: string,
  notificationId: string
): Promise<void> => {
  const notifDoc = doc(db, `${USERS_COLLECTION}/${userId}/notifications`, notificationId);
  await updateDoc(notifDoc, { read: true });
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  const notifRef = getNotificationsRef(userId);
  const q = query(notifRef, where('read', '==', false));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { read: true });
  });
  await batch.commit();
};

// ─── Delete ─────────────────────────────────────────────

export const deleteNotification = async (
  userId: string,
  notificationId: string
): Promise<void> => {
  const notifDoc = doc(db, `${USERS_COLLECTION}/${userId}/notifications`, notificationId);
  await deleteDoc(notifDoc);
};

// ─── Real-time listener ─────────────────────────────────

export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: NotificationData[]) => void,
  maxCount: number = 20
): Unsubscribe => {
  const notifRef = getNotificationsRef(userId);
  const q = query(notifRef, orderBy('createdAt', 'desc'), limit(maxCount));

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as NotificationData[];
    callback(notifications);
  });
};
