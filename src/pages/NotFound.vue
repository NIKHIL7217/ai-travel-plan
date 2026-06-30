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

<style scoped src="./styles/NotFound.css"></style>
