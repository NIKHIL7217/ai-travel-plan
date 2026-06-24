const DESTINATION_GEMS = {
  goa: [
    {
      id: "goa-divar-island-loop",
      name: "Divar Island Quiet Loop",
      category: "Culture",
      budget: "low",
      crowdLevel: "low",
      bestWindow: "07:00-10:00",
      highlight: "Village ferry crossing, old churches, and quiet lanes.",
      whyLocalLoveIt: "Lower traffic and authentic local rhythm compared to main beach strips."
    },
    {
      id: "goa-sunset-point-hinterland",
      name: "Hinterland Sunset Ridge",
      category: "Nature",
      budget: "low",
      crowdLevel: "low",
      bestWindow: "17:00-18:45",
      highlight: "Wide horizon sunset with sparse crowd pressure.",
      whyLocalLoveIt: "Reliable sunset view without heavy parking congestion."
    },
    {
      id: "goa-local-seafood-cluster",
      name: "Local Seafood Cluster",
      category: "Food",
      budget: "moderate",
      crowdLevel: "moderate",
      bestWindow: "13:00-15:00",
      highlight: "Traditional kitchens and better value than high-tourist belts.",
      whyLocalLoveIt: "Quality-to-price ratio remains strong off the party corridor."
    }
  ],
  delhi: [
    {
      id: "delhi-heritage-lane-walk",
      name: "Old Heritage Lane Walk",
      category: "Culture",
      budget: "low",
      crowdLevel: "moderate",
      bestWindow: "08:00-10:30",
      highlight: "Compact architecture pockets and local breakfast spots.",
      whyLocalLoveIt: "Dense history with short walking distances and low ticket cost."
    },
    {
      id: "delhi-lodhi-art-track",
      name: "Urban Art Track",
      category: "Art",
      budget: "low",
      crowdLevel: "low",
      bestWindow: "16:00-18:00",
      highlight: "Open-air art walls and walk-friendly corridors.",
      whyLocalLoveIt: "Easy access and photogenic route without premium spend."
    }
  ],
  paris: [
    {
      id: "paris-canal-district-loop",
      name: "Canal District Local Loop",
      category: "City",
      budget: "moderate",
      crowdLevel: "moderate",
      bestWindow: "09:00-11:30",
      highlight: "Local bakeries, indie stores, and low-pressure waterfront.",
      whyLocalLoveIt: "Better neighborhood feel than major monument queues."
    }
  ],
  bali: [
    {
      id: "bali-rice-terrace-village",
      name: "Village Rice Terrace Circuit",
      category: "Nature",
      budget: "low",
      crowdLevel: "low",
      bestWindow: "06:30-09:00",
      highlight: "Early-morning terrace views with minimal tourist clusters.",
      whyLocalLoveIt: "Cooler weather and smoother access before mid-day rush."
    },
    {
      id: "bali-craft-market-pocket",
      name: "Craft Market Pocket",
      category: "Shopping",
      budget: "moderate",
      crowdLevel: "moderate",
      bestWindow: "11:00-13:00",
      highlight: "Small-batch crafts and local maker workshops.",
      whyLocalLoveIt: "Direct artisan interaction and stronger value for custom pieces."
    }
  ]
};

import { getTestingHiddenGemsData } from "../../data/testing/featureDataset";

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function destinationKey(name, location) {
  const source = `${normalizeText(name)} ${normalizeText(location)}`.toLowerCase();
  return Object.keys(DESTINATION_GEMS).find((key) => source.includes(key)) || "";
}

function fallbackGems(destinationName) {
  const destination = normalizeText(destinationName) || "destination";
  return [
    {
      id: `${destination.toLowerCase().replace(/\s+/g, "-")}-local-market-loop`,
      name: `${destination} Local Market Loop`,
      category: "Culture",
      budget: "low",
      crowdLevel: "moderate",
      bestWindow: "09:00-11:00",
      highlight: "Street-side local commerce and neighborhood breakfast pockets.",
      whyLocalLoveIt: "Higher local authenticity versus primary tourist lanes."
    },
    {
      id: `${destination.toLowerCase().replace(/\s+/g, "-")}-sunrise-walkway`,
      name: `${destination} Sunrise Walkway`,
      category: "Nature",
      budget: "low",
      crowdLevel: "low",
      bestWindow: "06:30-08:30",
      highlight: "Scenic morning route with low queue pressure.",
      whyLocalLoveIt: "Comfortable climate and cleaner photography window."
    },
    {
      id: `${destination.toLowerCase().replace(/\s+/g, "-")}-community-food-hub`,
      name: `${destination} Community Food Hub`,
      category: "Food",
      budget: "moderate",
      crowdLevel: "moderate",
      bestWindow: "12:30-14:30",
      highlight: "High-value local meals and regional menu options.",
      whyLocalLoveIt: "Balanced quality-to-cost ratio for regular locals."
    }
  ];
}

function scoreGem(gem, budgetPreference, crowdPreference) {
  let score = 50;
  if (budgetPreference === "budget" && gem.budget === "low") score += 22;
  if (budgetPreference === "premium" && gem.budget === "moderate") score += 12;
  if (crowdPreference === "low" && gem.crowdLevel === "low") score += 20;
  if (crowdPreference === "moderate" && gem.crowdLevel === "moderate") score += 10;
  return score;
}

export async function getHiddenGems(options = {}) {
  const destinationName = normalizeText(options.destinationName || options.destination || "");
  const destinationLocation = normalizeText(options.destinationLocation || options.location || "");
  const budgetPreference = normalizeText(options.budgetPreference || "balanced").toLowerCase() || "balanced";
  const crowdPreference = normalizeText(options.crowdPreference || "low").toLowerCase() || "low";
  const limit = Math.max(1, Math.min(8, Number(options.limit || 5)));

  const testingGems = getTestingHiddenGemsData(destinationName || destinationLocation || "");
  if (Array.isArray(testingGems?.gems) && testingGems.gems.length > 0) {
    return {
      destination: destinationName || destinationLocation || testingGems.destination,
      budgetPreference,
      crowdPreference,
      gems: testingGems.gems.slice(0, limit),
      strategy: testingGems.strategy,
      advisory: testingGems.advisory,
      generatedAt: new Date().toISOString()
    };
  }

  const key = destinationKey(destinationName, destinationLocation);
  const sourceList = key ? DESTINATION_GEMS[key] : fallbackGems(destinationName || destinationLocation || "Destination");

  const ranked = [...sourceList]
    .map((item) => ({ ...item, relevanceScore: scoreGem(item, budgetPreference, crowdPreference) }))
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, limit);

  const advisory =
    crowdPreference === "low"
      ? "Prioritize early windows and neighborhood clusters for lower queue pressure."
      : "Blend local pockets with primary sights to balance discovery and coverage.";

  return {
    destination: destinationName || destinationLocation || "Current destination",
    budgetPreference,
    crowdPreference,
    gems: ranked,
    strategy: {
      firstWindow: ranked[0]?.bestWindow || "08:00-10:00",
      categoryMix: [...new Set(ranked.map((item) => item.category))]
    },
    advisory,
    generatedAt: new Date().toISOString()
  };
}
