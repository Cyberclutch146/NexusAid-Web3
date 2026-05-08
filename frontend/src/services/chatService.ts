import { db } from '@/lib/firebase';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { ChatMessage } from '@/types';

const EVENTS_COLLECTION = 'events';

export const subscribeToMessages = (eventId: string, callback: (messages: ChatMessage[]) => void) => {
  const messagesRef = collection(db, `${EVENTS_COLLECTION}/${eventId}/messages`);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];
    callback(messages);
  });
};

export const sendMessage = async (eventId: string, userId: string, userName: string, text: string): Promise<void> => {
  const messagesRef = collection(db, `${EVENTS_COLLECTION}/${eventId}/messages`);

  await addDoc(messagesRef, {
    eventId,
    userId,
    userName,
    text,
    createdAt: serverTimestamp(),
  });
};

