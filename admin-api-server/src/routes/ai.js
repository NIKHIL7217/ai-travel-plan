import { Router } from "express";
import { generateUrl, isConfigured, streamUrl } from "../lib/gemini.js";

const router = Router();

function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }
  return parts.map((part) => String(part?.text || "")).join("");
}

/**
 * Generic text/JSON generation. The browser sends only a prompt; the API key
 * never leaves the server.
 */
router.post("/generate", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "Gemini not configured on server." });
  }

  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) {
    return res.status(400).json({ error: "prompt is required." });
  }

  const wantsJson = req.body?.json !== false;

  try {
    const upstream = await fetch(generateUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: wantsJson ? { responseMimeType: "application/json" } : {}
      })
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Gemini error ${upstream.status}` });
    }

    const data = await upstream.json();
    return res.json({ text: extractText(data) });
  } catch (error) {
    return res.status(502).json({ error: "Upstream request failed." });
  }
});

/**
 * Conversational chat with SSE streaming. Proxies Gemini's streamGenerateContent
 * and forwards plain text deltas to the browser as Server-Sent Events.
 */
router.post("/chat", async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "Gemini not configured on server." });
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const system = String(req.body?.system || "").trim();

  const contents = messages
    .filter((message) => String(message?.text || "").trim())
    .slice(-16)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.text).trim() }]
    }));

  if (!contents.length) {
    return res.status(400).json({ error: "messages are required." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const upstream = await fetch(streamUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 1024 }
      })
    });

    if (!upstream.ok || !upstream.body) {
      res.write(`event: error\ndata: ${JSON.stringify({ status: upstream.status })}\n\n`);
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

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
          const chunk = extractText(JSON.parse(jsonText));
          if (chunk) {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          }
        } catch (_error) {
          // Ignore malformed partial chunk.
        }
      }
    }

    res.write("event: done\ndata: {}\n\n");
    return res.end();
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: "stream failed" })}\n\n`);
    return res.end();
  }
});

export default router;
