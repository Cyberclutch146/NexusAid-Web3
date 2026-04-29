export interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
  volunteerHours: number;
  totalDonated: number;
}

export interface Needs {
  volunteers?: { current: number; goal: number };
  funds?: { current: number; goal: number };
  goods?: string[];
}

export interface Event {
  id: string;
  title: string;
  organizer: string;
  location: string;
  distance: string;
  description: string;
  urgency: 'high' | 'normal';
  image: string;
  needs: Needs;
  progress: number;
  category: string;
}

export interface Message {
  id: string;
  eventId: string;
  userId: string;
  text: string;
  timestamp: string;
}

export const currentUser: User = {
  id: 'u1',
  name: 'Sarah Jenkins',
  role: 'Community Lead',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=2574&auto=format&fit=crop',
  volunteerHours: 42,
  totalDonated: 1500,
};

export const mockEvents: Event[] = [
  {
    id: 'e1',
    title: 'Downtown Winter Shelter Restock',
    organizer: 'Rose City Relief',
    location: 'Portland Metro Area',
    distance: '1.2 mi away',
    description: 'Preparing for the incoming freeze. We urgently need thermal blankets, warm socks, and volunteers to help sort and distribute items this weekend before temperatures drop below freezing.',
    urgency: 'high',
    image: 'https://images.unsplash.com/photo-1593113565694-c6ccdd8dcb15?q=80&w=2669&auto=format&fit=crop',
    needs: {
      volunteers: { current: 15, goal: 30 },
      goods: ['Thermal blankets', 'Warm socks', 'Jackets'],
    },
    progress: 65,
    category: 'Urgent Needs',
  },
  {
    id: 'e2',
    title: 'Weekly Pantry Distribution',
    organizer: 'PDX Food Bank',
    location: 'Portland Metro Area',
    distance: '3.5 mi',
    description: 'Assisting with traffic flow, loading boxes into cars, and registering new families for our Tuesday distribution.',
    urgency: 'normal',
    image: 'https://images.unsplash.com/photo-1594708767771-a7502209ff51?q=80&w=2670&auto=format&fit=crop',
    needs: {
      volunteers: { current: 5, goal: 10 },
      funds: { current: 200, goal: 500 },
    },
    progress: 40,
    category: 'Food Drive',
  },
  {
    id: 'e3',
    title: 'Park Cleanup & Planting',
    organizer: 'Neighborhood Org',
    location: 'Seattle Area',
    distance: '0.8 mi',
    description: 'Spring is here! Help us clear winter debris and plant native shrubs at Mt. Tabor. Tools provided.',
    urgency: 'normal',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2574&auto=format&fit=crop',
    needs: {
      volunteers: { current: 25, goal: 50 },
    },
    progress: 50,
    category: 'Volunteers',
  },
  {
    id: 'e4',
    title: 'School Supply Drive 2024',
    organizer: 'Education First',
    location: 'Eugene/Springfield',
    distance: 'Online',
    description: 'Raising funds to purchase bulk backpacks and supplies for 500 local students before the fall semester.',
    urgency: 'normal',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2673&auto=format&fit=crop',
    needs: {
      funds: { current: 3200, goal: 5000 },
    },
    progress: 64,
    category: 'Urgent Needs',
  },
  {
    id: 'e5',
    title: 'Community Mental Health Workshop',
    organizer: 'NexusAid',
    location: 'Community Center',
    distance: '2.1 mi away',
    description: 'A free workshop on managing stress and supporting neighbors during difficult times. No image provided, should show fallback logo.',
    urgency: 'normal',
    image: '',
    needs: {
      volunteers: { current: 2, goal: 10 },
    },
    progress: 20,
    category: 'Community',
  }
];

export const mockMessages: Message[] = [
  { id: 'm1', eventId: 'e1', userId: 'u2', text: 'Does anyone have a truck? We need to move palettes.', timestamp: '10:30 AM' },
  { id: 'm2', eventId: 'e1', userId: 'u3', text: 'I can bring my F150. Be there in 20.', timestamp: '10:35 AM' },
  { id: 'm3', eventId: 'e1', userId: 'u1', text: 'Thank you! See you at the loading dock.', timestamp: '10:38 AM' },
];
