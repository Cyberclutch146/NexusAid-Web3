import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { title, category } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required for AI generation" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY_AI_CHAT_BOT || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "AI API key is missing from environment variables" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Fallback list of models to try if one is experiencing high demand
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-flash-latest", "gemini-pro-latest"];
    let text = "";

    const prompt = `Write a short, engaging, and professional description (around 3-4 sentences) for a community event. 
    The event title is "${title}". 
    The event category is "${category || 'community event'}".
    The description should motivate people to join or contribute to the cause. Do not include hashtags or greetings, just the description paragraph.`;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
        if (text) break; // Successfully generated text, stop trying other models
      } catch (err: any) {
        console.warn(`Model ${modelName} failed:`, err.message);
        // Continue to the next model in the list
      }
    }

    if (!text) {
      throw new Error("All AI models are currently experiencing high demand. Please try again later.");
    }

    return NextResponse.json({ description: text });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to generate description" }, { status: 500 });
  }
}
