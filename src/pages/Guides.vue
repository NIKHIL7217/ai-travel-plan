<script setup>
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <div class="support-page container animate-fade-in" style="padding-top: 100px;">
    <div class="support-header">
      <span class="badge">GUIDES</span>
      <h1>AI Travel Planner Guides</h1>
      <p>Quick walkthroughs to help you search destinations, generate plans, and save useful trips.</p>
    </div>

    <section class="guide-grid mt-6">
      <article class="guide-card glass-card">
        <h3>1. Search Any Destination</h3>
        <p>Go to Destinations page and type city, country, or landmark. The app fetches live location-driven suggestions.</p>
      </article>

      <article class="guide-card glass-card">
        <h3>2. Generate AI Itinerary</h3>
        <p>Open Planner and enter your destination or natural language request. You can type in normal chat style too.</p>
      </article>

      <article class="guide-card glass-card">
        <h3>3. Review Budget Forecast</h3>
        <p>Planner auto-estimates stay, transport, food, and activities. Currency formatting follows your detected region.</p>
      </article>

      <article class="guide-card glass-card">
        <h3>4. Save and Track Trips</h3>
        <p>Login to save generated plans. Your Dashboard shows your saved count, planned days, and recent activity.</p>
      </article>
    </section>

    <section class="tips-panel glass-card mt-6">
      <h3>Best Practices</h3>
      <ul>
        <li>Keep destination names specific for better results.</li>
        <li>Allow geolocation for accurate distance and local context.</li>
        <li>Use realistic traveler count and days for better budgets.</li>
        <li>Review weather and route details before finalizing plans.</li>
      </ul>
      <button type="button" class="btn btn-primary mt-4" @click="router.push('/planner')">Open Planner</button>
    </section>
  </div>
</template>

<style scoped>
.support-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 32px;
}

.support-header h1 {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  margin: 8px 0;
}

.support-header p {
  color: var(--color-text-secondary);
}

.badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.guide-card {
  padding: 18px;
}

.guide-card p {
  margin-top: 8px;
  color: var(--color-text-secondary);
  font-size: 0.92rem;
  line-height: 1.5;
}

.tips-panel {
  padding: 20px;
}

.tips-panel ul {
  margin-top: 10px;
  padding-left: 18px;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.mt-6 {
  margin-top: 24px;
}

.mt-4 {
  margin-top: 16px;
}

@media (max-width: 860px) {
  .guide-grid {
    grid-template-columns: 1fr;
  }
}
</style>
