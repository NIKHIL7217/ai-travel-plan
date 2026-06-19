<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
  roadtrip: {
    type: Object,
    default: null
  }
});

const canvasRef = ref(null);
let frameId = null;

function scheduleDraw() {
  if (frameId) {
    cancelAnimationFrame(frameId);
  }

  frameId = requestAnimationFrame(() => {
    drawMiniMap();
  });
}

function projectPoints(points, width, height, padding = 28) {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;

  return points.map((point) => {
    const x = padding + ((point.lng - minLng) / lngSpan) * (width - padding * 2);
    const y = height - padding - ((point.lat - minLat) / latSpan) * (height - padding * 2);
    return {
      ...point,
      x,
      y
    };
  });
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawMiniMap() {
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }

  const parentWidth = canvas.parentElement?.clientWidth || 640;
  const width = Math.max(260, parentWidth);
  const height = 210;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(1, "#111827");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, width, height);

  const telemetry = props.roadtrip?.mapTelemetry || {};
  const origin = telemetry.originCoords;
  const destination = telemetry.destinationCoords;
  const midpoint = telemetry.midpoint;

  const evStops = Array.isArray(props.roadtrip?.evChargingPoints?.suggestedStops)
    ? props.roadtrip.evChargingPoints.suggestedStops
      .filter((stop) => stop?.lat !== null && stop?.lat !== undefined && stop?.lng !== null && stop?.lng !== undefined)
      .sort((left, right) => Number(left.kmFromStart || 0) - Number(right.kmFromStart || 0))
      .map((stop) => ({
        kind: "ev",
        lat: Number(stop.lat),
        lng: Number(stop.lng),
        label: "EV"
      }))
    : [];

  const routePoints = [];

  if (origin?.lat !== undefined && origin?.lng !== undefined) {
    routePoints.push({ kind: "origin", lat: Number(origin.lat), lng: Number(origin.lng), label: "A" });
  }

  if (midpoint?.lat !== undefined && midpoint?.lng !== undefined) {
    routePoints.push({ kind: "midpoint", lat: Number(midpoint.lat), lng: Number(midpoint.lng), label: "M" });
  }

  routePoints.push(...evStops);

  if (destination?.lat !== undefined && destination?.lng !== undefined) {
    routePoints.push({ kind: "destination", lat: Number(destination.lat), lng: Number(destination.lng), label: "B" });
  }

  if (routePoints.length < 2) {
    ctx.fillStyle = "rgba(226, 232, 240, 0.88)";
    ctx.font = "600 12px Plus Jakarta Sans";
    ctx.textAlign = "center";
    ctx.fillText("Route preview unavailable. Generate roadtrip telemetry.", width / 2, height / 2);
    return;
  }

  const projected = projectPoints(routePoints, width, height);

  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let index = 1; index < projected.length; index += 1) {
    ctx.lineTo(projected[index].x, projected[index].y);
  }
  ctx.strokeStyle = "rgba(6, 182, 212, 0.95)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  projected.forEach((point) => {
    if (point.kind === "origin") {
      ctx.fillStyle = "#22c55e";
    } else if (point.kind === "destination") {
      ctx.fillStyle = "#ef4444";
    } else if (point.kind === "ev") {
      ctx.fillStyle = "#38bdf8";
    } else {
      ctx.fillStyle = "#f59e0b";
    }

    ctx.beginPath();
    ctx.arc(point.x, point.y, point.kind === "ev" ? 4 : 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 10px Plus Jakarta Sans";
    ctx.fillText(point.label, point.x + 8, point.y - 8);
  });

  const summary = String(telemetry.routeSummary || "").trim();
  if (summary) {
    ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
    ctx.font = "600 11px Plus Jakarta Sans";
    ctx.textAlign = "left";
    ctx.fillText(summary.slice(0, 72), 12, 18);
  }
}

function handleResize() {
  scheduleDraw();
}

onMounted(() => {
  scheduleDraw();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  if (frameId) {
    cancelAnimationFrame(frameId);
  }
  window.removeEventListener("resize", handleResize);
});

watch(
  () => props.roadtrip,
  () => {
    scheduleDraw();
  },
  { deep: true }
);
</script>

<template>
  <div class="mini-map-wrap">
    <div class="mini-map-head">
      <span>Active Route Mini Map</span>
      <small>Origin to destination with EV waypoints</small>
    </div>
    <canvas ref="canvasRef" class="mini-map-canvas"></canvas>
  </div>
</template>

<style scoped>
.mini-map-wrap {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.mini-map-head {
  padding: 9px 12px;
  background: #f8fafc;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.mini-map-head span {
  font-size: 0.79rem;
  font-weight: 700;
  color: var(--color-text);
}

.mini-map-head small {
  font-size: 0.69rem;
  color: var(--color-text-muted);
}

.mini-map-canvas {
  display: block;
  width: 100%;
  height: 210px;
}

@media (max-width: 640px) {
  .mini-map-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
