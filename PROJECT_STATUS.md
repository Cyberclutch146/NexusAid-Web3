# NexusAid - Project Status & Roadmap

This document outlines the current state of the NexusAid project, tracking completed milestones and remaining high-priority tasks.

## ✅ Completed Milestones

### 🛡️ Security & Infrastructure
- [x] **Firebase Admin SDK Integration**: Established a secure server-side bridge (`src/lib/firebase-admin.ts`).
- [x] **Secure Event Creation**: Migrated event creation to `/api/events/create` for server-side validation and geocoding.
- [x] **Atomic Volunteer Signups**: Implemented `/api/events/join` with transactions to ensure data consistency across events and user profiles.

### 🧠 AI & Intelligence
- [x] **RAG Pattern Implementation**: The AI assistant now uses semantic retrieval (`searchService.ts`) to provide context-aware event recommendations.
- [x] **AI Function Calling**: Integrated Gemini functions for navigation and event signups directly from the chat interface.

### 🗺️ Dashboard & UI
- [x] **Sentinel Dashboard Aesthetics**: Refined dark mode and glassmorphism styling for the live safety monitoring map.
- [x] **Premium Components**: Implemented high-fidelity UI components for event cards, search, and AI chat.

---

## 🛠️ Remaining Tasks (TODO)

### 1. 🔐 Security Hardening (Highest Priority)
- [ ] **Migrate Remaining Writes**: Move these operations from client-side direct writes to API routes:
    - [ ] **Chat Messages**: Move `chatService.ts` writes to a new `/api/chat/send` route.
    - [ ] **User Profiles**: Move `userService.ts` (create/update) to `/api/user/profile`.
    - [ ] **Event Updates**: Move `updateEvent` and `deleteEvent` to `/api/events/[id]` routes.
    - [ ] **Donations**: Move `updateDonation` to a secure server-side transaction.
- [ ] **Tighten Firestore Rules**: Once all writes are migrated, update `firestore.rules` to set `allow write: if false;` for public collections, enforcing all changes through the Admin SDK.
- [ ] **Auth Token Verification**: Implement `verifyIdToken` in all API routes to ensure users can only modify their own data.

### 2. 🤖 AI & RAG Refinement
- [ ] **Fix Model Version**: Correct the model name in `searchService.ts` from the placeholder `gemini-2.5-flash` to a stable version (e.g., `gemini-1.5-flash`).
- [ ] **Retrieval Precision**: Fine-tune the RAG prompt to better prioritize urgency and proximity in recommendations.

### 3. 🎫 Feature Verification
- [ ] **Digital Ticket Flow**: Verify that QR codes are being correctly generated and sent via email upon event registration.
- [ ] **Volunteer Leaderboard**: Implement the dynamic scoring logic for the "Community Heroes" section.
- [ ] **Bulk Promotions**: Stress-test the CSV/Excel parser with larger contact lists (100+ entries).

### 4. 🧪 Testing & Quality Assurance
- [ ] **E2E Testing**: Verify the full user journey: Register -> Find Event via AI -> Volunteer -> Receive Ticket.
- [ ] **Error Handling**: Implement more robust error boundaries for the Sentinel real-time feeds (USGS/NOAA).

---

## 📅 Future Roadmap
- [ ] **Mobile App PWA**: Optimize the platform for installation as a Progressive Web App.
- [ ] **Advanced Analytics**: NGO-specific dashboard for tracking volunteer impact over time.
- [ ] **Multi-Language Support**: AI-driven translation for regional relief efforts.

---
*Last Updated: 2026-04-27*
