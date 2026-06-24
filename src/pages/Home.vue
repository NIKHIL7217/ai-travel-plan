<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
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
  "Luxury Bali honeymoon",
  "Roadtrip from Jaipur",
  "Family trip to Dubai"
];

const heroStats = [
  { label: "Trips Planned", value: "120K+" },
  { label: "Destinations", value: "180+" },
  { label: "Traveler Stories", value: "9.4K" }
];

const routePreviews = [
  {
    id: "coastal-escape",
    title: "Mumbai to Goa",
    subtitle: "Coastal sunrise route",
    distance: "590 km",
    duration: "11h",
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "mountain-loop",
    title: "Delhi to Manali",
    subtitle: "Mountain switchback drive",
    distance: "530 km",
    duration: "10h",
    image: "https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "desert-highway",
    title: "Jaipur to Jaisalmer",
    subtitle: "Desert fort trail",
    distance: "560 km",
    duration: "9h 20m",
    image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1400&q=80"
  }
];

const heroVisuals = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1800&q=80"
];

const testimonials = [
  {
    quote: "I opened WanderAI, typed one line, and booked the trip the same evening.",
    name: "Ananya R.",
    title: "Weekend Explorer"
  },
  {
    quote: "This feels like talking to a premium travel concierge, not filling a dashboard form.",
    name: "Karan M.",
    title: "Frequent Flyer"
  },
  {
    quote: "The inspiration flow made us choose a destination in under 3 minutes.",
    name: "Nidhi & Arjun",
    title: "Couple Travelers"
  }
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
    backgroundImage: `linear-gradient(150deg, rgba(8,47,73,0.52) 0%, rgba(15,118,110,0.56) 50%, rgba(2,132,199,0.72) 100%), url('${image}')`
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
    .slice(0, 48);
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

const sectionCollections = computed(() => {
  const source = sourcePool.value;

  return [
    {
      id: "trending",
      title: "Trending Destinations",
      subtitle: "Live picks from search momentum and seasonality.",
      cta: "/destination",
      cover: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=80",
      vibe: "Most booked this week",
      items: source.slice(0, 10)
    },
    {
      id: "weekend",
      title: "Weekend Escapes",
      subtitle: "Short, high-energy getaways for the next break.",
      cta: "/roadtrips",
      cover: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1600&q=80",
      vibe: "Fast recharge itineraries",
      items: source.slice(5, 15)
    },
    {
      id: "gems",
      title: "Hidden Gems",
      subtitle: "Less crowded spots with stronger local character.",
      cta: "/community",
      cover: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?auto=format&fit=crop&w=1600&q=80",
      vibe: "Low-crowd local secrets",
      items: source.slice(10, 20)
    },
    {
      id: "roadtrips",
      title: "Popular Roadtrips",
      subtitle: "Routes made for scenic drives and flexible stops.",
      cta: "/roadtrips",
      cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
      vibe: "Epic route narratives",
      items: source.slice(15, 25)
    },
    {
      id: "community",
      title: "Community Favorites",
      subtitle: "Places repeatedly recommended by travelers.",
      cta: "/community",
      cover: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
      vibe: "Loved by real travelers",
      items: source.slice(20, 30)
    }
  ];
});

function handleSearch() {
  const query = String(searchQuery.value || "").trim();
  if (query) {
    router.push({ path: "/planner", query: { q: query } });
    return;
  }

  router.push("/destination");
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

function openCollection(cta) {
  router.push(cta);
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
      liveDestinations.value.slice(0, 20).map((item) => resolveDestinationPhoto(item.name || "travel"))
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
  <div class="explore-page animate-fade-in">
    <section class="hero" :style="heroBackgroundStyle">
      <div class="hero-content container">
        <span class="hero-badge">EXPLORE</span>
        <h1>Where do you want to go next?</h1>
        <p>Plan complete trips with AI.</p>

        <form class="hero-prompt" @submit.prevent="handleSearch">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="7 days Japan under 1 lakh INR"
            aria-label="Travel prompt"
          />
          <button type="submit" class="btn btn-primary">Start Planning</button>
        </form>

        <div class="prompt-examples">
          <button
            v-for="prompt in quickPrompts"
            :key="prompt"
            type="button"
            class="example-pill"
            @click="usePrompt(prompt)"
          >
            {{ prompt }}
          </button>
        </div>

        <div class="hero-stats">
          <article v-for="stat in heroStats" :key="stat.label" class="hero-stat-pill">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="container route-preview-strip">
      <div class="section-head">
        <div>
          <h2>Route Previews</h2>
          <p>Quick route inspiration with distance and pacing at a glance.</p>
        </div>
      </div>

      <div class="route-rail stagger-grid">
        <article v-for="route in routePreviews" :key="route.id" class="route-preview-card glass-card hover-lift">
          <img :src="route.image" :alt="route.title" loading="lazy" />
          <div class="route-overlay">
            <strong>{{ route.title }}</strong>
            <p>{{ route.subtitle }}</p>
            <span>{{ route.distance }} • {{ route.duration }}</span>
          </div>
        </article>
      </div>
    </section>

    <section v-if="loadingError" class="container mt-12">
      <article class="glass-card error-panel">
        <h3>Inspiration is temporarily unavailable</h3>
        <p>{{ loadingError }}</p>
      </article>
    </section>

    <section
      v-for="section in sectionCollections"
      :key="section.id"
      class="inspiration-section container"
      :class="{ 'section-loading': loading }"
    >
      <div class="section-head">
        <div>
          <span class="section-vibe">{{ section.vibe }}</span>
          <h2>{{ section.title }}</h2>
          <p>{{ section.subtitle }}</p>
        </div>
        <img :src="section.cover" :alt="section.title" class="section-cover" loading="lazy" />
        <button type="button" class="btn btn-outline btn-xs" @click="openCollection(section.cta)">View All</button>
      </div>

      <div v-if="loading" class="loading-row">
        <div v-for="n in 4" :key="`${section.id}-loading-${n}`" class="loading-card"></div>
      </div>

      <div v-else class="card-carousel stagger-grid">
        <article v-for="item in section.items" :key="`${section.id}-${item.id}`" class="travel-card glass-card hover-lift">
          <div class="card-image-wrap">
            <img :src="item.image" :alt="item.name" loading="lazy" />
            <span class="distance-pill" v-if="item.distanceKm > 0">{{ Math.round(item.distanceKm) }} km away</span>
          </div>
          <div class="card-body">
            <h3>{{ item.name }}</h3>
            <p>{{ item.location }}</p>
            <div class="card-meta">
              <span>{{ formatPrice(item.budget) }}</span>
              <span>{{ item.season }}</span>
            </div>
            <div class="card-actions-row">
              <button type="button" class="btn btn-outline btn-xs" @click="openCollection('/destination')">Explore</button>
              <button type="button" class="btn btn-primary btn-xs" @click="openPlanner(item.name)">Plan Trip</button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="container testimonials">
      <div class="section-head">
        <div>
          <h2>Testimonials</h2>
          <p>What travelers feel in the first moments of opening WanderAI.</p>
        </div>
      </div>

      <div class="testimonial-grid">
        <article v-for="item in testimonials" :key="item.name" class="testimonial-card glass-card">
          <p class="quote">"{{ item.quote }}"</p>
          <div class="author">
            <strong>{{ item.name }}</strong>
            <span>{{ item.title }}</span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.explore-page {
  display: flex;
  flex-direction: column;
  gap: 42px;
  padding-bottom: 44px;
}

.hero {
  min-height: calc(100vh - 70px);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  position: relative;
  transition: background-image 680ms ease;
}

.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(8, 47, 73, 0) 0%, rgba(8, 47, 73, 0.28) 100%);
}

.hero-content {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 14px;
  color: #f8fafc;
}

.hero-badge {
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #a7f3d0;
  text-transform: uppercase;
}

.hero h1 {
  font-size: clamp(2.4rem, 8vw, 5.2rem);
  letter-spacing: -0.04em;
  line-height: 1.02;
  max-width: 900px;
}

.hero p {
  font-size: clamp(1rem, 2.8vw, 1.2rem);
  color: rgba(248, 250, 252, 0.92);
}

.hero-prompt {
  margin-top: 6px;
  width: min(860px, 96%);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 10px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 30px 70px rgba(2, 8, 23, 0.25);
}

.hero-prompt input {
  border: none;
  outline: none;
  font-size: 1.05rem;
  padding: 12px 14px;
  color: var(--color-text);
  background: transparent;
}

.prompt-examples {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}

.example-pill {
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(15, 23, 42, 0.28);
  color: #f8fafc;
  border-radius: var(--radius-full);
  padding: 7px 12px;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--transition-fast), background var(--transition-fast);
}

.example-pill:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.26);
}

.hero-stats {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.hero-stat-pill {
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: var(--radius-full);
  background: rgba(8, 47, 73, 0.34);
  padding: 7px 12px;
  display: grid;
  gap: 1px;
}

.hero-stat-pill strong {
  color: #f8fafc;
  font-size: 0.82rem;
}

.hero-stat-pill span {
  color: rgba(226, 232, 240, 0.92);
  font-size: 0.7rem;
}

.route-preview-strip {
  display: grid;
  gap: 12px;
}

.route-rail {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(290px, 1fr);
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.route-preview-card {
  position: relative;
  min-height: 180px;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.route-preview-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.route-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 14px;
  background: linear-gradient(180deg, rgba(2, 8, 23, 0), rgba(2, 8, 23, 0.78));
  color: #f8fafc;
}

.route-overlay strong {
  color: #f8fafc;
  font-size: 0.92rem;
}

.route-overlay p {
  margin-top: 4px;
  font-size: 0.76rem;
  color: rgba(226, 232, 240, 0.92);
}

.route-overlay span {
  display: inline-block;
  margin-top: 7px;
  border: 1px solid rgba(226, 232, 240, 0.34);
  border-radius: var(--radius-full);
  background: rgba(2, 6, 23, 0.5);
  padding: 4px 8px;
  font-size: 0.7rem;
}

.mt-12 {
  margin-top: 48px;
}

.error-panel {
  padding: 16px;
}

.inspiration-section {
  display: grid;
  gap: 14px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.section-vibe {
  display: inline-block;
  margin-bottom: 6px;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  font-weight: 800;
  color: #0f766e;
  text-transform: uppercase;
}

.section-head h2 {
  font-size: clamp(1.3rem, 3vw, 1.9rem);
  letter-spacing: -0.02em;
}

.section-head p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 0.86rem;
}

.section-cover {
  width: 118px;
  height: 70px;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: var(--shadow-sm);
}

.loading-row,
.card-carousel {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(260px, 1fr);
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.loading-card {
  min-height: 320px;
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, #dbeafe 0%, #ecfeff 50%, #dbeafe 100%);
  background-size: 220% 100%;
  animation: shimmer 1.2s linear infinite;
}

.travel-card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: grid;
  min-height: 338px;
}

.card-image-wrap {
  height: 194px;
  position: relative;
  overflow: hidden;
}

.card-image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.travel-card:hover img {
  transform: scale(1.05);
}

.distance-pill {
  position: absolute;
  left: 10px;
  bottom: 10px;
  background: rgba(2, 6, 23, 0.74);
  color: #e2e8f0;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: var(--radius-full);
}

.card-body {
  padding: 12px;
  display: grid;
  gap: 6px;
}

.card-body h3 {
  font-size: 0.96rem;
}

.card-body p {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.card-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.76rem;
  color: var(--color-text-muted);
}

.card-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.testimonials {
  display: grid;
  gap: 14px;
}

.testimonial-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.testimonial-card {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(240, 249, 255, 0.86));
}

.quote {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.author {
  margin-top: 12px;
  display: grid;
  gap: 2px;
}

.author strong {
  font-size: 0.84rem;
}

.author span {
  font-size: 0.74rem;
  color: var(--color-text-muted);
}

@keyframes shimmer {
  0% {
    background-position: 220% 0;
  }
  100% {
    background-position: -220% 0;
  }
}

@media (max-width: 980px) {
  .section-cover {
    display: none;
  }

  .testimonial-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .hero {
    min-height: calc(100vh - 64px);
    padding-top: 26px;
  }

  .hero-prompt {
    grid-template-columns: 1fr;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-actions-row {
    grid-template-columns: 1fr;
  }
}
</style>