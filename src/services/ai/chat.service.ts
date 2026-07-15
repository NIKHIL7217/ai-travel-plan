/**
 * Conversational, multi-turn, streaming Gemini chat for the Travel Copilot.
 *
 * This powers a real Mindtrip-style assistant: it keeps conversation history,
 * streams tokens as they arrive, and is grounded with live trip context.
 * When no API key is configured it returns null so callers can fall back to
 * the lightweight template assistant.
 */
import { GEMINI_API_KEY } from "./planner.service";
import { backendChatStream, isBackendEnabled } from "../api/backendClient";

const STREAM_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
const TEXT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface TravelChatContext {
  routeName?: string;
  destination?: string;
  origin?: string;
  days?: number;
  travelers?: number;
  budgetTotal?: number;
  travelMode?: string;
  isOnline?: boolean;
  pendingDrafts?: number;
  itineraryPreview?: string[];
  memoryContext?: string;
}

export interface StreamTravelChatOptions {
  messages: ChatMessage[];
  context?: TravelChatContext;
  signal?: AbortSignal;
  onToken?: (chunk: string, fullText: string) => void;
}

export function isChatConfigured(): boolean {
  return isBackendEnabled() || Boolean(GEMINI_API_KEY);
}

function buildSystemInstruction(context: TravelChatContext = {}): string {
  const lines: string[] = [
    "You are WanderAI Copilot, a warm, sharp, real-time travel assistant inside a travel planning app.",
    "You help users plan, refine, and run trips. You can answer about budget, itinerary, safety, food, routes, weather, packing, and offline readiness.",
    "Style rules:",
    "- Reply in the SAME language/flavor the user uses. If they write Hinglish, reply in friendly Hinglish.",
    "- Be concise and skimmable. Prefer short paragraphs and tight bullet points.",
    "- Be specific and actionable. Give concrete suggestions, not generic fluff.",
    "- Never invent live prices or bookings you cannot verify; suggest ranges and clearly mark estimates.",
    "- When the user asks to change a plan (cheaper, add adventure, extend a day), explain the concrete adjustments.",
    ""
  ];

  const ctx: string[] = [];
  if (context.routeName) ctx.push(`Current app screen: ${context.routeName}`);
  if (context.destination) ctx.push(`Active destination: ${context.destination}`);
  if (context.origin) ctx.push(`Origin: ${context.origin}`);
  if (context.days) ctx.push(`Trip length: ${context.days} days`);
  if (context.travelers) ctx.push(`Travelers: ${context.travelers}`);
  if (context.budgetTotal) ctx.push(`Projected budget: ${context.budgetTotal} (trip currency)`);
  if (context.travelMode) ctx.push(`Travel mode: ${context.travelMode}`);
  if (typeof context.isOnline === "boolean") ctx.push(`Connectivity: ${context.isOnline ? "online" : "offline"}`);
  if (typeof context.pendingDrafts === "number" && context.pendingDrafts > 0) {
    ctx.push(`Offline drafts pending sync: ${context.pendingDrafts}`);
  }
  if (Array.isArray(context.itineraryPreview) && context.itineraryPreview.length) {
    ctx.push(`Itinerary snapshot: ${context.itineraryPreview.slice(0, 6).join(" | ")}`);
  }
  if (context.memoryContext) ctx.push(`User memory/preferences: ${context.memoryContext}`);

  if (ctx.length) {
    lines.push("Live trip context (use it to ground answers; do not repeat it verbatim):");
    lines.push(ctx.map((line) => `- ${line}`).join("\n"));
  } else {
    lines.push("No active trip context yet. If the user has no trip, gently help them start one.");
  }

  return lines.join("\n");
}

function toGeminiContents(messages: ChatMessage[]) {
  return messages
    .filter((message) => String(message?.text || "").trim().length > 0)
    .slice(-16)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.text).trim() }]
    }));
}

function extractTextFromPayload(payload: unknown): string {
  const parts = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }
  return parts.map((part) => String(part?.text || "")).join("");
}

/**
 * Streams a conversational reply from Gemini. Returns the full text, or null
 * when no key is configured so the caller can use a fallback.
 */
export async function streamTravelChat(options: StreamTravelChatOptions): Promise<string | null> {
  const { messages, context = {}, signal, onToken } = options;
  const system = buildSystemInstruction(context);

  // Prefer the secure backend proxy so the Gemini key stays server-side.
  if (isBackendEnabled()) {
    const backendReply = await backendChatStream({ messages, system, signal, onToken });
    if (backendReply) {
      return backendReply;
    }
    if (!GEMINI_API_KEY) {
      return null;
    }
    // Backend failed but a direct key exists: fall through to direct call.
  }

  if (!GEMINI_API_KEY) {
    return null;
  }

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 1024
    }
  });

  let response: Response;
  try {
    response = await fetch(STREAM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal
    });
  } catch (error) {
    return fallbackNonStreaming(body, signal, onToken);
  }

  if (!response.ok || !response.body) {
    return fallbackNonStreaming(body, signal, onToken);
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
        if (!jsonText || jsonText === "[DONE]") {
          continue;
        }

        try {
          const payload = JSON.parse(jsonText);
          const chunk = extractTextFromPayload(payload);
          if (chunk) {
            fullText += chunk;
            onToken?.(chunk, fullText);
          }
        } catch (_error) {
          // Ignore malformed partial chunk; the next read may complete it.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText.trim() || fallbackNonStreaming(body, signal, onToken);
}

async function fallbackNonStreaming(
  body: string,
  signal?: AbortSignal,
  onToken?: (chunk: string, fullText: string) => void
): Promise<string | null> {
  try {
    const response = await fetch(TEXT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const text = extractTextFromPayload(data).trim();
    if (text) {
      onToken?.(text, text);
    }
    return text || null;
  } catch (_error) {
    return null;
  }
}
