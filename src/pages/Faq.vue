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

<style scoped src="./styles/Faq.css"></style>
