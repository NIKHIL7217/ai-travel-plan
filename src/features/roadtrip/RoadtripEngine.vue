<script setup>
import { ref } from "vue";
import { usePlannerStore } from "../../app/stores/planner";
import Icons from "../../shared/icons/Icons.vue";

const plannerStore = usePlannerStore();
const activeTab = ref("timeline"); // timeline | stops
const selectedDay = ref(1);

const selectDay = (day) => {
  selectedDay.value = day;
};
</script>

<template>
  <div v-if="plannerStore.activeTrip" class="roadtrip-engine-container">
    <!-- Header Tabs -->
    <div class="engine-tabs-header">
      <button 
        type="button" 
        :class="['engine-tab', activeTab === 'timeline' ? 'active' : '']" 
        @click="activeTab = 'timeline'"
      >
        🛰 Smart Timeline
      </button>
      <button 
        type="button" 
        :class="['engine-tab', activeTab === 'stops' ? 'active' : '']" 
        @click="activeTab = 'stops'"
      >
        📍 Waypoints & Sights
      </button>
    </div>

    <!-- Active Workspace Contents -->
    <div class="engine-workspace-body os-scrollbar">
      
      <!-- Tab 1: Timeline -->
      <div v-if="activeTab === 'timeline'" class="timeline-tab-content">
        <!-- Day Selector Bullets -->
        <div class="day-selector-row">
          <button 
            type="button" 
            v-for="item in plannerStore.activeTrip.itinerary" 
            :key="item.day"
            :class="['day-bullet', selectedDay === item.day ? 'active' : '']"
            @click="selectDay(item.day)"
          >
            D{{ item.day }}
          </button>
        </div>

        <!-- Selected Day's Brief -->
        <div class="day-theme-banner">
          <span class="day-tag">DAY {{ selectedDay }} Telemetry</span>
          <h3>{{ plannerStore.activeTrip.itinerary[selectedDay - 1]?.theme }}</h3>
        </div>

        <!-- Vertical Timeline Activities -->
        <div class="vertical-timeline">
          <div 
            v-for="(event, idx) in plannerStore.activeTrip.itinerary[selectedDay - 1]?.timeline" 
            :key="idx" 
            class="timeline-event"
          >
            <!-- Timeline connector line -->
            <div class="event-connector">
              <div class="connector-dot pulse-glow"></div>
              <div class="connector-line"></div>
            </div>

            <!-- Content Card -->
            <div class="event-card glass-panel">
              <div class="event-header">
                <span class="event-time monospaced">{{ event.time }}</span>
                <span class="event-type-badge">
                  <Icons :name="event.icon || 'drive'" class="icon-small" />
                  {{ event.icon ? event.icon.toUpperCase() : 'DRIVE' }}
                </span>
              </div>
              <p class="event-desc">{{ event.activity }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Stops & Waypoints -->
      <div v-if="activeTab === 'stops'" class="stops-tab-content">
        <div class="stops-summary">
          <span class="total-count-badge">{{ plannerStore.activeTrip.stops.length }} STOPS LOGGED</span>
        </div>

        <div class="stops-grid">
          <div 
            v-for="(stop, idx) in plannerStore.activeTrip.stops" 
            :key="idx" 
            class="stop-card glass-panel"
          >
            <div class="stop-header">
              <span class="stop-num monospaced">WP-0{{ idx + 1 }}</span>
              <div class="stop-rating-pill">
                ⭐ <span class="monospaced">{{ stop.scenicScore }}</span>
              </div>
            </div>

            <h4 class="stop-name">{{ stop.name }}</h4>
            <p class="stop-meta">Distance: <span class="monospaced">{{ stop.distanceFromStart }} km</span></p>
            
            <div class="stop-photo-spot">
              <span class="photo-icon">📷</span>
              <p class="photo-spot-txt">"{{ stop.photoSpot }}"</p>
            </div>

            <!-- Amenities Tags -->
            <div class="amenities-row">
              <span 
                v-for="amenity in stop.amenities" 
                :key="amenity"
                :class="['amenity-tag', amenity.includes('EV') ? 'ev' : '']"
              >
                {{ amenity }}
              </span>
            </div>
            
            <div class="stop-footer">
              <span class="toll-cost">Tolls: <span class="monospaced">${{ stop.tollCost }}</span></span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.roadtrip-engine-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Tab Header Navigation */
.engine-tabs-header {
  display: flex;
  gap: 12px;
  border-bottom: 1.5px solid var(--border-glass);
  padding-bottom: 12px;
}

.engine-tab {
  padding: 8px 16px;
  font-family: var(--font-display);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
}

.engine-tab:hover {
  color: var(--color-text-primary);
}

.engine-tab.active {
  color: var(--color-primary);
}

.engine-tab.active::after {
  content: '';
  position: absolute;
  bottom: -13.5px;
  left: 0;
  right: 0;
  height: 2.5px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  border-radius: var(--radius-full);
}

/* Scrollable Container Body */
.engine-workspace-body {
  flex-grow: 1;
  padding: 16px 0;
}

/* Timeline Styling */
.day-selector-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 14px;
}

.day-bullet {
  padding: 6px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-glass);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.day-bullet:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-primary);
}

.day-bullet.active {
  background: rgba(37, 99, 235, 0.2);
  border-color: var(--color-primary);
  color: #FFFFFF;
}

.day-theme-banner {
  background: rgba(37, 99, 235, 0.05);
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  margin-bottom: 20px;
}

.day-tag {
  font-size: 0.65rem;
  color: var(--color-secondary);
  letter-spacing: 0.08em;
  font-weight: 700;
  text-transform: uppercase;
}

.day-theme-banner h3 {
  font-size: 1.05rem;
  margin-top: 4px;
  color: var(--color-text-primary);
}

/* Vertical Timeline list */
.vertical-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-event {
  display: flex;
  gap: 16px;
}

.event-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 14px;
}

.connector-dot {
  width: 10px;
  height: 10px;
  background-color: var(--color-secondary);
  border-radius: var(--radius-full);
  border: 2px solid #06080e;
}

.connector-line {
  flex-grow: 1;
  width: 2px;
  background-color: rgba(255, 255, 255, 0.06);
  margin-top: 4px;
}

.timeline-event:last-child .connector-line {
  display: none;
}

.event-card {
  flex-grow: 1;
  padding: 14px 18px !important;
  background: rgba(15, 23, 42, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.05);
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.event-time {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-secondary);
}

.event-type-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--color-text-muted);
}

.icon-small {
  width: 12px;
  height: 12px;
}

.event-desc {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

/* Waypoints & Stops Tab */
.stops-summary {
  margin-bottom: 14px;
}

.total-count-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: 0.08em;
  background: rgba(20, 184, 166, 0.1);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(20, 184, 166, 0.2);
}

.stops-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.stop-card {
  padding: 16px !important;
  background: rgba(15, 23, 42, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.05);
}

.stop-card:hover {
  border-color: rgba(6, 182, 212, 0.2);
}

.stop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stop-num {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.stop-rating-pill {
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.stop-name {
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.stop-meta {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  margin-bottom: 10px;
}

.stop-photo-spot {
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.15);
  padding: 8px;
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
  font-style: italic;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.photo-spot-txt {
  line-height: 1.3;
}

.amenities-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
}

.amenity-tag {
  font-size: 0.62rem;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
}

.amenity-tag.ev {
  border-color: #10B981;
  color: #10B981;
}

.stop-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 8px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
