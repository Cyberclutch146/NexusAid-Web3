// Native fetch is available in Node 22+

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting API Verification Tests...\n');

  // 1. Test Chat API
  console.log('--- Testing Chat API ---');
  try {
    const res = await fetch(`${BASE_URL}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'test-event-123',
        userId: 'test-user-123',
        userName: 'Test User',
        text: 'Automated test message'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status, 'Response:', data);
  } catch (e) {
    console.error('Chat API Failed:', e.message);
  }

  // 2. Test User Profile API (Create)
  console.log('\n--- Testing User Profile API (Create) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        userId: 'test-user-123',
        data: {
          name: 'Test User',
          email: 'test@example.com',
          role: 'volunteer'
        }
      })
    });
    const data = await res.json();
    console.log('Status:', res.status, 'Response:', data);
  } catch (e) {
    console.error('Profile Create Failed:', e.message);
  }

  // 3. Test User Profile API (Update)
  console.log('\n--- Testing User Profile API (Update) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/user/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        userId: 'test-user-123',
        data: {
          bio: 'Updated via automation'
        }
      })
    });
    const data = await res.json();
    console.log('Status:', res.status, 'Response:', data);
  } catch (e) {
    console.error('Profile Update Failed:', e.message);
  }

  // 4. Test Attendance Scan API
  // Note: This might return 404 if the test IDs don't exist in Firestore, 
  // but a 404 from the logic is better than a 500 crash.
  console.log('\n--- Testing Attendance Scan API ---');
  try {
    const res = await fetch(`${BASE_URL}/api/events/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'test-event-123',
        volunteerId: 'test-volunteer-123',
        attended: true
      })
    });
    const data = await res.json();
    console.log('Status:', res.status, 'Response:', data);
  } catch (e) {
    console.error('Scan API Failed:', e.message);
  }

  console.log('\n✅ Testing Complete.');
}

runTests();
