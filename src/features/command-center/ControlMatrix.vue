<script setup>
import GlassPanel from "../../shared/ui/GlassPanel.vue";

const props = defineProps({
  controls: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(["update:controls", "save-preferences"]);

function patch(field, value) {
  emit("update:controls", {
    ...props.controls,
    [field]: value
  });
}

function patchNumber(field, value, fallback) {
  const parsed = Number(value);
  patch(field, Number.isFinite(parsed) ? parsed : fallback);
}
</script>

<template>
  <GlassPanel class="controls-card">
    <div class="card-head">
      <h3>Control Matrix</h3>
      <button type="button" class="btn btn-outline btn-sm" @click="$emit('save-preferences')">Save Prefs</button>
    </div>

    <div class="grid">
      <label class="cell">
        <span>Origin</span>
        <input
          class="form-input"
          :value="controls.origin"
          placeholder="e.g., New Delhi"
          @input="patch('origin', $event.target.value)"
        />
      </label>

      <label class="cell">
        <span>Destination</span>
        <input
          class="form-input"
          :value="controls.destination"
          placeholder="e.g., Bali"
          @input="patch('destination', $event.target.value)"
        />
      </label>

      <label class="cell">
        <span>Style</span>
        <select class="form-select" :value="controls.style" @change="patch('style', $event.target.value)">
          <option value="Balanced">Balanced</option>
          <option value="Budget">Budget</option>
          <option value="Comfort">Comfort</option>
          <option value="Luxury">Luxury</option>
          <option value="Adventure">Adventure</option>
        </select>
      </label>

      <label class="cell">
        <span>Transport</span>
        <select class="form-select" :value="controls.travelMode" @change="patch('travelMode', $event.target.value)">
          <option value="Flight">Flight</option>
          <option value="Train">Train</option>
          <option value="Bus">Bus</option>
          <option value="Car">Car</option>
          <option value="Bike">Bike</option>
        </select>
      </label>

      <label class="cell">
        <span>Budget (USD)</span>
        <input
          class="form-input"
          type="number"
          min="200"
          max="5000"
          step="50"
          :value="controls.maxBudget"
          @input="patchNumber('maxBudget', $event.target.value, controls.maxBudget)"
        />
      </label>

      <label class="cell">
        <span>Days</span>
        <input class="form-input" type="number" min="2" max="15" :value="controls.days" @input="patchNumber('days', $event.target.value, controls.days)" />
      </label>

      <label class="cell">
        <span>Travelers</span>
        <input class="form-input" type="number" min="1" max="8" :value="controls.travelers" @input="patchNumber('travelers', $event.target.value, controls.travelers)" />
      </label>

      <label class="cell">
        <span>Stay</span>
        <select class="form-select" :value="controls.stayPreference" @change="patch('stayPreference', $event.target.value)">
          <option value="hostel">Hostel</option>
          <option value="budget">Budget</option>
          <option value="mid-range">Mid-range</option>
          <option value="premium">Premium</option>
          <option value="luxury">Luxury</option>
        </select>
      </label>

      <label class="cell">
        <span>Food</span>
        <select class="form-select" :value="controls.foodPreference" @change="patch('foodPreference', $event.target.value)">
          <option value="street">Street</option>
          <option value="local">Local</option>
          <option value="mixed">Mixed</option>
          <option value="fine-dining">Fine Dining</option>
        </select>
      </label>
    </div>
  </GlassPanel>
</template>

<style scoped>
.controls-card {
  background: #ffffff !important;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.77rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.btn-sm {
  padding: 8px 12px;
  font-size: 0.8rem;
}

@media (max-width: 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
