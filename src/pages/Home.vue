<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Motion, useScroll, useTransform } from "motion-v";
import { useRouter } from "vue-router";
import { formatPrice, initUserCurrency } from "../services/currency";
import { detectUserLocation, userLocation } from "../services/location";
import { getFriendlyErrorMessage } from "../core/errors";
import { fetchUnifiedDiscoveryData } from "../services/ai/unified-discovery.service";
import TravelPlan from '../assets/TravelPlan.png';
import Weather from '../assets/Weather.png';
import SavedTrips from '../assets/SavedTrips.png';
import Documents from '../assets/Documents.png';
import Community from '../assets/Community.png';
import TripPlanner from '../assets/Trip_Planner.png';
import AiBuilder from '../assets/AI_Builder.png';
import Comparision from '../assets/Comparision.png';
import Share from  '../assets/Share.png';

const router = useRouter();

const searchQuery = ref("");
const loading = ref(true);
const loadingError = ref("");
const unifiedData = ref(null); // Single source of truth for all destination data
const locationLabel = ref("your region");

const quickPrompts = [
  "7 days Japan under 1 lakh INR",
  "Luxury Bali Honeymoon",
  "Roadtrip from Delhi to Leh",
  "Weekend escape near Mumbai"
];

const trustIndicators = ["4.9/5 traveler rating", "120K+ trips planned", "180+ destinations"];

const heroStats = [
  { id: "trips", label: "Trips Planned", value: "120K+" },
  { id: "destinations", label: "Destinations Explored", value: "180+" },
  { id: "countries", label: "Countries Covered", value: "62+" },
  { id: "stories", label: "Traveler Stories", value: "9.4K" }
];

// Default fallback floating cards (shown during loading or if location data fails)
const defaultFloatingCards = [
  {
    id: "float-bali",
    title: "Bali",
    meta: "Luxury escape",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "float-kyoto",
    title: "Kyoto",
    meta: "Culture and temples",
    image: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "float-leh",
    title: "Leh",
    meta: "Epic roadtrip mode",
    image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=80"
  }
];

// Dynamic floating cards based on user location
const floatingDestinationCards = ref([...defaultFloatingCards]);

const quickAccessCards = [
  {
    tab: "travel-plan",
    image: TravelPlan,
    title: "Travel Plan",
    subtitle: " Discover the joy of effortless travel bookings, open-road adventures, and relaxing overnight stays tailored just for you."
  },
  {
    tab: "weather",
    image: Weather,
    title: "Weather",
    subtitle: "Here is your comprehensive weather forecast and seasonal outlook to help you pack perfectly for your upcoming trip."
  },
  {
    tab: "community",
    image: Community,
    title: "Community",
    subtitle: "Wander together with a passionate travel community where every adventure is shared and every journey inspires another."
  },
  {
    tab: "trips",
    image: SavedTrips,
    title: "Saved Trips",
    subtitle: "Your next great adventure begins right here, explore your collection of saved trips and take the first step toward reality."
  },
  {
    tab: "documents",
    image: Documents,
    title: "Documents",
    subtitle: "Travel with total peace of mind by keeping your vital passports, visas, and booking confirmations safe in one place."
  }
];

const howItWorksSteps = [
  {
    id: "step-1",
    title: "Describe your dream trip",
    description: "Tell WanderAI where you want to go, your travel style, and your budget range.",
    image: TripPlanner
  },
  {
    id: "step-2",
    title: "AI builds personalized itinerary",
    description: "Get a complete trip plan with local highlights, pacing, and practical suggestions.",
    image: AiBuilder
  },
  {
    id: "step-3",
    title: "Compare budgets and routes",
    description: "Evaluate cost options, transport modes, and route intelligence before you decide.",
    image: Comparision
  },
  {
    id: "step-4",
    title: "Save, share and travel",
    description: "Move plans into trips, collaborate with your group, and carry offline-ready context.",
    image: Share
  }
];

const featureStories = [
  {
    id: "planner",
    eyebrow: "AI Planner",
    title: "Generate complete itineraries from natural language",
    body: "Plan end-to-end journeys from one prompt with itinerary structure, smart suggestions, and budget context.",
    points: ["Prompt-led planning", "Personalized output", "Budget intelligence"],
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1800&q=80",
    route: "/planner",
    cta: "Start Planning"
  },
  {
    id: "roadtrip",
    eyebrow: "Roadtrip Intelligence",
    title: "Map routes with fuel estimates, scenic stops, and travel timing",
    body: "Convert any destination idea into a road-ready journey with route analysis and practical distance planning.",
    points: ["Route comparisons", "Fuel and distance context", "Scenic stop suggestions"],
    image: "https://www.usnews.com/object/image/0000014a-4eba-d484-a55f-cffb10f80000/141215-coupleroadtrip-stock.jpg?update-time=1418660105034&size=responsive640",
    route: "/planner?tab=travel-plan&roadtrip=true",
    cta: "Open Roadtrip"
  },
  {
    id: "community",
    eyebrow: "Community Pulse",
    title: "See traveler tips and destination reviews in one live feed",
    body: "Discover real stories, practical advice, hidden gems, and social travel momentum from the community.",
    points: ["Traveler reviews", "Destination tips", "Safety and local context"],
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=80",
    route: "/community",
    cta: "View Community"
  },
  {
    id: "group",
    eyebrow: "Group Planning",
    title: "Collaborate on trips with polls, tasks, and shared decisions",
    body: "Keep everyone aligned with one collaborative workspace for itinerary updates, comments, and budgeting.",
    points: ["Invite by code", "Shared itinerary", "Collective decision-making"],
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1800&q=80",
    route: "/group-trips",
    cta: "Plan Together"
  },
  {
    id: "profile",
    eyebrow: "Profile and Memories",
    title: "Build your travel timeline and evolve with every journey",
    body: "Your travel profile learns from plans and trips so future recommendations become increasingly personal.",
    points: ["Travel memory timeline", "Preference learning", "Achievement context"],
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1800&q=80",
    route: "/profile",
    cta: "Open Profile"
  }
];

const storyCardRefs = featureStories.map(() => ref(null));

const storyParallax = storyCardRefs.map((cardRef) => {
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"]
  });
  return {
    textY: useTransform(scrollYProgress, [0, 1], [50, -50]),
    imageY: useTransform(scrollYProgress, [0, 1], [50, -50])
  };
});

const testimonials = [
  {
    id: "rev-1",
    quote: "This feels like a premium travel concierge. I planned Japan in minutes and actually followed it.",
    name: "Ananya R.",
    title: "Solo Explorer"
  },
  {
    id: "rev-2",
    quote: "Roadtrip intelligence and budget comparison made our Delhi to Leh plan practical and exciting.",
    name: "Karan M.",
    title: "Roadtrip Enthusiast"
  },
  {
    id: "rev-3",
    quote: "Group planning was effortless. Everyone voted, edited, and aligned without chaos.",
    name: "Nidhi and Arjun",
    title: "Group Travelers"
  }
];

const ecosystemNodes = [
  { id: "explore", label: "Explore", subtitle: "discover", x: 12, y: 28, route: "/destination" },
  { id: "planner", label: "Planner", subtitle: "ai itinerary", x: 31, y: 14, route: "/planner" },
  { id: "trips", label: "Trips", subtitle: "workspace", x: 52, y: 30, route: "/trips" },
  { id: "community", label: "Community", subtitle: "social pulse", x: 72, y: 16, route: "/community" },
  { id: "profile", label: "Profile", subtitle: "memory", x: 84, y: 41, route: "/profile" },
  { id: "roadtrip", label: "Roadtrip", subtitle: "route intel", x: 37, y: 54, route: "/roadtrips" },
  { id: "group", label: "Group Travel", subtitle: "collab", x: 62, y: 61, route: "/group-trips" }
];

const ecosystemLines = [
  { id: "l1", x1: 18, y1: 30, x2: 34, y2: 18 },
  { id: "l2", x1: 34, y1: 18, x2: 52, y2: 30 },
  { id: "l3", x1: 52, y1: 30, x2: 72, y2: 18 },
  { id: "l4", x1: 72, y1: 18, x2: 82, y2: 42 },
  { id: "l5", x1: 52, y1: 30, x2: 37, y2: 56 },
  { id: "l6", x1: 37, y1: 56, x2: 62, y2: 61 },
  { id: "l7", x1: 62, y1: 61, x2: 82, y2: 42 },
  { id: "l8", x1: 18, y1: 30, x2: 62, y2: 61 }
];

const copilotExamples = [
  {
    id: "cp-1",
    prompt: "7 days Japan under INR 1 lakh",
    output: "Tokyo + Kyoto itinerary, route cards, budget split, and flexible day alternates."
  },
  {
    id: "cp-2",
    prompt: "Luxury Bali Honeymoon",
    output: "Premium stay plan, romantic experiences, and curated timeline with comfort-first options."
  },
  {
    id: "cp-3",
    prompt: "Roadtrip from Delhi to Leh",
    output: "Drive plan with fuel estimates, acclimatization pacing, and scenic stop recommendations."
  }
];

const heroVisuals = [
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=2200&q=80",
  "https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=2200&q=80",
  "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=2200&q=80",
  "https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=2200&q=80"
];

const collectionConfig = [
  { id: "trending", title: "Trending Now", subtitle: "Most searched this week", cta: "/destination" },
  { id: "weekend", title: "Weekend Escapes", subtitle: "Fast recharge getaways", cta: "/destination" },
  { id: "luxury", title: "Luxury Experiences", subtitle: "Premium curated moments", cta: "/destination" },
  { id: "roadtrip", title: "Roadtrip Routes", subtitle: "Scenic drive-first journeys", cta: "/roadtrips" },
  { id: "budget", title: "Budget Friendly", subtitle: "Value-smart travel picks", cta: "/planner" },
  { id: "hidden", title: "Hidden Gems", subtitle: "Low-crowd local discoveries", cta: "/community" }
];

const currentHeroIndex = ref(0);
let heroIntervalId = null;
let aiServicePromise;

async function loadAiServices() {
  if (!aiServicePromise) {
    aiServicePromise = import("../services/gemini");
  }

  return aiServicePromise;
}

function estimateBudget(name = "Trip") {
  return 280 + String(name).length * 48;
}

function seasonByIndex(index = 0) {
  const seasons = ["Nov-Feb", "Mar-May", "Jun-Aug", "Sep-Nov"];
  return seasons[Math.abs(index) % seasons.length];
}

function toCard(item = {}, index = 0) {
  const name = item.name || item.title || `Destination ${index + 1}`;
  const id = item.id || `${name}-${index}`.toLowerCase().replace(/\s+/g, "-");
  return {
    id,
    name,
    location: item.location || locationLabel.value || "Global",
    image: item.image || heroVisuals[index % heroVisuals.length],
    budget: Number(item.startingBudget || item.budget || estimateBudget(name)),
    season: item.bestTime || seasonByIndex(index),
    distanceKm: Number(item.distanceKm || 0)
  };
}

const heroBackgroundStyle = computed(() => {
  const image = heroVisuals[currentHeroIndex.value % heroVisuals.length];
  return {
    backgroundImage: `linear-gradient(130deg, rgba(8, 25, 46, 0.62) 0%, rgba(15, 23, 42, 0.52) 38%, rgba(6, 78, 59, 0.5) 100%), url('${image}')`
  };
});

// NEW: All destination data comes from unified source
const destinationPool = computed(() => {
  if (!unifiedData.value || !unifiedData.value.allDestinations) {
    return fallbackPool.value;
  }
  
  return unifiedData.value.allDestinations
    .map((item, index) => toCard(item, index))
    .slice(0, 60);
});

const fallbackPool = computed(() => {
  return heroVisuals.map((image, index) => ({
    id: `fallback-${index + 1}`,
    name: ["Kyoto", "Bali", "Istanbul", "Cape Town"][index] || `Spot ${index + 1}`,
    location: "Trending",
    image,
    budget: estimateBudget(`fallback-${index + 1}`),
    season: seasonByIndex(index),
    distanceKm: 0
  }));
});

const sourcePool = computed(() => (destinationPool.value.length ? destinationPool.value : fallbackPool.value));

// NEW: Premium travel feed - location-based categorized collections
const discoveryCollections = computed(() => {
  if (!unifiedData.value) {
    // Fallback: use sourcePool with simple slicing
    const source = sourcePool.value;
    const windows = [
      source.slice(0, 10),
      source.slice(5, 15),
      source.slice(10, 20),
      source.slice(15, 25),
      source.slice(20, 30),
      source.slice(25, 35)
    ];
    return collectionConfig.map((config, index) => ({
      ...config,
      items: windows[index].length ? windows[index] : source.slice(0, 10)
    }));
  }

  // NEW: Use smart categorized data from unified service
  return [
    {
      id: "trending",
      title: "Trending Now",
      subtitle: `Popular picks near ${locationLabel.value}`,
      cta: "/destination",
      items: (unifiedData.value.trending || []).map(toCard).slice(0, 10)
    },
    {
      id: "weekend",
      title: "Weekend Escapes",
      subtitle: "Quick getaways from your location",
      cta: "/destination",
      items: (unifiedData.value.weekend || []).map(toCard).slice(0, 10)
    },
    {
      id: "luxury",
      title: "Luxury Experiences",
      subtitle: "Premium curated moments",
      cta: "/destination",
      items: (unifiedData.value.luxury || []).map(toCard).slice(0, 10)
    },
    {
      id: "nearby",
      title: "Nearby Destinations",
      subtitle: "Closest travel spots",
      cta: "/destination",
      items: (unifiedData.value.nearby || []).map(toCard).slice(0, 10)
    },
    {
      id: "budget",
      title: "Budget Friendly",
      subtitle: "Value-smart travel picks",
      cta: "/planner",
      items: (unifiedData.value.budget || []).map(toCard).slice(0, 10)
    },
    {
      id: "hidden",
      title: "Hidden Gems",
      subtitle: "Offbeat local discoveries",
      cta: "/community",
      items: (unifiedData.value.hidden || []).map(toCard).slice(0, 10)
    }
  ].filter(collection => collection.items.length > 0);
});

// NEW: Memory and destination feed - smart mix
const galleryItems = computed(() => {
  if (!unifiedData.value) {
    const source = sourcePool.value;
    const selected = source.slice(0, 12);
    if (selected.length >= 12) {
      return selected;
    }
    const fill = [];
    for (let i = 0; i < 12 - selected.length; i += 1) {
      fill.push(source[i % source.length]);
    }
    return [...selected, ...fill].slice(0, 12);
  }

  // NEW: Smart mix from different categories for visual variety
  const nearby = (unifiedData.value.nearby || []).slice(0, 3);
  const trending = (unifiedData.value.trending || []).slice(0, 3);
  const seasonal = (unifiedData.value.seasonal || []).slice(0, 3);
  const hidden = (unifiedData.value.hidden || []).slice(0, 3);
  
  const mixed = [...nearby, ...trending, ...seasonal, ...hidden]
    .map(toCard)
    .slice(0, 12);
  
  // Fill if needed
  if (mixed.length < 12 && unifiedData.value.allDestinations) {
    const remaining = unifiedData.value.allDestinations
      .slice(0, 12 - mixed.length)
      .map(toCard);
    return [...mixed, ...remaining].slice(0, 12);
  }
  
  return mixed;
});

function handleSearch() {
  const query = String(searchQuery.value || "").trim();
  if (query) {
    router.push({ path: "/planner", query: { q: query } });
    return;
  }

  router.push("/planner");
}

function usePrompt(prompt) {
  searchQuery.value = prompt;
  handleSearch();
}

function openPlanner(name) {
  router.push({
    path: "/planner",
    query: {
      destination: name,
      q: `Plan a complete ${name} trip with visual itinerary`
    }
  });
}

function openRoute(path) {
  router.push(path);
}

function rotateHeroVisual() {
  currentHeroIndex.value = (currentHeroIndex.value + 1) % heroVisuals.length;
}

onMounted(async () => {
  loading.value = true;
  loadingError.value = "";

  heroIntervalId = window.setInterval(rotateHeroVisual, 6800);

  try {
    // Step 1: Detect user location
    await detectUserLocation({ allowGeolocationPrompt: true });
    initUserCurrency(userLocation.value).catch(() => {
      // Currency inference is non-blocking for first paint.
    });

    locationLabel.value = userLocation.value?.city || userLocation.value?.country || "your region";

    // Step 2: Fetch ALL data in ONE unified API call (with automatic fallback)
    console.log(`🚀 Fetching unified discovery data for ${locationLabel.value}...`);
    const data = await fetchUnifiedDiscoveryData(userLocation.value);
    unifiedData.value = data;

    console.log(`✅ Unified data loaded: ${data.allDestinations.length} destinations`);

    // Step 3: Update floating cards with nearby destinations
    updateFloatingCards();
  } catch (error) {
    loadingError.value = getFriendlyErrorMessage(error, "Unable to load travel inspiration right now.");
    console.error("Home page data loading error:", error);
  } finally {
    loading.value = false;
  }
});

function updateFloatingCards() {
  if (!unifiedData.value) {
    return; // Keep default cards
  }

  // Priority 1: Use nearby destinations
  let topDestinations = [...(unifiedData.value.nearby || [])];
  
  // Priority 2: Add weekend escapes if needed
  if (topDestinations.length < 3) {
    topDestinations.push(...(unifiedData.value.weekend || []));
  }
  
  // Priority 3: Add trending if still needed
  if (topDestinations.length < 3) {
    topDestinations.push(...(unifiedData.value.trending || []));
  }
  
  // If we have enough location-based destinations, use top 3
  if (topDestinations.length >= 3) {
    const topThree = topDestinations.slice(0, 3);
    floatingDestinationCards.value = topThree.map((dest, index) => ({
      id: `float-${dest.id || dest.name.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      title: dest.name || dest.title || `Destination ${index + 1}`,
      meta: getDestinationMeta(dest, index),
      image: dest.image || defaultFloatingCards[index]?.image || heroVisuals[index % heroVisuals.length]
    }));
    
    console.log(`🎯 Floating cards updated with location-based destinations: ${floatingDestinationCards.value.map(c => c.title).join(', ')}`);
  }
}

function getDestinationMeta(dest, index) {
  // Generate contextual meta text based on destination data
  if (dest.distanceKm && dest.distanceKm > 0) {
    if (dest.distanceKm < 300) {
      return "Nearby getaway";
    } else if (dest.distanceKm < 800) {
      return "Weekend escape";
    } else {
      return "Explore beyond";
    }
  }
  
  // Fallback to budget-based or generic meta
  if (dest.startingBudget && dest.startingBudget < 20000) {
    return "Budget friendly";
  } else if (dest.startingBudget && dest.startingBudget > 100000) {
    return "Luxury experience";
  }
  
  // Generic fallback based on position
  const metaOptions = ["Hidden gem", "Trending now", "Local favorite", "Must visit"];
  return metaOptions[index % metaOptions.length];
}

onUnmounted(() => {
  if (heroIntervalId) {
    clearInterval(heroIntervalId);
    heroIntervalId = null;
  }
});
</script>

<template>
  <div class="wander-home animate-fade-in">
    <section class="hero" :style="heroBackgroundStyle">
      <div class="hero-noise"></div>
      <div class="container hero-inner">
        <div class="hero-copy">
          <h1>Explore smarter with AI.</h1>
          <p>Plan, discover, budget, collaborate, and experience trips with one intelligent travel companion.</p>

          <div class="hero_newButtons" style="display: flex; gap: 12px; margin-top: 12px;">
            <button type="submit" class="btn btn-primary" @click="openRoute('/planner')">Start Planning</button>
            <button type="button" class="btn btn-outline">Explore Destinations</button>
          </div>
        </div>

        <div class="hero-float-stage">
          <div v-if="locationLabel" class="location-badge">
            <span class="location-icon">📍</span>
            <span class="location-text">Top picks near {{ locationLabel }}</span>
          </div>
          <article
            v-for="(card, index) in floatingDestinationCards"
            :key="`${card.id}-${index}`"
            class="floating-destination-card glass-card"
            :class="`float-${index + 1 }`"
            @click="openPlanner(card.title)"
          >
            <img :src="card.image" :alt="card.title" loading="lazy" />
            <div class="floating-overlay">
              <strong>{{ card.title }}</strong>
              <span>{{ card.meta }}</span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="container storytelling-section">
      <div class="section-intro">
        <h2>WanderAI Core</h2>
      </div>

      <article
        v-for="(story, index) in featureStories"
        :key="story.id"
        :ref="el => { if (el) storyCardRefs[index].value = el }"
        class="story-card"
        :class="{ reverse: index % 2 === 1 }"
      >
        <Motion
          tag="figure"
          class="story-image"
          :style="{ y: storyParallax[index].imageY }"
        >
          <img :src="story.image" :alt="story.title" loading="lazy" style="border-radius: 25px;" />
        </Motion>

        <Motion
          tag="div"
          class="story-copy"
          :style="{ y: storyParallax[index].textY }"
        >
          <h3>{{ story.title }}</h3>
          <p>{{ story.body }}</p>
          <div class="story-points">
            <span v-for="point in story.points" :key="point">{{ point }}</span>
          </div>
          <button type="button" class="btn btn-primary" @click="openRoute(story.route)">{{ story.cta }}</button>
        </Motion>
      </article>
    </section>

    <section class="container how-section">
      <div class="section-intro">
        <h2>Prompt to trip in 4 steps</h2>
      </div>

      <div class="steps-grid">
        <article
          v-for="(step, index) in howItWorksSteps"
          :key="step.id"
          class="step-card"
          :class="{ reverse: index % 2 === 1 }"
        >
          <div class="step-art" aria-hidden="true">
            <div class="step-badge">
              <img v-if="step.image" :src="step.image" :alt="step.title" class="step-image" loading="lazy" />
            </div>
          </div>
          <div class="step-copy">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="quick-access-section">
      <div class="section-intro">
        <h2>Everything in one place</h2>
        <!-- <p>All you travel tools and information organized here for you.</p> -->
      </div>
      <div class="quick-access-grid">
        <router-link
          v-for="card in quickAccessCards"
          :key="card.tab"
          class="quick-access-card"
          :to="{ path: '/planner', query: { tab: card.tab } }"
        >
          <div class="quick-access-art">
            <img v-if="card.image" :src="card.image" :alt="card.title" class="qa-image" loading="lazy" />
          </div>
          <div class="quick-access-copy">
            <strong>{{ card.title }}</strong>
            <small>{{ card.subtitle }}</small>
            <span class="quick-access-cta">Try it Now</span>
          </div>
        </router-link>
      </div>
    </section>

    <section class="container discovery-section">
      <div class="section-intro">
        <h2>Premium travel feed</h2>
      </div>

      <article v-if="loadingError" class="error-panel glass-card">
        <h3>Live inspiration is temporarily unavailable</h3>
        <p>{{ loadingError }}</p>
      </article>

      <section v-for="collection in discoveryCollections" :key="collection.id" class="collection-section">
        <div class="collection-head">
          <div>
            <h3>{{ collection.title }}</h3>
            <p>{{ collection.subtitle }}</p>
          </div>
          <button type="button" class="btn btn-outline btn-xs" @click="openRoute(collection.cta)">View Collection</button>
        </div>

        <div v-if="loading" class="collection-loading-row">
          <div v-for="n in 5" :key="`${collection.id}-loading-${n}`" class="loading-card"></div>
        </div>

        <div v-else class="collection-rail">
          <article
            v-for="item in collection.items"
            :key="`${collection.id}-${item.id}`"
            class="destination-card glass-card"
            @click="openPlanner(item.name)"
          >
            <img :src="item.image" :alt="item.name" loading="lazy" />
            <div class="destination-overlay">
              <h4>{{ item.name }}</h4>
              <p>{{ item.location }}</p>
              <div class="destination-meta">
                <span>{{ formatPrice(item.budget) }}</span>
                <span>{{ item.season }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>

    <section class="container ecosystem-section">
      <div class="section-intro">
        <h2>Seamless travel features</h2>
      </div>

      <div class="ecosystem-map glass-card">
        <svg class="ecosystem-lines" viewBox="0 0 100 70" preserveAspectRatio="none" aria-hidden="true">
          <line
            v-for="line in ecosystemLines"
            :key="line.id"
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
          />
        </svg>

        <button
          v-for="node in ecosystemNodes"
          :key="node.id"
          type="button"
          class="ecosystem-node"
          :style="{ left: `${node.x}%`, top: `${node.y}%` }"
          @click="openRoute(node.route)"
        >
          <strong>{{ node.label }}</strong>
          <span>{{ node.subtitle }}</span>
        </button>
      </div>
    </section>

    <section class="container copilot-section">
      <div class="section-intro">
        <h2>Ask freely, get trips instantly</h2>
      </div>

      <article class="copilot-card">
        <div class="chat-column">
          <header class="chat-header">
            <span class="chat-dot"></span>
            WanderAI Copilot
          </header>
          <div class="chat-log">
            <article v-for="example in copilotExamples" :key="example.id" class="chat-pair">
              <div class="chat-bubble user">{{ example.prompt }}</div>
              <div class="chat-bubble ai">{{ example.output }}</div>
            </article>
          </div>
        </div>

        <div class="copilot-preview">
          <h3>Example prompts</h3>
          <ul>
            <li>"7 days Japan under INR 1 lakh"</li>
            <li>"Luxury Bali Honeymoon"</li>
            <li>"Roadtrip from Delhi to Leh"</li>
          </ul>
          <button type="button" class="btn btn-primary" @click="openRoute('/planner')">Open AI Planner</button>
        </div>
      </article>
    </section>

    <section class="container social-proof-section">
      <div class="section-intro">
        <h2>Community trust</h2>
      </div>

      <div class="proof-grid">
        <article v-for="stat in heroStats" :key="`proof-${stat.id}`" class="proof-card">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </article>
      </div>

      <div class="testimonial-grid">
        <article v-for="item in testimonials" :key="item.id" class="testimonial-card">
          <p class="quote">"{{ item.quote }}"</p>
          <div class="author">
            <strong>{{ item.name }}</strong>
            <span>{{ item.title }}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="container gallery-section">
      <div class="section-intro">
        <h2>Memory and destination feed</h2>
      </div>

      <div class="masonry-grid">
        <article
          v-for="(item, index) in galleryItems"
          :key="`${item.id}-gallery-${index}`"
          class="masonry-card glass-card"
          :class="`tile-${(index % 4) + 1}`"
        >
          <img :src="item.image" :alt="item.name" loading="lazy" />
          <div class="masonry-overlay">
            <strong>{{ item.name }}</strong>
            <span>{{ item.location }}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="final-cta" :style="heroBackgroundStyle">
      <div class="final-overlay"></div>
      <div class="container final-inner">
        <h2>Your next adventure starts here.</h2>
        <button type="button" class="btn btn-primary" @click="openRoute('/planner')">Plan My Trip</button>
      </div>
    </section>
  </div>
</template>

<style scoped src="./styles/Home.css"></style>