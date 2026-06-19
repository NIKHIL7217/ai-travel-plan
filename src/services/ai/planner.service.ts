/**
 * Shared Gemini AI client utilities for travel planning services.
 */

export interface GeminiJsonRequest {
  prompt: string;
  signal?: AbortSignal;
}

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
export const REAL_DATA_ONLY = import.meta.env.VITE_REAL_DATA_ONLY !== "false";
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
export const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export function isGeminiConfigured(): boolean {
  return Boolean(GEMINI_API_KEY);
}

export function safeJsonParse<T = unknown>(text: string, fallback: T | null = null): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    return fallback;
  }
}

export function extractJsonObject<T = Record<string, unknown>>(text: string): T | null {
  if (!text) {
    return null;
  }

  const direct = safeJsonParse<T>(text, null);
  if (direct && typeof direct === "object") {
    return direct;
  }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    const fenced = safeJsonParse<T>(fenceMatch[1].trim(), null);
    if (fenced && typeof fenced === "object") {
      return fenced;
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = text.slice(firstBrace, lastBrace + 1);
    const parsed = safeJsonParse<T>(sliced, null);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  }

  return null;
}

export async function requestGeminiJson<T = unknown>({ prompt, signal }: GeminiJsonRequest): Promise<T | null> {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return extractJsonObject<T>(text) || safeJsonParse<T>(text, null);
}
