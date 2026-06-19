export const DEMO_DESTINATION_SUGGESTIONS = [
  {
    id: "goa-demo",
    name: "Goa",
    location: "India",
    rating: 4.6,
    startingBudget: 280,
    bestTime: "November to February",
    description: "Beach sunsets, cafes, forts, and easy road-trip vibes.",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "jaipur-demo",
    name: "Jaipur",
    location: "India",
    rating: 4.5,
    startingBudget: 240,
    bestTime: "October to March",
    description: "Royal palaces, local bazaars, and heritage food trails.",
    image: "https://images.unsplash.com/photo-1477584305590-38772bf2542a?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "bali-demo",
    name: "Bali",
    location: "Indonesia",
    rating: 4.8,
    startingBudget: 520,
    bestTime: "April to October",
    description: "Rice terraces, beach clubs, temples, and island day trips.",
    image: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80"
  }
];

export const DEMO_DESTINATION_DETAILS = {
  "goa-demo": {
    id: "goa-demo",
    name: "Goa",
    location: "India",
    rating: 4.6,
    reviewsCount: 1840,
    startingBudget: 280,
    bestTime: "November to February",
    description: "Goa is ideal for short leisure breaks with beaches, nightlife, and easy transport.",
    longDescription: "A balanced destination for couples, friends, and solo travelers. You can split your stay between North and South Goa for beach activity and quieter scenic pockets. Local rentals, coastal roads, and mixed dining options make it practical for budget to premium travelers.",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    distanceFromHubs: "590 km",
    localCurrency: "Indian Rupee (INR)",
    aqi: 52,
    travelScore: 89,
    safetyScore: 82,
    advantages: [
      "Strong hotel availability across budget tiers",
      "High variety of cafes, beach shacks, and premium restaurants",
      "Short internal travel times"
    ],
    disadvantages: [
      "Peak season prices rise quickly",
      "Popular beaches can be crowded"
    ],
    suitability: {
      family: "Good with resort zones and calm beach areas",
      solo: "Very good due to easy mobility and traveler crowd",
      couple: "Excellent for sunset spots and beach dining",
      budget: "Good if booked early and slightly away from hotspots"
    },
    weatherForecast: [
      { day: "Monday", temp: "26C - 31C", general: "Partly Cloudy", aqi: 52 },
      { day: "Tuesday", temp: "25C - 30C", general: "Sunny", aqi: 48 },
      { day: "Wednesday", temp: "25C - 29C", general: "Showers", aqi: 55 }
    ],
    attractions: [
      { name: "Dona Paula", desc: "Cliffside viewpoint with sea panorama and evening breeze." },
      { name: "Aguada Fort", desc: "Historic fort walls with sunset and coastal views." },
      { name: "Baga Beach Belt", desc: "Active beachfront with cafes and nightlife options." }
    ],
    food: [
      { name: "Goan Fish Curry", desc: "Classic coastal curry served with rice." },
      { name: "Prawn Balchao", desc: "Tangy-spicy prawn preparation, local specialty." }
    ],
    tips: [
      "Use app cabs for fixed fares in peak hours.",
      "Book stays 2-3 weeks earlier in high season.",
      "Carry light cotton layers and hydration for day travel."
    ],
    budgetBreakdown: {
      flights: 110,
      lodging: 90,
      meals: 45,
      transport: 35,
      total: 280
    }
  }
};

export function getDemoDestinationSuggestions() {
  return DEMO_DESTINATION_SUGGESTIONS;
}

export function getDemoDestinationDetails(id = "goa-demo") {
  return DEMO_DESTINATION_DETAILS[id] || DEMO_DESTINATION_DETAILS["goa-demo"];
}
