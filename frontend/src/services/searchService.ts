import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

interface SearchableEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  urgency: string;
  volunteersNeeded?: number;
  goalAmount?: number;
  donatedAmount?: number;
}

// ─── Fetch all events for search ────────────────────────
async function fetchSearchableEvents(): Promise<SearchableEvent[]> {
  const eventsRef = collection(db, "events");
  const snapshot = await getDocs(query(eventsRef, orderBy("createdAt", "desc")));
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || "",
      description: data.description || "",
      category: data.category || "",
      location: data.location || "",
      urgency: data.urgency || "normal",
      volunteersNeeded: data.needs?.volunteers?.goal,
      goalAmount: data.needs?.funds?.goal,
      donatedAmount: data.needs?.funds?.current,
    };
  });
}

// ─── Keyword fallback search ────────────────────────────
export function keywordSearch(searchQuery: string, events: SearchableEvent[], userContext?: any): string[] {
  const q = searchQuery.toLowerCase();
  const queryWords = q.split(/\s+/).filter((w) => w.length > 2);

  const scored = events.map((event) => {
    const text = `${event.title} ${event.description} ${event.category} ${event.location}`.toLowerCase();
    let score = 0;

    // Full query match
    if (text.includes(q)) score += 10;

    // Individual word matches
    for (const word of queryWords) {
      if (event.title.toLowerCase().includes(word)) score += 5;
      if (event.category.toLowerCase().includes(word)) score += 4;
      if (event.location.toLowerCase().includes(word)) score += 3;
      if (event.description.toLowerCase().includes(word)) score += 1;
    }

    // Urgency boost
    if (event.urgency === "high") score += 2;

    // User context boost
    if (userContext) {
      if (userContext.skills?.some((s: string) => text.includes(s.toLowerCase()))) score += 3;
      if (userContext.equipment?.some((e: string) => text.includes(e.toLowerCase()))) score += 3;
    }

    return { id: event.id, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.id);
}

// ─── Semantic search using Gemini ───────────────────────
export async function semanticSearch(searchQuery: string): Promise<{
  results: string[];
  isAIPowered: boolean;
}> {
  const events = await fetchSearchableEvents();

  if (events.length === 0) {
    return { results: [], isAIPowered: false };
  }

  const apiKey = process.env.GEMINI_API_KEY_AI_CHAT_BOT || process.env.GEMINI_API_KEY;

  // If no API key, fall back to keyword search
  if (!apiKey) {
    return { results: keywordSearch(searchQuery, events), isAIPowered: false };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const eventSummaries = events
      .map(
        (e) =>
          `ID: ${e.id} | Title: "${e.title}" | Category: ${e.category} | Location: ${e.location} | Urgency: ${e.urgency} | Description: ${e.description.slice(0, 150)}`
      )
      .join("\n");

    const prompt = `You are a search engine for community volunteering events. Given a user's search query and a list of events, return ONLY the IDs of events that match the query, ranked by relevance (most relevant first).

Consider semantic meaning, not just keyword matching. For example:
- "food help" should match events about food drives, community kitchens, meal programs
- "urgent" should prioritize high-urgency events
- "near downtown" should prioritize events with downtown locations
- "I want to teach" should match education, tutoring, mentoring events

User Query: "${searchQuery}"

Available Events:
${eventSummaries}

Respond with ONLY a JSON array of event IDs, most relevant first. If no events match, respond with an empty array [].
Example response: ["id1", "id2", "id3"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse the JSON array from the response
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const ids = JSON.parse(jsonMatch[0]) as string[];
      // Validate that all returned IDs actually exist
      const validIds = ids.filter((id) => events.some((e) => e.id === id));
      if (validIds.length > 0) {
        return { results: validIds, isAIPowered: true };
      }
    }

    // If AI returned garbage, fall back
    return { results: keywordSearch(searchQuery, events), isAIPowered: false };
  } catch (error) {
    console.error("Semantic search failed, falling back to keyword search:", error);
    return { results: keywordSearch(searchQuery, events), isAIPowered: false };
  }
}

// ─── RAG Retrieval for AI Chatbot ───────────────────────
export async function ragRetrieveEvents(userMessage: string, userContext?: any): Promise<any[]> {
  const allEvents = await fetchSearchableEvents();

  if (allEvents.length <= 15) {
    return allEvents;
  }

  const rankedIds = keywordSearch(userMessage, allEvents, userContext);
  if (rankedIds.length === 0) return allEvents.slice(0, 5);

  return rankedIds
    .slice(0, 5)
    .map((id) => allEvents.find((e) => e.id === id))
    .filter(Boolean);
}
