const COMMON_ALERTS = [
  {
    id: "transport-overcharge",
    title: "Transport overcharge pressure",
    severity: "moderate",
    hotspot: "airport and station exits",
    timeWindow: "all-day",
    description: "Unmetered rides and inflated first-quote fares are common near high-arrival zones.",
    avoidance: "Use app-based rides or pre-paid counters and confirm fare before boarding."
  },
  {
    id: "tour-photo-trap",
    title: "Tour photo and guide trap",
    severity: "low",
    hotspot: "landmark entry corridors",
    timeWindow: "10:00-18:00",
    description: "Aggressive photo helpers or fake guides may demand unplanned payment.",
    avoidance: "Choose verified guides and agree on price upfront."
  },
  {
    id: "card-skim-risk",
    title: "Card skimming and cash split risk",
    severity: "moderate",
    hotspot: "nightlife and high-footfall retail",
    timeWindow: "18:00-01:00",
    description: "Card handling visibility and forced cash split attempts can increase at crowded payment points.",
    avoidance: "Prefer contactless payment and avoid handing over card out of sight."
  }
];

import { getTestingScamData } from "../../data/testing/featureDataset";

const DEMO_DATA_ENABLED =
  import.meta.env.VITE_NO_MOCK_DATA_POLICY === "false" && import.meta.env.VITE_DEMO_MODE === "true";

const DESTINATION_ALERTS = {
  goa: [
    {
      id: "beach-rental-duplication",
      title: "Beach rental duplication",
      severity: "moderate",
      hotspot: "major beach lanes",
      timeWindow: "12:00-21:00",
      description: "Duplicate booking claims for bikes, shacks, or activity slots can appear in peak windows.",
      avoidance: "Keep booking receipts and verify provider name before payment."
    },
    {
      id: "night-party-bill-padding",
      title: "Night party bill padding",
      severity: "high",
      hotspot: "late-night clubs",
      timeWindow: "22:00-03:00",
      description: "Unexpected service additions and item duplication may occur in late-night settlements.",
      avoidance: "Review bill line-by-line and pay via traceable digital method."
    }
  ],
  delhi: [
    {
      id: "fake-monument-guide",
      title: "Unofficial monument guide pressure",
      severity: "moderate",
      hotspot: "historic monument gates",
      timeWindow: "09:00-18:00",
      description: "Unverified guides may pressure tourists with false entry restrictions.",
      avoidance: "Use official kiosk or app-listed guide channels."
    }
  ],
  paris: [
    {
      id: "bracelet-and-signature-scam",
      title: "Bracelet and petition scam",
      severity: "high",
      hotspot: "top monuments and plazas",
      timeWindow: "10:00-20:00",
      description: "Forced souvenir placement and fake petitions are common near landmark queues.",
      avoidance: "Keep walking, avoid unsolicited interactions, and protect bags in crowds."
    }
  ],
  bali: [
    {
      id: "scooter-damage-claim",
      title: "Scooter damage claim pressure",
      severity: "moderate",
      hotspot: "rental clusters",
      timeWindow: "all-day",
      description: "Post-rental damage claims can be inflated without pre-check proof.",
      avoidance: "Record pickup photos/videos and ensure written contract terms."
    }
  ]
};

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveDestinationKey(destinationName, destinationLocation) {
  const source = `${normalizeText(destinationName)} ${normalizeText(destinationLocation)}`.toLowerCase();
  const keys = Object.keys(DESTINATION_ALERTS);
  return keys.find((key) => source.includes(key)) || "";
}

function severityWeight(severity) {
  const normalized = String(severity || "").toLowerCase();
  if (normalized === "high") return 28;
  if (normalized === "moderate") return 18;
  return 9;
}

function riskLevelFromScore(score) {
  if (score >= 78) return "High";
  if (score >= 52) return "Moderate";
  return "Low";
}

function byUniqueId(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const id = normalizeText(item?.id).toLowerCase();
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function timeBandLabel(inputBand = "") {
  const band = normalizeText(inputBand).toLowerCase();
  if (!band || band === "auto") {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 23) return "evening";
    return "night";
  }
  return band;
}

function safeZones(destinationName) {
  const destination = normalizeText(destinationName) || "destination";
  return [
    `Main transport hubs with official counters in ${destination}`,
    `Verified hospitality clusters with card-enabled billing`,
    `Well-lit primary streets and high-footfall public corridors`
  ];
}

export async function getScamAlerts(options = {}) {
  const destinationName = normalizeText(options.destinationName || options.destination || "");
  const destinationLocation = normalizeText(options.destinationLocation || options.location || "");
  const travelMode = normalizeText(options.travelMode || "general") || "general";
  const band = timeBandLabel(options.timeBand || options.timeOfDay || "auto");

  const testingScam = DEMO_DATA_ENABLED
    ? getTestingScamData(destinationName || destinationLocation || "")
    : null;
  if (testingScam?.alerts?.length) {
    return {
      ...testingScam,
      destination: destinationName || destinationLocation || testingScam.destination,
      travelMode,
      timeBand: band,
      generatedAt: new Date().toISOString()
    };
  }

  const destinationKey = resolveDestinationKey(destinationName, destinationLocation);
  const destinationAlerts = destinationKey ? DESTINATION_ALERTS[destinationKey] : [];
  const mergedAlerts = byUniqueId([...destinationAlerts, ...COMMON_ALERTS]).slice(0, 6);

  const riskScore = Math.min(
    96,
    Math.max(
      18,
      Math.round(
        mergedAlerts.reduce((sum, alert) => sum + severityWeight(alert.severity), 0) /
          Math.max(1, mergedAlerts.length) +
          (band === "night" ? 12 : band === "evening" ? 7 : 2)
      )
    )
  );

  const level = riskLevelFromScore(riskScore);
  const advisory =
    level === "High"
      ? "Scam pressure elevated for this route profile. Use verified channels, avoid cash-first settlements, and keep receipts."
      : level === "Moderate"
        ? "Scam risk is manageable with standard checks. Confirm prices and avoid unverified tout interactions."
        : "Scam signals are currently limited. Continue standard travel verification habits.";

  return {
    destination: destinationName || destinationLocation || "Current destination",
    travelMode,
    timeBand: band,
    riskScore,
    level,
    alerts: mergedAlerts,
    safeZones: safeZones(destinationName || destinationLocation),
    emergencyContacts: [
      "Local emergency hotline",
      "Tourist police support desk",
      "Embassy or consular helpline"
    ],
    advisory,
    generatedAt: new Date().toISOString()
  };
}
