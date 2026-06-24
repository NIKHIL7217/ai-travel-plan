const CITY_PROFILES = [
  {
    id: "goa-demo",
    name: "Goa",
    location: "India",
    rating: 4.6,
    startingBudget: 320,
    bestTime: "November to February",
    description: "Beach routes, seafood trails, forts, and nightlife clusters.",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    tags: ["beach", "nightlife", "roadtrip", "food"],
    routeHints: ["Mumbai", "Pune", "Bengaluru"]
  },
  {
    id: "jaipur-demo",
    name: "Jaipur",
    location: "India",
    rating: 4.5,
    startingBudget: 260,
    bestTime: "October to March",
    description: "Forts, heritage bazaars, food streets, and palace circuits.",
    image: "https://images.unsplash.com/photo-1477584305590-38772bf2542a?auto=format&fit=crop&w=1200&q=80",
    tags: ["heritage", "shopping", "family", "culture"],
    routeHints: ["Delhi", "Udaipur", "Agra"]
  },
  {
    id: "udaipur-demo",
    name: "Udaipur",
    location: "India",
    rating: 4.7,
    startingBudget: 300,
    bestTime: "October to February",
    description: "Lake city experiences, palaces, rooftop dining, and sunset points.",
    image: "https://images.unsplash.com/photo-1615568261314-e0c1f51ee19d?auto=format&fit=crop&w=1200&q=80",
    tags: ["romantic", "heritage", "lake", "premium"],
    routeHints: ["Jaipur", "Ahmedabad", "Delhi"]
  },
  {
    id: "delhi-demo",
    name: "Delhi",
    location: "India",
    rating: 4.4,
    startingBudget: 240,
    bestTime: "October to March",
    description: "Historic monuments, food hubs, shopping districts, and metro mobility.",
    image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80",
    tags: ["city", "food", "history", "budget"],
    routeHints: ["Jaipur", "Agra", "Manali"]
  },
  {
    id: "mumbai-demo",
    name: "Mumbai",
    location: "India",
    rating: 4.4,
    startingBudget: 310,
    bestTime: "November to February",
    description: "Coastal city, art districts, nightlife belts, and premium stays.",
    image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80",
    tags: ["city", "nightlife", "food", "premium"],
    routeHints: ["Goa", "Pune", "Lonavala"]
  },
  {
    id: "manali-demo",
    name: "Manali",
    location: "India",
    rating: 4.6,
    startingBudget: 280,
    bestTime: "March to June",
    description: "Mountain roads, alpine viewpoints, adventure sports, and cafe culture.",
    image: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1200&q=80",
    tags: ["mountain", "adventure", "roadtrip", "family"],
    routeHints: ["Delhi", "Chandigarh", "Kasol"]
  },
  {
    id: "bali-demo",
    name: "Bali",
    location: "Indonesia",
    rating: 4.8,
    startingBudget: 620,
    bestTime: "April to October",
    description: "Island stays, rice terraces, beach clubs, and temple routes.",
    image: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80",
    tags: ["island", "luxury", "couple", "wellness"],
    routeHints: ["Ubud", "Seminyak", "Nusa Dua"]
  },
  {
    id: "bangkok-demo",
    name: "Bangkok",
    location: "Thailand",
    rating: 4.6,
    startingBudget: 540,
    bestTime: "November to February",
    description: "Street food, temple trails, shopping malls, and night markets.",
    image: "https://images.unsplash.com/photo-1508009603885-50cf7c8dd0d5?auto=format&fit=crop&w=1200&q=80",
    tags: ["city", "food", "shopping", "budget"],
    routeHints: ["Phuket", "Chiang Mai", "Pattaya"]
  },
  {
    id: "dubai-demo",
    name: "Dubai",
    location: "United Arab Emirates",
    rating: 4.7,
    startingBudget: 980,
    bestTime: "November to March",
    description: "Skyline landmarks, shopping festivals, desert tours, and luxury stays.",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
    tags: ["luxury", "city", "family", "shopping"],
    routeHints: ["Abu Dhabi", "Sharjah", "Doha"]
  },
  {
    id: "paris-demo",
    name: "Paris",
    location: "France",
    rating: 4.8,
    startingBudget: 1100,
    bestTime: "April to October",
    description: "Museums, architecture, cafe culture, and river cruises.",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    tags: ["culture", "couple", "premium", "city"],
    routeHints: ["Lyon", "Brussels", "Amsterdam"]
  },
  {
    id: "tokyo-demo",
    name: "Tokyo",
    location: "Japan",
    rating: 4.8,
    startingBudget: 1280,
    bestTime: "March to May",
    description: "Urban-tech zones, food alleys, anime districts, and rail convenience.",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
    tags: ["city", "food", "tech", "family"],
    routeHints: ["Kyoto", "Osaka", "Yokohama"]
  },
  {
    id: "singapore-demo",
    name: "Singapore",
    location: "Singapore",
    rating: 4.7,
    startingBudget: 1020,
    bestTime: "February to April",
    description: "Urban gardens, food courts, waterfront attractions, and family parks.",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80",
    tags: ["city", "family", "food", "clean"],
    routeHints: ["Sentosa", "Kuala Lumpur", "Bali"]
  }
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function includesAny(text, words) {
  return words.some((word) => text.includes(normalizeText(word)));
}

function clone(item) {
  return JSON.parse(JSON.stringify(item));
}

export function getAllTestingCityProfiles() {
  return CITY_PROFILES.map(clone);
}

export function getTestingCityById(id = "") {
  const key = normalizeText(id);
  const direct = CITY_PROFILES.find((item) => normalizeText(item.id) === key);
  if (direct) {
    return clone(direct);
  }

  const byName = CITY_PROFILES.find((item) => normalizeText(item.name) === key);
  return byName ? clone(byName) : null;
}

export function searchTestingCities(query = "") {
  const q = normalizeText(query);
  if (!q) {
    return [];
  }

  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = CITY_PROFILES.map((item) => {
    const haystack = normalizeText([
      item.id,
      item.name,
      item.location,
      item.description,
      ...(item.tags || []),
      ...(item.routeHints || [])
    ].join(" "));

    let score = 0;
    if (normalizeText(item.id) === q || normalizeText(item.name) === q) score += 100;
    if (normalizeText(item.name).includes(q)) score += 60;
    if (normalizeText(item.location).includes(q)) score += 40;
    if (includesAny(haystack, tokens)) score += 25;

    const tokenHits = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
    score += tokenHits * 8;

    return { item, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((row) => clone(row.item));

  return scored;
}
