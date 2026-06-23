/**
 * Gemini API Integration for AI Travel Planner
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// Curated high-fidelity mock data database for offline/no-key usage
const MOCK_PLANS = {
  bali: {
    destination: "Bali, Indonesia",
    tagline: "Tropical Paradise of Temples & Beaches",
    baseCosts: { hotel: 45, food: 20, transit: 12, activities: 25 },
    suggestions: ["Uluwatu Temple", "Ubud Monkey Forest", "Tegallalang Rice Terraces", "Seminyak Beach", "Mount Batur Sunrise Trek"],
    itinerary: [
      {
        day: 1,
        theme: "Arrival & Coastal Sunsets",
        morning: "Land at Ngurah Rai Airport, check into your glassmorphic eco-resort in Seminyak, and refresh.",
        afternoon: "Walk around Seminyak's boutique shops and grab a fresh coconut at a beachside cafe.",
        evening: "Visit the cliffside Uluwatu Temple, watch the traditional Kecak Fire Dance performance, and enjoy a seafood dinner at Jimbaran Bay.",
        foodRecommendation: "Nasi Goreng (Indonesian fried rice with fried egg and chicken satay)"
      },
      {
        day: 2,
        theme: "Cultural Heart of Ubud",
        morning: "Travel to Ubud. Stroll through the sacred Monkey Forest and explore the historical Ubud Palace.",
        afternoon: "Wander through the breathtaking Tegallalang Rice Terraces and swing over the valleys for stunning photos.",
        evening: "Relax at a local organic spa with a traditional Balinese massage followed by dinner overlooking the jungle ravines.",
        foodRecommendation: "Babi Guling (Suckling pig roasted with rich local spices)"
      },
      {
        day: 3,
        theme: "Active Adventures & Volcanoes",
        morning: "Start early for a sunrise trek up Mount Batur, an active volcano, or take a scenic drive around Kintamani.",
        afternoon: "Relax in the natural hot springs of Toya Devasya to soothe your muscles after the hike.",
        evening: "Dine at a panoramic restaurant in Kintamani with sweeping views of Lake Batur.",
        foodRecommendation: "Nasi Campur (Scoop of rice surrounded by small portions of meats and vegetables)"
      },
      {
        day: 4,
        theme: "Waterfalls & Sacred Springs",
        morning: "Visit Tegenungan Waterfall and take a dip in the cool waters surrounded by lush jungle foliage.",
        afternoon: "Participate in a spiritual purification ritual at the Tirta Empul Holy Water Temple.",
        evening: "Explore the Ubud Art Market for hand-woven baskets, wood carvings, and souvenir shopping.",
        foodRecommendation: "Bebek Betutu (Slow-cooked duck in rich lemongrass and turmeric paste)"
      },
      {
        day: 5,
        theme: "Nusa Penida Island Excursion",
        morning: "Take a speed boat from Sanur to Nusa Penida Island. Head directly to the iconic Kelingking T-Rex Beach.",
        afternoon: "Swim at Crystal Bay and snorkel with Manta Rays at Manta Point.",
        evening: "Return to the main island for a farewell sunset dinner at a beach club in Canggu.",
        foodRecommendation: "Sate Lilit (Minced fish grilled on lemongrass sticks)"
      }
    ],
    tips: [
      "Hire a local driver for convenience; it is affordable and saves time.",
      "Dress respectfully when visiting temples, wearing a sarong and sash.",
      "Stay hydrated and avoid drinking tap water directly; use bottled water."
    ]
  },
  dubai: {
    destination: "Dubai, UAE",
    tagline: "Futuristic Oasis of Luxury & Wonders",
    baseCosts: { hotel: 120, food: 45, transit: 15, activities: 65 },
    suggestions: ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah", "Desert Safari", "Museum of the Future"],
    itinerary: [
      {
        day: 1,
        theme: "Modern Wonders & Tall Heights",
        morning: "Arrive in Dubai. Head to the top of the Burj Khalifa (124th & 125th floor) for a panoramic view of the skyline.",
        afternoon: "Explore the massive Dubai Mall, view the giant indoor aquarium, and grab lunch at a premium rooftop cafe.",
        evening: "Watch the spectacular Dubai Fountain show and enjoy a fine dining experience overlooking the lake.",
        foodRecommendation: "Shawarma wraps and fresh Arabic Hummus with freshly baked pita"
      },
      {
        day: 2,
        theme: "Old Dubai & Heritage",
        morning: "Visit the Al Fahidi Historical Neighborhood, walk through narrow lanes, and visit the Dubai Museum.",
        afternoon: "Take a traditional Abra water taxi across Dubai Creek to visit the Spice and Gold Souks.",
        evening: "Have a traditional Emirati dinner at the Sheikh Mohammed Centre for Cultural Understanding.",
        foodRecommendation: "Al Harees (Slow-cooked wheat and meat seasoned with spices)"
      },
      {
        day: 3,
        theme: "Desert Adventure & Safari",
        morning: "Sleep in or relax by your hotel pool. Visit the architectural marvel, the Museum of the Future.",
        afternoon: "Embark on a thrilling 4x4 desert safari, try sandboarding down dunes, and ride a camel.",
        evening: "Experience a magical Bedouin-style camp sunset, complete with a BBQ buffet dinner, henna painting, and Tanoura dance.",
        foodRecommendation: "Mandi (Rice and meat cooked in a pit under the sand with charcoal)"
      },
      {
        day: 4,
        theme: "Palm Jumeirah & Waterparks",
        morning: "Take the monorail to Palm Jumeirah and explore the stunning Atlantis, The Palm.",
        afternoon: "Spend a thrilling afternoon at Aquaventure Waterpark, the world's largest waterpark.",
        evening: "Walk along the Palm West Beach boardwalk, dine with view of the Marina skyline.",
        foodRecommendation: "Grilled Hammour fish with saffron rice"
      },
      {
        day: 5,
        theme: "Luxury & Modern Lifestyle",
        morning: "Stroll around the scenic Dubai Marina, admire the yachts, and have breakfast.",
        afternoon: "Visit the Souk Madinat Jumeirah, nicknamed 'Little Venice' of Dubai, for beautiful canal views.",
        evening: "Take a luxury sunset yacht cruise along the coastline for your farewell dinner.",
        foodRecommendation: "Luqaimat (Sweet, crunchy dumplings drizzled with date syrup)"
      }
    ],
    tips: [
      "Use the Dubai Metro; it is cheap, clean, fast, and covers most tourist hotspots.",
      "Respect local dress codes, especially in public spaces and religious sites.",
      "The best time to visit is from October to April when the weather is pleasant."
    ]
  },
  goa: {
    destination: "Goa, India",
    tagline: "Sun, Sand, Sea & Portuguese Charm",
    baseCosts: { hotel: 35, food: 18, transit: 10, activities: 15 },
    suggestions: ["Baga Beach", "Calangute Beach", "Basilica of Bom Jesus", "Dudhsagar Waterfalls", "Anjuna Flea Market"],
    itinerary: [
      {
        day: 1,
        theme: "Vibrant North Goa Beaches",
        morning: "Check into your beachside resort near Calangute. Walk along the beach to feel the soft sand.",
        afternoon: "Head to Baga Beach for exciting water sports like parasailing and jet skiing.",
        evening: "Have sunset cocktails at a shanti shack, followed by a lively beachside party and seafood dinner at Tito's Lane.",
        foodRecommendation: "Goan Fish Curry Rice with local Kingfish"
      },
      {
        day: 2,
        theme: "Heritage & Old Goa Portuguese Architecture",
        morning: "Drive to Old Goa. Explore the Basilica of Bom Jesus (holding relics of St. Francis Xavier) and Se Cathedral.",
        afternoon: "Walk through the colorful heritage Latin Quarter, Fontainhas, in Panaji, noting the vibrant Portuguese houses.",
        evening: "Enjoy a premium Mandovi River cruise with traditional live music, dancing, and Goan buffet dinner.",
        foodRecommendation: "Pork Vindaloo (Spicy, tangy Goan dish cooked in vinegar and garlic)"
      },
      {
        day: 3,
        theme: "Waterfalls & Spice Plantations",
        morning: "Trek to the magnificent Dudhsagar Waterfalls, watching the water cascade like milk down the hills.",
        afternoon: "Visit a lush Spice Plantation, take a guided tour, learn about exotic spices, and enjoy a traditional buffet on banana leaves.",
        evening: "Relax at your hotel or take a peaceful stroll along Miramar beach.",
        foodRecommendation: "Chicken Xacuti (Rich coconut-based curry with roasted spices)"
      },
      {
        day: 4,
        theme: "Bohemian Vibes & Forts",
        morning: "Visit the historic Fort Aguada and its 17th-century lighthouse overlooking the Arabian Sea.",
        afternoon: "Explore the famous Anjuna Flea Market (if Wednesday) or enjoy the rocky cliffs of Vagator beach.",
        evening: "Watch a magical sunset from the ruins of Chapora Fort (famous from Dil Chahta Hai) followed by dinner at a cliffside lounge.",
        foodRecommendation: "Prawn Balchao with warm local bread (Poi)"
      },
      {
        day: 5,
        theme: "South Goa Serenity",
        morning: "Drive to South Goa's quiet beaches like Palolem or Colva, which are much more peaceful.",
        afternoon: "Rent a kayak at Palolem beach or take a boat ride to Butterfly Beach to spot dolphins.",
        evening: "Enjoy a quiet candlelit dinner under the stars at a seaside shack, listening to the crashing waves.",
        foodRecommendation: "Bebinca (A traditional multi-layered Goan coconut cake dessert)"
      }
    ],
    tips: [
      "Rent a scooter or car for convenient and budget-friendly exploration.",
      "Carry sunscreen and light cotton clothing as the climate is tropical.",
      "Check out local shacks for the best seafood and affordable prices."
    ]
  },
  paris: {
    destination: "Paris, France",
    tagline: "Romantic Capital of Art & Culinary Pleasures",
    baseCosts: { hotel: 110, food: 50, transit: 15, activities: 40 },
    suggestions: ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral", "Arc de Triomphe", "Seine River Cruise"],
    itinerary: [
      {
        day: 1,
        theme: "Iconic Landmarks & Eiffel Tower",
        morning: "Arrive in Paris, settle in. Walk around the Trocadéro Gardens for the best views of the Eiffel Tower.",
        afternoon: "Climb the Eiffel Tower or enjoy a picnic on the Champ de Mars with fresh baguettes and cheese.",
        evening: "Take a scenic sunset cruise on the Seine River, watching the city landmarks light up, followed by dinner in a classic bistro.",
        foodRecommendation: "Confit de Canard (Slow-cooked duck leg with crispy skin)"
      },
      {
        day: 2,
        theme: "Artistic Treasures & Museums",
        morning: "Visit the Louvre Museum (pre-book tickets to see the Mona Lisa, Venus de Milo, and Winged Victory).",
        afternoon: "Stroll along the historic Tuileries Garden and shop along the famous Champs-Élysées.",
        evening: "Walk up to the Arc de Triomphe for panoramic views of the intersecting avenues, and dine at a nearby cafe.",
        foodRecommendation: "Boeuf Bourguignon (Beef stew braised in red wine and beef broth)"
      },
      {
        day: 3,
        theme: "Bohemian Montmartre & Hillside Views",
        morning: "Explore the bohemian neighborhood of Montmartre. Visit the stunning Sacré-Cœur Basilica.",
        afternoon: "Browse artwork at Place du Tertre, get your portrait sketched, and visit a cozy local cafe.",
        evening: "Watch a cabaret show at the Moulin Rouge or enjoy a jazz performance in the Latin Quarter.",
        foodRecommendation: "French Onion Soup topped with melted Gruyere cheese and croutons"
      },
      {
        day: 4,
        theme: "Versailles Royal Palace Day Trip",
        morning: "Take the RER train to the Palace of Versailles. Explore the breathtaking Hall of Mirrors and royal apartments.",
        afternoon: "Walk through the endless ornamental gardens and visit Marie Antoinette's estate.",
        evening: "Return to Paris, visit the trendy Le Marais district for boutique shopping and falafels.",
        foodRecommendation: "Classic Crepes (sweet with Nutella or savory with ham and cheese)"
      },
      {
        day: 5,
        theme: "Islands, Architecture & Cafes",
        morning: "Visit the Île de la Cité, admire the Gothic Notre-Dame Cathedral, and walk across the Pont Neuf.",
        afternoon: "Browse books at Shakespeare and Company and sit at Café de Flore for hot chocolate.",
        evening: "Farewell dinner in a Michelin-starred restaurant or premium brasserie to toast your trip.",
        foodRecommendation: "Escargots de Bourgogne (Snails cooked in butter, garlic, and parsley)"
      }
    ],
    tips: [
      "Buy the Paris Museum Pass to save money and skip long lines at major attractions.",
      "Learn basic French phrases like 'Bonjour' and 'Merci'; locals appreciate the effort.",
      "Use the Metro; it is efficient and very easy to navigate."
    ]
  },
  switzerland: {
    destination: "Switzerland",
    tagline: "Spectacular Alpine Peaks & Crystal Lakes",
    baseCosts: { hotel: 140, food: 60, transit: 35, activities: 70 },
    suggestions: ["Interlaken", "Zermatt & Matterhorn", "Lucerne Chapel Bridge", "Lake Geneva", "Jungfraujoch"],
    itinerary: [
      {
        day: 1,
        theme: "Lakes & Bridges of Lucerne",
        morning: "Arrive in Lucerne. Stroll across the iconic 14th-century Chapel Bridge (Kapellbrücke).",
        afternoon: "Take a scenic cruise around Lake Lucerne, surrounded by towering mountain peaks.",
        evening: "Walk through the medieval Old Town, and enjoy a traditional Swiss dinner by the river.",
        foodRecommendation: "Swiss Cheese Fondue (Melted cheese served in a communal pot for dipping bread)"
      },
      {
        day: 2,
        theme: "Adventure Capital Interlaken",
        morning: "Take the scenic golden-pass train to Interlaken. Check into your cozy alpine lodge.",
        afternoon: "Try tandem paragliding for breathtaking views of Lake Thun and Lake Brienz, or rent a kayak.",
        evening: "Walk around the Höheweg park, watch paragliders land, and dine at a Swiss chalet restaurant.",
        foodRecommendation: "Rösti (Crispy grated pan-fried potatoes, often served with cheese and bacon)"
      },
      {
        day: 3,
        theme: "Top of Europe - Jungfraujoch",
        morning: "Take the cogwheel train up to Jungfraujoch, the highest railway station in Europe at 3,454m.",
        afternoon: "Explore the Ice Palace tunnels, step onto the Sphinx Observatory deck, and enjoy snow activities.",
        evening: "Return to Interlaken, relax at a thermal bath house to warm up, followed by a hearty dinner.",
        foodRecommendation: "Zürcher Geschnetzeltes (Sliced veal in a creamy white wine and mushroom sauce)"
      },
      {
        day: 4,
        theme: "Car-Free Alpine Beauty Zermatt",
        morning: "Travel to Zermatt, the famous car-free mountain village at the foot of the iconic Matterhorn.",
        afternoon: "Take the Gornergrat open-air cog railway for spectacular close-up views of the Matterhorn glacier.",
        evening: "Wander around Zermatt's beautiful wooden huts and enjoy a cozy fondue dinner.",
        foodRecommendation: "Raclette (Melted alpine cheese scraped over potatoes, pickles, and onions)"
      },
      {
        day: 5,
        theme: "Lake Geneva & Castles",
        morning: "Travel to Montreux on the shores of Lake Geneva. Stroll along the flower-lined lake promenade.",
        afternoon: "Tour the medieval Chillon Castle, which sits on a rock directly on the edge of the lake.",
        evening: "Have a final lakeside dinner in Montreux, enjoying fresh lake fish and Swiss wine.",
        foodRecommendation: "Filets de Perche (Freshly caught lake perch fried in butter)"
      }
    ],
    tips: [
      "Purchase a Swiss Travel Pass for unlimited travel on trains, buses, and boats.",
      "Switzerland is expensive; eat lunch at supermarkets (Coop or Migros) to save money.",
      "Download the SBB Mobile app for precise, up-to-the-minute train schedules."
    ]
  },
  thailand: {
    destination: "Thailand",
    tagline: "Land of Smiles: Culture, Temples & Islands",
    baseCosts: { hotel: 30, food: 15, transit: 10, activities: 20 },
    suggestions: ["Bangkok Grand Palace", "Chiang Mai Old City", "Phi Phi Islands", "Wat Arun", "Phuket Beaches"],
    itinerary: [
      {
        day: 1,
        theme: "Bangkok Temples & Nightlife",
        morning: "Arrive in Bangkok. Visit the breathtaking Grand Palace and the Temple of the Emerald Buddha.",
        afternoon: "Take a longtail boat tour along the Chao Phraya River, stopping to explore Wat Arun (Temple of Dawn).",
        evening: "Explore the bustling street food stalls of Chinatown (Yaowarat Road) or visit a rooftop bar.",
        foodRecommendation: "Pad Thai (Stir-fried rice noodles with egg, tofu, sprouts, and peanuts)"
      },
      {
        day: 2,
        theme: "Bangkok Markets & Modern City",
        morning: "Visit the famous Damnoen Saduak Floating Market or Maeklong Railway Market.",
        afternoon: "Shop at the huge MBK Center or Siam Paragon mall, experiencing modern Bangkok's retail scene.",
        evening: "Walk around Khao San Road for lively backpacker nightlife, cheap drinks, and street snacks.",
        foodRecommendation: "Tom Yum Goong (Spicy, sour soup cooked with prawns, lemongrass, and lime)"
      },
      {
        day: 3,
        theme: "Cultural Chiang Mai",
        morning: "Fly or take a train to northern Chiang Mai. Check into a boutique guest house in the Old City.",
        afternoon: "Visit Wat Phra Singh and Wat Chedi Luang temples, taking in the unique Lanna-style architecture.",
        evening: "Wander through the famous Chiang Mai Night Bazaar, shopping for local crafts and sampling northern food.",
        foodRecommendation: "Khao Soi (Egg noodles in a rich, creamy coconut curry broth with chicken)"
      },
      {
        day: 4,
        theme: "Ethical Elephant Sanctuary",
        morning: "Spend a memorable morning volunteering at an ethical Elephant Jungle Sanctuary, feeding and bathing elephants.",
        afternoon: "Return to Chiang Mai, hike or drive up to Wat Phra That Doi Suthep on the mountain for sunset city views.",
        evening: "Relax with a traditional Thai foot massage, followed by a quiet dinner by the Ping River.",
        foodRecommendation: "Som Tum (Spicy green papaya salad with peanuts and lime)"
      },
      {
        day: 5,
        theme: "Tropical Paradise Phi Phi Islands",
        morning: "Travel to Phuket and take a speedboat to the Phi Phi Islands. Head straight to Maya Bay.",
        afternoon: "Snorkel in the crystal-clear waters of Pileh Lagoon and visit Monkey Beach.",
        evening: "Watch the fire dancers on the beach in Koh Phi Phi Don while enjoying a beach BBQ.",
        foodRecommendation: "Massaman Curry (Mild, rich Thai curry with beef, potatoes, and peanuts)"
      }
    ],
    tips: [
      "Use ride-hailing apps like Grab for transparent and affordable taxi pricing.",
      "Cover your shoulders and knees when visiting temples; sarongs are often available for rent.",
      "Street food is clean, cheap, and often tastes better than tourist restaurants."
    ]
  }
};

/**
 * Generates an autocomplete suggestion list based on user text query.
 * @param {string} query 
 * @returns {Promise<Array<string>>}
 */
export async function generateDestinationSuggestions(query) {
  if (!query || query.length < 2) return [];
  const lowerQuery = query.toLowerCase();

  // If live key is present, we could make an API call, but local autocomplete is fast, responsive, and robust.
  // We'll return a blended autocomplete list
  const standardList = [
    "Bali, Indonesia",
    "Dubai, United Arab Emirates",
    "Goa, India",
    "Paris, France",
    "Switzerland (Alps)",
    "Thailand (Bangkok/Phuket)",
    "Udaipur, India",
    "Jaisalmer, India",
    "Tokyo, Japan",
    "New York, USA",
    "London, United Kingdom",
    "Rome, Italy",
    "Sydney, Australia",
    "Cape Town, South Africa",
    "Maldives",
    "Kyoto, Japan",
    "Barcelona, Spain",
    "Singapore"
  ];

  return standardList.filter(d => d.toLowerCase().includes(lowerQuery));
}

/**
 * Generates a full travel itinerary and budget estimations.
 * @param {string} destination 
 * @param {number} budget - Maximum budget amount 
 * @param {number} days - Length of trip
 * @param {number} travelers - Number of people
 * @param {string} style - Luxury, Budget, Family, Solo, Adventure
 * @returns {Promise<Object>} The generated travel plan
 */
export async function generateTravelPlan(destination, budget, days, travelers, style) {
  // 1. Check if we have an API Key. If so, make a live Gemini API request.
  if (API_KEY) {
    try {
      const prompt = `
        You are an expert AI Travel Planner. Generate a comprehensive, beautiful travel plan for:
        RESPOND ONLY IN ENGLISH. Do not output Hinglish or Hindi text.
        Destination: ${destination}
        Duration: ${days} days
        Travelers: ${travelers} people
        Travel Style: ${style}
        Maximum Budget Constraint: ${budget} USD
        
        Provide the response as a single, valid JSON object. Do not wrap in markdown blocks, do not include comments.
        
        The JSON structure MUST follow this exact schema:
        {
          "destination": "Name of destination and country",
          "tagline": "A short engaging catchy phrase describing the destination",
          "baseCosts": {
            "hotel": estimated nightly hotel cost per day for this style in USD (integer),
            "food": estimated food cost per person per day in USD (integer),
            "transit": estimated local transport cost per day in USD (integer),
            "activities": estimated activity costs per day in USD (integer)
          },
          "suggestions": ["landmark 1", "landmark 2", "landmark 3"],
          "itinerary": [
            {
              "day": 1,
              "theme": "Theme of day 1",
              "morning": "Detailed description of morning activity",
              "afternoon": "Detailed description of afternoon activity",
              "evening": "Detailed description of evening activity",
              "foodRecommendation": "One recommended local dish or restaurant to try"
            }
          ],
          "tips": [
            "Local custom or tipping tip",
            "Transit tip",
            "Packing or seasonal advice"
          ]
        }

        Make sure you generate exactly ${days} itinerary days. Match the values to the travel style (${style}):
        - Budget: lower costs, public transit, free/cheap activities, local street food.
        - Luxury: high-end hotels, private tours, fine dining, premium transit.
        - Adventure: hikes, water sports, outdoor activities, mid-range.
        - Family: child-friendly spots, comfortable pace, spacious rooms.
        - Solo: social spots, hostels/boutique, local immersion.
      `;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      const textResult = data.candidates[0].content.parts[0].text;
      const parsedPlan = JSON.parse(textResult.trim());
      
      // Post-process to ensure numbers are valid
      parsedPlan.baseCosts = parsedPlan.baseCosts || { hotel: 50, food: 25, transit: 15, activities: 20 };
      return parsedPlan;
    } catch (e) {
      console.warn("Gemini API call failed, falling back to local mock engine. Error:", e);
      // Fall through to mock generator
    }
  }

  // 2. Local Fallback Engine (Runs when key is missing or API request fails)
  // Simulate delay to mimic AI thinking process
  await new Promise(resolve => setTimeout(resolve, 1800));

  const cleanDest = destination.toLowerCase().trim();
  let selectedMock = null;

  // Exact or partial match search in popular destinations database
  for (const key of Object.keys(MOCK_PLANS)) {
    if (cleanDest.includes(key)) {
      selectedMock = JSON.parse(JSON.stringify(MOCK_PLANS[key])); // deep clone
      break;
    }
  }

  // If it's a completely custom/unlisted destination, dynamically generate high-quality itinerary structures
  if (!selectedMock) {
    selectedMock = createDynamicPlan(destination, style);
  }

  // Scale the base costs based on the Travel Style
  const costScale = {
    budget: 0.6,
    solo: 0.8,
    adventure: 1.0,
    family: 1.4,
    luxury: 3.5
  };
  const multiplier = costScale[style.toLowerCase()] || 1.0;

  selectedMock.baseCosts = {
    hotel: Math.round(selectedMock.baseCosts.hotel * multiplier),
    food: Math.round(selectedMock.baseCosts.food * multiplier),
    transit: Math.round(selectedMock.baseCosts.transit * multiplier),
    activities: Math.round(selectedMock.baseCosts.activities * multiplier)
  };

  // Slice or extend itinerary days to match requested days
  let currentItinerary = selectedMock.itinerary;
  if (currentItinerary.length < days) {
    // Extend itinerary if requested days > default mock days
    const defaultLen = currentItinerary.length;
    for (let i = defaultLen; i < days; i++) {
      const baseDay = currentItinerary[i % defaultLen];
      currentItinerary.push({
        day: i + 1,
        theme: `Explore More - ${baseDay.theme}`,
        morning: `Discover hidden local gems in ${destination} and enjoy a leisurely breakfast.`,
        afternoon: `Visit scenic viewpoints or local craft markets for souvenirs.`,
        evening: `Relax at a cozy cafe or street bistro, reflecting on your travels.`,
        foodRecommendation: `Chef's special at a highly-rated local restaurant`
      });
    }
  } else if (currentItinerary.length > days) {
    currentItinerary = currentItinerary.slice(0, days);
  }
  
  // Re-adjust day indexes
  selectedMock.itinerary = currentItinerary.map((item, index) => ({
    ...item,
    day: index + 1
  }));

  return selectedMock;
}

/**
 * Dynamically synthesizes a high-fidelity travel plan for any custom destination entered by the user
 */
function createDynamicPlan(destination, style) {
  const destName = destination.split(",")[0].trim();
  const titleDest = destName.charAt(0).toUpperCase() + destName.slice(1);
  
  const activitiesByStyle = {
    budget: {
      morning: ["Explore the free historical city center and snap pictures of old structures.", "Take a scenic walking tour of local parks and natural landmarks.", "Visit the local historical museum on free-admission day."],
      afternoon: ["Browse vibrant public markets and sample affordable street delicacies.", "Relax at a local beach or scenic lake park, soaking in the neighborhood vibe.", "Take a self-guided architectural walking tour through old streets."],
      evening: ["Watch the sunset from a high vantage point or public pier.", "Stroll through a bustling night market and grab cheap local eats.", "Attend a free public concert or cultural street performance."],
      food: ["Local specialty street food platter", "Traditional family-run diner special", "Fresh market vegetable noodles"]
    },
    luxury: {
      morning: ["Take a private guided helicopter tour or helicopter charter for aerial views.", "Enjoy a premium breakfast buffet at a 5-star rooftop lounge.", "Embark on a private yacht tour with champagne service."],
      afternoon: ["Enjoy a customized high-end shopping trip with a personal stylist.", "Dine at a world-famous Michelin-starred culinary institution.", "Indulge in a premium gold-leaf spa treatment and body scrub."],
      evening: ["Attend a VIP private viewing of a theatrical performance.", "Enjoy a sunset helicopter tour followed by a 7-course tasting menu.", "Sip bespoke cocktails at a high-altitude private club."],
      food: ["Signature Truffle Degustation menu", "Freshly caught lobster with caviar butter", "Elite chef-curated seafood plate"]
    },
    adventure: {
      morning: ["Hike up the highest scenic peak or volcano trail for sunrise views.", "Go rock climbing, zip-lining, or canyoning with an expert guide.", "Embark on an early morning off-road ATV quad bike tour."],
      afternoon: ["Go white-water rafting down the local river canyons.", "Snorkel or scuba dive near deep coral reef walls.", "Go mountain biking along rugged forest single-tracks."],
      evening: ["Camp under the stars or relax around a beach bonfire.", "Enjoy a rich barbecue feast at an outdoor adventure basecamp.", "Visit a local hot spring or thermal spa to relax sore muscles."],
      food: ["Robust campfire grilled meats and roasted corn", "High-energy local grain bowl with grilled protein", "Traditional spicy claypot stew"]
    },
    family: {
      morning: ["Visit the city's top-rated science museum or interactive planetarium.", "Take a gentle family bicycle ride along designated nature trails.", "Explore a local wildlife sanctuary or botanical garden."],
      afternoon: ["Have a fun family picnic at an adventure playground.", "Take a relaxing glass-bottom boat tour around the bays.", "Explore a historical castle or fort with engaging interactive guides."],
      evening: ["Enjoy a family dinner with traditional musical theater.", "Walk along the pedestrian harbor and play games at an arcade.", "Watch an outdoor movies-under-the-stars screening."],
      food: ["Kid-friendly local noodles and dessert crepes", "Traditional wood-fired flatbreads", "Handmade sweet ice-cream sundaes"]
    },
    solo: {
      morning: ["Join a social walking tour to meet fellow travelers.", "Rent a bicycle and map out local coffee roasters.", "Attend a local language exchange or art workshop."],
      afternoon: ["Read a book at a famous historic library or bookstore.", "Explore off-the-beaten-path neighborhoods and alleys.", "Visit a contemporary local art exhibition or gallery."],
      evening: ["Join a guided hostel pub crawl or craft beer walking tour.", "Have dinner at a communal-table kitchen chatting with locals.", "Check out a live indie music show at a cozy basement club."],
      food: ["Artisanal single-source coffee and fresh avocado toast", "Sharing plate of local tapas", "Craft beer paired with signature burger"]
    }
  };

  const styleLower = style.toLowerCase();
  const pool = activitiesByStyle[styleLower] || activitiesByStyle.solo;
  
  // Construct dynamic itinerary days
  const itinerary = [];
  const daysCount = 5; // base length, scaled later
  
  const dayThemes = [
    "Orientation & Scenic Horizons",
    "Deep Dive into Local Culture",
    "Hidden Gems & Local Secrets",
    "Nature, Outdoors & Landscapes",
    "Farewell & Artistic Escapes"
  ];

  for (let i = 0; i < daysCount; i++) {
    itinerary.push({
      day: i + 1,
      theme: dayThemes[i],
      morning: pool.morning[i % pool.morning.length].replace(/local/g, titleDest),
      afternoon: pool.afternoon[i % pool.afternoon.length].replace(/local/g, titleDest),
      evening: pool.evening[i % pool.evening.length].replace(/local/g, titleDest),
      foodRecommendation: pool.food[i % pool.food.length]
    });
  }

  return {
    destination: `${titleDest}, Selected Country`,
    tagline: `Unlocking the Wonders of ${titleDest}`,
    baseCosts: { hotel: 55, food: 25, transit: 15, activities: 20 },
    suggestions: [`${titleDest} Historic Quarter`, `${titleDest} Panorama Viewpoint`, `${titleDest} Botanical Gardens`],
    itinerary,
    tips: [
      `Check local weather forecasts to plan outdoor days in ${titleDest}.`,
      `Always keep some local physical cash on hand for small transport or snacks.`,
      `Ask locals for dining spots one street away from the main tourist streets to save budget.`
    ]
  };
}
