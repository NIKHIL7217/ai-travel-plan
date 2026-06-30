<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Motion, useScroll, useTransform } from "motion-v";
import { useRouter } from "vue-router";
import { formatPrice, initUserCurrency } from "../services/currency";
import { detectUserLocation, userLocation } from "../services/location";
import { getFriendlyErrorMessage } from "../core/errors";
import { getDynamicTrendingData } from "../modules/trending/engine";

const router = useRouter();

const searchQuery = ref("");
const loading = ref(true);
const loadingError = ref("");
const trendingCategories = ref([]);
const liveDestinations = ref([]);
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

const floatingDestinationCards = [
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

const howItWorksSteps = [
  {
    id: "step-1",
    title: "Describe your dream trip",
    description: "Tell WanderAI where you want to go, your travel style, and your budget range.",
    accent: "Step 1"
  },
  {
    id: "step-2",
    title: "AI builds personalized itinerary",
    description: "Get a complete trip plan with local highlights, pacing, and practical suggestions.",
    accent: "Step 2"
  },
  {
    id: "step-3",
    title: "Compare budgets and routes",
    description: "Evaluate cost options, transport modes, and route intelligence before you decide.",
    accent: "Step 3"
  },
  {
    id: "step-4",
    title: "Save, share and travel",
    description: "Move plans into trips, collaborate with your group, and carry offline-ready context.",
    accent: "Step 4"
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
    route: "/roadtrips",
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

const destinationPool = computed(() => {
  const trendItems = (trendingCategories.value || []).flatMap((category) => category.items || []);
  const merged = [...trendItems, ...liveDestinations.value];
  const seen = new Set();

  return merged
    .map((item, index) => toCard(item, index))
    .filter((item) => {
      const key = `${item.id}-${item.name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 56);
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

const discoveryCollections = computed(() => {
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
});

const galleryItems = computed(() => {
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
    const { generateDestinationSuggestions, resolveDestinationPhoto } = await loadAiServices();

    await detectUserLocation();
    initUserCurrency(userLocation.value).catch(() => {
      // Currency inference is non-blocking for first paint.
    });

    locationLabel.value = userLocation.value?.city || userLocation.value?.country || "your region";

    const [trendingResult, destinationResult] = await Promise.allSettled([
      getDynamicTrendingData(userLocation.value),
      generateDestinationSuggestions(`top destinations for travelers from ${locationLabel.value}`)
    ]);

    trendingCategories.value = trendingResult.status === "fulfilled" ? trendingResult.value : [];
    liveDestinations.value = destinationResult.status === "fulfilled" ? destinationResult.value : [];

    const photos = await Promise.allSettled(
      liveDestinations.value.slice(0, 24).map((item) => resolveDestinationPhoto(item.name || "travel"))
    );

    liveDestinations.value = liveDestinations.value.map((item, index) => {
      const image = photos[index]?.status === "fulfilled" ? photos[index].value : item.image;
      return {
        ...item,
        image: image || item.image
      };
    });
  } catch (error) {
    loadingError.value = getFriendlyErrorMessage(error, "Unable to load travel inspiration right now.");
  } finally {
    loading.value = false;
  }
});

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
            <button type="submit" class="btn btn-primary">Start Planning</button>
            <button type="button" class="btn btn-outline" @click="openRoute('/destination')">Explore Destinations</button>
          </div>
        </div>

        <div class="hero-float-stage">
          <article
            v-for="(card, index) in floatingDestinationCards"
            :key="card.id"
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

    <section class="container how-section">
      <div class="section-intro">
        <h2>Prompt to trip in 4 steps</h2>
      </div>

      <div class="steps-grid">
        <article
          v-for="(step, index) in howItWorksSteps"
          :key="step.id"
          class="step-card glass-card"
          :class="{ reverse: index % 2 === 1 }"
        >
          <div class="step-art" aria-hidden="true">
            <div class="step-badge">{{ step.accent }}</div>
          </div>
          <div class="step-copy">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="container storytelling-section">
      <div class="section-intro">
        <h2>Core WanderAI showcase</h2>
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

    <section class="container discovery-section">
      <div class="section-intro">
        <h2>Premium travel feed scrolling</h2>
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

    <section class="container social-proof-section">
      <div class="section-intro">
        <h2>Community trust</h2>
      </div>

      <div class="proof-grid">
        <article v-for="stat in heroStats" :key="`proof-${stat.id}`" class="proof-card glass-card">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </article>
      </div>

      <div class="testimonial-grid">
        <article v-for="item in testimonials" :key="item.id" class="testimonial-card glass-card">
          <p class="quote">"{{ item.quote }}"</p>
          <div class="author">
            <strong>{{ item.name }}</strong>
            <span>{{ item.title }}</span>
          </div>
        </article>
      </div>
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

<style scoped>
.wander-home {
  display: flex;
  flex-direction: column;
  gap: clamp(52px, 7vw, 96px);
  padding-bottom: 80px;
}

.section-intro {
  display: grid;
  gap: 10px;
  margin-bottom: 22px;
  align-items: center;
  justify-content: center;
}

.section-kicker {
  width: fit-content;
  border: 1px solid rgba(15, 118, 110, 0.28);
  border-radius: var(--radius-full);
  background: rgba(20, 184, 166, 0.08);
  color: #0f766e;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 7px 12px;
}

.section-intro h2 {
  font-size: clamp(2.4rem, 6vw, 4rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: black;
  max-width: 860px;
  margin: 28px 0;;
}

.hero {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 0 0 34px;
  background-size: cover;
  background-position: center;
  transition: background-image 700ms ease;
  overflow: hidden;
}

.hero-noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 20% 15%, rgba(125, 211, 252, 0.18) 0%, rgba(125, 211, 252, 0) 42%),
    radial-gradient(circle at 84% 78%, rgba(74, 222, 128, 0.16) 0%, rgba(74, 222, 128, 0) 40%);
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 50px;
  align-items: center;
}

.hero-copy {
  color: #f8fafc;
  display: grid;
  gap: 16px;
}

.hero-kicker {
  width: fit-content;
  border: 1px solid rgba(226, 232, 240, 0.5);
  border-radius: var(--radius-full);
  background: rgba(8, 47, 73, 0.36);
  padding: 7px 14px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h1 {
  font-size: clamp(3.5rem, 7vw, 6.5rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
  color: #f8fafc;
  max-width: 760px;
}

.hero-copy p {
  font-size: clamp(1rem, 2.4vw, 1.24rem);
  color: rgba(248, 250, 252, 0.94);
  max-width: 670px;
}

.hero-prompt {
  margin-top: 8px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  padding: 10px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.3);
}

.hero-prompt input {
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font-size: 0.98rem;
  padding: 12px 14px;
}

.hero-prompt .btn {
  min-height: 46px;
}

.hero-prompt .btn-outline {
  background: rgba(255, 255, 255, 0.82);
}

.hero-prompt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.prompt-chip {
  border: 1px solid rgba(226, 232, 240, 0.42);
  border-radius: var(--radius-full);
  background: rgba(8, 47, 73, 0.34);
  color: #f8fafc;
  padding: 8px 12px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--transition-fast), background var(--transition-fast);
}

.prompt-chip:hover {
  transform: translateY(-2px);
  background: rgba(2, 132, 199, 0.34);
}

.trust-indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.trust-indicators span {
  border: 1px solid rgba(226, 232, 240, 0.34);
  border-radius: var(--radius-full);
  background: rgba(2, 6, 23, 0.34);
  color: #dbeafe;
  padding: 7px 11px;
  font-size: 0.72rem;
  font-weight: 700;
}

.hero-float-stage {
  position: relative;
  min-height: 420px; /* was 460px */
}

.floating-destination-card {
  position: absolute;
  width: min(250px, 68vw); /* was 270px, 72vw */
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 22px 52px rgba(2, 8, 23, 0.3);
  animation: floatCard 5.8s ease-in-out infinite;
}

.floating-destination-card img {
  width: 100%;
  height: 170px; /* was 190px */
  object-fit: cover;
}

.floating-overlay {
  padding: 10px; /* was 12px */
  display: grid;
  gap: 4px;
  background: linear-gradient(180deg, rgba(2, 8, 23, 0.42), rgba(2, 8, 23, 0.72));
}

.float-1 {
  left: 0;
  top: 8%;
}

.float-2 {
  right: 3%;
  top: 20%;
  animation-delay: 0.9s;
}

.float-3 {
  left: 18%;
  bottom: 2%;
  animation-delay: 1.6s;
}

.floating-overlay {
  padding: 12px;
  display: grid;
  gap: 4px;
  background: linear-gradient(180deg, rgba(2, 8, 23, 0.42), rgba(2, 8, 23, 0.72));
}

.floating-overlay strong {
  color: #f8fafc;
  font-size: 0.92rem;
}

.floating-overlay span {
  color: #cbd5e1;
  font-size: 0.76rem;
}

.hero-stats-row {
  position: relative;
  z-index: 1;
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.hero-stat {
  padding: 15px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.1));
  border-color: rgba(226, 232, 240, 0.3);
}

.hero-stat strong {
  color: #f8fafc;
  font-size: 1.18rem;
}

.hero-stat span {
  display: block;
  margin-top: 5px;
  color: rgba(226, 232, 240, 0.94);
  font-size: 0.76rem;
}

.how-section,
.storytelling-section,
.discovery-section,
.social-proof-section,
.ecosystem-section,
.copilot-section,
.gallery-section {
  display: grid;
  gap: 20px;
}

.steps-grid {
  display: grid;
  gap: 14px;
}

.step-card {
  display: grid;
  grid-template-columns: minmax(0, 0.38fr) minmax(0, 0.62fr);
  overflow: hidden;
  margin: 20px 0;
}

.step-card.reverse {
  grid-template-columns: minmax(0, 0.62fr) minmax(0, 0.38fr);
}

.step-card.reverse .step-art {
  order: 2;
}

.step-card.reverse .step-copy {
  order: 1;
}

.step-art {
  min-height: 200px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 24% 22%, rgba(56, 189, 248, 0.32), transparent 52%),
    linear-gradient(145deg, rgba(8, 47, 73, 0.9), rgba(2, 132, 199, 0.82));
}

.step-badge {
  border: 1px solid rgba(226, 232, 240, 0.36);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f8fafc;
  background: rgba(8, 47, 73, 0.5);
}

.step-copy {
  display: grid;
  align-content: center;
  gap: 10px;
  padding: clamp(20px, 4vw, 34px);
}

.step-copy h3 {
  font-size: clamp(1.2rem, 2.8vw, 1.9rem);
  line-height: 1.2;
}

.step-copy p {
  color: var(--color-text-secondary);
  line-height: 1.66;
}

.story-card {
  display: grid;
  grid-template-columns: minmax(0, 0.56fr) minmax(0, 0.44fr);
  /* overflow: hidden intentionally removed — the parallax translateY on both
     Motion children must be able to bleed outside the card boundary. Clipping
     is instead scoped to .story-image so the image stays contained. */
  margin: 100px 0;
}

.story-card.reverse {
  grid-template-columns: minmax(0, 0.44fr) minmax(0, 0.56fr);
}

.story-card.reverse .story-image {
  order: 2;
}

.story-card.reverse .story-copy {
  order: 1;
}

.story-image {
  /* Clip the image's slower parallax travel so it never escapes the figure.
     The figure itself is a grid child, so setting overflow here is safe. */
  overflow: hidden;
  will-change: transform; /* promote to its own compositor layer */
}

.story-image img {
  width: 100%;
  height: 100%;
  min-height: 320px;
  object-fit: cover;
}

.story-copy {
  display: grid;
  align-content: center;
  gap: 12px;
  padding: clamp(20px, 4vw, 40px);
  will-change: transform; /* promote to its own compositor layer */
}

.story-eyebrow {
  width: fit-content;
  border: 1px solid rgba(15, 118, 110, 0.3);
  border-radius: var(--radius-full);
  background: rgba(20, 184, 166, 0.08);
  color: #0f766e;
  padding: 6px 11px;
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 800;
}

.story-copy h3 {
  font-size: clamp(1.36rem, 3vw, 2.15rem);
  line-height: 1.14;
}

.story-copy p {
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.story-points {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.story-points span {
  border: 1px solid rgba(14, 165, 233, 0.28);
  border-radius: var(--radius-full);
  background: rgba(224, 242, 254, 0.78);
  color: #0369a1;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 6px 10px;
}

.collection-section {
  display: grid;
  gap: 12px;
}

.collection-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.collection-head h3 {
  font-size: clamp(1.16rem, 2.5vw, 1.62rem);
}

.collection-head p {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
}

.collection-loading-row,
.collection-rail {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(260px, 1fr);
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.loading-card {
  min-height: 330px;
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, #dbeafe 0%, #ecfeff 50%, #dbeafe 100%);
  background-size: 220% 100%;
  animation: shimmer 1.2s linear infinite;
}

.destination-card {
  position: relative;
  min-height: 330px;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
}

.destination-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.45s ease;
}

.destination-card:hover img {
  transform: scale(1.07);
}

.destination-overlay {
  position: absolute;
  inset: auto 0 0 0;
  display: grid;
  gap: 5px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(2, 8, 23, 0), rgba(2, 8, 23, 0.85));
}

.destination-overlay h4 {
  color: #f8fafc;
  font-size: 1rem;
}

.destination-overlay p {
  color: rgba(226, 232, 240, 0.94);
  font-size: 0.8rem;
}

.destination-meta {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #cbd5e1;
  font-size: 0.74rem;
}

.error-panel {
  padding: 18px;
}

.error-panel h3 {
  font-size: 1rem;
}

.error-panel p {
  margin-top: 8px;
  color: var(--color-text-secondary);
}

.proof-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.proof-card {
  padding: 16px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(236, 253, 245, 0.76));
}

.proof-card strong {
  font-size: 1.24rem;
  color: #082f49;
}

.proof-card span {
  display: block;
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.testimonial-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.testimonial-card {
  padding: 18px;
}

.quote {
  color: var(--color-text-secondary);
  line-height: 1.68;
}

.author {
  margin-top: 14px;
  display: grid;
  gap: 2px;
}

.author strong {
  font-size: 0.86rem;
}

.author span {
  color: var(--color-text-muted);
  font-size: 0.76rem;
}

.ecosystem-map {
  position: relative;
  min-height: 480px;
  overflow: hidden;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(224, 242, 254, 0.76));
}

.ecosystem-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ecosystem-lines line {
  stroke: rgba(15, 118, 110, 0.44);
  stroke-width: 0.35;
  stroke-dasharray: 2;
  animation: flow 3.2s linear infinite;
}

.ecosystem-node {
  position: absolute;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(15, 118, 110, 0.3);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 12px;
  display: grid;
  gap: 3px;
  min-width: 126px;
  text-align: left;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.ecosystem-node:hover {
  transform: translate(-50%, -54%);
  border-color: rgba(20, 184, 166, 0.56);
  box-shadow: 0 16px 34px rgba(2, 8, 23, 0.2);
}

.ecosystem-node strong {
  color: #082f49;
  font-size: 0.82rem;
}

.ecosystem-node span {
  color: #64748b;
  font-size: 0.72rem;
}

.copilot-card {
  display: grid;
  grid-template-columns: minmax(0, 0.58fr) minmax(0, 0.42fr);
  overflow: hidden;
}

.chat-column {
  display: grid;
  border-radius: 25px;
  background: linear-gradient(160deg, rgba(8, 47, 73, 0.95), rgba(15, 23, 42, 0.92));
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
  font-weight: 700;
  font-size: 0.82rem;
}

.chat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #14b8a6;
  box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.18);
}

.chat-log {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.chat-pair {
  display: grid;
  gap: 8px;
}

.chat-bubble {
  max-width: min(96%, 620px);
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 0.82rem;
  line-height: 1.54;
}

.chat-bubble.user {
  justify-self: end;
  background: rgba(16, 185, 129, 0.24);
  border: 1px solid rgba(110, 231, 183, 0.36);
  color: #dcfce7;
}

.chat-bubble.ai {
  justify-self: start;
  background: rgba(14, 165, 233, 0.22);
  border: 1px solid rgba(125, 211, 252, 0.36);
  color: #e0f2fe;
}

.copilot-preview {
  display: grid;
  align-content: center;
  gap: 12px;
  padding: clamp(18px, 3vw, 30px);
}

.copilot-preview h3 {
  font-size: clamp(1.2rem, 2.4vw, 1.6rem);
}

.copilot-preview ul {
  list-style: none;
  display: grid;
  gap: 8px;
}

.copilot-preview li {
  border: 1px solid rgba(15, 118, 110, 0.24);
  border-radius: var(--radius-md);
  background: rgba(20, 184, 166, 0.08);
  padding: 9px 11px;
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.masonry-grid {
  column-count: 4;
  column-gap: 14px;
}

.masonry-card {
  break-inside: avoid;
  margin-bottom: 14px;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.masonry-card img {
  width: 100%;
  display: block;
  object-fit: cover;
}

.masonry-card.tile-1 img {
  height: 240px;
}

.masonry-card.tile-2 img {
  height: 330px;
}

.masonry-card.tile-3 img {
  height: 280px;
}

.masonry-card.tile-4 img {
  height: 360px;
}

.masonry-overlay {
  padding: 12px;
  display: grid;
  gap: 2px;
}

.masonry-overlay strong {
  color: #082f49;
  font-size: 0.84rem;
}

.masonry-overlay span {
  color: var(--color-text-muted);
  font-size: 0.74rem;
}

.final-cta {
  position: relative;
  min-height: 58vh;
  display: grid;
  align-items: center;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.final-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, rgba(8, 25, 46, 0.74), rgba(2, 6, 23, 0.62));
}

.final-inner {
  position: relative;
  z-index: 1;
  text-align: center;
  display: grid;
  justify-items: center;
  gap: 14px;
}

.final-inner h2 {
  color: #f8fafc;
  font-size: clamp(2rem, 6vw, 4.2rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
}

@keyframes shimmer {
  0% {
    background-position: 220% 0;
  }
  100% {
    background-position: -220% 0;
  }
}

@keyframes flow {
  0% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: -8;
  }
}

@keyframes floatCard {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
}

@media (max-width: 1180px) {
  .hero-inner {
    grid-template-columns: 1fr;
  }

  .hero-float-stage {
    min-height: 390px;
  }
}

@media (max-width: 980px) {
  .step-card,
  .step-card.reverse,
  .story-card,
  .story-card.reverse,
  .copilot-card {
    grid-template-columns: 1fr;
  }

  .step-card.reverse .step-art,
  .step-card.reverse .step-copy,
  .story-card.reverse .story-image,
  .story-card.reverse .story-copy {
    order: initial;
  }

  .proof-grid,
  .hero-stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .testimonial-grid {
    grid-template-columns: 1fr;
  }

  .masonry-grid {
    column-count: 3;
  }
}

@media (max-width: 760px) {
  .wander-home {
    gap: 44px;
    padding-bottom: 58px;
  }

  .hero {
    min-height: auto;
    padding-top: 92px;
  }

  .hero-prompt {
    grid-template-columns: 1fr;
  }

  .hero-float-stage {
    min-height: 420px;
  }

  .floating-destination-card {
    width: min(230px, 74vw);
  }

  .float-1 {
    left: 2%;
  }

  .float-2 {
    right: 2%;
  }

  .float-3 {
    left: 8%;
  }

  .proof-grid,
  .hero-stats-row {
    grid-template-columns: 1fr;
  }

  .ecosystem-map {
    min-height: 620px;
  }

  .ecosystem-node {
    min-width: 112px;
    padding: 8px 10px;
  }

  .ecosystem-node strong {
    font-size: 0.76rem;
  }

  .ecosystem-node span {
    font-size: 0.66rem;
  }

  .masonry-grid {
    column-count: 2;
  }
}

@media (max-width: 520px) {
  .masonry-grid {
    column-count: 1;
  }

  .final-cta {
    min-height: 48vh;
  }
}
</style>