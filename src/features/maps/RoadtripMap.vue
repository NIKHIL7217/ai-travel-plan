<script setup>
import { ref, onMounted, watch, onUnmounted } from "vue";
import { usePlannerStore } from "../../app/stores/planner";
import Icons from "../../shared/icons/Icons.vue";

const plannerStore = usePlannerStore();

// Toggles for MAP HUDS
const showTraffic = ref(true);
const showWeather = ref(false);
const showChargers = ref(true);
const isFullscreen = ref(false);

const canvasRef = ref(null);
let animationFrameId = null;
let pulseProgress = 0;

// Draw route function
const drawMap = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width = canvas.parentElement.clientWidth;
  const height = canvas.height = canvas.parentElement.clientHeight || 360;

  // Clear canvas with dark grid-space fill
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, width, height);

  // Draw grid helper lines inside map
  ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
  ctx.lineWidth = 1;
  const gridSize = 30;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const trip = plannerStore.activeTrip;
  if (!trip || !trip.route || !trip.route.points || trip.route.points.length === 0) {
    // Render blank scanning radar
    ctx.strokeStyle = "rgba(37, 99, 235, 0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.35, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = "rgba(6, 182, 212, 0.6)";
    ctx.font = "12px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText("GPS ACQUISITION OFFLINE", width / 2, height / 2 + 5);
    return;
  }

  const points = trip.route.points;
  
  // Projection scaling helper (fit coordinates inside canvas margins)
  const margin = 50;
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;

  const project = (lat, lng) => {
    // Invert lat because Canvas Y goes down
    const x = margin + ((lng - minLng) / lngSpan) * (width - 2 * margin);
    const y = height - margin - ((lat - minLat) / latSpan) * (height - 2 * margin);
    return { x, y };
  };

  // Draw roads connecting points
  ctx.beginPath();
  const startProj = project(points[0].lat, points[0].lng);
  ctx.moveTo(startProj.x, startProj.y);
  
  const projectedPoints = points.map(p => project(p.lat, p.lng));

  for (let i = 1; i < projectedPoints.length; i++) {
    ctx.lineTo(projectedPoints[i].x, projectedPoints[i].y);
  }

  // Base road color
  ctx.strokeStyle = "rgba(37, 99, 235, 0.2)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Traffic Overlay
  if (showTraffic.value) {
    for (let i = 0; i < projectedPoints.length - 1; i++) {
      const p1 = projectedPoints[i];
      const p2 = projectedPoints[i+1];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      
      // Seed a pseudo-random traffic index
      const seed = (i * 31 + Math.round(minLat)) % 10;
      if (seed > 7) {
        ctx.strokeStyle = "#EF4444"; // Jammed
      } else if (seed > 5) {
        ctx.strokeStyle = "#F59E0B"; // Moderate
      } else {
        ctx.strokeStyle = "#10B981"; // Clear
      }
      ctx.stroke();
    }
  } else {
    // Normal HUD cyan line
    ctx.beginPath();
    ctx.moveTo(startProj.x, startProj.y);
    for (let i = 1; i < projectedPoints.length; i++) {
      ctx.lineTo(projectedPoints[i].x, projectedPoints[i].y);
    }
    ctx.strokeStyle = "var(--color-secondary)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // Draw stops & chargers nodes
  trip.stops.forEach((stop, idx) => {
    // Match stop to projected segment roughly
    const index = Math.min(idx + 1, projectedPoints.length - 1);
    const p = projectedPoints[index];
    
    // Circle Node
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "var(--color-accent)";
    ctx.fill();
    ctx.strokeStyle = "#06080e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw EV Charger indicator if toggled
    if (showChargers.value && stop.amenities.includes("EV Supercharger")) {
      ctx.fillStyle = "#10B981";
      ctx.beginPath();
      ctx.arc(p.x, p.y + 12, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Stop Label
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px Plus Jakarta Sans";
    ctx.fillText(stop.name, p.x + 10, p.y + 3);
  });

  // Weather overlay rendering
  if (showWeather.value) {
    projectedPoints.forEach((p, idx) => {
      if (idx % 2 === 1) {
        ctx.fillStyle = "rgba(6, 182, 212, 0.2)";
        ctx.beginPath();
        ctx.arc(p.x, p.y - 15, 8, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "9px Courier";
        ctx.fillText("🌧", p.x - 4, p.y - 12);
      }
    });
  }

  // Draw start/end nodes
  const start = projectedPoints[0];
  const end = projectedPoints[projectedPoints.length - 1];

  // Origin Marker
  ctx.beginPath();
  ctx.arc(start.x, start.y, 9, 0, 2 * Math.PI);
  ctx.fillStyle = "var(--color-primary)";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "9px Space Grotesk";
  ctx.fillText("A", start.x - 3, start.y + 3);

  // Destination Marker
  ctx.beginPath();
  ctx.arc(end.x, end.y, 9, 0, 2 * Math.PI);
  ctx.fillStyle = "#EF4444";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "9px Space Grotesk";
  ctx.fillText("B", end.x - 3, end.y + 3);

  // Animate GPS telemetry pulse tracker along route
  pulseProgress += 0.003;
  if (pulseProgress > 1) pulseProgress = 0;

  // Calculate coordinates of pulsing dot
  const totalSegments = projectedPoints.length - 1;
  const currentSegmentFloat = pulseProgress * totalSegments;
  const currentSegIdx = Math.floor(currentSegmentFloat);
  const segProgress = currentSegmentFloat - currentSegIdx;

  if (currentSegIdx < totalSegments) {
    const p1 = projectedPoints[currentSegIdx];
    const p2 = projectedPoints[currentSegIdx + 1];
    const dotX = p1.x + (p2.x - p1.x) * segProgress;
    const dotY = p1.y + (p2.y - p1.y) * segProgress;

    // Outer glow pulse ring
    ctx.beginPath();
    ctx.arc(dotX, dotY, 14, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(6, 182, 212, 0.18)";
    ctx.fill();

    // Inner bright core
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#00FFFF";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
};

// Loop redraws for pulse animation
const animate = () => {
  drawMap();
  animationFrameId = requestAnimationFrame(animate);
};

const handleResize = () => {
  drawMap();
};

onMounted(() => {
  animate();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  window.removeEventListener("resize", handleResize);
});

// Watch store for plan generation updates
watch(() => plannerStore.activeTrip, () => {
  drawMap();
}, { deep: true });
</script>

<template>
  <div :class="['map-hud-container', isFullscreen ? 'hud-fullscreen' : '']">
    <!-- Overlay HUD Toggles -->
    <div class="map-overlay-huds">
      <button 
        type="button" 
        :class="['hud-toggle', showTraffic ? 'active' : '']" 
        @click="showTraffic = !showTraffic"
        title="Toggle Traffic Density"
      >
        <Icons name="map" /> Traffic
      </button>
      <button 
        type="button" 
        :class="['hud-toggle', showWeather ? 'active' : '']" 
        @click="showWeather = !showWeather"
        title="Toggle Weather Overlays"
      >
        <Icons name="sun" /> Weather
      </button>
      <button 
        type="button" 
        :class="['hud-toggle', showChargers ? 'active' : '']" 
        @click="showChargers = !showChargers"
        title="Toggle EV Station Nodes"
      >
        <Icons name="fuel" /> EV Grid
      </button>
      <button 
        type="button" 
        class="hud-toggle toggle-fullscreen-btn" 
        @click="isFullscreen = !isFullscreen"
        title="Toggle Fullscreen Map Mode"
      >
        🛰 HUD
      </button>
    </div>

    <!-- Map Canvas Element -->
    <div class="canvas-wrapper">
      <canvas ref="canvasRef" class="map-hud-canvas"></canvas>
    </div>

    <!-- Telemetry Readout Panel Overlay -->
    <div v-if="plannerStore.activeTrip" class="hud-telemetry-readout glass-panel">
      <div class="telemetry-grid">
        <div class="tel-col">
          <span class="tel-lbl">ROUTE SPEED</span>
          <span class="tel-val monospaced">78 km/h</span>
        </div>
        <div class="tel-col">
          <span class="tel-lbl">EST. DISTANCE</span>
          <span class="tel-val monospaced">{{ plannerStore.activeTrip.route.distanceKm }} km</span>
        </div>
        <div class="tel-col">
          <span class="tel-lbl">DRIVE SECONDS</span>
          <span class="tel-val monospaced">{{ plannerStore.activeTrip.route.driveTimeHours }} hr</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-hud-container {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-glass);
  background-color: #090d16;
  min-height: 320px;
  display: flex;
  flex-direction: column;
}

.hud-fullscreen {
  position: fixed;
  inset: 50px 0 0 0;
  z-index: 900;
  height: calc(100vh - 50px) !important;
  border-radius: 0;
  border: none;
}

.canvas-wrapper {
  position: relative;
  width: 100%;
  flex-grow: 1;
}

.map-hud-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* HUD Overlay Controls */
.map-overlay-huds {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  z-index: 10;
}

.hud-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  background: rgba(10, 15, 30, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.hud-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-primary);
}

.hud-toggle.active {
  background: rgba(37, 99, 235, 0.25);
  border-color: var(--color-primary);
  color: #FFFFFF;
  box-shadow: 0 0 10px rgba(37, 99, 235, 0.2);
}

.toggle-fullscreen-btn {
  margin-left: auto;
}

/* Telemetry Stats Overlay */
.hud-telemetry-readout {
  position: absolute;
  bottom: 14px;
  left: 14px;
  right: 14px;
  padding: 12px 16px !important;
  background: rgba(10, 15, 30, 0.75) !important;
  border-color: rgba(255,255,255,0.06);
}

.telemetry-grid {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tel-col {
  display: flex;
  flex-direction: column;
}

.tel-lbl {
  font-size: 0.62rem;
  color: var(--color-text-muted);
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}

.tel-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
}
</style>
