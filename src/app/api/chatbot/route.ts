import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ragRetrieveEvents } from "@/services/searchService";
import { AI_FUNCTION_DECLARATIONS, executeFunction } from "@/services/aiActions";
import { getAllSentinelAlerts } from "@/services/sentinelService";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableModelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();

  return (
    normalized.includes("429") ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("resource exhausted") ||
    normalized.includes("exhausted") ||
    normalized.includes("503") ||
    normalized.includes("overloaded") ||
    normalized.includes("unavailable")
  );
}

async function sendMessageWithRetry(chat: any, payload: string | any[]) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await chat.sendMessage(payload);
    } catch (error) {
      lastError = error;
      if (!isRetryableModelError(error) || attempt === 2) {
        throw error;
      }

      await sleep(600 * (attempt + 1));
    }
  }

  throw lastError;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    const userId = body.userId || "";
    const userName = body.userName || "Volunteer";
    const userEmail = body.userEmail || "";
    const userSkills = body.userSkills || [];
    const userEquipment = body.userEquipment || [];
    const userAvailability = body.userAvailability || 'anytime';
    const userTravelRadius = body.userTravelRadius || 0;
    const pendingSignup = body.pendingSignup || null;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "No messages provided." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY_AI_CHAT_BOT || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "AI API key is missing from environment variables" },
        { status: 500 }
      );
    }

    // Fetch relevant events to provide targeted RAG context to Gemini
    const [events, sentinelAlerts] = await Promise.all([
      ragRetrieveEvents(messages[messages.length - 1]?.content || "", {
        skills: userSkills,
        equipment: userEquipment,
        travelRadius: userTravelRadius
      }),
      getAllSentinelAlerts().catch(() => []) // fail gracefully
    ]);
    
    const eventContext = events
      .map((e) => {
        let needsStr = [];
        if (e.volunteersNeeded)
          needsStr.push(`${e.volunteersNeeded} volunteers`);
        if (e.goalAmount)
          needsStr.push(
            `$${e.goalAmount} (Raised: $${e.donatedAmount || 0})`
          );
        const needs = needsStr.length > 0 ? needsStr.join(", ") : "N/A";
        return `- ${e.title} (${e.category}) at ${e.location}. Need: ${needs}. Description: ${String(e.description || "").slice(0, 160)}`;
      })
      .join("\n");

    const userContext = userId
      ? `\nThe current user is "${userName}" (ID: ${userId}). ${
          userSkills.length > 0
            ? `Their skills include: ${userSkills.join(", ")}.`
            : ""
        }${
          userEquipment.length > 0
            ? ` They have equipment: ${userEquipment.join(", ")}.`
            : ""
        }${
          userTravelRadius > 0
            ? ` They can travel up to ${userTravelRadius} km.`
            : ""
        } Available: ${userAvailability}.`
      : "\nThe user is not logged in.";

    const sentinelContext = sentinelAlerts.length > 0 
      ? `\nCURRENT SENTINEL SAFETY ALERTS IN EFFECT:\n` + sentinelAlerts.slice(0, 3).map((a: any) => `- ${a.severity} ${a.type}: ${a.title} (${String(a.description || "").slice(0, 120)})`).join("\n") + `\nAlways warn users about these active safety alerts when relevant to events.`
      : "";

    const systemInstruction = `You are the NexusAid AI Assistant. 
You are a helpful, empathetic, and encouraging assistant for a community event and volunteering platform.
Your primary goal is to help users discover events, learn how to volunteer or donate, and guide them on organizing new events.

${userContext}

Here is the list of CURRENTLY LIVE events on the platform:
${eventContext || "No active events right now."}
${sentinelContext}

IMPORTANT INSTRUCTIONS:
- When users ask for events, recommend specific live events. Be conversational and natural.
- When a user wants to sign up/volunteer, use the "request_signup" function first to confirm, then "confirm_signup" only after they say yes.
- When a user says "yes", "confirm", "go ahead", "sure" in response to a signup confirmation, use the "confirm_signup" function.
- When a user asks to navigate somewhere, use the "navigate_to_page" function.
- Keep responses concise (under 4-5 sentences) and engaging.
- Use bold text (**text**) for event names and important information.
- Always be encouraging about volunteering and community involvement.${pendingSignup ? `

IMPORTANT CONTEXT: The user was just asked to confirm signing up for the event titled "${pendingSignup.eventTitle}"${pendingSignup.eventId ? ` (ID: ${pendingSignup.eventId})` : ''}. If the user says "yes", "confirm", "sure", "go ahead", or anything affirmative, you MUST call the confirm_signup function with eventTitle: "${pendingSignup.eventTitle}"${pendingSignup.eventId ? ` and eventId: "${pendingSignup.eventId}"` : ''}.` : ''}`;

    const genAI = new GoogleGenerativeAI(apiKey);

    // Format history for Gemini chat
    let chatHistory = messages.slice(-9, -1);
    while (chatHistory.length > 0 && chatHistory[0].role !== "user") {
      chatHistory.shift();
    }

    const history = chatHistory.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const latestMessage = messages[messages.length - 1].content;

    // Try models with function calling support
    const modelsToTry = [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.0-flash-lite",
    ];

    let text = "";
    let actionData: any = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: AI_FUNCTION_DECLARATIONS as any }],
        });

        const chat = model.startChat({ history });
        let result = await sendMessageWithRetry(chat, latestMessage);
        let response = result.response;

        // Handle function calling loop (max 3 iterations to prevent infinite loops)
        let iterations = 0;
        while (iterations < 3) {
          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts;

          if (!parts || parts.length === 0) break;

          // Check if the response contains a function call
          const functionCallPart = parts.find((p: any) => p.functionCall);

          if (!functionCallPart || !functionCallPart.functionCall) {
            // No function call, extract text
            const textPart = parts.find((p: any) => p.text);
            if (textPart && textPart.text) {
              text = textPart.text;
            }
            break;
          }

          // Execute the function
          const { name, args } = functionCallPart.functionCall;
          console.log(`AI Function Call: ${name}`, args);

          const actionResult = await executeFunction(
            name,
            args as Record<string, string>,
            userId,
            userName,
            userEmail
          );

          // Store the action data for the client
          if (actionResult.action) {
            actionData = actionResult.action;
          }

          // Send the function result back to Gemini
          result = await sendMessageWithRetry(chat, [
            {
              functionResponse: {
                name: name,
                response: {
                  success: actionResult.success,
                  message: actionResult.message,
                  action: actionResult.action,
                },
              },
            },
          ]);

          response = result.response;
          iterations++;
        }

        // Extract final text if not already captured
        if (!text) {
          const candidate = response.candidates?.[0];
          const textPart = candidate?.content?.parts?.find((p: any) => p.text);
          if (textPart && textPart.text) {
            text = textPart.text;
          }
        }

        if (text) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed:`, err.message);
      }
    }

    if (!text) {
      throw lastError || new Error("All AI models failed.");
    }

    return NextResponse.json({
      success: true,
      reply: text,
      action: actionData,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    
    // Check for rate limit / quota errors
    const errorMessage = error.message || "";
    const isRateLimit = 
      errorMessage.includes("429") || 
      errorMessage.toLowerCase().includes("quota") || 
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.toLowerCase().includes("exhausted");
    const isTemporaryCapacityIssue =
      errorMessage.includes("503") ||
      errorMessage.toLowerCase().includes("overloaded") ||
      errorMessage.toLowerCase().includes("unavailable");

    return NextResponse.json(
      {
        success: false,
        error:
          isRateLimit
            ? "The AI service is being throttled right now. Please try again in a minute."
            : isTemporaryCapacityIssue
              ? "The AI service is temporarily busy. Please try again in a moment."
              : (errorMessage || "Something went wrong while generating a response."),
      },
      { status: isRateLimit ? 429 : isTemporaryCapacityIssue ? 503 : 500 }
    );
  }
}
