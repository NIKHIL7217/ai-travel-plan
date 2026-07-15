/**
 * Backend API client for admin-api-server integration.
 * Supports trip storage, secure AI chat proxy, and admin telemetry.
 */

import { trackLiveDataDecision } from "../../core/monitoring";

const API_BASE_URL =
  import.meta.env.VITE_ADMIN_API_BASE_URL ||
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "";

const RESOLVED_API_BASE_URL = API_BASE_URL || "http://localhost:8787/api";

export function isBackendEnabled() {
  return Boolean(API_BASE_URL);
}

function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem("roam_auth_session");
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function buildRequesterHeaders() {
  const session = getStoredSession();
  const headers = {};

  if (session?.uid) {
    headers["x-user-id"] = String(session.uid);
  }
  if (session?.email) {
    headers["x-user-email"] = String(session.email).toLowerCase();
  }
  if (session?.role) {
    headers["x-user-role"] = String(session.role).toLowerCase();
  }

  const adminSecret = String(import.meta.env.VITE_ADMIN_API_SECRET || "").trim();
  if (adminSecret) {
    headers["x-admin-secret"] = adminSecret;
  }

  return headers;
}

function withQuery(path, params = {}) {
  const url = new URL(`${RESOLVED_API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function request(path, options = {}) {
  const requesterHeaders = buildRequesterHeaders();
  const inputHeaders = options.headers && typeof options.headers === "object" ? options.headers : {};
  const response = await fetch(`${RESOLVED_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...requesterHeaders,
      ...inputHeaders
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || `Backend request failed: ${response.status}`);
  }

  return data;
}

export async function backendSaveTrip(tripData, userId) {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const data = await request("/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...tripData })
    });

    return data?.trip || null;
  } catch (error) {
    console.warn("Backend trip save failed:", error);
    return null;
  }
}

export async function backendListTrips(userId = "") {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const response = await fetch(withQuery("/trips", { userId }), {
      headers: {
        ...buildRequesterHeaders()
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Backend list failed: ${response.status}`);
    }

    return Array.isArray(data?.trips) ? data.trips : [];
  } catch (error) {
    console.warn("Backend trip list failed:", error);
    return null;
  }
}

export async function backendDeleteTrip(tripId) {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const data = await request(`/trips/${tripId}`, {
      method: "DELETE"
    });
    return Boolean(data?.removed);
  } catch (error) {
    console.warn("Backend trip delete failed:", error);
    return null;
  }
}

export async function backendUpsertUserProfile(user, extras = {}) {
  if (!isBackendEnabled() || !user) {
    return null;
  }

  try {
    const payload = {
      id: user.uid || user.id,
      email: user.email,
      displayName: user.displayName,
      role: extras.role,
      status: extras.status,
      isVerified: extras.isVerified,
      signupSource: extras.signupSource || "app"
    };

    const data = await request("/admin/users/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    return data?.user || null;
  } catch (error) {
    console.warn("Backend user upsert failed:", error);
    return null;
  }
}

export async function backendTrackAuthEvent(eventPayload) {
  if (!isBackendEnabled() || !eventPayload) {
    return null;
  }

  try {
    const data = await request("/admin/events/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload)
    });

    return data?.user || null;
  } catch (error) {
    console.warn("Backend auth event tracking failed:", error);
    return null;
  }
}

export async function backendTrackTripRevenue(eventPayload) {
  if (!isBackendEnabled() || !eventPayload) {
    return null;
  }

  try {
    const data = await request("/admin/events/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload)
    });

    return data?.user || null;
  } catch (error) {
    console.warn("Backend trip revenue tracking failed:", error);
    return null;
  }
}

export async function backendTrackBookingFunnelEvent(eventPayload) {
  if (!isBackendEnabled() || !eventPayload) {
    return null;
  }

  const session = getStoredSession();
  const payload = {
    userId: String(eventPayload.userId || session?.uid || "guest"),
    eventType: String(eventPayload.eventType || "booking.event"),
    stage: eventPayload.stage,
    source: eventPayload.source || "planner.travel-plan-panel",
    tripId: eventPayload.tripId,
    destination: eventPayload.destination,
    amount: Number(eventPayload.amount || 0),
    revenueImpact: Boolean(eventPayload.revenueImpact),
    meta: eventPayload.meta && typeof eventPayload.meta === "object" ? eventPayload.meta : {}
  };

  try {
    const data = await request("/admin/events/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    return data?.user || null;
  } catch (error) {
    console.warn("Backend booking funnel tracking failed:", error);
    return null;
  }
}

export async function backendAdminGetOverview() {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    return await request("/admin/overview");
  } catch (error) {
    console.warn("Backend admin overview failed:", error);
    return null;
  }
}

export async function backendLiveGeocode(query) {
  if (!isBackendEnabled()) {
    trackLiveDataDecision({ feature: "geocode", source: "backend", status: "skipped", reason: "backend_disabled" });
    return null;
  }

  try {
    const response = await fetch(withQuery("/live/geocode", { q: query }), {
      headers: { ...buildRequesterHeaders() }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Backend geocode failed: ${response.status}`);
    }
    trackLiveDataDecision({ feature: "geocode", source: "backend", status: data?.result ? "success" : "empty" });
    return data?.result || null;
  } catch (error) {
    console.warn("Backend geocode failed:", error);
    trackLiveDataDecision({ feature: "geocode", source: "backend", status: "failure", reason: String(error?.message || error || "unknown") });
    return null;
  }
}

export async function backendLiveRoute(origin, destination) {
  if (!isBackendEnabled()) {
    trackLiveDataDecision({ feature: "route", source: "backend", status: "skipped", reason: "backend_disabled" });
    return null;
  }

  try {
    const response = await fetch(withQuery("/live/route", { origin, destination }), {
      headers: { ...buildRequesterHeaders() }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Backend route failed: ${response.status}`);
    }
    trackLiveDataDecision({ feature: "route", source: "backend", status: data?.route ? "success" : "empty" });
    return data?.route || null;
  } catch (error) {
    console.warn("Backend route failed:", error);
    trackLiveDataDecision({ feature: "route", source: "backend", status: "failure", reason: String(error?.message || error || "unknown") });
    return null;
  }
}

export async function backendLivePlaces(lat, lng, type) {
  if (!isBackendEnabled()) {
    trackLiveDataDecision({ feature: `places:${type}`, source: "backend", status: "skipped", reason: "backend_disabled" });
    return null;
  }

  try {
    const response = await fetch(withQuery("/live/places", { lat, lng, type }), {
      headers: { ...buildRequesterHeaders() }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Backend places failed: ${response.status}`);
    }
    trackLiveDataDecision({ feature: `places:${type}`, source: "backend", status: Array.isArray(data?.places) && data.places.length ? "success" : "empty" });
    return Array.isArray(data?.places) ? data.places : [];
  } catch (error) {
    console.warn("Backend places failed:", error);
    trackLiveDataDecision({ feature: `places:${type}`, source: "backend", status: "failure", reason: String(error?.message || error || "unknown") });
    return null;
  }
}

export async function backendLiveWeather(lat, lng) {
  if (!isBackendEnabled()) {
    trackLiveDataDecision({ feature: "weather", source: "backend", status: "skipped", reason: "backend_disabled" });
    return null;
  }

  try {
    const response = await fetch(withQuery("/live/weather", { lat, lng }), {
      headers: { ...buildRequesterHeaders() }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Backend weather failed: ${response.status}`);
    }
    trackLiveDataDecision({ feature: "weather", source: "backend", status: data?.weather ? "success" : "empty" });
    return data?.weather || null;
  } catch (error) {
    console.warn("Backend weather failed:", error);
    trackLiveDataDecision({ feature: "weather", source: "backend", status: "failure", reason: String(error?.message || error || "unknown") });
    return null;
  }
}

export async function backendAdminListUsers() {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const data = await request("/admin/users");
    return Array.isArray(data?.users) ? data.users : [];
  } catch (error) {
    console.warn("Backend admin users failed:", error);
    return null;
  }
}

export async function backendAdminUpdateUser(userId, patch) {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const data = await request(`/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch || {})
    });

    return data?.user || null;
  } catch (error) {
    console.warn("Backend admin update user failed:", error);
    return null;
  }
}

export async function backendAdminDeleteUser(userId) {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const data = await request(`/admin/users/${userId}`, {
      method: "DELETE"
    });

    return Boolean(data?.removed);
  } catch (error) {
    console.warn("Backend admin delete user failed:", error);
    return null;
  }
}

export async function backendChatStream({ messages, system, signal, onToken } = {}) {
  if (!isBackendEnabled()) {
    return null;
  }

  try {
    const response = await fetch(`${RESOLVED_API_BASE_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildRequesterHeaders()
      },
      body: JSON.stringify({ messages, system }),
      signal
    });

    if (!response.ok || !response.body) {
      throw new Error(`Chat stream failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

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

        if (line.startsWith("event: done")) {
          return fullText.trim() || null;
        }

        if (!line.startsWith("data:")) {
          continue;
        }

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const chunk = String(parsed?.text || "");
          if (chunk) {
            fullText += chunk;
            onToken?.(chunk, fullText);
          }
        } catch (_error) {
          // Skip malformed line.
        }
      }
    }

    return fullText.trim() || null;
  } catch (error) {
    console.warn("Backend chat stream failed:", error);
    return null;
  }
}
