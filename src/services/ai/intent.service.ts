import { isGeminiConfigured, requestGeminiJson } from "./planner.service";

const STYLE_MAP = [
  { match: ["balanced", "normal", "regular"], value: "Balanced" },
  { match: ["luxury", "premium", "high-end"], value: "Luxury" },
  { match: ["adventure", "trek", "hiking", "camping"], value: "Adventure" },
  { match: ["budget", "cheap", "low cost", "affordable"], value: "Budget" },
  { match: ["comfort", "relaxed"], value: "Comfort" }
];

const MODE_MAP = [
  { match: ["flight", "plane", "air"], value: "Flight" },
  { match: ["train", "rail"], value: "Train" },
  { match: ["bus", "coach"], value: "Bus" },
  { match: ["bike", "motorbike", "scooter"], value: "Bike" },
  { match: ["car", "drive", "roadtrip", "road trip"], value: "Car" }
];

const STAY_MAP = [
  { match: ["hostel", "dorm"], value: "hostel" },
  { match: ["budget hotel", "budget stay", "cheap stay"], value: "budget" },
  { match: ["mid", "mid-range", "mid range"], value: "mid-range" },
  { match: ["premium"], value: "premium" },
  { match: ["luxury", "resort", "5 star"], value: "luxury" }
];

const FOOD_MAP = [
  { match: ["street food", "street"], value: "street" },
  { match: ["local food", "regional food", "local"], value: "local" },
  { match: ["fine dining", "fine-dining", "fine"], value: "fine-dining" },
  { match: ["mixed", "mix"], value: "mixed" }
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "my",
  "trip",
  "plan",
  "travel",
  "for",
  "with",
  "and",
  "from",
  "to",
  "in",
  "on",
  "of",
  "days",
  "day",
  "people",
  "person",
  "balanced",
  "normal",
  "regular",
  "budget",
  "comfort",
  "luxury",
  "premium",
  "adventure",
  "flight",
  "train",
  "bus",
  "bike",
  "car",
  "by"
]);

function containsAny(text: string, candidates: string[]) {
  return candidates.some((item) => text.includes(item));
}

function titleCase(value: string) {
  return String(value || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .trim();
}

function normalizeMultilingualPrompt(rawPrompt: string) {
  let normalized = String(rawPrompt || "")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of HINGLISH_NORMALIZATION_MAP) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDestination(raw: string) {
  const cleaned = String(raw || "")
    .replace(/[^\p{L}\p{M}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  const words = cleaned
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !STOP_WORDS.has(item.toLowerCase()))
    .slice(0, 4);

  return titleCase(words.join(" "));
}

function parseBudget(rawValue: string, suffix = "") {
  const amount = Number(String(rawValue || "").replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const suffixClean = String(suffix || "").toLowerCase();
  if (suffixClean === "k") {
    return Math.round(amount * 1000);
  }
  if (suffixClean === "m") {
    return Math.round(amount * 1000000);
  }
  if (suffixClean === "lakh" || suffixClean === "lac") {
    return Math.round(amount * 100000);
  }

  return Math.round(amount);
}

function parseHeuristicIntent(prompt: string) {
  const text = normalizeMultilingualPrompt(prompt);
  const lower = text.toLowerCase();
  const patch: Record<string, unknown> = {};
  const explicitFields: string[] = [];

  const fromTo = text.match(/from\s+([a-zA-Z\s-]{2,40})\s+to\s+([a-zA-Z\s-]{2,40})/i);
  if (fromTo?.[1] && fromTo?.[2]) {
    const origin = normalizeDestination(fromTo[1]);
    const destination = normalizeDestination(fromTo[2]);

    if (origin) {
      patch.origin = origin;
      explicitFields.push("origin");
    }
    if (destination) {
      patch.destination = destination;
      explicitFields.push("destination");
    }
  }

  if (!patch.destination) {
    const seTo = text.match(/([a-zA-Z\s-]{2,35})\s+se\s+([a-zA-Z\s-]{2,35})/i);
    if (seTo?.[1] && seTo?.[2]) {
      const origin = normalizeDestination(seTo[1]);
      const destination = normalizeDestination(seTo[2]);

      if (origin) {
        patch.origin = origin;
        explicitFields.push("origin");
      }
      if (destination) {
        patch.destination = destination;
        explicitFields.push("destination");
      }
    }
  }

  if (!patch.destination) {
    const toDestination = text.match(/(?:trip\s+to|travel\s+to|going\s+to|to)\s+([a-zA-Z\s-]{2,40})/i);
    if (toDestination?.[1]) {
      const destination = normalizeDestination(toDestination[1]);
      if (destination) {
        patch.destination = destination;
        explicitFields.push("destination");
      }
    }
  }

  if (!patch.destination) {
    const jaanePattern = text.match(/([a-zA-Z\s-]{2,35})\s+(?:jaane|jana|jaana|visit|ghumne|ghumna|ghoomne)/i);
    if (jaanePattern?.[1]) {
      const destination = normalizeDestination(jaanePattern[1]);
      if (destination) {
        patch.destination = destination;
        explicitFields.push("destination");
      }
    }
  }

  if (!patch.destination) {
    const beforeTripPattern = text.match(/([\p{L}\p{M}\s-]{2,35})\s+trip/iu);
    if (beforeTripPattern?.[1]) {
      const destination = normalizeDestination(beforeTripPattern[1]);
      if (destination) {
        patch.destination = destination;
        explicitFields.push("destination");
      }
    }
  }

  if (!patch.destination) {
    const singlePlacePattern = text.match(/^\s*([\p{L}\p{M}\s-]{2,35})\s*$/iu);
    if (singlePlacePattern?.[1]) {
      const destination = normalizeDestination(singlePlacePattern[1]);
      if (destination) {
        patch.destination = destination;
        explicitFields.push("destination");
      }
    }
  }

  if (!patch.destination) {
    const destinationBeforeBudgetPattern = text.match(/^\s*([\p{L}\p{M}\s-]{2,35})\s+(?:₹|rs\.?|inr|\$|usd|\d)/iu);
    if (destinationBeforeBudgetPattern?.[1]) {
      const destination = normalizeDestination(destinationBeforeBudgetPattern[1]);
      if (destination) {
        patch.destination = destination;
        explicitFields.push("destination");
      }
    }
  }

  if (!patch.destination) {
    const kiTripPattern = text.match(/([\p{L}\p{M}\s-]{2,35})\s+(?:ki|ka)\s+trip/iu);
    if (kiTripPattern?.[1]) {
      const destination = normalizeDestination(kiTripPattern[1]);
      if (destination) {
        patch.destination = destination;
        explicitFields.push("destination");
      }
    }
  }

  if (!patch.destination) {
    const ghumnaHaiPattern = text.match(/([\p{L}\p{M}\s-]{2,35})\s+(?:ghumna|ghumna hai|visit|dekhna hai)/iu);
    if (ghumnaHaiPattern?.[1]) {
      const destination = normalizeDestination(ghumnaHaiPattern[1]);
      if (destination) {
        patch.destination = destination;
        explicitFields.push("destination");
      }
    }
  }

  if (!patch.destination) {
    const janeKaPlanPattern = text.match(/([\p{L}\p{M}\s-]{2,35})\s+(?:jana|jane)\s+ka\s+plan/iu);
    if (janeKaPlanPattern?.[1]) {
      const destination = normalizeDestination(janeKaPlanPattern[1]);
      if (destination) {
        patch.destination = destination;
        explicitFields.push("destination");
      }
    }
  }

  const daysMatch = text.match(/(\d+)\s*(?:day|days|din)/i);
  if (daysMatch?.[1]) {
    patch.days = Math.max(2, Math.min(15, Number(daysMatch[1])));
    explicitFields.push("days");
  }

  const travelerMatch = text.match(/(\d+)\s*(?:traveler|travelers|traveller|travellers|people|person|adult|adults|bande|bando|bndo|bndo ka)/i);
  if (travelerMatch?.[1]) {
    patch.travelers = Math.max(1, Math.min(8, Number(travelerMatch[1])));
    explicitFields.push("travelers");
  }

  const budgetMatch = text.match(/(?:under|below|max(?:imum)?|budget(?:\s*of)?|within)\s*(?:₹|rs\.?|inr|\$|usd)?\s*([\d,]+(?:\.\d+)?)\s*(k|m|lakh|lac)?/i);
  if (budgetMatch?.[1]) {
    const parsed = parseBudget(budgetMatch[1], budgetMatch[2] || "");
    if (parsed && parsed >= 200) {
      patch.maxBudget = parsed;
      explicitFields.push("maxBudget");
    }
  }

  if (!patch.maxBudget) {
    const budgetAfterAmountMatch = text.match(/(?:₹|rs\.?|inr|\$|usd)?\s*([\d,]+(?:\.\d+)?)\s*(k|m|lakh|lac)?\s*(?:tak|tkk|tk|upto|up\s*to)?\s*(?:ka|ke|k)?\s*budget/i);
    if (budgetAfterAmountMatch?.[1]) {
      const parsed = parseBudget(budgetAfterAmountMatch[1], budgetAfterAmountMatch[2] || "");
      if (parsed && parsed >= 200) {
        patch.maxBudget = parsed;
        explicitFields.push("maxBudget");
      }
    }
  }

  for (const item of STYLE_MAP) {
    if (containsAny(lower, item.match)) {
      patch.style = item.value;
      explicitFields.push("style");
      break;
    }
  }

  for (const item of MODE_MAP) {
    if (containsAny(lower, item.match)) {
      patch.travelMode = item.value;
      explicitFields.push("travelMode");
      break;
    }
  }

  for (const item of STAY_MAP) {
    if (containsAny(lower, item.match)) {
      patch.stayPreference = item.value;
      explicitFields.push("stayPreference");
      break;
    }
  }

  for (const item of FOOD_MAP) {
    if (containsAny(lower, item.match)) {
      patch.foodPreference = item.value;
      explicitFields.push("foodPreference");
      break;
    }
  }

  return {
    patch,
    explicitFields: [...new Set(explicitFields)],
    confidence: Math.min(95, 30 + [...new Set(explicitFields)].length * 10),
    source: "heuristic"
  };
}

function sanitizeIntentPatch(rawPatch: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};

  if (typeof rawPatch.origin === "string" && rawPatch.origin.trim()) {
    patch.origin = normalizeDestination(rawPatch.origin);
  }

  if (typeof rawPatch.destination === "string" && rawPatch.destination.trim()) {
    patch.destination = normalizeDestination(rawPatch.destination);
  }

  const days = Number(rawPatch.days);
  if (Number.isFinite(days) && days > 0) {
    patch.days = Math.max(2, Math.min(15, Math.round(days)));
  }

  const travelers = Number(rawPatch.travelers);
  if (Number.isFinite(travelers) && travelers > 0) {
    patch.travelers = Math.max(1, Math.min(8, Math.round(travelers)));
  }

  const maxBudget = Number(rawPatch.maxBudget);
  if (Number.isFinite(maxBudget) && maxBudget >= 200) {
    patch.maxBudget = Math.round(maxBudget);
  }

  if (typeof rawPatch.style === "string" && rawPatch.style.trim()) {
    patch.style = titleCase(rawPatch.style.trim());
  }

  if (typeof rawPatch.travelMode === "string" && rawPatch.travelMode.trim()) {
    patch.travelMode = titleCase(rawPatch.travelMode.trim());
  }

  if (typeof rawPatch.stayPreference === "string" && rawPatch.stayPreference.trim()) {
    patch.stayPreference = String(rawPatch.stayPreference).trim().toLowerCase();
  }

  if (typeof rawPatch.foodPreference === "string" && rawPatch.foodPreference.trim()) {
    patch.foodPreference = String(rawPatch.foodPreference).trim().toLowerCase();
  }

  return patch;
}

async function parseGeminiIntent(prompt: string, currentControls: Record<string, unknown>) {
  if (!isGeminiConfigured()) {
    return null;
  }

  const parserPrompt = `
You are an intent parser for a travel planner form.
The parser should understand casual chat language (including Hinglish) in the user input, but MUST OUTPUT TEXT ONLY IN ENGLISH. Do not include any Hinglish or Hindi in the output.
Extract only values that are explicitly present in the user prompt.
If a field is not explicit, set it to null.

Current controls context:
${JSON.stringify(currentControls || {}, null, 2)}

User prompt:
${prompt}

Return a strict JSON object only. All textual fields (including filter ) must be in English:
{
  "origin": "string or null",
  "destination": "string or null",
  "days": "number or null",
  "travelers": "number or null",
  "maxBudget": "number or null",
  "style": "Budget|Balanced|Comfort|Luxury|Adventure|null",
  "travelMode": "Flight|Train|Bus|Car|Bike|null",
  "stayPreference": "hostel|budget|mid-range|premium|luxury|null",
  "foodPreference": "street|local|mixed|fine-dining|null",
  "filters": ["short notes of constraints from prompt"],
  "confidence": "0-100 integer"
}
`;

  const result = await requestGeminiJson<Record<string, unknown>>({ prompt: parserPrompt });
  if (!result || typeof result !== "object") {
    return null;
  }

  const sanitizedPatch = sanitizeIntentPatch(result);
  const explicitFields = Object.keys(sanitizedPatch);
  const confidence = Math.max(0, Math.min(100, Math.round(Number(result.confidence || 0))));
  const filters = Array.isArray(result.filters)
    ? result.filters.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6)
    : [];

  return {
    patch: sanitizedPatch,
    explicitFields,
    confidence,
    source: "gemini",
    filters
  };
}

export async function extractTripIntent(prompt: string, currentControls: Record<string, unknown> = {}) {
  const sourcePrompt = normalizeMultilingualPrompt(prompt);

  if (!sourcePrompt) {
    return {
      patch: {},
      explicitFields: [],
      confidence: 0,
      source: "heuristic",
      filters: []
    };
  }

  const heuristic = parseHeuristicIntent(sourcePrompt);

  try {
    const gemini = await parseGeminiIntent(sourcePrompt, currentControls);
    if (!gemini) {
      return {
        ...heuristic,
        filters: []
      };
    }

    const mergedPatch: Record<string, unknown> = {
      ...gemini.patch,
      ...heuristic.patch
    };

    const explicitFields = [...new Set([...(gemini.explicitFields || []), ...(heuristic.explicitFields || [])])];
    const confidence = Math.max(heuristic.confidence, gemini.confidence || 0);

    return {
      patch: mergedPatch,
      explicitFields,
      confidence,
      source: "hybrid",
      filters: gemini.filters || []
    };
  } catch (error) {
    return {
      ...heuristic,
      filters: []
    };
  }
}
