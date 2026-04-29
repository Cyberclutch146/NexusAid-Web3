import { NextResponse } from "next/server";
import { semanticSearch } from "@/services/searchService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Search query is required." },
        { status: 400 }
      );
    }

    const { results, isAIPowered } = await semanticSearch(query.trim());

    return NextResponse.json({
      success: true,
      results,
      isAIPowered,
    });
  } catch (error: any) {
    console.error("Search API error:", error);
    
    // Check for rate limit / quota errors
    const errorMessage = error.message || "";
    const isRateLimit = 
      errorMessage.includes("429") || 
      errorMessage.toLowerCase().includes("quota") || 
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.toLowerCase().includes("exhausted");

    return NextResponse.json(
      { success: false, error: isRateLimit ? "Rate limits hit. Using basic search instead." : (errorMessage || "Search failed.") },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
