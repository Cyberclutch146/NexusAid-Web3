# NexusAid 🤝

[![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-1.5_Flash-4285F4?style=for-the-badge&logo=google-gemini)](https://ai.google.dev/)

**NexusAid** is a comprehensive, professional, community-centric platform engineered to streamline disaster relief, volunteer coordination, and mutual aid. It combines real-time situational awareness with intelligent matchmaking to empower communities when they need it most. Designed with a focus on speed, compassion, and automation, NexusAid empowers local communities and NGOs to organize efficiently during critical times.

---

## 🚀 Key Innovation Pillars

### 🛡️ Community Sentinel (Live Safety Monitoring)
*   **Real-Time Data**: Integrates live feeds from **USGS** and **NOAA** to track environmental risks.
*   **Situational Map**: Interactive Leaflet-based map with custom hazard overlays (Weather, Earthquakes, etc.).
*   **Proactive Alerts**: Notifies community organizers of nearby critical signals before they escalate.

### 🧠 Intelligent Matchmaking
*   **Skill-Based Recommendations**: Proprietary scoring algorithm that matches volunteers to events based on their unique expertise (Medical, Logistics, Technical, etc.).
*   **Match Clarity**: Dynamic "Why it's a match" insights for every recommended event.
*   **Capacity Handling**: Optimized to show up to 6 high-relevance matches at a glance.

### 📢 Event & Campaign Management
* **Intelligent Event Creation**: Quickly set up relief campaigns or events with titles, descriptions, and specific needs. Features an AI-powered description generator to formulate compelling campaign messages.
* **Interactive Resource Tracking**: Real-time progress tracking for funding goals and volunteer registration.
* **Interactive Mapping**: Integrated geospatial mapping (using Leaflet & OpenStreetMap) displaying real-time proximity of events and "Sentinel" hazard overlays to users.

### 🤖 AI-Native Operations
*   **24/7 AI Guide**: A persistent Gemini-powered assistant to answer platform questions and guide volunteer signups.
*   **Generative Event Tools**: AI-assisted generation for professional event descriptions and promotional imagery.
*   **Smart Skill Matching**: Dynamic banners and feeds that recommend specific volunteering tasks based on user profile skills.

### 💬 Real-Time Coordination & Alerts
* **Sentinel Alert System**: Active tracking and mapping of emergency/relief zones to send immediate, automated visual notifications across the feed and dashboards.
* **Community Chat Rooms**: Dedicated Firestore-backed real-time chat spaces for event volunteers to coordinate effectively.
* **Centralized Notification Service**: Robust internal notification system to keep users informed about event updates, chat messages, and administrative alerts.

### 🚀 Automated Bulk Communications
* **Multi-Channel Promos**: Built-in promotion service that supports bulk parsing of `.csv` and `.xlsx` contact files.
* **Email & SMS Automation**: Delivers automated event invitations and updates utilizing **Nodemailer** (Email) and **Twilio** (SMS) simultaneously.
* **Firebase Audit Logs**: Ensures every promotion outcome is reliably logged within Firestore.

### 🔐 Verified Volunteer Ecosystem & Profiles
*   **Email OTP Verification**: Secure, real-world verification via **Nodemailer** and dedicated backend APIs to ensure valid participants.
*   **Event Check-In Scanner**: Built-in QR scanner interface allowing organizers to seamlessly scan and validate volunteer digital tickets directly at the event.
*   **Volunteer Leaderboards & Profiles**: A dedicated user profile system and a gamified "Community Heroes" leaderboard to recognize and track top contributors.

### 💳 Donations & Material Pledging
* **Razorpay Integration**: Secure, seamless in-app donation panel for funding campaigns, complete with order creation and fulfillment endpoints.
* **Goods & Material Pledging**: Interactive forms and modals allowing users to formally pledge physical goods, supplies, or materials for specific relief events.

---

## 🛠 Technical Excellence

| Category         | Technologies Used                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **Framework**    | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) & [React 19](https://react.dev/)          |
| **Language**     | TypeScript                                                                                          |
| **Styling**      | [Tailwind CSS 4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)        |
| **Database**     | [Firebase](https://firebase.google.com/) (Firestore, Auth, Admin SDK)                               |
| **AI Engines**   | [Google Generative AI (Gemini 1.5+)](https://ai.google.dev/) & [OpenAI API](https://openai.com/)    |
| **Payments**     | [Razorpay](https://razorpay.com/)                                                                   |
| **Mapping**      | [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)                  |
| **Comms/Parser** | [Twilio](https://twilio.com/), [Nodemailer](https://nodemailer.com/), CSV-Parser, Papaparse, XLSX   |

---

## 🏗 Architecture & Process Flows

### High-Level System Architecture
```mermaid
graph TD
    Client[Next.js Frontend Client] -->|API Requests| NextAPI[Next.js Serverless API Routes]
    Client -->|Direct Read/Write| Firestore[(Firebase Firestore)]
    Client -->|Auth State| FirebaseAuth[Firebase Authentication]
    
    NextAPI -->|Event Data & Logs| FirestoreAdmin[(Firebase Admin SDK)]
    NextAPI -->|Emails| Nodemailer[Nodemailer Service]
    NextAPI -->|SMS| Twilio[Twilio Service]
    NextAPI -->|AI Prompts| LLM[Google Gemini / OpenAI]
    NextAPI -->|Payments| Razorpay[Razorpay API]
```

### Event Creation & Bulk Promotion Flow
```mermaid
sequenceDiagram
    participant Organizer
    participant Frontend
    participant PromotionAPI
    participant EmailSMS (Twilio/NodeMailer)
    participant Database

    Organizer->>Frontend: Creates Event & Uploads CSV/Excel Contacts
    Frontend->>Frontend: Parses CSV/XLSX locally or via API
    Frontend->>PromotionAPI: Sends Batch Contacts & Message Templates
    PromotionAPI->>EmailSMS: Dispatch Bulk Emails & SMS in parallel
    EmailSMS-->>PromotionAPI: Delivery Status / Callbacks
    PromotionAPI->>Database: Log successful deliveries & errors
    Database-->>Frontend: Real-time update on delivery progress
    Frontend-->>Organizer: Promotion Summary & Success Notifications
```

---

## 📂 Project Architecture

```text
├── src/
│   ├── app/                # Next.js App Router (Pages, Layouts & APIs)
│   │   ├── (app)/          # Main App Views (Dashboard, Feed, Profile)
│   │   ├── (marketing)/    # Public routes (Landing, Login, Register)
│   │   └── api/            # Serverless Functions (Sentinel, Payments, AI, Promote)
│   ├── components/         # Reusable Premium UI Components (Glassmorphism, Modals, Maps, AI Widgets)
│   ├── context/            # Global State (AuthContext, Theme)
│   ├── lib/                # External library configurations (Firebase, Razorpay, OpenAI)
│   ├── services/           # Backend Logic (EventService, Email, Recommendation, SMS, AI)
│   ├── types/              # TypeScript Interfaces
│   ├── utils/              # Helper functions (Geo-calculations, formatters)
│   └── styles/             # Global CSS & Tailwind Config
├── public/                 # Static Assets & Icons
├── firebase.json           # Firebase Deployment Config
└── tailwind.config.ts      # Tailwind styling definitions
```

---

## ⚙️ Configuration & Setup

### 1. Prerequisites
- Node.js 18+
- Firebase Project
- Google AI (Gemini) API Key
- Razorpay Account (Optional)
- Twilio Account (Optional)

### 2. Environment Variables
Create a `.env` or `.env.local` file in the root directory and add your credentials. Refer to the expected variables below:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI Integrations
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY_AI_CHAT_BOT=your_gemini_api_key_for_bot

# Communications (Email / SMS)
EMAIL=your-email@gmail.com
EMAIL_PASS=your-google-app-password
TWILIO_SID=your_twilio_sid
TWILIO_AUTH=your_twilio_auth_token
TWILIO_PHONE=your_twilio_phone

# Payments
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 3. Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🛡 Security & Reliability
- **Firestore Security Rules**: Strict access control for user data and chatrooms.
- **Input Validation**: Server-side checks for all API routes.
- **Error Handling**: Comprehensive logging and user-friendly error boundaries.

---

Built with ❤️ by the NexusAid Team to foster community resilience and rapid response.
