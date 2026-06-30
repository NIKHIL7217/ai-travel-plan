/**
 * Optional backend client.
 *
 * When VITE_API_BASE_URL is set, the app routes AI calls through the WanderAI
 * API server (admin-api-server) so the Gemini key stays server-side. When it is
 * not set, callers fall back to direct browser calls.
 */

export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function isBackendEnabled() {
  return Boolean(API_BASE_URL);
}

/**
 * Streams a chat reply from the backend SSE endpoint. Returns the full text, or
 * null if the backend is not enabled / fails so the caller can fall back.
 */
export async function backendChatStream({ messages, system, signal, onToken }) {
  if (!isBackendEnabled()) {
    return null;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, system }),
      signal
    });
  } catch (_error) {
    return null;
  }

  if (!response.ok || !response.body) {
    return null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) {
          continue;
        }
        const jsonText = line.slice(5).trim();
        if (!jsonText) {
          continue;
        }
        try {
          const parsed = JSON.parse(jsonText);
          if (parsed?.text) {
            fullText += parsed.text;
            onToken?.(parsed.text, fullText);
          }
        } catch (_error) {
          // Ignore malformed partial chunk.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText.trim() || null;
}

/**
 * Requests JSON/text generation from the backend. Returns the text, or null.
 */
export async function backendGenerate({ prompt, json = true, signal }) {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, json }),
      signal
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return typeof data?.text === "string" ? data.text : null;
  } catch (_error) {
    return null;
  }
}

/**
 * Saves a trip to the backend. Returns the stored record or null.
 */
export async function backendSaveTrip(trip, userId = "guest") {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title: trip?.title || trip?.destination || "Saved Trip",
        destination: trip?.destination || "",
        data: trip
      })
    });
    if (!response.ok) {
      return null;
    }
    const json = await response.json();
    return json?.trip || null;
  } catch (_error) {
    return null;
  }
}

/**
 * Lists trips for a user from the backend. Returns an array or null.
 */
export async function backendListTrips(userId = "guest") {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/trips?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      return null;
    }
    const json = await response.json();
    return Array.isArray(json?.trips) ? json.trips : null;
  } catch (_error) {
    return null;
  }
}

/**
 * Deletes a trip from the backend. Returns true on success.
 */
export async function backendDeleteTrip(id) {
  if (!isBackendEnabled()) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/trips/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    return response.ok;
  } catch (_error) {
    return false;
  }
}
