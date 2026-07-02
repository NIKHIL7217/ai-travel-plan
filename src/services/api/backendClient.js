/**
 * Backend API client for admin server integration
 */

const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL || "http://localhost:3001/api";

export function isBackendEnabled() {
  return Boolean(import.meta.env.VITE_ADMIN_API_URL);
}

export async function backendSaveTrip(userId, tripData) {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const response = await fetch(`${ADMIN_API_URL}/trips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId, ...tripData })
    });

    if (!response.ok) {
      throw new Error(`Backend save failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn("Backend trip save failed:", error);
    return null;
  }
}

export async function backendListTrips(userId) {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const response = await fetch(`${ADMIN_API_URL}/trips?userId=${userId}`);

    if (!response.ok) {
      throw new Error(`Backend list failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn("Backend trip list failed:", error);
    return null;
  }
}

export async function backendDeleteTrip(userId, tripId) {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const response = await fetch(`${ADMIN_API_URL}/trips/${tripId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error(`Backend delete failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn("Backend trip delete failed:", error);
    return null;
  }
}

export async function* backendChatStream(messages, context = {}) {
  if (!isBackendEnabled()) {
    return;
  }

  try {
    const response = await fetch(`${ADMIN_API_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages, context })
    });

    if (!response.ok) {
      throw new Error(`Chat stream failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              yield parsed.text;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    console.warn("Backend chat stream failed:", error);
  }
}

