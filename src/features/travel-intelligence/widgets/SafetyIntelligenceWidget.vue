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
      <h4>Safety Intelligence</h4>
      <span class="chip">{{ data?.level || "N/A" }}</span>
    </div>

    <div v-if="loading" class="widget-loading">Computing safety signals...</div>
    <div v-else-if="!data" class="widget-empty">No safety intelligence available.</div>
    <div v-else>
      <div class="metric-grid">
        <div class="metric"><span>Safety Score</span><strong>{{ data.safetyScore }}/100</strong></div>
        <div class="metric"><span>Risk Drivers</span><strong>{{ data.riskDrivers?.length || 0 }}</strong></div>
        <div class="metric"><span>Night Safety</span><strong>{{ data.dimensions?.nightSafety ?? "-" }}/100</strong></div>
        <div class="metric"><span>Solo Female Safety</span><strong>{{ data.dimensions?.soloFemaleSafety ?? "-" }}/100</strong></div>
        <div class="metric"><span>Family Safety</span><strong>{{ data.dimensions?.familySafety ?? "-" }}/100</strong></div>
        <div class="metric"><span>Scam Risk</span><strong>{{ data.dimensions?.scamRisk ?? "-" }}/100</strong></div>
      </div>
      <div class="drivers" v-if="data.riskDrivers?.length">
        <span v-for="driver in data.riskDrivers" :key="driver" class="driver-chip">{{ driver }}</span>
      </div>
      <p class="advisory">{{ data.advisory }}</p>
    </div>
  </GlassPanel>
</template>

<style scoped>
.ti-widget { background: #ffffff !important; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px; }
.head h4 { font-size: 0.95rem; }
.chip { font-size: 0.68rem; font-weight: 700; color: #991b1b; background: rgba(239, 68, 68, 0.14); border-radius: var(--radius-full); padding: 4px 8px; }
.metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.metric { border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px; }
.metric span { display: block; font-size: 0.71rem; color: var(--color-text-secondary); }
.metric strong { display: block; margin-top: 3px; font-size: 0.86rem; }
.drivers { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.driver-chip { font-size: 0.68rem; font-weight: 700; color: #7f1d1d; background: rgba(248, 113, 113, 0.18); border-radius: var(--radius-full); padding: 4px 8px; }
.advisory { margin-top: 8px; font-size: 0.79rem; color: var(--color-text-secondary); line-height: 1.45; }
.widget-loading, .widget-empty { font-size: 0.8rem; color: var(--color-text-muted); }
</style>
