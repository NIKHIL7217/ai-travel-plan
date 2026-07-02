<script setup>
import { ref, watch } from "vue";
import { geocodePlace } from "../../services/gemini";
import { fetchWeather } from "../../services/weather";
import { userLocation } from "../../services/location";

const props = defineProps({
  destination: { type: String, default: "" }
});

const loading = ref(false);
const error = ref("");
const place = ref("");
const report = ref(null);

async function loadWeather() {
  const query = String(props.destination || "").trim();
  loading.value = true;
  error.value = "";
  try {
    let coords = null;
    if (query) {
      const geo = await geocodePlace(query).catch(() => null);
      if (geo) {
        coords = { lat: geo.lat, lng: geo.lng };
        place.value = geo.formattedName || query;
      }
    }
    if (!coords) {
      coords = { lat: userLocation.value.lat || 28.6139, lng: userLocation.value.lng || 77.209 };
      place.value = query || userLocation.value.city || "Your location";
    }
    report.value = await fetchWeather(coords.lat, coords.lng);
    if (!report.value) {
      error.value = "Weather data abhi available nahi hai.";
    }
  } catch (_error) {
    error.value = "Weather load nahi ho paya.";
  } finally {
    loading.value = false;
  }
}

function iconFor(general = "") {
  const text = String(general).toLowerCase();
  if (text.includes("sun") || text.includes("clear")) return "☀️";
  if (text.includes("cloud")) return "⛅";
  if (text.includes("rain") || text.includes("shower") || text.includes("drizzle")) return "🌧️";
  if (text.includes("thunder")) return "⛈️";
  if (text.includes("snow")) return "❄️";
  if (text.includes("fog")) return "🌫️";
  return "🌤️";
}

watch(() => props.destination, loadWeather, { immediate: true });
</script>

<template>
  <div class="wx-panel">
    <div class="wx-head">
      <h2>Weather</h2>
      <p>{{ place || "Destination" }}</p>
    </div>

    <div v-if="loading" class="wx-empty">Loading weather…</div>
    <div v-else-if="error" class="wx-empty">{{ error }}</div>

    <template v-else-if="report">
      <div class="wx-current">
        <div class="wx-temp">{{ report.temp }}</div>
        <div class="wx-meta">
          <span>💧 Humidity {{ report.humidity }}</span>
          <span>🌬️ Wind {{ report.windSpeed }}</span>
          <span>🌧️ Rain {{ report.rainProbability }}</span>
        </div>
      </div>

      <div v-if="report.weatherForecast?.length" class="wx-forecast">
        <div v-for="(day, index) in report.weatherForecast" :key="index" class="wx-day">
          <span class="wx-day-name">{{ day.day }}</span>
          <span class="wx-day-icon">{{ iconFor(day.general) }}</span>
          <span class="wx-day-general">{{ day.general }}</span>
          <span class="wx-day-temp">{{ day.temp }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.wx-panel {
  padding: 20px;
}
.wx-head h2 {
  font-size: 1.3rem;
  margin: 0;
  color: #0f172a;
}
.wx-head p {
  color: #64748b;
  margin: 2px 0 16px;
}
.wx-empty {
  padding: 24px;
  color: #64748b;
}
.wx-current {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, #eef2ff, #e0f2fe);
  margin-bottom: 18px;
}
.wx-temp {
  font-size: 2.6rem;
  font-weight: 800;
  color: #0f172a;
}
.wx-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.86rem;
  color: #334155;
}
.wx-forecast {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.wx-day {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}
.wx-day-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: #1e293b;
}
.wx-day-icon {
  font-size: 1.4rem;
}
.wx-day-general {
  font-size: 0.78rem;
  color: #64748b;
}
.wx-day-temp {
  font-size: 0.82rem;
  font-weight: 600;
  color: #0f172a;
}
</style>
