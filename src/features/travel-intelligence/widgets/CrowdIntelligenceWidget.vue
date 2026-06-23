<script setup>
import GlassPanel from "../../../shared/ui/GlassPanel.vue";

defineProps({
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false }
});
</script>

<template>
  <GlassPanel class="ti-widget">
    <div class="head">
      <h4>Crowd Intelligence</h4>
      <span class="chip">{{ data?.level || "N/A" }}</span>
    </div>

    <div v-if="loading" class="widget-loading">Scanning crowd signals...</div>
    <div v-else-if="!data" class="widget-empty">No crowd intelligence available.</div>
    <div v-else>
      <div class="metric-grid">
        <div class="metric"><span>Crowd Index</span><strong>{{ data.crowdIndex }}/100</strong></div>
        <div class="metric"><span>Peak Window</span><strong>{{ data.peakWindow }}</strong></div>
        <div class="metric"><span>Attractions</span><strong>{{ data.attractionHotspots }}</strong></div>
        <div class="metric"><span>Dining</span><strong>{{ data.diningHotspots }}</strong></div>
        <div class="metric"><span>Attraction Wait</span><strong>{{ data.waitTimeMinutes?.attractions ?? "-" }} min</strong></div>
        <div class="metric"><span>Dining Wait</span><strong>{{ data.waitTimeMinutes?.dining ?? "-" }} min</strong></div>
      </div>

      <div v-if="data.nextHourForecast?.length" class="forecast-row">
        <span class="forecast-head">Next 3h crowd forecast</span>
        <div class="forecast-grid">
          <div v-for="entry in data.nextHourForecast" :key="`fc-${entry.hourOffset}`" class="forecast-item">
            <small>+{{ entry.hourOffset }}h</small>
            <strong>{{ entry.expectedIndex }}/100</strong>
            <span>{{ entry.expectedLevel }}</span>
          </div>
        </div>
      </div>
      <p class="advisory">{{ data.advisory }}</p>
    </div>
  </GlassPanel>
</template>

<style scoped>
.ti-widget { background: #ffffff !important; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; }
.head h4 { font-size: 0.95rem; }
.chip { font-size: 0.68rem; font-weight: 700; color: #1d4ed8; background: rgba(37, 99, 235, 0.14); border-radius: var(--radius-full); padding: 4px 8px; }
.metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.metric { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px; }
.metric span { display: block; font-size: 0.71rem; color: var(--color-text-secondary); }
.metric strong { display: block; margin-top: 3px; font-size: 0.86rem; }
.forecast-row { margin-top: 8px; }
.forecast-head { display: block; font-size: 0.7rem; color: var(--color-text-secondary); margin-bottom: 6px; }
.forecast-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.forecast-item { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 6px; background: #f8fafc; text-align: center; }
.forecast-item small { display: block; font-size: 0.66rem; color: var(--color-text-muted); }
.forecast-item strong { display: block; font-size: 0.8rem; margin-top: 2px; }
.forecast-item span { display: block; font-size: 0.66rem; color: var(--color-text-secondary); margin-top: 2px; }
.advisory { margin-top: 8px; font-size: 0.79rem; color: var(--color-text-secondary); line-height: 1.45; }
.widget-loading, .widget-empty { font-size: 0.8rem; color: var(--color-text-muted); }

@media (max-width: 640px) {
  .forecast-grid { grid-template-columns: 1fr; }
}
</style>
