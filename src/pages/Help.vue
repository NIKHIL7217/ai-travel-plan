<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const topic = computed(() => String(route.query.topic || "overview").toLowerCase());

const sections = computed(() => {
  const all = [
    {
      id: "overview",
      title: "How To Use The Platform",
      points: [
        "Start from Home and enter a natural query in the command center.",
        "Open a destination and verify weather, cost, and distance context.",
        "Generate a complete trip workspace and save your preferred plan.",
        "Use Saved Trips to revisit, compare, and continue planning."
      ]
    },
    {
      id: "security",
      title: "Security and Privacy",
      points: [
        "Use environment variables for all provider API keys.",
        "Do not commit secrets or private credentials to git.",
        "Location access can be disabled from browser settings any time.",
        "User trips are scoped by account identity when logged in."
      ]
    },
    {
      id: "api",
      title: "API Setup",
      points: [
        "Required: VITE_GEMINI_API_KEY",
        "Recommended: VITE_GOOGLE_MAPS_API_KEY, VITE_OPENWEATHER_API_KEY, VITE_TOMTOM_API_KEY",
        "Optional: Firebase VITE_FIREBASE_* keys for cloud auth and storage",
        "Restart the dev server after updating .env values."
      ]
    }
  ];

  if (topic.value === "security") {
    return [all[1], all[0], all[2]];
  }

  if (topic.value === "api" || topic.value === "api-keys") {
    return [all[2], all[0], all[1]];
  }

  return all;
});
</script>

<template>
  <div class="support-page container animate-fade-in" style="padding-top: 100px;">
    <div class="support-header">
      <span class="badge">HELP CENTER</span>
      <h1>Help, Setup, and Trust</h1>
      <p>Everything you need to use the planner confidently, without breaking your planning flow.</p>
    </div>

    <section class="actions-row mt-6">
      <button type="button" class="btn btn-primary" @click="router.push('/planner')">Open Trip Workspace</button>
      <button type="button" class="btn btn-outline" @click="router.push('/destination')">Explore Destinations</button>
      <button type="button" class="btn btn-outline" @click="router.push({ path: '/help', query: { topic: 'api' } })">API Setup</button>
    </section>

    <section class="support-grid mt-6">
      <article v-for="section in sections" :key="section.id" class="support-card glass-card">
        <h3>{{ section.title }}</h3>
        <ul>
          <li v-for="point in section.points" :key="point">{{ point }}</li>
        </ul>
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

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.support-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.support-card {
  padding: 18px;
}

.support-card ul {
  margin-top: 10px;
  padding-left: 16px;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.mt-6 {
  margin-top: 24px;
}

@media (max-width: 980px) {
  .support-grid {
    grid-template-columns: 1fr;
  }
}
</style>
