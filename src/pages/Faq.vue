<script setup>
import { ref } from "vue";

const faqs = ref([
  {
    q: "How does destination search work?",
    a: "Search accepts city, country, and common travel phrases. The app uses live AI and geolocation-aware services for matching results."
  },
  {
    q: "Why do I need geolocation?",
    a: "Geolocation helps personalize distance, nearby recommendations, weather context, and currency display for your region."
  },
  {
    q: "Can I plan trips in normal language?",
    a: "Yes. In Planner you can type natural prompts like a normal chat message and generate an itinerary with budget details."
  },
  {
    q: "How are saved trips handled?",
    a: "Saved trips are linked to your account profile and shown in Dashboard and Saved Trips after login."
  },
  {
    q: "Why is no result shown sometimes?",
    a: "This can happen when external APIs are unavailable. Retry after a few seconds or use a more specific destination query."
  }
]);
</script>

<template>
  <div class="support-page container animate-fade-in" style="padding-top: 100px;">
    <div class="support-header">
      <span class="badge">FAQ</span>
      <h1>Frequently Asked Questions</h1>
      <p>Common questions about search, planner, live data, and account features.</p>
    </div>

    <section class="faq-list mt-6">
      <article v-for="item in faqs" :key="item.q" class="faq-card glass-card">
        <h3>{{ item.q }}</h3>
        <p>{{ item.a }}</p>
      </article>
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

.faq-list {
  display: grid;
  gap: 12px;
}

.faq-card {
  padding: 18px;
}

.faq-card p {
  margin-top: 8px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.mt-6 {
  margin-top: 24px;
}
</style>
