<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { generateTravelPlan, generateBudgetEstimate, isGeminiConfigured } from "../services/gemini";
import { saveTripToDb } from "../services/firebase";
import { useAuthStore } from "../stores/auth";
import GlassPanel from "../shared/ui/GlassPanel.vue";
import { formatPrice, userCurrency } from "../services/currency";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Input states
const destination = ref("");
const naturalQuery = ref("");
const days = ref(5);
const travelers = ref(2);
const style = ref("Comfort");
const maxBudget = ref(1500);
const travelMode = ref("Car");
const plannerError = ref("");
const liveAiReady = isGeminiConfigured();

// Generated results
const activeItinerary = ref(null);
const activeBudget = ref(null);
const loading = ref(false);
const activeLoadingText = ref("Awaiting constraints...");
const expandedDay = ref(1); // active open accordion
const saveStatus = ref(false); // saved notification indicator

const loadingMessages = [
  "Consulting local guides...",
  "Structuring flight routes...",
  "Estimating hotel rates...",
  "Formatting day-by-day timeline details...",
  "Computing total budget estimations..."
];

onMounted(() => {
  // Catch route queries pre-loads
  if (route.query.destination) {
    destination.value = route.query.destination;
    naturalQuery.value = `Mujhe ${route.query.destination} ke liye ${days.value} din ka best trip plan chahiye.`;
  }
});

const handleGenerate = async () => {
  plannerError.value = "";

  if (!liveAiReady) {
    plannerError.value = "Live AI disabled hai. .env me VITE_GEMINI_API_KEY add karo, tabhi real-time response milega.";
    return;
  }

  if (!destination.value.trim() && !naturalQuery.value.trim()) {
    plannerError.value = "Destination ya normal language trip request enter karo.";
    return;
  }

  loading.value = true;
  activeItinerary.value = null;
  activeBudget.value = null;

  // Cycle messages
  let msgIdx = 0;
  activeLoadingText.value = loadingMessages[0];
  const interval = setInterval(() => {
    msgIdx = (msgIdx + 1) % loadingMessages.length;
    activeLoadingText.value = loadingMessages[msgIdx];
  }, 400);

  try {
    const plannerQuery = naturalQuery.value.trim();
    const destinationHint = destination.value.trim() || plannerQuery;

    // Generate Itinerary and Budget in parallel
    const [itinerary, budget] = await Promise.all([
      generateTravelPlan(destinationHint, style.value, days.value, travelers.value, maxBudget.value, travelMode.value, {
        userQuery: plannerQuery,
        requireLive: true
      }),
      generateBudgetEstimate(destinationHint, days.value, travelers.value, style.value, travelMode.value, {
        userQuery: plannerQuery,
        requireLive: true
      })
    ]);

    activeItinerary.value = itinerary;
    activeBudget.value = budget;
    expandedDay.value = 1;
  } catch (e) {
    console.error("AI Generation failed:", e);
    plannerError.value = e?.message || "Live AI response generate nahi ho paya. Thodi der baad retry karo.";
  } finally {
    clearInterval(interval);
    loading.value = false;
  }
};

const toggleDay = (dayNum) => {
  expandedDay.value = expandedDay.value === dayNum ? null : dayNum;
};

const handleSave = async () => {
  if (!activeItinerary.value || !activeBudget.value) return;

  if (!authStore.user?.uid) {
    router.push({ path: "/login", query: { redirect: "/planner" } });
    return;
  }

  const record = {
    destination: activeItinerary.value.destination,
    tagline: activeItinerary.value.tagline,
    summary: activeItinerary.value.summary,
    days: days.value,
    travelers: travelers.value,
    style: style.value,
    travelMode: travelMode.value,
    itinerary: activeItinerary.value.itinerary,
    budget: activeBudget.value
  };

  try {
    await saveTripToDb(record, authStore.user.uid);
    saveStatus.value = true;
    setTimeout(() => {
      saveStatus.value = false;
    }, 3500);
  } catch (e) {
    console.error("Save failed:", e);
  }
};
</script>

<template>
  <div class="planner-dashboard-layout container animate-fade-in" style="padding-top: 100px;">
    
    <!-- Title -->
    <div class="planner-header">
      <span class="hud-badge">COPILOT CONSOLE</span>
      <h1>AI Travel Planner</h1>
      <p class="subtitle">Enter your travel details and let artificial intelligence structure your custom itinerary and budget forecast.</p>
    </div>

    <!-- Core Layout Grid -->
    <div class="planner-grid mt-8">
      
      <!-- Left Panel: Form Criteria -->
      <div class="planner-left-wing">
        <GlassPanel class="criteria-card" heavy>
          <h3>Trip Parameters</h3>
          <p class="section-desc">Adjust sliders and select style targets.</p>

          <form @submit.prevent="handleGenerate" class="criteria-form mt-4">
            <!-- Destination -->
            <div class="form-group">
              <label class="form-lbl">DESTINATION</label>
              <input 
                v-model="destination" 
                type="text" 
                placeholder="e.g., Bali, Paris, Goa..." 
                required 
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-lbl">NORMAL LANGUAGE TRIP REQUEST</label>
              <textarea
                v-model="naturalQuery"
                class="form-textarea"
                rows="3"
                placeholder="Jaise: bhai goa ka 4 din ka budget friendly trip bana do, good cafes aur beaches include karna"
              ></textarea>
            </div>

            <p v-if="!liveAiReady" class="live-ai-warning">
              Live AI currently configured nahi hai. Real-time response ke liye API key required hai.
            </p>

            <p v-if="plannerError" class="planner-error">{{ plannerError }}</p>

            <!-- Budget Constraint -->
            <div class="form-group">
              <label class="form-lbl">MAX BUDGET LIMIT ({{ userCurrency.currency }})</label>
              <div class="slider-info-row">
                <input 
                  v-model.number="maxBudget" 
                  type="range" 
                  min="200" 
                  max="5000" 
                  step="50"
                  class="neon-range"
                />
                <span class="slider-val monospaced">{{ formatPrice(maxBudget) }}</span>
              </div>
            </div>

            <div class="form-row">
              <!-- Duration -->
              <div class="form-group col-half">
                <label class="form-lbl">DAYS</label>
                <select v-model.number="days" class="form-select">
                  <option v-for="n in 8" :key="n" :value="n + 2">{{ n + 2 }} Days</option>
                </select>
              </div>

              <!-- Travelers -->
              <div class="form-group col-half">
                <label class="form-lbl">TRAVELERS</label>
                <select v-model.number="travelers" class="form-select">
                  <option v-for="n in 6" :key="n" :value="n">{{ n }} Person</option>
                </select>
              </div>
            </div>

            <!-- Style Selector -->
            <div class="form-group">
              <label class="form-lbl">TRAVEL STYLE</label>
              <select v-model="style" class="form-select">
                <option value="Budget">Budget</option>
                <option value="Comfort">Comfort</option>
                <option value="Luxury">Luxury</option>
                <option value="Adventure">Adventure</option>
              </select>
            </div>

            <!-- Travel Mode Selector -->
            <div class="form-group">
              <label class="form-lbl">PREFERRED TRAVEL MODE</label>
              <select v-model="travelMode" class="form-select">
                <option value="Flight">✈️ Flight</option>
                <option value="Train">🚆 Train</option>
                <option value="Bus">🚌 Bus</option>
                <option value="Car">🚗 Car / Road Trip</option>
                <option value="Bike">🏍️ Motorcycle</option>
              </select>
            </div>

            <button type="submit" class="btn btn-primary w-full mt-4" :disabled="loading">
              {{ loading ? "Processing..." : "Generate AI Itinerary" }}
            </button>
          </form>
        </GlassPanel>

        <!-- Section 8: Budget Calculator Widget -->
        <GlassPanel v-if="activeBudget" class="budget-analytics-card mt-6" heavy>
          <div class="calc-header">
            <h3>Budget Breakdown</h3>
            <span class="budget-total monospaced">{{ formatPrice(activeBudget.total) }}</span>
          </div>
          
          <div class="calc-visualization-meter mt-4">
            <!-- Segmented visual budget bar -->
            <div 
              class="bar-seg fl" 
              :style="{ width: `${(activeBudget.flights / activeBudget.total) * 100}%` }"
              title="Flights"
            ></div>
            <div 
              class="bar-seg ac" 
              :style="{ width: `${(activeBudget.accommodation / activeBudget.total) * 100}%` }"
              title="Lodging"
            ></div>
            <div 
              class="bar-seg fd" 
              :style="{ width: `${(activeBudget.food / activeBudget.total) * 100}%` }"
              title="Food"
            ></div>
            <div 
              class="bar-seg tr" 
              :style="{ width: `${(activeBudget.transportation / activeBudget.total) * 100}%` }"
              title="Transit"
            ></div>
            <div 
              class="bar-seg act" 
              :style="{ width: `${(activeBudget.activities / activeBudget.total) * 100}%` }"
              title="Activities"
            ></div>
          </div>

          <div class="itemized-budget-list mt-4">
            <div class="budget-item">
              <span class="color-dot fl"></span>
              <span class="item-name">✈️ Flights</span>
              <span class="item-cost monospaced">{{ formatPrice(activeBudget.flights) }}</span>
            </div>
            <div class="budget-item">
              <span class="color-dot ac"></span>
              <span class="item-name">🏨 Accommodation</span>
              <span class="item-cost monospaced">{{ formatPrice(activeBudget.accommodation) }}</span>
            </div>
            <div class="budget-item">
              <span class="color-dot fd"></span>
              <span class="item-name">🍔 Food & Dinings</span>
              <span class="item-cost monospaced">{{ formatPrice(activeBudget.food) }}</span>
            </div>
            <div class="budget-item">
              <span class="color-dot tr"></span>
              <span class="item-name">🚗 Transportation</span>
              <span class="item-cost monospaced">{{ formatPrice(activeBudget.transportation) }}</span>
            </div>
            <div class="budget-item">
              <span class="color-dot act"></span>
              <span class="item-name">🎟️ Activities & Tickets</span>
              <span class="item-cost monospaced">{{ formatPrice(activeBudget.activities) }}</span>
            </div>
          </div>
        </GlassPanel>
      </div>

      <!-- Right Panel: Expandable Day Itinerary / Loading skeletons -->
      <div class="planner-right-wing">
        
        <!-- Loading Loader overlay -->
        <div v-if="loading" class="planner-skeletons">
          <GlassPanel class="loading-prompt-msg" heavy>
            <div class="spinner"></div>
            <p class="monospaced">{{ activeLoadingText }}</p>
          </GlassPanel>
          <div v-for="n in 4" :key="n" class="skeleton skeleton-itinerary-day mt-4"></div>
        </div>

        <!-- Initial Blank State -->
        <div v-else-if="!activeItinerary" class="itinerary-blank-card glass-card">
          <span>📅</span>
          <h3>Itinerary Panel</h3>
          <p>Complete the parameters form on the left and submit to generate your day-by-day plan.</p>
        </div>

        <!-- Itinerary Display -->
        <div v-else class="itinerary-showcase-wrapper">
          <!-- Active Itinerary Title block -->
          <div class="itinerary-summary-bar glass-card">
            <div class="sum-text">
              <span class="tagline-span">{{ activeItinerary.tagline }}</span>
              <h2>{{ activeItinerary.destination }}</h2>
              <p>{{ activeItinerary.summary }}</p>
            </div>
            
            <button 
              type="button" 
              :class="['btn btn-outline save-btn-hud', saveStatus ? 'saved' : '']"
              @click="handleSave"
            >
              ❤️ {{ saveStatus ? "Saved" : "Save Plan" }}
            </button>
          </div>

          <!-- Accordion Cards -->
          <div class="days-accordions-list mt-6">
            <div 
              v-for="item in activeItinerary.itinerary" 
              :key="item.day"
              :class="['accordion-card', 'glass-card', expandedDay === item.day ? 'active' : '']"
            >
              <!-- Day Card Clickable Header -->
              <div class="accordion-header" @click="toggleDay(item.day)">
                <div class="acc-title-left">
                  <span class="day-num-bullet monospaced">DAY {{ item.day }}</span>
                  <h4>{{ item.theme }}</h4>
                </div>
                <span class="chevron-arrow">{{ expandedDay === item.day ? "▲" : "▼" }}</span>
              </div>

              <!-- Day Card Body -->
              <div v-if="expandedDay === item.day" class="accordion-body-content animate-fade-in">
                <div class="activity-block">
                  <span class="act-time">🌅 Morning</span>
                  <p>{{ item.morning }}</p>
                </div>
                <div class="activity-block">
                  <span class="act-time">☀️ Afternoon</span>
                  <p>{{ item.afternoon }}</p>
                </div>
                <div class="activity-block">
                  <span class="act-time">🌃 Evening</span>
                  <p>{{ item.evening }}</p>
                </div>
                <div class="activity-block food-rec">
                  <span class="act-time">🍽️ Local Food Recommendation</span>
                  <p>{{ item.foodRecommendation }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.planner-dashboard-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.planner-header {
  text-align: left;
}

.planner-header h1 {
  font-size: 2.2rem;
  font-weight: 800;
  margin: 6px 0;
  letter-spacing: -0.5px;
}

.hud-badge {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: inline-block;
}

.subtitle {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

/* Dashboard grid */
.planner-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 32px;
  align-items: start;
}

@media (max-width: 900px) {
  .planner-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

.planner-left-wing {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 92px;
}

@media (max-width: 900px) {
  .planner-left-wing {
    position: static;
  }
}

.criteria-card, .budget-analytics-card {
  background-color: #FFFFFF !important;
}

.criteria-card h3, .budget-analytics-card h3 {
  font-size: 1.2rem;
  font-weight: 800;
  margin-bottom: 2px;
}

.section-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.criteria-form {
  display: flex;
  flex-direction: column;
}

.form-row {
  display: flex;
  gap: 16px;
}

.col-half {
  flex-grow: 1;
  width: 50%;
}

.slider-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.neon-range {
  flex-grow: 1;
  -webkit-appearance: none;
  height: 4px;
  background: #E2E8F0;
  border-radius: var(--radius-full);
  outline: none;
}

.neon-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  border: 2px solid white;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}

.slider-val {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-primary);
  white-space: nowrap;
}

/* Budget Visualizer */
.calc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.budget-total {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--color-primary);
}

.calc-visualization-meter {
  height: 12px;
  background-color: #F1F5F9;
  border-radius: var(--radius-full);
  display: flex;
  overflow: hidden;
}

.bar-seg {
  height: 100%;
  transition: width var(--transition-slow);
}

/* Segment colors */
.bar-seg.fl, .color-dot.fl { background-color: var(--color-primary); }
.bar-seg.ac, .color-dot.ac { background-color: var(--color-secondary); }
.bar-seg.fd, .color-dot.fd { background-color: var(--color-accent); }
.bar-seg.tr, .color-dot.tr { background-color: #8B5CF6; }
.bar-seg.act, .color-dot.act { background-color: #F59E0B; }

.itemized-budget-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.budget-item {
  display: flex;
  align-items: center;
  font-size: 0.88rem;
  color: var(--color-text-secondary);
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  margin-right: 8px;
  display: inline-block;
}

.item-name {
  flex-grow: 1;
}

.item-cost {
  font-weight: 700;
  color: var(--color-text-primary);
}

/* Right Panel display */
.itinerary-blank-card {
  text-align: center;
  padding: 48px 24px !important;
  background-color: #FFFFFF !important;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.itinerary-blank-card span {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 12px;
}

.itinerary-blank-card p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

/* Loading skeletal box */
.loading-prompt-msg {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px !important;
  background-color: #FFFFFF !important;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid var(--color-primary-light);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: radarScan 1s infinite linear;
}

.skeleton-itinerary-day {
  height: 60px;
  border-radius: var(--radius-md);
}

/* Itinerary presentation */
.itinerary-summary-bar {
  padding: 24px !important;
  background-color: #FFFFFF !important;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

@media (max-width: 600px) {
  .itinerary-summary-bar {
    flex-direction: column;
    align-items: stretch;
  }
}

.sum-text {
  flex-grow: 1;
}

.tagline-span {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--color-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sum-text h2 {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 4px 0 8px;
}

.sum-text p {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.save-btn-hud.saved {
  border-color: #10B981;
  color: #10B981;
  background-color: rgba(16, 185, 129, 0.05);
}

/* Accordions */
.days-accordions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.accordion-card {
  padding: 0 !important;
  overflow: hidden;
  background-color: #FFFFFF !important;
}

.accordion-header {
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast);
}

.accordion-header:hover {
  background-color: #F8FAFC;
}

.acc-title-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

@media (max-width: 480px) {
  .acc-title-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

.day-num-bullet {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--color-primary);
  background-color: var(--color-primary-light);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.accordion-header h4 {
  font-size: 1.05rem;
  font-weight: 700;
}

.chevron-arrow {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.accordion-body-content {
  padding: 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.activity-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.act-time {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.activity-block p {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.food-rec {
  background-color: var(--color-primary-light);
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px dashed rgba(37, 99, 235, 0.15);
}

.food-rec .act-time {
  color: var(--color-primary);
}

.mt-8 { margin-top: 32px; }
.mt-6 { margin-top: 24px; }
.w-full { width: 100%; }

.live-ai-warning {
  margin-top: 8px;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #92400e;
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.planner-error {
  margin-top: 8px;
  font-size: 0.84rem;
  line-height: 1.45;
  color: #b91c1c;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}
</style>
