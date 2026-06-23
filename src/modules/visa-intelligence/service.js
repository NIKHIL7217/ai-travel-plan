const COUNTRY_ALIASES = {
  uae: "United Arab Emirates",
  usa: "United States",
  us: "United States",
  uk: "United Kingdom"
};

const INDIA_VISA_FREE = new Set([
  "Bhutan",
  "Nepal",
  "Thailand",
  "Indonesia",
  "Maldives",
  "Mauritius",
  "Seychelles",
  "Sri Lanka"
]);

const INDIA_EVISA = new Set([
  "Turkey",
  "Vietnam",
  "Kenya",
  "United Arab Emirates",
  "Singapore",
  "Cambodia"
]);

const INDIA_VOA = new Set([
  "Qatar",
  "Jordan",
  "Laos",
  "Tanzania"
]);

const PURPOSE_DOCUMENTS = {
  tourism: [
    "Valid passport (minimum 6 months validity)",
    "Confirmed return tickets",
    "Hotel booking or host address proof",
    "Recent bank statement"
  ],
  business: [
    "Valid passport (minimum 6 months validity)",
    "Business invitation letter",
    "Company cover letter",
    "Financial proof and return ticket"
  ],
  student: [
    "Valid passport (minimum 6 months validity)",
    "Offer letter from institution",
    "Proof of funds",
    "Medical insurance"
  ]
};

function normalizeWord(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCountryName(raw) {
  const text = normalizeWord(raw);
  if (!text) {
    return "";
  }

  const lower = text.toLowerCase();
  if (COUNTRY_ALIASES[lower]) {
    return COUNTRY_ALIASES[lower];
  }

  return text
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function inferDestinationCountry(destinationName, destinationLocation) {
  const location = normalizeWord(destinationLocation);
  const name = normalizeWord(destinationName);

  if (location) {
    return normalizeCountryName(location.split(",").pop());
  }

  return normalizeCountryName(name.split(",").pop());
}

function buildCommonRecommendations(visaRequired) {
  const common = [
    "Always verify latest rules with the official embassy/consulate before booking.",
    "Keep digital + printed copies of all travel documents.",
    "Track passport expiry and blank-page availability."
  ];

  if (visaRequired) {
    return [
      "Start visa preparation at least 3 to 6 weeks before departure.",
      ...common
    ];
  }

  return [
    "Carry onward travel proof and accommodation details at immigration.",
    ...common
  ];
}

function evaluateForIndianPassport(country, purpose, durationDays) {
  const docs = PURPOSE_DOCUMENTS[purpose] || PURPOSE_DOCUMENTS.tourism;

  if (INDIA_VISA_FREE.has(country)) {
    return {
      visaRequired: false,
      statusLabel: "Likely Visa-Free",
      visaType: "Visa-Free Entry",
      processingTime: "No pre-approval required",
      estimatedCostUsd: 0,
      stayLimit: durationDays > 30 ? "Likely 30 days standard entry" : `${durationDays} days usually acceptable`,
      confidence: "medium",
      documentsRequired: docs,
      recommendations: buildCommonRecommendations(false)
    };
  }

  if (INDIA_VOA.has(country)) {
    return {
      visaRequired: true,
      statusLabel: "Likely Visa on Arrival",
      visaType: "Visa on Arrival",
      processingTime: "Same day at immigration counter",
      estimatedCostUsd: 30,
      stayLimit: "Typically 14 to 30 days",
      confidence: "medium",
      documentsRequired: docs,
      recommendations: buildCommonRecommendations(true)
    };
  }

  if (INDIA_EVISA.has(country)) {
    return {
      visaRequired: true,
      statusLabel: "Likely eVisa",
      visaType: "Tourist eVisa",
      processingTime: "2 to 7 business days",
      estimatedCostUsd: 45,
      stayLimit: "Usually 30 to 90 days depending on category",
      confidence: "medium",
      documentsRequired: docs,
      recommendations: buildCommonRecommendations(true)
    };
  }

  return {
    visaRequired: true,
    statusLabel: "Likely Pre-Approved Visa",
    visaType: "Embassy/Consulate Visa",
    processingTime: "5 to 20 business days",
    estimatedCostUsd: 90,
    stayLimit: "As per embassy approval",
    confidence: "low",
    documentsRequired: docs,
    recommendations: buildCommonRecommendations(true)
  };
}

export async function getVisaIntelligence({
  destinationName,
  destinationLocation,
  nationality,
  purpose = "tourism",
  durationDays = 7
} = {}) {
  const safeDestination = normalizeWord(destinationName);
  if (!safeDestination) {
    throw new Error("Destination is required for visa intelligence.");
  }

  const country = inferDestinationCountry(destinationName, destinationLocation) || safeDestination;
  const normalizedNationality = normalizeCountryName(nationality || "Indian");
  const normalizedPurpose = ["tourism", "business", "student"].includes(String(purpose || "").toLowerCase())
    ? String(purpose).toLowerCase()
    : "tourism";
  const normalizedDuration = Math.max(1, Math.min(180, Number(durationDays || 7)));

  if (normalizedNationality.toLowerCase().includes(country.toLowerCase())) {
    return {
      destination: safeDestination,
      destinationCountry: country,
      nationality: normalizedNationality,
      purpose: normalizedPurpose,
      durationDays: normalizedDuration,
      visaRequired: false,
      statusLabel: "No International Visa Needed",
      visaType: "Domestic / Citizen Entry",
      processingTime: "Not applicable",
      estimatedCostUsd: 0,
      stayLimit: "As per domestic regulations",
      confidence: "high",
      documentsRequired: [
        "Government-issued identity proof",
        "Transport booking confirmation"
      ],
      recommendations: buildCommonRecommendations(false),
      advisoryNote: "This looks like domestic/citizen travel. Keep ID proof and check local permit rules if applicable."
    };
  }

  let policy;
  if (normalizedNationality.toLowerCase().includes("indian") || normalizedNationality.toLowerCase() === "india") {
    policy = evaluateForIndianPassport(country, normalizedPurpose, normalizedDuration);
  } else {
    policy = {
      visaRequired: true,
      statusLabel: "Check Official Embassy Rules",
      visaType: "Country-specific",
      processingTime: "Depends on nationality and destination",
      estimatedCostUsd: 80,
      stayLimit: "Depends on visa category",
      confidence: "low",
      documentsRequired: PURPOSE_DOCUMENTS[normalizedPurpose] || PURPOSE_DOCUMENTS.tourism,
      recommendations: buildCommonRecommendations(true)
    };
  }

  return {
    destination: safeDestination,
    destinationCountry: country,
    nationality: normalizedNationality,
    purpose: normalizedPurpose,
    durationDays: normalizedDuration,
    ...policy,
    advisoryNote:
      "Visa intelligence is advisory only. Rules can change without notice; confirm with official embassy/consulate portals before travel."
  };
}
