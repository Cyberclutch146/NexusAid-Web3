import { db } from "@/lib/firebase";
import { adminDb } from "@/lib/firebase-admin";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { addVolunteerSignup } from "@/services/eventService";
import { addVolunteerSignupServer } from "@/services/eventServiceServer";

// ─── Types ──────────────────────────────────────────────
interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  action?: {
    type: "navigate" | "signed_up" | "confirm_signup" | "search_results";
    url?: string;
    eventId?: string;
    eventTitle?: string;
    results?: Array<{ id: string; title: string; category: string; location: string }>;
  };
}

interface EventDoc {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  organizer: string;
  urgency: string;
  eventDate?: string;
  needs?: {
    volunteers?: { current: number; goal: number };
    funds?: { current: number; goal: number };
  };
}

// ─── Function Declarations for Gemini ───────────────────
export const AI_FUNCTION_DECLARATIONS = [
  {
    name: "search_events",
    description:
      "Search for community events by keyword, category, or description. Use this when the user asks about finding events, discovering opportunities, or looking for specific types of help.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query — can be a keyword, category name, or natural language description of what the user is looking for.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_event_details",
    description:
      "Get detailed information about a specific event by its title or a partial title match. Use this when the user asks about a specific event.",
    parameters: {
      type: "object" as const,
      properties: {
        eventTitle: {
          type: "string",
          description: "The title (or partial title) of the event to look up.",
        },
      },
      required: ["eventTitle"],
    },
  },
  {
    name: "request_signup",
    description:
      "Request to sign the user up as a volunteer for a specific event. This sends a verification code (OTP) to the user's email. Use this when the user expresses intent to volunteer or sign up for an event. After calling this, instruct the user to check their email and provide the 6-digit verification code.",
    parameters: {
      type: "object" as const,
      properties: {
        eventTitle: {
          type: "string",
          description: "The title (or partial title) of the event to sign up for.",
        },
      },
      required: ["eventTitle"],
    },
  },
  {
    name: "confirm_signup",
    description:
      "Complete the volunteer signup AFTER the user provides a valid 6-digit verification code from their email. You MUST provide the otpCode the user shared. Only call this when the user provides a 6-digit number in response to the OTP request. You MUST provide the eventTitle. If you have the eventId, include it too.",
    parameters: {
      type: "object" as const,
      properties: {
        eventId: {
          type: "string",
          description: "The Firestore document ID of the event. Optional if eventTitle is provided.",
        },
        eventTitle: {
          type: "string",
          description: "The title of the event to sign up for. This is always required.",
        },
        otpCode: {
          type: "string",
          description: "The 6-digit verification code the user received via email. This is always required.",
        },
      },
      required: ["eventTitle", "otpCode"],
    },
  },
  {
    name: "navigate_to_page",
    description:
      "Navigate the user to a specific page on the platform. Use this when the user asks to go to a page, view their dashboard, create an event, etc.",
    parameters: {
      type: "object" as const,
      properties: {
        pageName: {
          type: "string",
          enum: ["home", "feed", "create", "dashboard", "profile", "about"],
          description: "The name of the page to navigate to.",
        },
      },
      required: ["pageName"],
    },
  },
];

// ─── Helper: Fetch all events from Firestore ────────────
async function fetchAllEvents(): Promise<EventDoc[]> {
  // Use admin SDK on server to bypass security rules
  if (typeof window === 'undefined' && adminDb) {
    try {
      const snapshot = await adminDb.collection("events").orderBy("createdAt", "desc").get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          category: data.category || "",
          location: data.location || "",
          organizer: data.organizer || "",
          urgency: data.urgency || "normal",
          eventDate: data.eventDate,
          needs: data.needs,
        };
      });
    } catch (error) {
      console.warn("Admin SDK fetchAllEvents failed, falling back to client SDK:", error);
    }
  }

  const snapshot = await getDocs(
    query(collection(db, "events"), orderBy("createdAt", "desc"))
  );
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || "",
      description: data.description || "",
      category: data.category || "",
      location: data.location || "",
      organizer: data.organizer || "",
      urgency: data.urgency || "normal",
      eventDate: data.eventDate,
      needs: data.needs,
    };
  });
}

// ─── Helper: Find event by title (fuzzy) ────────────────
function findEventByTitle(events: EventDoc[], searchTitle: string): EventDoc | null {
  const normalizedSearch = searchTitle.toLowerCase().trim();

  // Exact match first
  const exact = events.find(
    (e) => e.title.toLowerCase() === normalizedSearch
  );
  if (exact) return exact;

  // Partial match
  const partial = events.find((e) =>
    e.title.toLowerCase().includes(normalizedSearch) ||
    normalizedSearch.includes(e.title.toLowerCase())
  );
  if (partial) return partial;

  // Word-level match
  const searchWords = normalizedSearch.split(/\s+/);
  let bestMatch: EventDoc | null = null;
  let bestScore = 0;

  for (const event of events) {
    const titleWords = event.title.toLowerCase().split(/\s+/);
    const score = searchWords.filter((w) =>
      titleWords.some((tw) => tw.includes(w) || w.includes(tw))
    ).length;
    if (score > bestScore && score >= Math.ceil(searchWords.length / 2)) {
      bestScore = score;
      bestMatch = event;
    }
  }

  return bestMatch;
}

// ─── Action Handlers ────────────────────────────────────

export async function handleSearchEvents(searchQuery: string): Promise<ActionResult> {
  try {
    const events = await fetchAllEvents();
    const q = searchQuery.toLowerCase();

    const matches = events.filter((e) => {
      const text = `${e.title} ${e.description} ${e.category} ${e.location}`.toLowerCase();
      const queryWords = q.split(/\s+/);
      return queryWords.some((word) => text.includes(word));
    });

    if (matches.length === 0) {
      return {
        success: true,
        message: `No events found matching "${searchQuery}". Try a different search term or browse all events in the feed.`,
        action: { type: "search_results", results: [] },
      };
    }

    const topResults = matches.slice(0, 5).map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      location: e.location,
    }));

    return {
      success: true,
      message: `Found ${matches.length} event(s) matching "${searchQuery}": ${topResults
        .map((r, i) => `${i + 1}. **${r.title}** (${r.category}) at ${r.location}`)
        .join("; ")}`,
      action: { type: "search_results", results: topResults },
    };
  } catch (error) {
    console.error("Search events error:", error);
    return { success: false, message: "I had trouble searching for events. Please try again." };
  }
}

export async function handleGetEventDetails(eventTitle: string): Promise<ActionResult> {
  try {
    const events = await fetchAllEvents();
    const event = findEventByTitle(events, eventTitle);

    if (!event) {
      return {
        success: false,
        message: `I couldn't find an event called "${eventTitle}". Would you like me to search for similar events?`,
      };
    }

    const volunteerInfo = event.needs?.volunteers
      ? `Volunteers: ${event.needs.volunteers.current}/${event.needs.volunteers.goal}`
      : "No volunteer goal set";

    const fundingInfo = event.needs?.funds
      ? `Funding: $${event.needs.funds.current.toLocaleString()} raised of $${event.needs.funds.goal.toLocaleString()}`
      : "No funding goal set";

    return {
      success: true,
      message: `**${event.title}**\n📍 ${event.location}\n📂 ${event.category}\n👤 Organized by ${event.organizer}\n${event.eventDate ? `📅 ${event.eventDate}` : ""}\n📊 ${volunteerInfo} | ${fundingInfo}\n\n${event.description}`,
      action: { type: "navigate", url: `/event/${event.id}`, eventId: event.id },
    };
  } catch (error) {
    console.error("Get event details error:", error);
    return { success: false, message: "I had trouble fetching event details. Please try again." };
  }
}

export async function handleRequestSignup(
  eventTitle: string,
  userEmail: string
): Promise<ActionResult> {
  try {
    if (!userEmail) {
      return {
        success: false,
        message: "You need to be logged in with a valid email to sign up for events. Please log in first!",
        action: { type: "navigate", url: "/" },
      };
    }

    const events = await fetchAllEvents();
    const event = findEventByTitle(events, eventTitle);

    if (!event) {
      return {
        success: false,
        message: `I couldn't find an event called "${eventTitle}". Could you double-check the name? You can also ask me to search for events.`,
      };
    }

    // Check if volunteer slots are available
    if (event.needs?.volunteers) {
      const { current, goal } = event.needs.volunteers;
      if (current >= goal) {
        return {
          success: false,
          message: `The event **${event.title}** has already reached its volunteer goal (${goal}/${goal}). You can still check it out though!`,
          action: { type: "navigate", url: `/event/${event.id}` },
        };
      }
    }

    // Send the OTP email to the user
    try {
      const otpRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, eventTitle: event.title }),
      });

      if (!otpRes.ok) {
        const errData = await otpRes.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to send verification email');
      }
    } catch (otpErr: any) {
      console.error("OTP send error:", otpErr);
      return {
        success: false,
        message: `I found the event but couldn't send a verification email to ${userEmail}. Error: ${otpErr.message}. You can try signing up directly from the event page.`,
        action: { type: "navigate", url: `/event/${event.id}` },
      };
    }

    return {
      success: true,
      message: `I found **${event.title}** at ${event.location}. I've sent a **6-digit verification code** to your email (${userEmail}). Please check your inbox and share the code with me to complete your registration.`,
      action: {
        type: "confirm_signup",
        eventId: event.id,
        eventTitle: event.title,
      },
    };
  } catch (error) {
    console.error("Request signup error:", error);
    return { success: false, message: "I had trouble finding that event. Please try again." };
  }
}

export async function handleConfirmSignup(
  eventId: string | undefined,
  eventTitle: string,
  otpCode: string | undefined,
  userId: string,
  userName: string,
  userEmail: string
): Promise<ActionResult> {
  try {
    if (!userId) {
      return {
        success: false,
        message: "You need to be logged in to sign up for events. Please log in first!",
        action: { type: "navigate", url: "/" },
      };
    }

    if (!otpCode || otpCode.length !== 6) {
      return {
        success: false,
        message: "I need the **6-digit verification code** that was sent to your email. Please check your inbox and share the code with me.",
      };
    }

    // Verify the OTP first
    const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, code: otpCode }),
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok) {
      if (verifyRes.status === 410) {
        return {
          success: false,
          message: "Your verification code has **expired**. Please say \"sign me up\" again and I'll send a fresh code to your email.",
        };
      }
      if (verifyRes.status === 401) {
        return {
          success: false,
          message: "That code is **incorrect**. Please double-check the 6-digit code from your email and try again.",
        };
      }
      return {
        success: false,
        message: verifyData.error || "Verification failed. Please try again.",
      };
    }

    // OTP verified — now proceed with the actual signup
    let resolvedId = eventId;
    let resolvedTitle = eventTitle;

    if (!resolvedId && eventTitle) {
      const events = await fetchAllEvents();
      const found = findEventByTitle(events, eventTitle);
      if (!found) {
        return {
          success: false,
          message: `I couldn't find an event called "${eventTitle}". Could you double-check the name?`,
        };
      }
      resolvedId = found.id;
      resolvedTitle = found.title;
    }

    if (!resolvedId) {
      return {
        success: false,
        message: "I couldn't determine which event to sign up for. Could you tell me the event name again?",
      };
    }

    const ticketId = Math.random().toString(36).substring(2, 12).toUpperCase();

    try {
      await addVolunteerSignupServer(resolvedId, userId, userName, userEmail, ticketId);
    } catch (signupError: any) {
      // If the user is already registered, treat it as a success
      if (signupError.message?.includes('Already registered')) {
        return {
          success: true,
          message: `You're already registered as a volunteer for **${resolvedTitle}**! No need to sign up again. You can view the event for more details.`,
          action: {
            type: "signed_up",
            url: `/event/${resolvedId}`,
            eventId: resolvedId,
            eventTitle: resolvedTitle,
          },
        };
      }
      throw signupError; // re-throw other errors
    }

    // Send confirmation email (non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/confirm-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, eventTitle: resolvedTitle, ticketId }),
    }).catch((err) => console.warn('Confirmation email failed:', err));

    return {
      success: true,
      message: `🎉 Email verified and you're all set! You've been signed up as a volunteer for **${resolvedTitle}**. Your ticket ID is **${ticketId}**. A confirmation email with your digital ticket has been sent.`,
      action: {
        type: "signed_up",
        url: `/event/${resolvedId}`,
        eventId: resolvedId,
        eventTitle: resolvedTitle,
      },
    };
  } catch (error: any) {
    console.error("Confirm signup error:", error);
    const fallbackUrl = eventId ? `/event/${eventId}` : '/feed';
    return {
      success: false,
      message: `I couldn't complete the signup: ${error.message || "unknown error"}. You can try signing up directly from the event page.`,
      action: { type: "navigate", url: fallbackUrl },
    };
  }
}

export async function handleNavigateToPage(pageName: string): Promise<ActionResult> {
  const pageMap: Record<string, { url: string; label: string }> = {
    home: { url: "/home", label: "Home" },
    feed: { url: "/feed", label: "Events Feed" },
    create: { url: "/create", label: "Create Event" },
    dashboard: { url: "/dashboard", label: "Dashboard" },
    profile: { url: "/profile", label: "Profile" },
    about: { url: "/about", label: "About Us" },
  };

  const page = pageMap[pageName.toLowerCase()];
  if (!page) {
    return {
      success: false,
      message: `I'm not sure which page you mean. Available pages are: Home, Events Feed, Create Event, Dashboard, Profile, and About.`,
    };
  }

  return {
    success: true,
    message: `Here's a link to the **${page.label}** page:`,
    action: { type: "navigate", url: page.url },
  };
}

// ─── Main Dispatcher ────────────────────────────────────
export async function executeFunction(
  functionName: string,
  args: Record<string, string>,
  userId: string,
  userName: string,
  userEmail: string
): Promise<ActionResult> {
  switch (functionName) {
    case "search_events":
      return handleSearchEvents(args.query);
    case "get_event_details":
      return handleGetEventDetails(args.eventTitle);
    case "request_signup":
      return handleRequestSignup(args.eventTitle, userEmail || '');
    case "confirm_signup":
      return handleConfirmSignup(args.eventId, args.eventTitle, args.otpCode, userId, userName, userEmail || '');
    case "navigate_to_page":
      return handleNavigateToPage(args.pageName);
    default:
      return { success: false, message: `Unknown action: ${functionName}` };
  }
}
