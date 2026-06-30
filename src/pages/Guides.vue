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

<style scoped src="./styles/Guides.css"></style>
