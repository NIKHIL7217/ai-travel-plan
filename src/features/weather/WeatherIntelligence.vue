<script setup>
import { usePlannerStore } from "../../app/stores/planner";
import Icons from "../../shared/icons/Icons.vue";

const plannerStore = usePlannerStore();
</script>

<template>
  <div v-if="plannerStore.activeTrip" class="weather-intelligence-container">
    <div class="weather-header">
      <h3>Telemetry Intelligence</h3>
      <span :class="['hazard-badge', plannerStore.activeTrip.weather.hazardLevel.toLowerCase()]">
        {{ plannerStore.activeTrip.weather.hazardLevel }} Risk
      </span>
    </div>

    <!-- Alert Banner -->
    <div 
      v-if="plannerStore.activeTrip.weather.hazardWarning" 
      :class="['alert-banner', plannerStore.activeTrip.weather.hazardLevel.toLowerCase() === 'low' ? 'low-risk' : 'high-risk']"
    >
      <div class="alert-icon-wrap">
        <Icons name="alert" class="alert-icon" />
      </div>
      <div class="alert-info">
        <span class="alert-title">ROAD TELEMETRY HAZARD</span>
        <p class="alert-msg">{{ plannerStore.activeTrip.weather.hazardWarning }}</p>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="weather-stats-grid">
      <!-- Temperature Range -->
      <div class="w-stat-card glass-panel">
        <Icons name="sun" class="stat-icon cyan" />
        <div class="stat-detail">
          <span class="stat-lbl">TEMP SPECTRUM</span>
          <span class="stat-val monospaced">{{ plannerStore.activeTrip.weather.tempRange }}</span>
        </div>
      </div>

      <!-- General Outlook -->
      <div class="w-stat-card glass-panel">
        <Icons name="cloud" class="stat-icon blue" />
        <div class="stat-detail">
          <span class="stat-lbl">OUTLOOK</span>
          <span class="stat-val font-small">{{ plannerStore.activeTrip.weather.general }}</span>
        </div>
      </div>

      <!-- Drive Window -->
      <div class="w-stat-card glass-panel">
        <Icons name="clock" class="stat-icon green" />
        <div class="stat-detail">
          <span class="stat-lbl">OPTIMAL WINDOW</span>
          <span class="stat-val monospaced">{{ plannerStore.activeTrip.weather.bestTravelWindow }}</span>
        </div>
      </div>
    </div>

    <!-- Elevation Telemetry Curve Graph (New Advanced Feature) -->
    <div class="elevation-telemetry-box glass-panel">
      <span class="elevation-lbl monospaced">⛰️ ELEVATION TELEMETRY INDEX</span>
      <div class="elevation-graph-wrap">
        <svg viewBox="0 0 300 70" class="elevation-svg">
          <defs>
            <linearGradient id="elevationAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--color-secondary)" stop-opacity="0.35"></stop>
              <stop offset="100%" stop-color="var(--color-secondary)" stop-opacity="0"></stop>
            </linearGradient>
            <filter id="glowFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="var(--color-secondary)" flood-opacity="0.5" />
            </filter>
          </defs>
          
          <!-- Area fill -->
          <path d="M 0 60 Q 40 55 80 30 T 160 45 T 220 15 T 300 5 L 300 70 L 0 70 Z" fill="url(#elevationAreaGrad)"></path>
          
          <!-- Vector line -->
          <path d="M 0 60 Q 40 55 80 30 T 160 45 T 220 15 T 300 5" fill="none" stroke="var(--color-secondary)" stroke-width="2" filter="url(#glowFilter)"></path>
          
          <!-- Waypoint markers -->
          <circle cx="80" cy="30" r="3" fill="var(--color-accent)"></circle>
          <circle cx="160" cy="45" r="3" fill="var(--color-accent)"></circle>
          <circle cx="220" cy="15" r="3" fill="var(--color-accent)"></circle>
          <circle cx="300" cy="5" r="3.5" fill="#EF4444"></circle>
        </svg>
      </div>
      <div class="elevation-readout monospaced">
        <div class="r-item">
          <span class="r-lbl">ORIGIN</span>
          <span class="r-val">340m</span>
        </div>
        <div class="r-item center">
          <span class="r-lbl">PEAK CRITICAL</span>
          <span class="r-val text-glow-cyan">3,820m</span>
        </div>
        <div class="r-item right">
          <span class="r-lbl">TERMINUS</span>
          <span class="r-val">1,860m</span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.weather-intelligence-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.weather-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1.5px solid var(--border-glass);
  padding-bottom: 12px;
}

.weather-header h3 {
  font-family: var(--font-display);
  font-size: 1rem;
}

.hazard-badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.hazard-badge.low {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10B981;
}

.hazard-badge.moderate {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #F59E0B;
}

.hazard-badge.high {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #EF4444;
  animation: pulseGlow 1.5s infinite alternate ease-in-out;
}

/* Warnings Banner */
.alert-banner {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid;
}

.alert-banner.high-risk {
  background: rgba(239, 68, 68, 0.04);
  border-color: rgba(239, 68, 68, 0.25);
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.05);
}

.alert-banner.low-risk {
  background: rgba(16, 185, 129, 0.04);
  border-color: rgba(16, 185, 129, 0.2);
}

.alert-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-icon {
  color: #EF4444;
}

.alert-banner.low-risk .alert-icon {
  color: #10B981;
}

.alert-info {
  display: flex;
  flex-direction: column;
}

.alert-title {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}

.alert-msg {
  font-size: 0.82rem;
  color: var(--color-text-primary);
  margin-top: 2px;
  line-height: 1.35;
}

/* Weather Stats Cards */
.weather-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.w-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px !important;
  background: rgba(15, 23, 42, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.05);
}

.stat-icon {
  padding: 6px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-glass);
}

.stat-icon.cyan { color: var(--color-secondary); }
.stat-icon.blue { color: var(--color-primary); }
.stat-icon.green { color: var(--color-accent); }

.stat-detail {
  display: flex;
  flex-direction: column;
}

.stat-lbl {
  font-size: 0.6rem;
  color: var(--color-text-muted);
  letter-spacing: 0.08em;
}

.stat-val {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-top: 1px;
}

.font-small {
  font-size: 0.78rem;
  line-height: 1.25;
}

/* Elevation Telemetry Box */
.elevation-telemetry-box {
  background: rgba(15, 23, 42, 0.15) !important;
  border-color: rgba(255, 255, 255, 0.04);
  padding: 14px !important;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.elevation-lbl {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.elevation-graph-wrap {
  width: 100%;
  height: 60px;
  padding: 0 4px;
}

.elevation-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.elevation-readout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  font-size: 0.7rem;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  padding-top: 8px;
}

.r-item {
  display: flex;
  flex-direction: column;
}

.r-item.center {
  align-items: center;
}

.r-item.right {
  align-items: flex-end;
}

.r-lbl {
  font-size: 0.55rem;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.r-val {
  font-weight: 700;
  color: var(--color-text-primary);
  margin-top: 2px;
}
</style>
