<script setup>
import { useBudgetStore } from "../../app/stores/budget";
import { usePlannerStore } from "../../app/stores/planner";

const budgetStore = useBudgetStore();
const plannerStore = usePlannerStore();
</script>

<template>
  <div v-if="plannerStore.activeTrip" class="budget-forecaster-container animate-fade-in">
    <div class="forecaster-header">
      <h3>Budget Analytics</h3>
      <select v-model="budgetStore.selectedCurrency" class="currency-selector">
        <option 
          v-for="(cur, code) in budgetStore.currencies" 
          :key="code" 
          :value="code"
        >
          {{ cur.label }}
        </option>
      </select>
    </div>

    <!-- Massive Glowing Budget Readout -->
    <div class="total-forecast-display glass-panel">
      <span class="forecast-lbl">FORECAST TOTAL</span>
      <h2 class="forecast-val monospaced">{{ budgetStore.convertAndFormat(budgetStore.totalBudget) }}</h2>
      <div class="split-info">
        <span>{{ budgetStore.days }} Days</span>
        <span>•</span>
        <span>{{ budgetStore.travelers }} Travelers</span>
      </div>
    </div>

    <!-- Sliders and Inputs -->
    <div class="sliders-list">
      
      <!-- Lodging Nightly Rate -->
      <div class="slider-group">
        <div class="slider-info">
          <span class="slider-lbl">🏨 Lodging / Night</span>
          <span class="slider-val monospaced">
            {{ budgetStore.convertAndFormat(budgetStore.hotelRate) }}
          </span>
        </div>
        <input 
          v-model.number="budgetStore.hotelRate" 
          type="range" 
          min="10" 
          max="500" 
          step="5" 
          class="neon-range"
        />
        <span class="sub-calc">
          Subtotal ({{ budgetStore.days - 1 }} Nights): 
          <span class="monospaced">{{ budgetStore.convertAndFormat(budgetStore.totalHotel) }}</span>
        </span>
      </div>

      <!-- Food Daily Rate -->
      <div class="slider-group">
        <div class="slider-info">
          <span class="slider-lbl">🍔 Food / Person / Day</span>
          <span class="slider-val monospaced">
            {{ budgetStore.convertAndFormat(budgetStore.foodRate) }}
          </span>
        </div>
        <input 
          v-model.number="budgetStore.foodRate" 
          type="range" 
          min="5" 
          max="150" 
          step="2" 
          class="neon-range"
        />
        <span class="sub-calc">
          Subtotal ({{ budgetStore.days }} Days): 
          <span class="monospaced">{{ budgetStore.convertAndFormat(budgetStore.totalFood) }}</span>
        </span>
      </div>

      <!-- Fuel / KM Rate -->
      <div class="slider-group">
        <div class="slider-info">
          <span class="slider-lbl">⚡ EV/Fuel Cost / KM</span>
          <span class="slider-val monospaced">
            {{ budgetStore.activeCurrency.symbol }}{{ (budgetStore.fuelRate * budgetStore.activeCurrency.rate).toFixed(2) }}
          </span>
        </div>
        <input 
          v-model.number="budgetStore.fuelRate" 
          type="range" 
          min="0.05" 
          max="0.60" 
          step="0.01" 
          class="neon-range"
        />
        <span class="sub-calc">
          Subtotal ({{ plannerStore.activeTrip.route.distanceKm }} KM): 
          <span class="monospaced">{{ budgetStore.convertAndFormat(budgetStore.totalFuel) }}</span>
        </span>
      </div>

      <!-- Flat Activities Limit -->
      <div class="slider-group">
        <div class="slider-info">
          <span class="slider-lbl">🎟️ Sights & Activities</span>
          <span class="slider-val monospaced">
            {{ budgetStore.convertAndFormat(budgetStore.activitiesTotal) }}
          </span>
        </div>
        <input 
          v-model.number="budgetStore.activitiesTotal" 
          type="range" 
          min="0" 
          max="1000" 
          step="10" 
          class="neon-range"
        />
      </div>

      <!-- Tolls -->
      <div class="slider-group">
        <div class="slider-info">
          <span class="slider-lbl">🛣️ Highway Toll Cost</span>
          <span class="slider-val monospaced">
            {{ budgetStore.convertAndFormat(budgetStore.tollCost) }}
          </span>
        </div>
        <input 
          v-model.number="budgetStore.tollCost" 
          type="range" 
          min="0" 
          max="200" 
          step="5" 
          class="neon-range"
        />
      </div>

    </div>
  </div>
</template>

<style scoped>
.budget-forecaster-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.forecaster-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1.5px solid var(--border-glass);
  padding-bottom: 12px;
}

.forecaster-header h3 {
  font-family: var(--font-display);
  font-size: 1rem;
}

.currency-selector {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-secondary);
  outline: none;
  cursor: pointer;
  font-family: var(--font-display);
}

.currency-selector option {
  background-color: var(--color-bg-base);
  color: white;
}

/* Big Display */
.total-forecast-display {
  text-align: center;
  padding: 16px !important;
  background: rgba(37, 99, 235, 0.05) !important;
  border-color: rgba(37, 99, 235, 0.12);
}

.forecast-lbl {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}

.forecast-val {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #FFF 0%, var(--color-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 6px 0;
  text-shadow: 0 0 20px rgba(6, 182, 212, 0.2);
}

.split-info {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  display: flex;
  justify-content: center;
  gap: 6px;
}

/* Sliders List */
.sliders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-lbl {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.slider-val {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-secondary);
}

/* Futuristic Neon Range Slider */
.neon-range {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  outline: none;
  border: none;
}

.neon-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: var(--radius-full);
  background: var(--color-secondary);
  border: 2.5px solid #06080e;
  box-shadow: 0 0 10px var(--color-secondary);
  cursor: pointer;
  transition: transform 0.1s;
}

.neon-range::-webkit-slider-thumb:hover {
  transform: scale(1.25);
}

.sub-calc {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-align: right;
}
</style>
