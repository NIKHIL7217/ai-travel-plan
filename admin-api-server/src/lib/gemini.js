import process from "node:process";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function getApiKey() {
  return process.env.GEMINI_API_KEY || "";
}

export function isConfigured() {
  return Boolean(getApiKey());
}

export function generateUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${getApiKey()}`;
}

export function streamUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${getApiKey()}`;
}
