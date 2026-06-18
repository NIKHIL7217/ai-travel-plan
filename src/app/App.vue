<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { RouterView } from "vue-router";
import { playSystemBoot, playClickTone, toggleMute, getMuteState } from "./services/sound";

// Live Clock for OS Status Bar
const currentTime = ref("");
let timerId = null;

const isMuted = ref(false);

const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const toggleMuteAudio = () => {
  isMuted.value = toggleMute();
  playClickTone();
};

onMounted(() => {
  updateClock();
  timerId = setInterval(updateClock, 1000);
  
  // Play short boot sequence sound when page loads
  playSystemBoot();
  isMuted.value = getMuteState();
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
});
</script>

<template>
  <div class="app-viewport">
    <!-- Ambient Sci-Fi Glowing Mesh -->
    <div class="ambient-glow-wrapper">
      <div class="ambient-glow-1"></div>
      <div class="ambient-glow-2"></div>
      <div class="grid-lines-overlay"></div>
    </div>

    <!-- HUD OS Status Bar -->
    <header class="hud-status-bar glass-panel">
      <div class="status-left">
        <span class="system-tag pulse-glow">● SYSTEM ON</span>
        <span class="telemetry-item">GPS: <span class="monospaced">28.6139° N, 77.2090° E</span></span>
      </div>
      
      <div class="status-center">
        <span class="brand-title">ROAM<span class="brand-accent">AI</span></span>
        <span class="divider">|</span>
        <span class="clock-display monospaced">{{ currentTime }}</span>
      </div>
      
      <div class="status-right">
        <button type="button" class="audio-toggle-btn monospaced" @click="toggleMuteAudio" title="Toggle audio feedback chime">
          {{ isMuted ? '🔇 AUD_HUD: OFF' : '🔊 AUD_HUD: ON' }}
        </button>
        <span class="telemetry-item">SIGNAL: <span class="green-text">5G LTE</span></span>
        <span class="telemetry-item">COPILOT: <span class="cyan-text">ACTIVE</span></span>
      </div>
    </header>

    <!-- Router Render Container -->
    <div class="viewport-content">
      <RouterView />
    </div>
  </div>
</template>

<style>
/* Immersive Viewport Layout */
.app-viewport {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-bg-base);
}

/* Background grid styling like Vercel/Linear */
.grid-lines-overlay {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: center;
  pointer-events: none;
}

/* Glass HUD Top Status Bar */
.hud-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  padding: 0 24px;
  border-bottom: 1px solid var(--border-glass);
  background: rgba(10, 15, 30, 0.6) !important;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  font-weight: 550;
  color: var(--color-text-secondary);
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.status-left, .status-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.system-tag {
  color: var(--color-accent);
  font-weight: 700;
  font-size: 0.75rem;
}

.monospaced {
  font-family: var(--font-display);
  color: var(--color-text-primary);
}

.brand-title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 2px;
  color: var(--color-text-primary);
}

.brand-accent {
  color: var(--color-primary);
}

.divider {
  opacity: 0.3;
}

.green-text {
  color: var(--color-success);
}

.cyan-text {
  color: var(--color-secondary);
}

/* Audio toggle button */
.audio-toggle-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  padding: 3px 10px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.audio-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-primary);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Viewport content area offset for status bar */
.viewport-content {
  flex-grow: 1;
  height: calc(100vh - 50px);
  position: relative;
}

/* Small UI Adjustments for Mobile Bar */
@media (max-width: 768px) {
  .status-left .telemetry-item, .status-right .telemetry-item {
    display: none;
  }
}
</style>
