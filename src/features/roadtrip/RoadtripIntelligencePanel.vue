<script setup>
import { computed } from "vue";
import GlassPanel from "../../shared/ui/GlassPanel.vue";
import RoadtripMiniMap from "./RoadtripMiniMap.vue";

const props = defineProps({
  roadtrip: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const telemetry = computed(() => props.roadtrip?.mapTelemetry || {});
const routePlan = computed(() => props.roadtrip?.scenicRoutePlan || {});
const fuelData = computed(() => props.roadtrip?.fuelEstimation || {});
const roadConditions = computed(() => props.roadtrip?.roadConditions || {});
const toll = computed(() => props.roadtrip?.tollEstimation || {});
const evPoints = computed(() => props.roadtrip?.evChargingPoints || {});
const drivingRoads = computed(() => props.roadtrip?.bestDrivingRoads || []);
const sunSpots = computed(() => props.roadtrip?.sunriseSunsetSpots || []);
const photoSpots = computed(() => props.roadtrip?.photographyStops || []);

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function scoreWidth(value) {
  const normalized = Math.max(0, Math.min(100, Number(value || 0)));
  return `${normalized}%`;
}

function mapsSearchUrl(query) {
  const text = String(query || "").trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
}
</script>

<template>
  <GlassPanel class="roadtrip-panel" heavy>
    <div class="head-row">
      <div>
        <span class="panel-tag">Roadtrip Engine</span>
        <h3>Scenic Drive Intelligence</h3>
        <p v-if="routePlan.summary" class="summary">{{ routePlan.summary }}</p>
        <p v-else class="summary">Switch transport mode to Car, Bike, or Bus to generate roadtrip telemetry.</p>
      </div>
      <span class="mode-chip" v-if="roadtrip">{{ roadtrip.travelMode }}</span>
    </div>

    <div v-if="loading" class="panel-state">Building route telemetry and stop intelligence...</div>
    <div v-else-if="!roadtrip" class="panel-state">Roadtrip engine waits for a generated itinerary in road mode.</div>

    <template v-else>
      <RoadtripMiniMap :roadtrip="roadtrip" class="mt-3" />

      <div class="telemetry-grid">
        <article>
          <span>Distance</span>
          <strong>{{ telemetry.distanceKm || 0 }} km</strong>
        </article>
        <article>
          <span>Drive Hours</span>
          <strong>{{ telemetry.driveHours || "-" }}</strong>
        </article>
        <article>
          <span>Traffic</span>
          <strong>{{ telemetry.trafficLevel || "Unknown" }}</strong>
        </article>
        <article>
          <span>Congestion</span>
          <strong>{{ telemetry.congestionPercent || 0 }}%</strong>
        </article>
      </div>

      <div class="section-grid">
        <article class="section-card">
          <h4>Fuel And Toll Estimation</h4>
          <p class="section-meta">Recommended fuel: {{ fuelData.recommended?.type || "-" }} ({{ formatMoney(fuelData.recommended?.totalCost) }})</p>
          <div class="fuel-list">
            <div v-for="fuel in fuelData.options || []" :key="fuel.type" class="fuel-item">
              <span>{{ fuel.type }}</span>
              <strong>{{ fuel.usage }} {{ fuel.unit }}</strong>
              <small>{{ formatMoney(fuel.totalCost) }}</small>
            </div>
          </div>
          <div class="toll-line">
            <span>Toll Estimate</span>
            <strong>{{ formatMoney(toll.estimated) }}</strong>
            <small>Range {{ formatMoney(toll.low) }} to {{ formatMoney(toll.high) }}</small>
          </div>
        </article>

        <article class="section-card">
          <h4>Road Conditions</h4>
          <p class="section-meta">{{ roadConditions.advice }}</p>
          <div class="score-wrap">
            <div class="score-bar">
              <span :style="{ width: scoreWidth(roadConditions.score) }"></span>
            </div>
            <strong>{{ roadConditions.score || 0 }}/100</strong>
          </div>
          <div class="condition-chip">Condition: {{ roadConditions.level || "moderate" }}</div>
          <p class="section-meta">Best window: {{ routePlan.idealDrivingWindow || "05:30 - 18:30" }}</p>
        </article>

        <article class="section-card">
          <h4>EV Charging Points</h4>
          <p class="section-meta">Stops needed: {{ evPoints.stopsNeeded || 0 }} | Estimated range per charge: {{ evPoints.batteryRangeKm || "-" }} km</p>
          <div v-if="(evPoints.suggestedStops || []).length === 0" class="empty-inline">No EV stops suggested for this route length.</div>
          <div v-else class="list-stack">
            <div v-for="stop in evPoints.suggestedStops" :key="stop.id" class="list-item">
              <div>
                <strong>{{ stop.name }}</strong>
                <small>{{ stop.city }} | {{ stop.kmFromStart }} km from start</small>
              </div>
              <a :href="mapsSearchUrl(stop.mapQuery)" target="_blank" rel="noopener noreferrer" class="map-link">Open map</a>
            </div>
          </div>
        </article>

        <article class="section-card">
          <h4>Best Driving Roads</h4>
          <div class="list-stack">
            <div v-for="road in drivingRoads" :key="road.id" class="list-item wide">
              <div>
                <strong>{{ road.name }}</strong>
                <small>{{ road.reason }}</small>
              </div>
              <div class="meta-col">
                <span>Score {{ road.scenicScore }}</span>
                <a :href="mapsSearchUrl(road.mapQuery)" target="_blank" rel="noopener noreferrer" class="map-link">View</a>
              </div>
            </div>
          </div>
        </article>

        <article class="section-card">
          <h4>Sunrise And Sunset Spots</h4>
          <div class="list-stack">
            <div v-for="spot in sunSpots" :key="spot.id" class="list-item wide">
              <div>
                <strong>{{ spot.label }}</strong>
                <small>{{ spot.city }} | Sunrise {{ spot.sunrise }} | Sunset {{ spot.sunset }}</small>
              </div>
              <a :href="mapsSearchUrl(spot.mapQuery)" target="_blank" rel="noopener noreferrer" class="map-link">View</a>
            </div>
          </div>
        </article>

        <article class="section-card">
          <h4>Photography Stops</h4>
          <div class="list-stack">
            <div v-for="stop in photoSpots" :key="stop.id" class="list-item wide">
              <div>
                <strong>{{ stop.title }}</strong>
                <small>{{ stop.theme }} | {{ stop.reason }}</small>
              </div>
              <a :href="mapsSearchUrl(stop.mapQuery)" target="_blank" rel="noopener noreferrer" class="map-link">View</a>
            </div>
          </div>
        </article>
      </div>
    </template>
  </GlassPanel>
</template>

<style scoped>
.roadtrip-panel {
  background: #ffffff !important;
  border: 1px solid var(--color-border);
}

.head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-tag {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-secondary);
  margin-bottom: 4px;
}

.head-row h3 {
  font-size: 1.1rem;
}

.summary {
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 0.84rem;
  max-width: 760px;
}

.mode-chip {
  border: 1px solid rgba(14, 165, 233, 0.35);
  background: rgba(14, 165, 233, 0.08);
  color: var(--color-secondary);
  border-radius: var(--radius-full);
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.panel-state {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 0.82rem;
}

.mt-3 {
  margin-top: 12px;
}

.telemetry-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.telemetry-grid article {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  background: #f8fafc;
}

.telemetry-grid span {
  display: block;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.telemetry-grid strong {
  display: block;
  margin-top: 4px;
  font-size: 0.94rem;
  color: var(--color-text);
}

.section-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.section-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px;
  background: #ffffff;
}

.section-card h4 {
  font-size: 0.9rem;
}

.section-meta {
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 0.78rem;
}

.fuel-list {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.fuel-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px;
  display: grid;
  gap: 2px;
}

.fuel-item span {
  font-size: 0.74rem;
  color: var(--color-text-secondary);
}

.fuel-item strong {
  font-size: 0.86rem;
}

.fuel-item small,
.toll-line small,
.list-item small {
  color: var(--color-text-secondary);
  font-size: 0.72rem;
}

.toll-line {
  margin-top: 10px;
  border-top: 1px solid var(--color-border);
  padding-top: 10px;
  display: grid;
  gap: 2px;
}

.score-wrap {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-bar {
  flex: 1;
  height: 8px;
  border-radius: var(--radius-full);
  background: #e2e8f0;
  overflow: hidden;
}

.score-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
}

.condition-chip {
  margin-top: 8px;
  display: inline-flex;
  padding: 5px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(20, 184, 166, 0.35);
  background: rgba(20, 184, 166, 0.08);
  color: #0f766e;
  font-size: 0.73rem;
  font-weight: 700;
}

.list-stack {
  margin-top: 8px;
  display: grid;
  gap: 8px;
}

.list-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.list-item.wide {
  align-items: flex-start;
}

.meta-col {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.meta-col span {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.map-link {
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-full);
  color: var(--color-primary);
  padding: 5px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.map-link:hover {
  background: var(--color-primary-light);
}

.empty-inline {
  margin-top: 8px;
  color: var(--color-text-secondary);
  font-size: 0.76rem;
}

@media (max-width: 980px) {
  .telemetry-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .head-row {
    flex-direction: column;
  }

  .fuel-list {
    grid-template-columns: 1fr;
  }
}
</style>
