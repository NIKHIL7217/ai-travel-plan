<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const props = defineProps({
  points: {
    type: Array,
    default: () => []
  },
  showRoute: {
    type: Boolean,
    default: true
  },
  height: {
    type: String,
    default: "360px"
  },
  interactive: {
    type: Boolean,
    default: true
  }
});

const mapEl = ref(null);
let map = null;
let layerGroup = null;

function markerColor(type) {
  switch (String(type || "").toLowerCase()) {
    case "start":
      return "#16a34a";
    case "end":
      return "#dc2626";
    case "hotel":
      return "#7c3aed";
    case "food":
      return "#ea580c";
    case "attraction":
      return "#2563eb";
    default:
      return "#2563eb";
  }
}

function buildIcon(index, type) {
  const color = markerColor(type);
  const label = type === "start" ? "A" : type === "end" ? "B" : String(index + 1);
  return L.divIcon({
    className: "trip-map-pin",
    html: `<span class="trip-map-pin__dot" style="background:${color}">${label}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function validPoints() {
  return props.points
    .map((point) => ({
      lat: Number(point.lat),
      lng: Number(point.lng),
      label: String(point.label || point.name || "Stop"),
      sublabel: String(point.sublabel || ""),
      type: point.type || "stop"
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function render() {
  if (!map || !layerGroup) {
    return;
  }

  layerGroup.clearLayers();
  const points = validPoints();

  if (!points.length) {
    map.setView([20.5937, 78.9629], 4);
    return;
  }

  const latLngs = points.map((point) => [point.lat, point.lng]);

  if (props.showRoute && points.length > 1) {
    L.polyline(latLngs, {
      color: "#2563eb",
      weight: 4,
      opacity: 0.7,
      dashArray: "1 8",
      lineCap: "round"
    }).addTo(layerGroup);
  }

  points.forEach((point, index) => {
    const marker = L.marker([point.lat, point.lng], {
      icon: buildIcon(index, point.type)
    }).addTo(layerGroup);

    const popup = point.sublabel
      ? `<strong>${point.label}</strong><br><span>${point.sublabel}</span>`
      : `<strong>${point.label}</strong>`;
    marker.bindPopup(popup);
  });

  if (points.length === 1) {
    map.setView(latLngs[0], 12);
  } else {
    map.fitBounds(L.latLngBounds(latLngs).pad(0.2));
  }
}

onMounted(() => {
  if (!mapEl.value) {
    return;
  }

  map = L.map(mapEl.value, {
    zoomControl: props.interactive,
    dragging: props.interactive,
    scrollWheelZoom: props.interactive,
    doubleClickZoom: props.interactive,
    attributionControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  layerGroup = L.layerGroup().addTo(map);
  render();

  // Leaflet needs a size recalc when mounted inside flex/grid containers.
  setTimeout(() => map && map.invalidateSize(), 150);
});

watch(
  () => props.points,
  () => render(),
  { deep: true }
);

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
    layerGroup = null;
  }
});
</script>

<template>
  <div class="trip-map-shell" :style="{ height }">
    <div ref="mapEl" class="trip-map-canvas"></div>
    <p v-if="!points.length" class="trip-map-empty">Add a destination or route to see it on the live map.</p>
  </div>
</template>

<style scoped>
.trip-map-shell {
  position: relative;
  width: 100%;
  border-radius: var(--radius-md, 14px);
  overflow: hidden;
  border: 1px solid var(--color-border, rgba(15, 23, 42, 0.1));
  background: #e7eef6;
}

.trip-map-canvas {
  width: 100%;
  height: 100%;
}

.trip-map-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px;
  font-size: 0.85rem;
  color: var(--color-text-secondary, #475569);
  pointer-events: none;
}

:deep(.trip-map-pin__dot) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  border: 2px solid #ffffff;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.35);
}

:deep(.leaflet-container) {
  font-family: inherit;
}
</style>
