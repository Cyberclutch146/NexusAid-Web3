import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const geocodeLocation = async (address: string): Promise<{lat: number, lng: number} | null> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
      headers: {
        'User-Agent': 'CommunityManagementApp/1.0 (Server)'
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon) // Nominatim returns 'lon' instead of 'lng'
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
};

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      const { initError } = require("@/lib/firebase-admin");
      return NextResponse.json(
        { 
          error: "Server configuration error: Firebase Admin not initialized.",
          details: initError || "Unknown initialization failure."
        },
        { status: 500 }
      );
    }

    const data = await req.json();

    if (!data.title || !data.organizerId) {
      return NextResponse.json(
        { error: "Missing required fields (title, organizerId)." },
        { status: 400 }
      );
    }

    // Ideally, we would verify an auth token here
    // const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    // await adminAuth.verifyIdToken(token);

    let coords = (data.lat !== undefined && data.lng !== undefined) 
      ? { lat: data.lat, lng: data.lng } 
      : null;

    if (!coords && data.location) {
      coords = await geocodeLocation(data.location);
    }

    const now = new Date();

    const eventData = {
      ...data,
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      createdAt: now,
      updatedAt: now,
      status: 'active',
      progress: 0,
      needs: {
        ...data.needs,
        funds: {
          goal: data.needs?.funds?.goal || 0,
          current: 0
        },
        volunteers: {
          goal: data.needs?.volunteers?.goal || 0,
          current: 0
        }
      }
    };

    const docRef = await adminDb.collection("events").add(eventData);

    return NextResponse.json(
      { message: "Event created successfully.", eventId: docRef.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API Error creating event:", error);
    return NextResponse.json(
      { error: "Internal server error.", details: error.message },
      { status: 500 }
    );
  }
}
