<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const goHome = () => {
  router.push("/");
};
</script>

<template>
  <div class="not-found-page-layout container animate-fade-in" style="padding-top: 150px;">
    <div class="not-found-card glass-card">
      <span class="icon-lost">🧭</span>
      <h1>404 - Page Not Found</h1>
      <p>It looks like the travel coordinate you are attempting to visit does not exist or has been archived.</p>
      <button type="button" class="btn btn-primary mt-6" @click="goHome">
        Return to Home Portal
      </button>
    </div>
  </div>
</template>

<style scoped>
.not-found-page-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
}

.not-found-card {
  width: min(480px, 100%);
  text-align: center;
  padding: 40px 24px !important;
  background-color: #FFFFFF !important;
}

.icon-lost {
  font-size: 3.5rem;
  display: block;
  margin-bottom: 16px;
  animation: floatIcon 3s infinite alternate ease-in-out;
}

@keyframes floatIcon {
  0% { transform: translateY(0); }
  100% { transform: translateY(-8px); }
}

.not-found-card h1 {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.not-found-card p {
  font-size: 0.92rem;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.mt-6 {
  margin-top: 24px;
}
</style>
