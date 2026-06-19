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
      <h4>Season Intelligence</h4>
      <span class="chip">{{ data?.currentSeason || "N/A" }}</span>
    </div>

    <div v-if="loading" class="widget-loading">Analyzing season profile...</div>
    <div v-else-if="!data" class="widget-empty">No season intelligence available.</div>
    <div v-else>
      <div class="metric-grid">
        <div class="metric"><span>Seasonal Score</span><strong>{{ data.seasonalScore }}/100</strong></div>
        <div class="metric"><span>Thermal Trend</span><strong>{{ data.thermalTrend }}</strong></div>
        <div class="metric"><span>Avg Temp</span><strong>{{ data.avgTemp ?? "-" }}°C</strong></div>
        <div class="metric"><span>Best Window</span><strong>{{ data.bestWindow }}</strong></div>
      </div>
      <p class="advisory">{{ data.advisory }}</p>
    </div>
  </GlassPanel>
</template>

<style scoped>
.ti-widget { background: #ffffff !important; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; }
.head h4 { font-size: 0.95rem; }
.chip { font-size: 0.68rem; font-weight: 700; color: #0f766e; background: rgba(16, 185, 129, 0.15); border-radius: var(--radius-full); padding: 4px 8px; }
.metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.metric { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px; }
.metric span { display: block; font-size: 0.71rem; color: var(--color-text-secondary); }
.metric strong { display: block; margin-top: 3px; font-size: 0.86rem; }
.advisory { margin-top: 8px; font-size: 0.79rem; color: var(--color-text-secondary); line-height: 1.45; }
.widget-loading, .widget-empty { font-size: 0.8rem; color: var(--color-text-muted); }
</style>
