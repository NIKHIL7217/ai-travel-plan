<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import GlowingButton from "../shared/ui/GlowingButton.vue";
import { formatPrice } from "../services/currency";

const router = useRouter();
const searchQuery = ref("");

const popularDestinations = [
  { id: "bali", name: "Bali", location: "Indonesia", budget: 600, rating: 4.8, image: "/images/destinations/bali.png" },
  { id: "dubai", name: "Dubai", location: "UAE", budget: 1200, rating: 4.7, image: "/images/destinations/dubai.png" },
  { id: "goa", name: "Goa", location: "India", budget: 250, rating: 4.6, image: "/images/destinations/goa.png" },
  { id: "paris", name: "Paris", location: "France", budget: 1100, rating: 4.9, image: "/images/destinations/paris.png" },
  { id: "switzerland", name: "Switzerland", location: "Europe", budget: 1500, rating: 4.9, image: "/images/destinations/switzerland.png" },
  { id: "thailand", name: "Thailand", location: "Asia", budget: 500, rating: 4.7, image: "/images/destinations/thailand.png" }
];

const recommendations = [
  { title: "Beach Getaway", desc: "Soak in the sun, feel the ocean breeze, and relax on sandy shores.", image: "/images/destinations/bali.png", query: "goa" },
  { title: "City Explorer", desc: "Immerse yourself in modern architecture, high-end shops, and local life.", image: "/images/destinations/dubai.png", query: "dubai" },
  { title: "Mountain Adventure", desc: "Hike alpine valleys, climb snowy heights, and breathe cool fresh air.", image: "/images/destinations/switzerland.png", query: "switzerland" }
];

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: "/destination", query: { search: searchQuery.value } });
  } else {
    router.push("/destination");
  }
};

const goToDetails = (id) => {
  router.push(`/destination/${id}`);
};

const goToPlanner = (destName) => {
  router.push({ path: "/planner", query: { destination: destName } });
};
</script>

<template>
  <div class="home-page-layout animate-fade-in">
    
    <!-- Section 2: Hero Section -->
    <section class="hero-section" style="background-image: url('/images/hero_bg.png')">
      <div class="hero-overlay-gradient"></div>
      <div class="container hero-content">
        <span class="hero-tag">✦ NEXT GENERATION ITINERARIES</span>
        <h1 class="hero-title">Plan Your Dream Journey With AI</h1>
        <p class="hero-desc">
          Discover amazing destinations, generate personalized itineraries, and travel smarter with artificial intelligence.
        </p>

        <!-- Search Bar Overlay -->
        <form @submit.prevent="handleSearch" class="hero-search-bar">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Where do you want to go?" 
            class="hero-search-input"
          />
          <button type="submit" class="btn btn-primary hero-search-btn">Search</button>
        </form>

        <!-- CTAs -->
        <div class="hero-ctas">
          <button type="button" class="btn btn-primary" @click="router.push('/destination')">
            Explore Destinations
          </button>
          <button type="button" class="btn btn-outline-white" @click="router.push('/planner')">
            Generate AI Plan
          </button>
        </div>
      </div>
    </section>

    <!-- Section 3: Popular Destinations -->
    <section class="popular-section container mt-16">
      <div class="section-header">
        <span class="section-badge">POPULAR CHOICES</span>
        <h2>Trending Destinations</h2>
        <p class="section-subtitle">Highly rated routes curated by our travelers and optimized by AI.</p>
      </div>

      <div class="destinations-grid">
        <div 
          v-for="dest in popularDestinations" 
          :key="dest.id" 
          class="destination-card glass-card"
          @click="goToDetails(dest.id)"
        >
          <div class="card-img-wrap">
            <img :src="dest.image" :alt="dest.name" class="card-img" loading="lazy" />
            <div class="card-rating">
              ⭐ <span class="monospaced">{{ dest.rating }}</span>
            </div>
          </div>
          <div class="card-body">
            <span class="card-loc">{{ dest.location }}</span>
            <h4 class="card-title">{{ dest.name }}</h4>
            <div class="card-footer">
              <span class="card-budget">Starts from <span class="monospaced font-bold">{{ formatPrice(dest.budget) }}</span></span>
              <span class="view-details-txt">View Details →</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 4: AI Recommendations -->
    <section class="recommendations-section container mt-20">
      <div class="section-header">
        <span class="section-badge">AI CORRELATIONS</span>
        <h2>Curated Recommendations</h2>
        <p class="section-subtitle">Choose a lifestyle theme and discover top recommendations.</p>
      </div>

      <div class="recommendations-grid">
        <div 
          v-for="rec in recommendations" 
          :key="rec.title" 
          class="rec-card glass-card"
        >
          <div class="rec-img-wrap">
            <img :src="rec.image" :alt="rec.title" class="rec-img" loading="lazy" />
          </div>
          <div class="rec-body">
            <h3>{{ rec.title }}</h3>
            <p>{{ rec.desc }}</p>
            <button 
              type="button" 
              class="btn btn-outline w-full mt-4" 
              @click="goToDetails(rec.query)"
            >
              Explore Theme
            </button>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.home-page-layout {
  display: flex;
  flex-direction: column;
}

.mt-16 { margin-top: 64px; }
.mt-20 { margin-top: 80px; }
.w-full { width: 100%; }

/* Hero Section */
.hero-section {
  position: relative;
  height: 580px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  padding-top: 72px; /* Header offset */
  color: white;
}

.hero-overlay-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.8) 100%);
  z-index: 1;
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 800px;
}

.hero-tag {
  font-size: 0.72rem;
  letter-spacing: 0.15em;
  color: var(--color-secondary);
  font-weight: 800;
  margin-bottom: 14px;
}

.hero-title {
  font-size: clamp(2.4rem, 6vw, 3.8rem);
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.15;
  margin-bottom: 16px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.hero-desc {
  font-size: 1.12rem;
  color: #E2E8F0;
  max-width: 620px;
  line-height: 1.6;
  margin-bottom: 32px;
}

/* Hero Search Bar Overlay */
.hero-search-bar {
  display: flex;
  align-items: center;
  background-color: #FFFFFF;
  border-radius: var(--radius-md);
  padding: 8px 10px;
  width: 100%;
  max-width: 580px;
  box-shadow: var(--shadow-xl);
  margin-bottom: 28px;
  position: relative;
}

.search-icon {
  margin: 0 10px 0 6px;
  font-size: 1.1rem;
}

.hero-search-input {
  flex-grow: 1;
  border: none;
  outline: none;
  font-size: 0.95rem;
  color: var(--color-text);
  font-family: inherit;
  padding: 10px 0;
}

.hero-search-input::placeholder {
  color: var(--color-text-muted);
}

.hero-search-btn {
  padding: 10px 24px !important;
}

.hero-ctas {
  display: flex;
  gap: 16px;
}

.btn-outline-white {
  background-color: transparent;
  color: white;
  border: 1.5px solid white;
}

.btn-outline-white:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

/* Sections headers */
.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-badge {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: inline-block;
  margin-bottom: 8px;
}

.section-header h2 {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}

.section-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

/* Destinations Cards Grid */
.destinations-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 900px) {
  .destinations-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .destinations-grid {
    grid-template-columns: 1fr;
  }
}

.destination-card {
  overflow: hidden;
  cursor: pointer;
}

.card-img-wrap {
  height: 200px;
  position: relative;
  overflow: hidden;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.destination-card:hover .card-img {
  transform: scale(1.06);
}

.card-rating {
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.card-body {
  padding: 18px;
}

.card-loc {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 4px 0 12px;
  color: var(--color-text);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
  font-size: 0.85rem;
}

.card-budget {
  color: var(--color-text-secondary);
}

.font-bold {
  font-weight: 700;
  color: var(--color-text);
}

.view-details-txt {
  font-weight: 700;
  color: var(--color-primary);
}

.destination-card:hover .view-details-txt {
  color: var(--color-secondary);
}

/* Recommendations grid */
.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 900px) {
  .recommendations-grid {
    grid-template-columns: 1fr;
  }
}

.rec-card {
  overflow: hidden;
  padding: 0 !important;
}

.rec-img-wrap {
  height: 180px;
  overflow: hidden;
}

.rec-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rec-body {
  padding: 20px;
}

.rec-body h3 {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.rec-body p {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.55;
  min-height: 66px;
}
</style>
