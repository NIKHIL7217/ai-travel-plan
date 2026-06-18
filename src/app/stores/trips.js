import { defineStore } from "pinia";
import { ref } from "vue";

export const useTripsStore = defineStore("trips", () => {
  const savedTrips = ref([]);

  const loadSavedTrips = () => {
    try {
      const data = localStorage.getItem("roamai_saved_trips");
      if (data) {
        savedTrips.value = JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to parse saved trips from localStorage:", e);
    }
  };

  const saveTrip = (trip) => {
    if (!trip) return;
    
    // Add custom metadata
    const newTripRecord = {
      id: "trip_" + Date.now(),
      savedAt: new Date().toLocaleDateString(),
      ...trip
    };

    savedTrips.value.push(newTripRecord);
    localStorage.setItem("roamai_saved_trips", JSON.stringify(savedTrips.value));
  };

  const deleteTrip = (id) => {
    savedTrips.value = savedTrips.value.filter(t => t.id !== id);
    localStorage.setItem("roamai_saved_trips", JSON.stringify(savedTrips.value));
  };

  // Initialize
  loadSavedTrips();

  return {
    savedTrips,
    saveTrip,
    deleteTrip,
    loadSavedTrips
  };
});
