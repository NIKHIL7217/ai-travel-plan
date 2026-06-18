<script setup>
import { ref } from "vue";
import { usePlannerStore } from "../stores/planner";
import { useTripsStore } from "../stores/trips";
import Icons from "../../shared/icons/Icons.vue";
import GlassPanel from "../../shared/ui/GlassPanel.vue";
import GlowingButton from "../../shared/ui/GlowingButton.vue";
import RoadtripMap from "../../features/maps/RoadtripMap.vue";
import RoadtripEngine from "../../features/roadtrip/RoadtripEngine.vue";
import BudgetForecaster from "../../features/budget/BudgetForecaster.vue";
import WeatherIntelligence from "../../features/weather/WeatherIntelligence.vue";
import CopilotPanel from "../../features/assistant/CopilotPanel.vue";
import RecentPrompts from "../../features/dashboard/RecentPrompts.vue";
import { playHoverTone, playClickTone, playWarningChime, playChime } from "../services/sound";

const plannerStore = usePlannerStore();
const tripsStore = useTripsStore();

const searchInputRef = ref(null);
const isTripSaved = ref(false);

const handleMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
  e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
};

const handleGenerate = () => {
  if (plannerStore.promptQuery.trim()) {
    playClickTone();
    // Play system processing tone
    setTimeout(() => playChime(440, "triangle", 0.3, 0.02), 0);
    setTimeout(() => playChime(660, "triangle", 0.2, 0.02), 150);
    
    plannerStore.executePlan();
    isTripSaved.value = false;
  } else {
    playWarningChime();
  }
};

const handleSaveTrip = () => {
  if (plannerStore.activeTrip) {
    playClickTone();
    tripsStore.saveTrip(plannerStore.activeTrip);
    isTripSaved.value = true;
    setTimeout(() => {
      isTripSaved.value = false;
    }, 3000);
  }
};

const handleTriggerPreset = (prompt) => {
  playClickTone();
  plannerStore.executePlan(prompt);
};

const scrollToConsole = () => {
  playClickTone();
  const el = document.getElementById("ai-terminal-console");
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
};
</script>

<template>
  <div 
    class="home-workspace-container animate-fade-in" 
    @mousemove="handleMouseMove"
  >
    
    <!-- ==================== VIEW 1: PREMIUM LANDING SHOWCASE WEBSITE ==================== -->
    <div v-if="!plannerStore.activeTrip && !plannerStore.loading" class="website-landing-layout">
      
      <!-- Interactive Hero Section -->
      <section class="landing-hero container">
        <div class="hero-text-side">
          <span class="hud-span pulse-glow">✦ ROAMAI PILOT CORE ONLINE</span>
          <h1 class="hero-main-title">
            Navigate the Open Road with <span class="text-glow-cyan">AI Intelligence</span>
          </h1>
          <p class="hero-subtitle">
            An immersive travel operating system focused on road trips, live route optimization, and budget forecasting. Powered by Gemini.
          </p>
          <div class="hero-ctas">
            <GlowingButton 
              variant="primary" 
              @click="scrollToConsole"
              @mouseenter="playHoverTone"
            >
              Launch Console <Icons name="arrow-right" />
            </GlowingButton>
            <GlowingButton 
              variant="standard" 
              @click="handleTriggerPreset('Plan a 7-day Himachal roadtrip starting from Delhi')"
              @mouseenter="playHoverTone"
            >
              Quick Test Route
            </GlowingButton>
          </div>
        </div>

        <div class="hero-visual-side">
          <!-- Glassmorphic HUD Dashboard Mockup Preview -->
          <div class="hud-mockup glass-panel" @mouseenter="playHoverTone">
            <div class="mockup-header">
              <span class="pulse-dot red">● REC</span>
              <span class="mock-route-tag monospaced text-glow-cyan">SYS_ROUTE: HIMACHAL_PASS</span>
            </div>
            
            <div class="mock-map-box">
              <div class="radar-ping"></div>
              <div class="mock-route-line"></div>
              <div class="mock-pointer"></div>
            </div>

            <div class="mockup-stats">
              <div class="m-stat">
                <span class="m-lbl">EST BUDGET</span>
                <span class="m-val monospaced text-glow-accent">₹84,500</span>
              </div>
              <div class="m-stat">
                <span class="m-lbl">WEATHER RISK</span>
                <span class="m-val monospaced yellow-text">MODERATE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Cards Grid Section -->
      <section class="landing-features container">
        <div class="section-title">
          <span class="block-tag">FEATURES MATRIX</span>
          <h2>Engineered for the Open Highway</h2>
        </div>

        <div class="features-grid">
          <GlassPanel class="feature-card" @mouseenter="playHoverTone">
            <div class="feature-icon-wrap cyan">
              <Icons name="map" />
            </div>
            <h3>HUD Mapping</h3>
            <p>Renders GPS routes, charger locations, scenic viewpoints, and traffic density dynamically on our custom vectors canvas.</p>
          </GlassPanel>

          <GlassPanel class="feature-card" @mouseenter="playHoverTone">
            <div class="feature-icon-wrap blue">
              <Icons name="wallet" />
            </div>
            <h3>Budget Forecaster</h3>
            <p>Recalculates lodging, fuel, tolls, and activity budgets on the fly. Full support for Indian Rupees (₹), USD ($), and Euros (€).</p>
          </GlassPanel>

          <GlassPanel class="feature-card" @mouseenter="playHoverTone">
            <div class="feature-icon-wrap green">
              <Icons name="copilot" />
            </div>
            <h3>AI Copilot Assist</h3>
            <p>An intelligent chat helper that scans your roadtrip logs to answer weather warnings, charging hubs, and dining advice.</p>
          </GlassPanel>
        </div>
      </section>

      <!-- Predefined Scenic Routes Section -->
      <section class="featured-routes container">
        <div class="section-title">
          <span class="block-tag">EXPEDITIONS CATALOG</span>
          <h2>Load Preconfigured Roadtrips</h2>
        </div>

        <div class="routes-grid">
          <!-- Card 1 -->
          <div 
            class="route-profile-card glass-panel"
            @click="handleTriggerPreset('Plan a 7-day Himachal roadtrip starting from Delhi')"
            @mouseenter="playHoverTone"
          >
            <div class="route-img-placeholder himachal">
              <div class="route-fade-overlay"></div>
              <span class="route-rating">⭐ 9.5</span>
            </div>
            <div class="route-details">
              <h4>Himachal Peak Pass Route</h4>
              <p>Mountain roads, pine valleys, and high altitude passes connecting Shimla to Spiti.</p>
              <div class="route-footer">
                <span class="route-distance monospaced">720 km</span>
                <span class="load-trigger">Load Telemetry →</span>
              </div>
            </div>
          </div>

          <!-- Card 2 -->
          <div 
            class="route-profile-card glass-panel"
            @click="handleTriggerPreset('5-day Mumbai to Goa coastal roadtrip')"
            @mouseenter="playHoverTone"
          >
            <div class="route-img-placeholder goa">
              <div class="route-fade-overlay"></div>
              <span class="route-rating">⭐ 9.0</span>
            </div>
            <div class="route-details">
              <h4>Konkan Coastal Highway</h4>
              <p>Scenic beach drives, Portuguese forts, and fresh coconut groves along the ocean.</p>
              <div class="route-footer">
                <span class="route-distance monospaced">580 km</span>
                <span class="load-trigger">Load Telemetry →</span>
              </div>
            </div>
          </div>

          <!-- Card 3 -->
          <div 
            class="route-profile-card glass-panel"
            @click="handleTriggerPreset('10-day Leh Ladakh adventure loop')"
            @mouseenter="playHoverTone"
          >
            <div class="route-img-placeholder ladakh">
              <div class="route-fade-overlay"></div>
              <span class="route-rating">⭐ 9.8</span>
            </div>
            <div class="route-details">
              <h4>Leh Ladakh Expedition</h4>
              <p>Ultimate high-altitude roadtrip across rugged cold desert peaks and blue lakes.</p>
              <div class="route-footer">
                <span class="route-distance monospaced">980 km</span>
                <span class="load-trigger">Load Telemetry →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Active AI Terminal Area -->
      <section id="ai-terminal-console" class="terminal-console-section container">
        <div class="section-title">
          <span class="block-tag">COPILOT CONSOLE</span>
          <h2>Initialize Your AI Roadtrip Engine</h2>
        </div>

        <GlassPanel class="prompt-box-card" heavy @mouseenter="playHoverTone">
          <!-- Style & Config Parameters Row -->
          <div class="prompt-params-row">
            <!-- Style Select -->
            <div class="param-col">
              <label class="param-lbl">DRIVE STYLE</label>
              <select v-model="plannerStore.stylePreference" class="param-select" @click="playClickTone">
                <option value="Adventure">Adventure</option>
                <option value="Budget">Budget</option>
                <option value="Luxury">Luxury</option>
                <option value="Family">Family</option>
                <option value="Solo">Solo</option>
              </select>
            </div>

            <!-- Duration Days -->
            <div class="param-col">
              <label class="param-lbl">DURATION (DAYS)</label>
              <div class="slider-val-align">
                <input 
                  v-model.number="plannerStore.durationDays" 
                  type="range" 
                  min="3" 
                  max="10" 
                  class="neon-range duration-slider" 
                  @input="playHoverTone"
                />
                <span class="days-val monospaced">{{ plannerStore.durationDays }}D</span>
              </div>
            </div>

            <!-- Travelers Picker -->
            <div class="param-col">
              <label class="param-lbl">TRAVELERS</label>
              <div class="travelers-counter">
                <button 
                  type="button" 
                  class="cnt-btn" 
                  @click="plannerStore.travelersCount = Math.max(1, plannerStore.travelersCount - 1); playClickTone()"
                >
                  -
                </button>
                <span class="cnt-val monospaced">{{ plannerStore.travelersCount }}</span>
                <button 
                  type="button" 
                  class="cnt-btn" 
                  @click="plannerStore.travelersCount = Math.min(8, plannerStore.travelersCount + 1); playClickTone()"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <!-- Input Field -->
          <form @submit.prevent="handleGenerate" class="prompt-form-field mt-6">
            <div class="prompt-input-wrapper">
              <Icons name="search" class="search-input-icon" />
              <input 
                ref="searchInputRef"
                v-model="plannerStore.promptQuery" 
                type="text" 
                placeholder="Where do you want to travel? (e.g., Plan a 7-day Himachal roadtrip...)"
                class="prompt-text-input"
                required
              />
              <button type="button" class="voice-trigger-btn" title="Voice command (mock)" @click="playClickTone">
                <Icons name="mic" />
              </button>
            </div>
            <GlowingButton variant="primary" type="submit" @mouseenter="playHoverTone">
              Assemble Engine <Icons name="arrow-right" />
            </GlowingButton>
          </form>
        </GlassPanel>

        <!-- Stored Saved trips & suggestions logs -->
        <div class="recent-archives-section">
          <RecentPrompts />
        </div>
      </section>

      <!-- Landing footer -->
      <footer class="landing-footer">
        <p>&copy; 2026 RoamAI Roadtrip OS. Powered by Google Gemini Intelligence. All rights reserved.</p>
      </footer>

    </div>


    <!-- ==================== LOADING OVERLAY STATE ==================== -->
    <div v-if="plannerStore.loading" class="loader-overlay-workspace">
      <div class="radar-scan-box">
        <div class="radar-scanner"></div>
        <div class="radar-ripple-1"></div>
        <div class="radar-ripple-2"></div>
      </div>
      <div class="loader-status">
        <h3 class="status-gradient monospaced">ASSEMBLING ROADTRIP TELEMETRY</h3>
        <p class="status-msg-sub">{{ plannerStore.loadingStatusText }}</p>
      </div>
    </div>


    <!-- ==================== VIEW 2: ACTIVE HUD WORKSPACE ==================== -->
    <div v-if="plannerStore.activeTrip && !plannerStore.loading" class="active-cockpit-workspace animate-fade-in">
      
      <!-- Sticky Navigation HUD Sub-bar -->
      <div class="hud-nav-subbar glass-panel" @mouseenter="playHoverTone">
        <div class="subbar-left">
          <button 
            type="button" 
            class="back-to-cmd-btn" 
            @click="plannerStore.resetPlanner(); playClickTone()" 
            title="Return to landing website"
          >
            ← Exit Cockpit
          </button>
          <span class="subbar-title text-glow-cyan">{{ plannerStore.activeTrip.destination }}</span>
          <span class="subbar-style-badge">{{ plannerStore.activeTrip.style }}</span>
        </div>
        <div class="subbar-right">
          <button 
            type="button" 
            :class="['save-trip-hud-btn', isTripSaved ? 'saved' : '']" 
            @click="handleSaveTrip"
            @mouseenter="playHoverTone"
          >
            <Icons name="heart" :class="['heart-icon', isTripSaved ? 'filled' : '']" />
            {{ isTripSaved ? 'SAVED TO ARCHIVE' : 'SAVE ROADTRIP' }}
          </button>
        </div>
      </div>

      <!-- Main Cockpit Columns Layout -->
      <div class="cockpit-grid container">
        
        <!-- Left Wing: Map, Telemetry, and Budget Sliders -->
        <div class="cockpit-wing left-wing">
          <!-- Interactive canvas Map HUD -->
          <div class="map-widget-container">
            <RoadtripMap />
          </div>

          <!-- Weather and Warnings HUD -->
          <GlassPanel class="weather-widget" @mouseenter="playHoverTone">
            <WeatherIntelligence />
          </GlassPanel>

          <!-- Budget Sliders calculation -->
          <GlassPanel class="budget-widget" @mouseenter="playHoverTone">
            <BudgetForecaster />
          </GlassPanel>
        </div>

        <!-- Right Wing: Timeline Scheduler / Stops list -->
        <div class="cockpit-wing right-wing">
          <GlassPanel class="itinerary-widget h-full" @mouseenter="playHoverTone">
            <RoadtripEngine />
          </GlassPanel>
        </div>

      </div>
    </div>

    <!-- AI COPILOT INTERACTIVE TRIGGER & CHAT CONSOLE -->
    <CopilotPanel />

  </div>
</template>

<style scoped>
.home-workspace-container {
  height: 100%;
  width: 100%;
  position: relative;
  overflow-y: auto;
  padding-bottom: 80px;
}

/* Landing Page Wrapper */
.website-landing-layout {
  display: flex;
  flex-direction: column;
  gap: 80px;
  padding-bottom: 60px;
}

/* Hero Section */
.landing-hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 40px;
  align-items: center;
  padding-top: 80px;
  padding-bottom: 40px;
  text-align: left;
}

@media (max-width: 960px) {
  .landing-hero {
    grid-template-columns: 1fr;
    text-align: center;
  }
}

.hero-text-side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

@media (max-width: 960px) {
  .hero-text-side {
    align-items: center;
  }
}

.hero-main-title {
  font-size: clamp(2.4rem, 5.5vw, 4.2rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -1.5px;
  margin: 14px 0;
  text-shadow: 0 0 35px rgba(255, 255, 255, 0.05);
}

.hero-subtitle {
  font-size: 1.12rem;
  color: var(--color-text-secondary);
  max-width: 580px;
  line-height: 1.6;
  margin-bottom: 30px;
}

.hero-ctas {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

/* HUD Mockup Card Preview */
.hud-mockup {
  border-radius: var(--radius-xl);
  padding: 18px !important;
  background: var(--color-bg-surface) !important;
  border-color: rgba(255,255,255,0.06);
  box-shadow: 0 15px 40px rgba(0,0,0,0.5), var(--shadow-neon-primary);
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
  transition: border-color var(--transition-normal);
}

.hud-mockup:hover {
  border-color: rgba(6, 182, 212, 0.3);
}

.mockup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 14px;
}

.pulse-dot {
  color: #EF4444;
  animation: pulseGlow 1.5s infinite alternate;
}

.mock-map-box {
  background-color: #06080e;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-lg);
  height: 160px;
  position: relative;
  overflow: hidden;
}

.radar-ping {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border: 1.5px dashed rgba(6, 182, 212, 0.15);
  border-radius: 100%;
}

.mock-route-line {
  position: absolute;
  top: 30%;
  left: 15%;
  width: 70%;
  height: 40%;
  border-bottom: 4px solid var(--color-secondary);
  border-right: 4px solid var(--color-secondary);
  border-radius: 0 0 14px 0;
}

.mock-pointer {
  position: absolute;
  top: 70%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: #00ffff;
  border-radius: var(--radius-full);
  box-shadow: 0 0 10px #00ffff;
}

.mockup-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 14px;
}

.m-stat {
  display: flex;
  flex-direction: column;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  text-align: center;
}

.m-lbl {
  font-size: 0.55rem;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.m-val {
  font-size: 0.9rem;
  font-weight: 700;
}

.yellow-text { color: var(--color-warning); }

/* Features Section */
.landing-features, .featured-routes, .terminal-console-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section-title {
  text-align: center;
}

.section-title h2 {
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-top: 6px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}

.feature-card {
  text-align: center;
  padding: 24px !important;
  background: rgba(15, 23, 42, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.05);
}

.feature-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: var(--radius-md);
  border: 1px solid;
  margin-bottom: 16px;
}

.feature-icon-wrap.cyan { border-color: var(--color-secondary); color: var(--color-secondary); background: rgba(6, 182, 212, 0.05); }
.feature-icon-wrap.blue { border-color: var(--color-primary); color: var(--color-primary); background: rgba(37, 99, 235, 0.05); }
.feature-icon-wrap.green { border-color: var(--color-accent); color: var(--color-accent); background: rgba(20, 184, 166, 0.05); }

.feature-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.feature-card p {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* Expeditions Section */
.routes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 900px) {
  .routes-grid {
    grid-template-columns: 1fr;
  }
}

.route-profile-card {
  padding: 0 !important;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.3) !important;
  border-color: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all var(--transition-normal);
}

.route-profile-card:hover {
  transform: translateY(-6px);
  border-color: rgba(6, 182, 212, 0.25);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
}

.route-img-placeholder {
  height: 160px;
  position: relative;
  background-size: cover;
  background-position: center;
}

/* Premium gradient illustrations representing destinations */
.route-img-placeholder.himachal {
  background-image: linear-gradient(135deg, #1E3A8A 0%, #10B981 100%);
}
.route-img-placeholder.goa {
  background-image: linear-gradient(135deg, #F59E0B 0%, #06B6D4 100%);
}
.route-img-placeholder.ladakh {
  background-image: linear-gradient(135deg, #111827 0%, #4B5563 100%);
}

.route-fade-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, #090d16 0%, transparent 80%);
}

.route-rating {
  position: absolute;
  top: 12px;
  left: 12px;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(0,0,0,0.6);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  color: white;
}

.route-details {
  padding: 16px;
}

.route-details h4 {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.route-details p {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-bottom: 14px;
  min-height: 40px;
}

.route-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255,255,255,0.04);
  padding-top: 10px;
}

.route-distance {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.load-trigger {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-secondary);
}

.route-profile-card:hover .load-trigger {
  color: var(--color-accent);
}

/* Prompt Box Terminal Area */
.terminal-console-section {
  align-items: center;
}

.prompt-box-card {
  width: min(820px, 100%);
  padding: 24px 28px !important;
  background: var(--color-bg-surface) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

.prompt-params-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 20px;
}

@media (max-width: 640px) {
  .prompt-params-row {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

.param-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.param-lbl {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.param-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 0.88rem;
  font-weight: 600;
  color: white;
  outline: none;
}

.param-select option {
  background-color: var(--color-bg-base);
  color: white;
}

.slider-val-align {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.duration-slider {
  flex-grow: 1;
}

.days-val {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-secondary);
  white-space: nowrap;
}

.travelers-counter {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
  width: 100%;
}

.cnt-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 14px;
  flex-grow: 1;
  transition: background var(--transition-fast);
}

.cnt-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.cnt-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: white;
  padding: 0 10px;
}

.mt-6 {
  margin-top: 24px;
}

.prompt-form-field {
  display: flex;
  gap: 12px;
}

@media (max-width: 640px) {
  .prompt-form-field {
    flex-direction: column;
  }
}

.prompt-input-wrapper {
  position: relative;
  flex-grow: 1;
  display: flex;
  align-items: center;
}

.search-input-icon {
  position: absolute;
  left: 14px;
  color: var(--color-text-muted);
}

.prompt-text-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  padding: 14px 44px 14px 40px;
  font-size: 0.95rem;
  color: white;
  outline: none;
  transition: all var(--transition-normal);
}

.prompt-text-input:focus {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-neon-primary);
  background: rgba(0,0,0,0.35);
}

.voice-trigger-btn {
  position: absolute;
  right: 14px;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.voice-trigger-btn:hover {
  color: white;
}

.recent-archives-section {
  width: min(820px, 100%);
  margin-top: 40px;
}

.landing-footer {
  text-align: center;
  border-top: 1px solid rgba(255,255,255,0.04);
  padding-top: 20px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

/* ==================== LOADING OVERLAY STATE ==================== --> */
.loader-overlay-workspace {
  position: fixed;
  inset: 50px 0 0 0;
  z-index: 800;
  background-color: rgba(6, 8, 14, 0.92);
  backdrop-filter: blur(25px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
}

.radar-scan-box {
  position: relative;
  width: 120px;
  height: 120px;
}

.radar-scanner {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(6, 182, 212, 0.2);
  border-radius: var(--radius-full);
}

.radar-scanner::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 50%;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.4) 0%, transparent 100%);
  border-radius: 100% 0 0 0;
  transform-origin: bottom right;
  animation: radarScan 2.5s infinite linear;
}

@keyframes radarScan {
  to { transform: rotate(360deg); }
}

.radar-ripple-1, .radar-ripple-2 {
  position: absolute;
  inset: 0;
  border: 1.5px solid rgba(37, 99, 235, 0.15);
  border-radius: var(--radius-full);
  animation: radarRipple 3s infinite linear;
}

.radar-ripple-2 {
  animation-delay: 1.5s;
}

@keyframes radarRipple {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}

.loader-status {
  text-align: center;
}

.status-gradient {
  font-size: 1.25rem;
  letter-spacing: 0.1em;
  background: linear-gradient(135deg, #FFF 0%, var(--color-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.status-msg-sub {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-top: 8px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* ==================== ACTIVE WORKSPACE HUD ==================== */
.active-cockpit-workspace {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Sticky Navigation HUD Sub-bar */
.hud-nav-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 54px;
  padding: 0 24px;
  background: rgba(10, 15, 30, 0.75) !important;
  border-bottom: 1px solid var(--border-glass);
  border-radius: 0;
  margin-bottom: 24px;
}

.subbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-to-cmd-btn {
  background: transparent;
  border: none;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.back-to-cmd-btn:hover {
  color: white;
}

.subbar-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.subbar-style-badge {
  font-size: 0.62rem;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-glass);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.save-trip-hud-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-glass);
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.save-trip-hud-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255,255,255,0.2);
}

.save-trip-hud-btn.saved {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10B981;
  color: #10B981;
}

.heart-icon {
  color: var(--color-text-muted);
}

.heart-icon.filled {
  color: #EF4444;
  fill: #EF4444;
}

/* Grid Layout Cockpit Columns */
.cockpit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 1024px) {
  .cockpit-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.cockpit-wing {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.map-widget-container {
  height: 400px;
  width: 100%;
}

.h-full {
  height: 100%;
}
</style>
