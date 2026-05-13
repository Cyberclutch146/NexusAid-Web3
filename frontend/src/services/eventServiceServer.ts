import { adminDb } from "@/lib/firebase-admin";

/**
 * Server-side helper to sign up a volunteer.
 * Bypasses client-side fetch and security rules.
 */
export async function addVolunteerSignupServer(
  eventId: string,
  userId: string,
  userName: string,
  userEmail: string = "",
  ticketId: string = ""
): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const eventRef = adminDb.collection("events").doc(eventId);
  const volunteerRef = eventRef.collection("volunteers").doc(userId);
  const userRegistrationRef = adminDb.collection("users").doc(userId).collection("registrations").doc(eventId);

  await adminDb.runTransaction(async (transaction) => {
    const eventSnap = await transaction.get(eventRef);
    
    if (!eventSnap.exists) {
      throw new Error("Event not found");
    }

    const volunteerSnap = await transaction.get(volunteerRef);
    if (volunteerSnap.exists) {
      throw new Error("Already registered for this event");
    }

    const eventData = eventSnap.data();
    const currentVolunteers = eventData?.needs?.volunteers?.current || 0;
    const volunteerGoal = eventData?.needs?.volunteers?.goal;

    if (volunteerGoal && currentVolunteers >= volunteerGoal) {
      throw new Error("Event has reached its volunteer capacity");
    }

    // 1. Update event document
    transaction.update(eventRef, {
      "needs.volunteers.current": currentVolunteers + 1,
      updatedAt: new Date()
    });

    // 2. Add to event's volunteers subcollection
    transaction.set(volunteerRef, {
      userId,
      userName,
      userEmail,
      ticketId,
      signedUpAt: new Date()
    });

    // 3. Add to user's registrations subcollection
    transaction.set(userRegistrationRef, {
      eventId,
      ticketId,
      signedUpAt: new Date(),
      status: "registered"
    });
  });
}
