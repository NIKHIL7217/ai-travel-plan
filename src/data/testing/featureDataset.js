const CITY_FEATURE_DATA = [
  {
    id: "goa-demo",
    aliases: ["goa", "goa india", "north goa", "south goa"],
    name: "Goa",
    location: "India",
    rating: 4.6,
    reviewsCount: 1840,
    startingBudget: 280,
    bestTime: "November to February",
    description: "Beach sunsets, cafes, forts, and easy road-trip vibes.",
    longDescription:
      "Goa works well for short leisure breaks with beaches, nightlife, and fast internal transfers. You can split your stay between North and South zones for activity plus quieter pockets.",
    image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    distanceFromHubs: "590 km",
    localCurrency: "Indian Rupee (INR)",
    aqi: 52,
    travelScore: 89,
    safetyScore: 82,
    advantages: [
      "Strong hotel availability across budget tiers",
      "High variety of cafes and restaurants",
      "Short internal travel times"
    ],
    disadvantages: ["Peak season prices rise quickly", "Popular beaches can be crowded"],
    suitability: {
      family: "Good with resort zones and calm beach areas",
      solo: "Very good due to easy mobility and traveler crowd",
      couple: "Excellent for sunset spots and beach dining",
      budget: "Good if booked early and away from hotspots"
    },
    weatherForecast: [
      { day: "Monday", temp: "26C - 31C", general: "Partly Cloudy", aqi: 52 },
      { day: "Tuesday", temp: "25C - 30C", general: "Sunny", aqi: 48 },
      { day: "Wednesday", temp: "25C - 29C", general: "Showers", aqi: 55 }
    ],
    attractions: [
      { name: "Dona Paula", desc: "Cliffside viewpoint with sea panorama." },
      { name: "Aguada Fort", desc: "Historic fort walls with sunset and coastal views." },
      { name: "Baga Beach Belt", desc: "Active beachfront with cafes and nightlife." }
    ],
    food: [
      { name: "Goan Fish Curry", desc: "Classic coastal curry served with rice." },
      { name: "Prawn Balchao", desc: "Tangy-spicy prawn local specialty." }
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
    },
    transportOptions: {
      flights: { lowest: 90, average: 120, duration: "1.3h" },
      trains: { cost: 40, duration: "11h" },
      buses: { cost: 22, duration: "13h" },
      taxi: { fare: 55 }
    },
    accommodationOptions: {
      hostels: [{ name: "Zostel Goa", price: 18, rating: 4.3, reviews: 640, distance: "1.5 km" }],
      budget: [{ name: "Calangute Beach Rooms", price: 28, rating: 3.8, reviews: 420, distance: "2.2 km" }],
      comfort: [{ name: "ibis Styles Goa", price: 54, rating: 4.1, reviews: 780, distance: "1.9 km" }],
      luxury: [{ name: "Taj Exotica", price: 190, rating: 4.8, reviews: 2140, distance: "0.5 km" }]
    },
    foodCostAnalysis: {
      budgetDaily: 14,
      midRangeDaily: 32,
      luxuryDaily: 85,
      popularRestaurants: [
        { name: "Britto's", type: "Seafood", averagePrice: 18 },
        { name: "Gunpowder", type: "Coastal", averagePrice: 22 }
      ]
    },
    nearbyExplorer: {
      hospitals: [{ name: "Manipal Hospital Goa", distance: "2.8 km", rating: 4.6, lat: 15.459, lng: 73.812 }],
      fuelStations: [{ name: "Indian Oil Panaji", distance: "1.5 km", rating: 4.2, lat: 15.495, lng: 73.828 }],
      restaurants: [{ name: "Thalassa", distance: "3.2 km", rating: 4.7, lat: 15.612, lng: 73.731 }]
    },
    locationData: {
      hotels: [
        {
          name: "Taj Exotica Resort & Spa",
          price: 14500,
          rating: 4.8,
          reviews: 2140,
          distance: "0.5 km",
          lat: 15.275,
          lng: 73.928,
          address: "Benaulim Beach, Goa",
          tier: "luxury"
        },
        {
          name: "ibis Styles Goa Calangute",
          price: 3200,
          rating: 4.1,
          reviews: 780,
          distance: "1.9 km",
          lat: 15.541,
          lng: 73.768,
          address: "Calangute-Baga Road, Goa",
          tier: "mid-range"
        }
      ],
      restaurants: [
        {
          name: "Britto's Bar & Restaurant",
          type: "Seafood & Goan Cuisine",
          averagePrice: 1200,
          rating: 4.5,
          distance: "0.6 km",
          lat: 15.558,
          lng: 73.752,
          address: "Baga Beach, Goa"
        },
        {
          name: "Gunpowder",
          type: "South Indian & Coastal",
          averagePrice: 1500,
          rating: 4.6,
          distance: "2.5 km",
          lat: 15.598,
          lng: 73.774,
          address: "Assagao, Goa"
        }
      ],
      attractions: [
        {
          name: "Aguada Fort",
          desc: "Historic lighthouse fort with sea view.",
          rating: 4.7,
          distance: "5.3 km",
          lat: 15.492,
          lng: 73.773,
          address: "Candolim, Goa"
        },
        {
          name: "Dudhsagar Falls",
          desc: "Waterfall cascade and monsoon trail.",
          rating: 4.6,
          distance: "63 km",
          lat: 15.314,
          lng: 74.314,
          address: "Sanguem, Goa"
        }
      ],
      hospitals: [
        {
          name: "Goa Medical College & Hospital",
          distance: "6.5 km",
          rating: 4.4,
          lat: 15.461,
          lng: 73.858,
          address: "Bambolim, Goa",
          phone: "+91-832-2458727"
        }
      ],
      fuelStations: [
        {
          name: "Shell Highway Goa",
          distance: "8.5 km",
          rating: 4.5,
          lat: 15.421,
          lng: 73.918,
          address: "NH-66 Highway, Goa",
          types: ["Petrol", "Diesel", "EV Charging"]
        }
      ],
      evChargingStations: [
        {
          name: "Tata Power EV Charging Panaji",
          distance: "1.8 km",
          rating: 4.3,
          lat: 15.491,
          lng: 73.818,
          address: "Campal, Panaji",
          chargingType: "DC Fast 50kW",
          connector: "CCS2"
        }
      ],
      updatedAt: "2026-06-24T10:00:00.000Z"
    },
    scam: {
      level: "High",
      riskScore: 81,
      alerts: [
        {
          id: "night-party-bill-padding",
          title: "Night party bill padding",
          severity: "high",
          hotspot: "late-night clubs",
          timeWindow: "22:00-03:00",
          description: "Unexpected service additions in late-night settlements.",
          avoidance: "Review bill line-by-line and use digital payment."
        }
      ],
      safeZones: [
        "Verified hospitality clusters",
        "Well-lit primary roads",
        "Official taxi counters"
      ],
      advisory: "Use verified channels and avoid cash-only settlements."
    },
    gems: {
      gems: [
        {
          id: "goa-divar-island-loop",
          name: "Divar Island Quiet Loop",
          category: "Culture",
          budget: "low",
          crowdLevel: "low",
          bestWindow: "07:00-10:00",
          highlight: "Village ferry crossing and quiet lanes.",
          whyLocalLoveIt: "Low traffic and authentic local rhythm.",
          relevanceScore: 90
        },
        {
          id: "goa-hinterland-sunset",
          name: "Hinterland Sunset Ridge",
          category: "Nature",
          budget: "low",
          crowdLevel: "low",
          bestWindow: "17:00-18:45",
          highlight: "Wide sunset horizon with low crowd pressure.",
          whyLocalLoveIt: "Best sunset without parking chaos.",
          relevanceScore: 88
        }
      ],
      strategy: { firstWindow: "07:00-10:00", categoryMix: ["Culture", "Nature"] },
      advisory: "Start early for lower queue pressure."
    },
    visa: {
      nationality: "Indian",
      statusLabel: "Likely Visa-Free",
      visaType: "Visa-Free Entry",
      processingTime: "No pre-approval required",
      estimatedCostUsd: 0,
      stayLimit: "Usually 30 days"
    }
  },
  {
    id: "jaipur-demo",
    aliases: ["jaipur", "pink city", "jaipur india"],
    name: "Jaipur",
    location: "India",
    rating: 4.5,
    reviewsCount: 1320,
    startingBudget: 240,
    bestTime: "October to March",
    description: "Royal palaces, local bazaars, and heritage food trails.",
    longDescription:
      "Jaipur gives a strong mix of forts, palace architecture, shopping streets, and curated cultural performances. It is ideal for culture-first and photo-first trips.",
    image:
      "https://images.unsplash.com/photo-1477584305590-38772bf2542a?auto=format&fit=crop&w=1200&q=80",
    distanceFromHubs: "280 km",
    localCurrency: "Indian Rupee (INR)",
    aqi: 88,
    travelScore: 84,
    safetyScore: 79,
    advantages: ["Strong heritage circuit", "Good hotel spread", "Road/rail accessibility"],
    disadvantages: ["Can be hot in summer", "Tourist spots peak midday"],
    suitability: {
      family: "Very good for fort tours and cultural evenings",
      solo: "Good with guided walk routes",
      couple: "Great for palace dining and viewpoints",
      budget: "Strong value if booked off-center"
    },
    weatherForecast: [
      { day: "Monday", temp: "24C - 35C", general: "Sunny", aqi: 92 },
      { day: "Tuesday", temp: "23C - 34C", general: "Sunny", aqi: 88 },
      { day: "Wednesday", temp: "22C - 33C", general: "Hazy", aqi: 95 }
    ],
    attractions: [
      { name: "Amber Fort", desc: "Hill fort with palace courtyards." },
      { name: "City Palace", desc: "Royal complex and museum wing." },
      { name: "Hawa Mahal", desc: "Iconic facade and old-city access." }
    ],
    food: [
      { name: "Dal Baati Churma", desc: "Classic Rajasthani platter." },
      { name: "Pyaaz Kachori", desc: "Popular spicy street snack." }
    ],
    tips: [
      "Start fort visits before 9am.",
      "Use old-city walking loops for food coverage.",
      "Keep water and sun protection handy."
    ],
    budgetBreakdown: {
      flights: 70,
      lodging: 78,
      meals: 40,
      transport: 28,
      total: 216
    },
    transportOptions: {
      flights: { lowest: 65, average: 88, duration: "1.0h" },
      trains: { cost: 20, duration: "4.8h" },
      buses: { cost: 14, duration: "6.2h" },
      taxi: { fare: 40 }
    },
    accommodationOptions: {
      hostels: [{ name: "Zostel Jaipur", price: 15, rating: 4.3, reviews: 840, distance: "1.4 km" }],
      budget: [{ name: "Pink City Inn", price: 24, rating: 3.9, reviews: 540, distance: "2.1 km" }],
      comfort: [{ name: "Lemon Tree Jaipur", price: 48, rating: 4.2, reviews: 920, distance: "2.8 km" }],
      luxury: [{ name: "Rambagh Palace", price: 240, rating: 4.9, reviews: 1680, distance: "3.3 km" }]
    },
    foodCostAnalysis: {
      budgetDaily: 10,
      midRangeDaily: 24,
      luxuryDaily: 72,
      popularRestaurants: [
        { name: "Rawat Mishthan", type: "Rajasthani", averagePrice: 7 },
        { name: "Bar Palladio", type: "Premium", averagePrice: 28 }
      ]
    },
    nearbyExplorer: {
      hospitals: [{ name: "SMS Hospital", distance: "3.2 km", rating: 4.3, lat: 26.908, lng: 75.812 }],
      fuelStations: [{ name: "Indian Oil MI Road", distance: "1.6 km", rating: 4.1, lat: 26.918, lng: 75.805 }],
      restaurants: [{ name: "LMB", distance: "1.2 km", rating: 4.4, lat: 26.923, lng: 75.824 }]
    },
    locationData: {
      hotels: [
        {
          name: "Rambagh Palace",
          price: 22000,
          rating: 4.9,
          reviews: 1680,
          distance: "3.3 km",
          lat: 26.898,
          lng: 75.808,
          address: "Bhawani Singh Road, Jaipur",
          tier: "luxury"
        },
        {
          name: "Zostel Jaipur",
          price: 1200,
          rating: 4.3,
          reviews: 840,
          distance: "1.4 km",
          lat: 26.925,
          lng: 75.812,
          address: "MI Road, Jaipur",
          tier: "hostel"
        }
      ],
      restaurants: [
        {
          name: "Laxmi Misthan Bhandar",
          type: "Rajasthani",
          averagePrice: 650,
          rating: 4.4,
          distance: "1.2 km",
          lat: 26.923,
          lng: 75.824,
          address: "Johari Bazaar, Jaipur"
        },
        {
          name: "Bar Palladio",
          type: "Italian & Premium",
          averagePrice: 2200,
          rating: 4.6,
          distance: "2.9 km",
          lat: 26.912,
          lng: 75.827,
          address: "Narain Niwas, Jaipur"
        }
      ],
      attractions: [
        {
          name: "Amber Fort",
          desc: "Hill fort and mirror palace sections.",
          rating: 4.8,
          distance: "11 km",
          lat: 26.985,
          lng: 75.851,
          address: "Amer, Jaipur"
        }
      ],
      hospitals: [
        {
          name: "Sawai Man Singh Hospital",
          distance: "3.2 km",
          rating: 4.3,
          lat: 26.908,
          lng: 75.812,
          address: "JLN Marg, Jaipur",
          phone: "+91-141-2518200"
        }
      ],
      fuelStations: [
        {
          name: "Indian Oil MI Road",
          distance: "1.6 km",
          rating: 4.1,
          lat: 26.918,
          lng: 75.805,
          address: "MI Road, Jaipur",
          types: ["Petrol", "Diesel"]
        }
      ],
      evChargingStations: [
        {
          name: "Tata Power EV Jaipur Central",
          distance: "2.1 km",
          rating: 4.3,
          lat: 26.916,
          lng: 75.818,
          address: "C-Scheme, Jaipur",
          chargingType: "DC Fast 30kW",
          connector: "CCS2"
        }
      ],
      updatedAt: "2026-06-24T10:00:00.000Z"
    },
    scam: {
      level: "Moderate",
      riskScore: 63,
      alerts: [
        {
          id: "guide-pressure",
          title: "Unofficial guide pressure",
          severity: "moderate",
          hotspot: "fort entry gates",
          timeWindow: "09:00-17:00",
          description: "Unverified guides may add forced service bundles.",
          avoidance: "Use ticket-counter listed guides only."
        }
      ],
      safeZones: ["Ticketed heritage corridors", "City-center lit routes", "Verified taxi stands"],
      advisory: "Confirm prices before guided service booking."
    },
    gems: {
      gems: [
        {
          id: "jaipur-stepwell-loop",
          name: "Stepwell and Old City Loop",
          category: "Culture",
          budget: "low",
          crowdLevel: "moderate",
          bestWindow: "08:00-10:30",
          highlight: "Historic lanes, facades, and craft pockets.",
          whyLocalLoveIt: "Strong heritage feel with low spend.",
          relevanceScore: 84
        }
      ],
      strategy: { firstWindow: "08:00-10:30", categoryMix: ["Culture"] },
      advisory: "Prefer morning windows to avoid peak heat."
    },
    visa: {
      nationality: "Indian",
      statusLabel: "No International Visa Needed",
      visaType: "Domestic / Citizen Entry",
      processingTime: "Not applicable",
      estimatedCostUsd: 0,
      stayLimit: "As per domestic regulations"
    }
  },
  {
    id: "bali-demo",
    aliases: ["bali", "bali indonesia", "ubud", "seminyak"],
    name: "Bali",
    location: "Indonesia",
    rating: 4.8,
    reviewsCount: 2210,
    startingBudget: 520,
    bestTime: "April to October",
    description: "Rice terraces, beach clubs, temples, and island day trips.",
    longDescription:
      "Bali offers a split experience between inland cultural zones and coastal leisure zones. It is highly suitable for couples, creators, and first-time international travelers.",
    image:
      "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80",
    distanceFromHubs: "5,720 km",
    localCurrency: "Indonesian Rupiah (IDR)",
    aqi: 36,
    travelScore: 92,
    safetyScore: 84,
    advantages: ["Strong resort and villa inventory", "Diverse culture plus beaches", "Good cafe ecosystem"],
    disadvantages: ["Traffic in peak areas", "Premium zones can get expensive"],
    suitability: {
      family: "Good with resort clusters and activity parks",
      solo: "Very good due to cafe/work-friendly neighborhoods",
      couple: "Excellent for scenic stays and private dining",
      budget: "Good with hostel and scooter strategy"
    },
    weatherForecast: [
      { day: "Monday", temp: "24C - 30C", general: "Sunny", aqi: 34 },
      { day: "Tuesday", temp: "24C - 31C", general: "Partly Cloudy", aqi: 36 },
      { day: "Wednesday", temp: "23C - 30C", general: "Showers", aqi: 40 }
    ],
    attractions: [
      { name: "Uluwatu Temple", desc: "Clifftop temple and evening performance." },
      { name: "Tegallalang Terraces", desc: "Layered rice fields and scenic tracks." },
      { name: "Ubud Market", desc: "Craft market and local artisan strip." }
    ],
    food: [
      { name: "Nasi Goreng", desc: "Indonesian fried rice classic." },
      { name: "Babi Guling", desc: "Traditional roasted pork dish." }
    ],
    tips: [
      "Pre-book scooter and verify rental policy.",
      "Start temple visits in early hours.",
      "Carry small cash for local spots."
    ],
    budgetBreakdown: {
      flights: 260,
      lodging: 150,
      meals: 60,
      transport: 35,
      total: 505
    },
    transportOptions: {
      flights: { lowest: 250, average: 320, duration: "8.2h" },
      trains: { cost: 0, duration: "N/A" },
      buses: { cost: 0, duration: "N/A" },
      taxi: { fare: 48 }
    },
    accommodationOptions: {
      hostels: [{ name: "Lay Day Surf Hostel", price: 16, rating: 4.5, reviews: 680, distance: "2.8 km" }],
      budget: [{ name: "Kuta Beach Stay", price: 26, rating: 3.9, reviews: 420, distance: "2.1 km" }],
      comfort: [{ name: "Hard Rock Bali", price: 78, rating: 4.4, reviews: 3120, distance: "0.8 km" }],
      luxury: [{ name: "Ritz Carlton Bali", price: 270, rating: 4.9, reviews: 1420, distance: "1.5 km" }]
    },
    foodCostAnalysis: {
      budgetDaily: 12,
      midRangeDaily: 30,
      luxuryDaily: 95,
      popularRestaurants: [
        { name: "Locavore", type: "Fine Dining", averagePrice: 42 },
        { name: "Warung Nia", type: "Local", averagePrice: 15 }
      ]
    },
    nearbyExplorer: {
      hospitals: [{ name: "BIMC Hospital", distance: "2.5 km", rating: 4.7, lat: -8.802, lng: 115.228 }],
      fuelStations: [{ name: "Pertamina Kuta", distance: "1.1 km", rating: 4.2, lat: -8.709, lng: 115.183 }],
      restaurants: [{ name: "Potato Head", distance: "0.4 km", rating: 4.7, lat: -8.679, lng: 115.143 }]
    },
    locationData: {
      hotels: [
        {
          name: "The Ritz-Carlton, Bali",
          price: 22500,
          rating: 4.9,
          reviews: 1420,
          distance: "1.5 km",
          lat: -8.829,
          lng: 115.216,
          address: "Nusa Dua Selatan, Bali",
          tier: "luxury"
        },
        {
          name: "Hard Rock Hotel Bali",
          price: 6500,
          rating: 4.4,
          reviews: 3120,
          distance: "0.8 km",
          lat: -8.722,
          lng: 115.169,
          address: "Kuta, Bali",
          tier: "mid-range"
        }
      ],
      restaurants: [
        {
          name: "Locavore",
          type: "Modern European & Balinese",
          averagePrice: 3500,
          rating: 4.8,
          distance: "1.2 km",
          lat: -8.513,
          lng: 115.261,
          address: "Ubud, Bali"
        },
        {
          name: "Warung Nia",
          type: "Balinese",
          averagePrice: 800,
          rating: 4.5,
          distance: "0.9 km",
          lat: -8.682,
          lng: 115.155,
          address: "Seminyak, Bali"
        }
      ],
      attractions: [
        {
          name: "Uluwatu Temple",
          desc: "Temple on sea cliffs and sunset ceremonies.",
          rating: 4.8,
          distance: "18 km",
          lat: -8.829,
          lng: 115.084,
          address: "Pecatu, Bali"
        }
      ],
      hospitals: [
        {
          name: "BIMC Hospital Nusa Dua",
          distance: "2.5 km",
          rating: 4.7,
          lat: -8.802,
          lng: 115.228,
          address: "ITDC Block D, Nusa Dua",
          phone: "+62-361-3000911"
        }
      ],
      fuelStations: [
        {
          name: "Pertamina Sunset Road",
          distance: "1.1 km",
          rating: 4.2,
          lat: -8.709,
          lng: 115.183,
          address: "Sunset Road, Kuta",
          types: ["Petrol", "Diesel"]
        }
      ],
      evChargingStations: [
        {
          name: "PLN SPKLU Nusa Dua",
          distance: "2.6 km",
          rating: 4.6,
          lat: -8.803,
          lng: 115.224,
          address: "ITDC Park, Nusa Dua",
          chargingType: "DC Fast 50kW",
          connector: "CCS2"
        }
      ],
      updatedAt: "2026-06-24T10:00:00.000Z"
    },
    scam: {
      level: "Moderate",
      riskScore: 58,
      alerts: [
        {
          id: "scooter-damage-claim",
          title: "Scooter damage claim pressure",
          severity: "moderate",
          hotspot: "rental clusters",
          timeWindow: "all-day",
          description: "Post-rental claims can inflate without pre-check proof.",
          avoidance: "Record pickup photos and written contract terms."
        }
      ],
      safeZones: ["Verified resort districts", "Major road-lit corridors", "Branded counters"],
      advisory: "Use written receipts for rentals and tours."
    },
    gems: {
      gems: [
        {
          id: "bali-rice-terrace-village",
          name: "Village Rice Terrace Circuit",
          category: "Nature",
          budget: "low",
          crowdLevel: "low",
          bestWindow: "06:30-09:00",
          highlight: "Early morning terraces and cooler routes.",
          whyLocalLoveIt: "Less crowded and better light.",
          relevanceScore: 91
        }
      ],
      strategy: { firstWindow: "06:30-09:00", categoryMix: ["Nature"] },
      advisory: "Start before 9am for low traffic and low heat."
    },
    visa: {
      nationality: "Indian",
      statusLabel: "Likely Visa-Free",
      visaType: "Visa-Free Entry",
      processingTime: "No pre-approval required",
      estimatedCostUsd: 0,
      stayLimit: "Usually 30 days"
    }
  },
  {
    id: "dubai-demo",
    aliases: ["dubai", "uae", "dubai uae", "abudhabi"],
    name: "Dubai",
    location: "UAE",
    rating: 4.7,
    reviewsCount: 2760,
    startingBudget: 820,
    bestTime: "November to March",
    description: "Luxury skyline, curated shopping, and modern entertainment hubs.",
    longDescription:
      "Dubai blends high-end hospitality, city-scale attractions, and premium mobility. It fits short luxury breaks and event-based travel planning.",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
    distanceFromHubs: "2,180 km",
    localCurrency: "UAE Dirham (AED)",
    aqi: 76,
    travelScore: 87,
    safetyScore: 86,
    advantages: ["Premium infrastructure", "High safety in core zones", "Strong shopping and events"],
    disadvantages: ["Can be expensive", "Summer heat is intense"],
    suitability: {
      family: "Good with theme parks and malls",
      solo: "Good with transport and city safety",
      couple: "Strong for skyline dining and resorts",
      budget: "Manageable with off-center stay choices"
    },
    weatherForecast: [
      { day: "Monday", temp: "29C - 38C", general: "Sunny", aqi: 78 },
      { day: "Tuesday", temp: "30C - 39C", general: "Sunny", aqi: 75 },
      { day: "Wednesday", temp: "31C - 40C", general: "Dry", aqi: 80 }
    ],
    attractions: [
      { name: "Burj Khalifa", desc: "Observation decks and skyline views." },
      { name: "Dubai Fountain", desc: "Night water-and-light show." },
      { name: "Museum of the Future", desc: "Future-tech and design exhibits." }
    ],
    food: [
      { name: "Shawarma", desc: "Popular grilled wrap snack." },
      { name: "Mandi", desc: "Traditional aromatic rice and meat dish." }
    ],
    tips: [
      "Use metro for peak-hour movement.",
      "Book major attractions in advance.",
      "Carry light layers for indoor AC transitions."
    ],
    budgetBreakdown: {
      flights: 210,
      lodging: 350,
      meals: 110,
      transport: 90,
      total: 760
    },
    transportOptions: {
      flights: { lowest: 180, average: 240, duration: "3.5h" },
      trains: { cost: 0, duration: "N/A" },
      buses: { cost: 0, duration: "N/A" },
      taxi: { fare: 70 }
    },
    accommodationOptions: {
      hostels: [{ name: "California Hostel Marina", price: 28, rating: 4.3, reviews: 520, distance: "18.5 km" }],
      budget: [{ name: "ibis One Central", price: 72, rating: 4.0, reviews: 810, distance: "3.4 km" }],
      comfort: [{ name: "Rove Downtown", price: 96, rating: 4.5, reviews: 1650, distance: "1.1 km" }],
      luxury: [{ name: "Burj Al Arab", price: 690, rating: 4.9, reviews: 3400, distance: "3.5 km" }]
    },
    foodCostAnalysis: {
      budgetDaily: 24,
      midRangeDaily: 58,
      luxuryDaily: 170,
      popularRestaurants: [
        { name: "Ravi Restaurant", type: "Budget", averagePrice: 12 },
        { name: "Zuma", type: "Fine Dining", averagePrice: 75 }
      ]
    },
    nearbyExplorer: {
      hospitals: [{ name: "Rashid Hospital", distance: "4.8 km", rating: 4.5, lat: 25.239, lng: 55.318 }],
      fuelStations: [{ name: "ENOC Sheikh Zayed", distance: "0.8 km", rating: 4.3, lat: 25.191, lng: 55.269 }],
      restaurants: [{ name: "Zuma Dubai", distance: "1.8 km", rating: 4.8, lat: 25.213, lng: 55.280 }]
    },
    locationData: {
      hotels: [
        {
          name: "Burj Al Arab Jumeirah",
          price: 45000,
          rating: 4.9,
          reviews: 3400,
          distance: "3.5 km",
          lat: 25.141,
          lng: 55.185,
          address: "Jumeirah Street, Dubai",
          tier: "luxury"
        },
        {
          name: "Rove Downtown Dubai",
          price: 4200,
          rating: 4.5,
          reviews: 1650,
          distance: "1.1 km",
          lat: 25.199,
          lng: 55.282,
          address: "Zabeel 2, Dubai",
          tier: "mid-range"
        }
      ],
      restaurants: [
        {
          name: "Zuma Dubai",
          type: "Japanese Fine Dining",
          averagePrice: 4500,
          rating: 4.8,
          distance: "1.8 km",
          lat: 25.213,
          lng: 55.280,
          address: "DIFC, Dubai"
        },
        {
          name: "Ravi Restaurant Satwa",
          type: "Pakistani & Indian",
          averagePrice: 500,
          rating: 4.4,
          distance: "3.1 km",
          lat: 25.228,
          lng: 55.275,
          address: "Al Satwa, Dubai"
        }
      ],
      attractions: [
        {
          name: "Burj Khalifa",
          desc: "World's tallest building and sky decks.",
          rating: 4.8,
          distance: "0.1 km",
          lat: 25.197,
          lng: 55.274,
          address: "Downtown Dubai"
        }
      ],
      hospitals: [
        {
          name: "Rashid Hospital",
          distance: "4.8 km",
          rating: 4.5,
          lat: 25.239,
          lng: 55.318,
          address: "Oud Metha Road, Dubai",
          phone: "+971-4-2192000"
        }
      ],
      fuelStations: [
        {
          name: "ENOC Sheikh Zayed",
          distance: "0.8 km",
          rating: 4.3,
          lat: 25.191,
          lng: 55.269,
          address: "Sheikh Zayed Road, Dubai",
          types: ["Petrol", "Diesel"]
        }
      ],
      evChargingStations: [
        {
          name: "DEWA EV Charging Dubai Mall",
          distance: "0.9 km",
          rating: 4.5,
          lat: 25.197,
          lng: 55.279,
          address: "Dubai Mall Parking",
          chargingType: "DC Fast 50kW",
          connector: "CCS2"
        }
      ],
      updatedAt: "2026-06-24T10:00:00.000Z"
    },
    scam: {
      level: "Low",
      riskScore: 46,
      alerts: [
        {
          id: "taxi-meter-setup",
          title: "Taxi meter setup check",
          severity: "low",
          hotspot: "airport pickup lane",
          timeWindow: "all-day",
          description: "Some drivers may start without meter setting.",
          avoidance: "Confirm meter before ride start."
        }
      ],
      safeZones: ["Metro-connected districts", "Mall and downtown zones", "Official taxi stands"],
      advisory: "Use official transit channels and digital payment where possible."
    },
    gems: {
      gems: [
        {
          id: "dubai-alserkal-loop",
          name: "Alserkal Art Loop",
          category: "Art",
          budget: "moderate",
          crowdLevel: "moderate",
          bestWindow: "11:00-14:00",
          highlight: "Gallery district and design studios.",
          whyLocalLoveIt: "Alternative side of city beyond skyline.",
          relevanceScore: 79
        }
      ],
      strategy: { firstWindow: "11:00-14:00", categoryMix: ["Art"] },
      advisory: "Combine premium sights with district-level experiences."
    },
    visa: {
      nationality: "Indian",
      statusLabel: "Likely eVisa",
      visaType: "Tourist eVisa",
      processingTime: "2 to 7 business days",
      estimatedCostUsd: 45,
      stayLimit: "Usually 30 to 90 days"
    }
  },
  {
    id: "paris-demo",
    aliases: ["paris", "paris france", "france paris"],
    name: "Paris",
    location: "France",
    rating: 4.9,
    reviewsCount: 3620,
    startingBudget: 1100,
    bestTime: "April to October",
    description: "Art, fashion, gastronomy, and iconic architecture.",
    longDescription:
      "Paris is a high-density culture destination with museum routes, river-side neighborhoods, and cafe-centered day plans. It supports short premium trips and long discovery itineraries.",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    distanceFromHubs: "6,560 km",
    localCurrency: "Euro (EUR)",
    aqi: 40,
    travelScore: 94,
    safetyScore: 80,
    advantages: ["Dense landmark coverage", "Strong metro connectivity", "Global food scene"],
    disadvantages: ["Premium zones costly", "Crowded monument corridors"],
    suitability: {
      family: "Good with museum and park balancing",
      solo: "Strong public transport and walkability",
      couple: "Excellent for river and evening dining",
      budget: "Possible with outer-arrondissement stays"
    },
    weatherForecast: [
      { day: "Monday", temp: "15C - 24C", general: "Partly Cloudy", aqi: 41 },
      { day: "Tuesday", temp: "14C - 23C", general: "Sunny", aqi: 38 },
      { day: "Wednesday", temp: "13C - 22C", general: "Light Rain", aqi: 44 }
    ],
    attractions: [
      { name: "Eiffel Tower", desc: "Observation decks and city panorama." },
      { name: "Louvre Museum", desc: "Art collections and iconic galleries." },
      { name: "Arc de Triomphe", desc: "Historic monument and avenue axis view." }
    ],
    food: [
      { name: "Croissant", desc: "Buttery layered pastry classic." },
      { name: "Confit de Canard", desc: "Traditional duck preparation." }
    ],
    tips: [
      "Book timed-entry slots for major museums.",
      "Use metro passes for route density.",
      "Keep anti-pickpocket precautions in crowded zones."
    ],
    budgetBreakdown: {
      flights: 520,
      lodging: 360,
      meals: 140,
      transport: 65,
      total: 1085
    },
    transportOptions: {
      flights: { lowest: 480, average: 620, duration: "9.1h" },
      trains: { cost: 0, duration: "N/A" },
      buses: { cost: 0, duration: "N/A" },
      taxi: { fare: 85 }
    },
    accommodationOptions: {
      hostels: [{ name: "Generator Paris", price: 45, rating: 4.1, reviews: 2980, distance: "3.2 km" }],
      budget: [{ name: "St Christopher's Inn", price: 58, rating: 4.0, reviews: 4200, distance: "2.8 km" }],
      comfort: [{ name: "Hotel de Nell", price: 168, rating: 4.3, reviews: 540, distance: "2.1 km" }],
      luxury: [{ name: "Ritz Paris", price: 750, rating: 4.9, reviews: 1240, distance: "1.8 km" }]
    },
    foodCostAnalysis: {
      budgetDaily: 32,
      midRangeDaily: 72,
      luxuryDaily: 210,
      popularRestaurants: [
        { name: "Bouillon Chartier", type: "Budget French", averagePrice: 20 },
        { name: "Le Jules Verne", type: "Fine Dining", averagePrice: 120 }
      ]
    },
    nearbyExplorer: {
      hospitals: [{ name: "Necker Hospital", distance: "3.8 km", rating: 4.6, lat: 48.844, lng: 2.315 }],
      fuelStations: [{ name: "TotalEnergies Porte d'Orleans", distance: "4.5 km", rating: 4.1, lat: 48.821, lng: 2.325 }],
      restaurants: [{ name: "Cafe de Flore", distance: "2.4 km", rating: 4.3, lat: 48.854, lng: 2.328 }]
    },
    locationData: {
      hotels: [
        {
          name: "Ritz Paris",
          price: 55000,
          rating: 4.9,
          reviews: 1240,
          distance: "1.8 km",
          lat: 48.868,
          lng: 2.329,
          address: "15 Place Vendome, Paris",
          tier: "luxury"
        },
        {
          name: "Generator Paris Hostel",
          price: 4200,
          rating: 4.1,
          reviews: 2980,
          distance: "3.2 km",
          lat: 48.880,
          lng: 2.368,
          address: "Place du Colonel Fabien, Paris",
          tier: "hostel"
        }
      ],
      restaurants: [
        {
          name: "Le Jules Verne",
          type: "Gastronomic French",
          averagePrice: 6500,
          rating: 4.8,
          distance: "3.5 km",
          lat: 48.858,
          lng: 2.294,
          address: "Eiffel Tower, Paris"
        },
        {
          name: "Bouillon Chartier",
          type: "Traditional Parisian",
          averagePrice: 1200,
          rating: 4.4,
          distance: "2.1 km",
          lat: 48.871,
          lng: 2.343,
          address: "Faubourg Montmartre, Paris"
        }
      ],
      attractions: [
        {
          name: "Louvre Museum",
          desc: "World-famous museum and collections.",
          rating: 4.8,
          distance: "1.9 km",
          lat: 48.860,
          lng: 2.337,
          address: "Rue de Rivoli, Paris"
        }
      ],
      hospitals: [
        {
          name: "Necker Hospital",
          distance: "3.8 km",
          rating: 4.6,
          lat: 48.844,
          lng: 2.315,
          address: "149 Rue de Sevres, Paris",
          phone: "+33-1-44494000"
        }
      ],
      fuelStations: [
        {
          name: "TotalEnergies Porte d'Orleans",
          distance: "4.5 km",
          rating: 4.1,
          lat: 48.821,
          lng: 2.325,
          address: "Porte d'Orleans, Paris",
          types: ["Petrol", "Diesel"]
        }
      ],
      evChargingStations: [
        {
          name: "Belib Concorde Charging",
          distance: "1.8 km",
          rating: 4.4,
          lat: 48.865,
          lng: 2.321,
          address: "Place de la Concorde, Paris",
          chargingType: "AC 22kW / DC 50kW",
          connector: "Type 2 / CCS2"
        }
      ],
      updatedAt: "2026-06-24T10:00:00.000Z"
    },
    scam: {
      level: "High",
      riskScore: 79,
      alerts: [
        {
          id: "petition-scam",
          title: "Petition and bracelet scam",
          severity: "high",
          hotspot: "major monument corridors",
          timeWindow: "10:00-20:00",
          description: "Forced interactions near queue lines.",
          avoidance: "Avoid unsolicited interactions and keep moving."
        }
      ],
      safeZones: ["Main transport lines", "Museum security corridors", "Verified ride points"],
      advisory: "Guard personal belongings in crowded attraction zones."
    },
    gems: {
      gems: [
        {
          id: "paris-canal-district-loop",
          name: "Canal District Local Loop",
          category: "City",
          budget: "moderate",
          crowdLevel: "moderate",
          bestWindow: "09:00-11:30",
          highlight: "Neighborhood bakeries and local storefront rhythm.",
          whyLocalLoveIt: "Less queue pressure than monument circuits.",
          relevanceScore: 82
        }
      ],
      strategy: { firstWindow: "09:00-11:30", categoryMix: ["City"] },
      advisory: "Mix major landmarks with neighborhood loops."
    },
    visa: {
      nationality: "Indian",
      statusLabel: "Likely Pre-Approved Visa",
      visaType: "Embassy/Consulate Visa",
      processingTime: "5 to 20 business days",
      estimatedCostUsd: 90,
      stayLimit: "As per embassy approval"
    }
  },
  {
    id: "tokyo-demo",
    aliases: ["tokyo", "japan", "tokyo japan", "shibuya"],
    name: "Tokyo",
    location: "Japan",
    rating: 4.9,
    reviewsCount: 4080,
    startingBudget: 980,
    bestTime: "March to May and October to November",
    description: "Futuristic neighborhoods, precision transit, and deep food culture.",
    longDescription:
      "Tokyo combines high-efficiency movement, district-level diversity, and a layered cultural scene from shrines to robotics. It supports both premium and structured budget itineraries.",
    image:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
    distanceFromHubs: "6,010 km",
    localCurrency: "Japanese Yen (JPY)",
    aqi: 34,
    travelScore: 95,
    safetyScore: 91,
    advantages: ["Excellent public transport", "High safety", "Strong district experiences"],
    disadvantages: ["Premium central stays", "Peak-hour station crowding"],
    suitability: {
      family: "Excellent with parks and themed attractions",
      solo: "Very strong for safe and efficient movement",
      couple: "Great for seasonal walks and skyline dining",
      budget: "Good with rail pass and neighborhood stays"
    },
    weatherForecast: [
      { day: "Monday", temp: "18C - 27C", general: "Sunny", aqi: 32 },
      { day: "Tuesday", temp: "19C - 28C", general: "Partly Cloudy", aqi: 35 },
      { day: "Wednesday", temp: "17C - 26C", general: "Rain chance", aqi: 38 }
    ],
    attractions: [
      { name: "Shibuya Crossing", desc: "Iconic urban junction and city pulse." },
      { name: "Senso-ji", desc: "Historic temple district and market lane." },
      { name: "Tokyo Skytree", desc: "Observation decks and skyline scope." }
    ],
    food: [
      { name: "Ramen", desc: "District-style broth noodle variations." },
      { name: "Sushi", desc: "Fresh seasonal fish and rice craft." }
    ],
    tips: [
      "Plan station exits beforehand.",
      "Use IC card for rapid transit movement.",
      "Book popular restaurants in advance."
    ],
    budgetBreakdown: {
      flights: 520,
      lodging: 280,
      meals: 110,
      transport: 70,
      total: 980
    },
    transportOptions: {
      flights: { lowest: 500, average: 620, duration: "8.8h" },
      trains: { cost: 0, duration: "N/A" },
      buses: { cost: 0, duration: "N/A" },
      taxi: { fare: 120 }
    },
    accommodationOptions: {
      hostels: [{ name: "UNPLAN Shinjuku", price: 42, rating: 4.4, reviews: 980, distance: "2.0 km" }],
      budget: [{ name: "APA Hotel Ueno", price: 88, rating: 4.0, reviews: 2210, distance: "1.8 km" }],
      comfort: [{ name: "Shinjuku Prince Hotel", price: 158, rating: 4.3, reviews: 1860, distance: "1.2 km" }],
      luxury: [{ name: "The Peninsula Tokyo", price: 620, rating: 4.9, reviews: 1320, distance: "2.4 km" }]
    },
    foodCostAnalysis: {
      budgetDaily: 28,
      midRangeDaily: 62,
      luxuryDaily: 180,
      popularRestaurants: [
        { name: "Ichiran", type: "Ramen", averagePrice: 11 },
        { name: "Sukiyabashi-level Omakase", type: "Fine Dining", averagePrice: 140 }
      ]
    },
    nearbyExplorer: {
      hospitals: [{ name: "St. Luke's International Hospital", distance: "4.2 km", rating: 4.7, lat: 35.667, lng: 139.775 }],
      fuelStations: [{ name: "ENEOS Chuo-ku", distance: "2.1 km", rating: 4.2, lat: 35.673, lng: 139.768 }],
      restaurants: [{ name: "Ichiran Shibuya", distance: "0.7 km", rating: 4.5, lat: 35.659, lng: 139.700 }]
    },
    locationData: {
      hotels: [
        {
          name: "The Peninsula Tokyo",
          price: 82000,
          rating: 4.9,
          reviews: 1320,
          distance: "2.4 km",
          lat: 35.673,
          lng: 139.761,
          address: "Chiyoda City, Tokyo",
          tier: "luxury"
        },
        {
          name: "APA Hotel Ueno",
          price: 12000,
          rating: 4.0,
          reviews: 2210,
          distance: "1.8 km",
          lat: 35.711,
          lng: 139.777,
          address: "Taito City, Tokyo",
          tier: "budget"
        }
      ],
      restaurants: [
        {
          name: "Ichiran Shibuya",
          type: "Ramen",
          averagePrice: 1500,
          rating: 4.5,
          distance: "0.7 km",
          lat: 35.659,
          lng: 139.700,
          address: "Shibuya, Tokyo"
        },
        {
          name: "Tsukiji Outer Market Sushi",
          type: "Sushi",
          averagePrice: 3500,
          rating: 4.6,
          distance: "2.6 km",
          lat: 35.665,
          lng: 139.770,
          address: "Tsukiji, Tokyo"
        }
      ],
      attractions: [
        {
          name: "Senso-ji",
          desc: "Historic temple and market street.",
          rating: 4.8,
          distance: "3.2 km",
          lat: 35.714,
          lng: 139.796,
          address: "Asakusa, Tokyo"
        }
      ],
      hospitals: [
        {
          name: "St. Luke's International Hospital",
          distance: "4.2 km",
          rating: 4.7,
          lat: 35.667,
          lng: 139.775,
          address: "Chuo City, Tokyo",
          phone: "+81-3-3541-5151"
        }
      ],
      fuelStations: [
        {
          name: "ENEOS Chuo-ku",
          distance: "2.1 km",
          rating: 4.2,
          lat: 35.673,
          lng: 139.768,
          address: "Chuo, Tokyo",
          types: ["Petrol", "Diesel"]
        }
      ],
      evChargingStations: [
        {
          name: "Tokyo Midtown EV Hub",
          distance: "3.1 km",
          rating: 4.5,
          lat: 35.665,
          lng: 139.731,
          address: "Roppongi, Tokyo",
          chargingType: "DC Fast 50kW",
          connector: "CHAdeMO / CCS2"
        }
      ],
      updatedAt: "2026-06-24T10:00:00.000Z"
    },
    scam: {
      level: "Low",
      riskScore: 42,
      alerts: [
        {
          id: "bar-cover-charge",
          title: "Late-night cover charge surprise",
          severity: "low",
          hotspot: "nightlife alleys",
          timeWindow: "20:00-02:00",
          description: "Unexpected seating/cover charges in some late-night spots.",
          avoidance: "Check menu board and service charge before entry."
        }
      ],
      safeZones: ["Major station routes", "Family districts", "Well-signed commercial streets"],
      advisory: "Use standard urban vigilance but overall risk remains low."
    },
    gems: {
      gems: [
        {
          id: "tokyo-kuramae-loop",
          name: "Kuramae Craft Loop",
          category: "Design",
          budget: "moderate",
          crowdLevel: "low",
          bestWindow: "10:00-13:00",
          highlight: "Small-batch crafts and calm coffee routes.",
          whyLocalLoveIt: "Quieter than core tourist corridors.",
          relevanceScore: 86
        }
      ],
      strategy: { firstWindow: "10:00-13:00", categoryMix: ["Design"] },
      advisory: "Blend major landmarks with neighborhood loops."
    },
    visa: {
      nationality: "Indian",
      statusLabel: "Likely Pre-Approved Visa",
      visaType: "Embassy/Consulate Visa",
      processingTime: "5 to 20 business days",
      estimatedCostUsd: 90,
      stayLimit: "As per embassy approval"
    }
  }
];

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .trim();
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function uniqueById(list = []) {
  const seen = new Set();
  return list.filter((item) => {
    const id = String(item?.id || "");
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function summaryRow(city) {
  return {
    id: city.id,
    name: city.name,
    location: city.location,
    rating: city.rating,
    startingBudget: city.startingBudget,
    bestTime: city.bestTime,
    description: city.description,
    image: city.image
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getTestingDestinationCities() {
  return deepClone(CITY_FEATURE_DATA.map(summaryRow));
}

export function searchTestingDestinationCities(query = "") {
  const q = normalizeText(query);
  if (!q) {
    return getTestingDestinationCities();
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const ranked = CITY_FEATURE_DATA.map((city) => {
    const haystack = [city.name, city.location, ...(city.aliases || []), city.description].join(" ").toLowerCase();
    let score = 0;

    for (const token of tokens) {
      if (haystack.includes(token)) score += 3;
      if (city.name.toLowerCase().includes(token)) score += 4;
      if ((city.aliases || []).some((alias) => alias.includes(token))) score += 2;
    }

    return { score, city };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => summaryRow(row.city));

  return uniqueById(ranked);
}

export function getTestingDestinationDetails(idOrName = "") {
  const raw = normalizeText(idOrName);
  if (!raw) {
    return deepClone(CITY_FEATURE_DATA[0]);
  }

  const compact = raw.replace(/-demo$/, "").replace(/-/g, " ").trim();

  const found = CITY_FEATURE_DATA.find((city) => {
    if (city.id === raw) return true;
    if (city.id.replace(/-demo$/, "") === raw) return true;
    if (normalizeText(city.name) === raw) return true;
    if (normalizeText(city.name) === compact) return true;
    if ((city.aliases || []).includes(raw)) return true;
    if ((city.aliases || []).includes(compact)) return true;
    return false;
  });

  return deepClone(found || CITY_FEATURE_DATA[0]);
}

export function getTestingLocationData(idOrName = "") {
  const details = getTestingDestinationDetails(idOrName);
  return deepClone(details.locationData || {});
}

export function getTestingScamData(idOrName = "") {
  const details = getTestingDestinationDetails(idOrName);
  const payload = details.scam || { level: "Low", riskScore: 30, alerts: [], safeZones: [], advisory: "No major signals." };
  return {
    destination: details.name,
    travelMode: "general",
    timeBand: "auto",
    riskScore: Number(payload.riskScore || 30),
    level: String(payload.level || "Low"),
    alerts: deepClone(payload.alerts || []),
    safeZones: deepClone(payload.safeZones || []),
    emergencyContacts: ["Local emergency hotline", "Tourist police support desk", "Embassy or consular helpline"],
    advisory: String(payload.advisory || "Standard travel vigilance advised."),
    generatedAt: new Date().toISOString()
  };
}

export function getTestingHiddenGemsData(idOrName = "") {
  const details = getTestingDestinationDetails(idOrName);
  const payload = details.gems || { gems: [], strategy: { firstWindow: "08:00-10:00", categoryMix: [] }, advisory: "Prefer local windows." };
  return {
    destination: details.name,
    budgetPreference: "balanced",
    crowdPreference: "low",
    gems: deepClone(payload.gems || []),
    strategy: deepClone(payload.strategy || { firstWindow: "08:00-10:00", categoryMix: [] }),
    advisory: String(payload.advisory || "Prefer local windows."),
    generatedAt: new Date().toISOString()
  };
}

export function getTestingVisaData(idOrName = "", nationality = "Indian", purpose = "tourism", durationDays = 7) {
  const details = getTestingDestinationDetails(idOrName);
  const payload = details.visa || {};

  return {
    destination: details.name,
    destinationCountry: details.location,
    nationality,
    purpose,
    durationDays: Math.max(1, Math.min(180, Number(durationDays || 7))),
    visaRequired: !String(payload.statusLabel || "").toLowerCase().includes("visa-free") && !String(payload.statusLabel || "").toLowerCase().includes("no international visa"),
    statusLabel: String(payload.statusLabel || "Check Official Embassy Rules"),
    visaType: String(payload.visaType || "Country-specific"),
    processingTime: String(payload.processingTime || "Depends on nationality and destination"),
    estimatedCostUsd: Number(payload.estimatedCostUsd || 80),
    stayLimit: String(payload.stayLimit || "Depends on visa category"),
    confidence: "medium",
    documentsRequired: [
      "Valid passport (minimum 6 months validity)",
      "Confirmed return tickets",
      "Hotel booking or host address proof",
      "Recent bank statement"
    ],
    recommendations: [
      "Always verify latest rules with official embassy/consulate before booking.",
      "Keep digital and printed copies of all travel documents.",
      "Track passport expiry and blank-page availability."
    ],
    advisoryNote:
      "Visa intelligence is advisory only. Rules can change without notice; confirm with official embassy/consulate portals before travel."
  };
}

export function getTestingCityIndex() {
  return CITY_FEATURE_DATA.map((city) => ({
    id: city.id,
    slug: toSlug(city.name),
    aliases: [...(city.aliases || [])],
    name: city.name,
    location: city.location
  }));
}
