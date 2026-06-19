<script setup>
import GlassPanel from "../../../shared/ui/GlassPanel.vue";

defineProps({
  data: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <GlassPanel class="ti-widget">
    <div class="head">
      <h4>Weather Intelligence</h4>
      <span class="chip">{{ data?.comfortBand || "N/A" }}</span>
    </div>

    <div v-if="loading" class="widget-loading">Loading weather model...</div>
    <div v-else-if="!data" class="widget-empty">No weather intelligence available.</div>
    <div v-else class="content">
      <div class="metric-grid">
        <div class="metric"><span>Temp</span><strong>{{ data.temperatureC ?? "-" }}°C</strong></div>
        <div class="metric"><span>Humidity</span><strong>{{ data.humidityPercent ?? "-" }}%</strong></div>
        <div class="metric"><span>Rain</span><strong>{{ data.rainProbabilityPercent ?? "-" }}%</strong></div>
        <div class="metric"><span>AQI</span><strong>{{ data.aqi ?? "N/A" }}</strong></div>
      </div>
      <div class="score-line">
        <span>Comfort Score</span>
        <strong>{{ data.comfortScore }}/100</strong>
      </div>
      <p class="advisory">{{ data.advisory }}</p>
    </div>
  </GlassPanel>
</template>

<style scoped>
.ti-widget { background: #ffffff !important; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; }
.head h4 { font-size: 0.95rem; }
.chip { font-size: 0.68rem; font-weight: 700; color: #0f766e; background: rgba(20, 184, 166, 0.12); border-radius: var(--radius-full); padding: 4px 8px; }
.metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.metric { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px; }
.metric span { display: block; font-size: 0.71rem; color: var(--color-text-secondary); }
.metric strong { display: block; margin-top: 3px; font-size: 0.9rem; }
.score-line { margin-top: 10px; display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--color-text-secondary); }
.advisory { margin-top: 8px; font-size: 0.79rem; color: var(--color-text-secondary); line-height: 1.45; }
.widget-loading, .widget-empty { font-size: 0.8rem; color: var(--color-text-muted); }
</style>
