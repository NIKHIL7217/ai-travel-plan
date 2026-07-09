import { defineStore } from "pinia";
import {
  computeMemoryScores,
  createPersonalizationPlan,
  loadProfileMemory,
  deleteNamedPreferenceProfile as deleteNamedPreferenceProfileInStorage,
  recordGeneratedTrip,
  recordSavedTrip,
  saveEditablePreferences as saveEditablePreferencesInStorage,
  saveNamedPreferenceProfile as saveNamedPreferenceProfileInStorage,
  setActivePreferenceProfile as setActivePreferenceProfileInStorage
} from "../modules/profile-memory/index.js";

function safeAverage(values = []) {
  const normalized = values
    .map((value) => Number(value || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (normalized.length === 0) {
    return 0;
  }

  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
}

function toLower(value = "") {
  return String(value || "").trim().toLowerCase();
}

function inferFavoriteDestinationType(memory) {
  const previousTrips = Array.isArray(memory?.previousTrips) ? memory.previousTrips : [];
  const destinationSignals = previousTrips.map((trip) => {
    const source = `${trip.destination || ""} ${trip.sourceQuery || ""}`.toLowerCase();

    if (/(beach|coast|island|sea|goa|maldives|bali|ocean)/i.test(source)) return "Beach";
    if (/(mountain|hill|trek|hiking|alps|manali|leh|snow)/i.test(source)) return "Mountain";
    if (/(city|urban|downtown|tokyo|dubai|paris|london|new york)/i.test(source)) return "City";
    if (/(roadtrip|drive|highway|scenic route|by car)/i.test(source)) return "Roadtrip";
    if (/(heritage|culture|temple|museum|history)/i.test(source)) return "Culture";

    return "Mixed";
  });

  if (destinationSignals.length === 0) {
    return "Mixed";
  }

  const frequency = destinationSignals.reduce((map, item) => {
    map[item] = (map[item] || 0) + 1;
    return map;
  }, {});

  return Object.entries(frequency).sort((left, right) => right[1] - left[1])[0]?.[0] || "Mixed";
}

function inferTravelPersonality(memory, scores) {
  const preferences = memory?.preferences || {};
  const previousTrips = Array.isArray(memory?.previousTrips) ? memory.previousTrips : [];
  const style = toLower(preferences.travelStyle);
  const stay = toLower(preferences.stayPreference);
  const food = toLower(preferences.foodPreference);
  const transport = toLower(preferences.transportPreference);
  const budgetTarget = Number(preferences?.budgetPreference?.target || 0);
  const avgTravelers = safeAverage(previousTrips.map((trip) => trip.travelers));

  const basePersonality = {
    key: "explorer",
    label: "Explorer",
    description: "Prefers discovering diverse places with balanced comfort and flexibility.",
    traits: ["Discovery focused", "Flexible itinerary", "Balanced spend"]
  };

  if (/(luxury|premium)/.test(style) || /(luxury|premium)/.test(stay) || budgetTarget >= 3200) {
    return {
      key: "luxury_traveler",
      label: "Luxury Traveler",
      description: "Optimizes for comfort, premium stays, and elevated trip experiences.",
      traits: ["High-comfort stays", "Experience-first", "Premium budget"]
    };
  }

  if (/(fine|foodie|local)/.test(food) || /(food|restaurant|cafe|culinary)/i.test(previousTrips[0]?.sourceQuery || "")) {
    return {
      key: "foodie",
      label: "Foodie",
      description: "Selects destinations and activities around local cuisine and dining quality.",
      traits: ["Cuisine-led planning", "Local food hunting", "Dining variety"]
    };
  }

  if (/(budget)/.test(style) || /(hostel|budget)/.test(stay) || (budgetTarget > 0 && budgetTarget < 950)) {
    return {
      key: "backpacker",
      label: "Backpacker",
      description: "Keeps costs controlled while maximizing days, movement, and local exposure.",
      traits: ["Cost conscious", "Lean stays", "High flexibility"]
    };
  }

  if (/(car|bike|bus)/.test(transport)) {
    return {
      key: "road_tripper",
      label: "Road Tripper",
      description: "Prefers route-driven travel with scenic stops and on-road intelligence.",
      traits: ["Drive-first", "Route optimization", "Scenic stop preference"]
    };
  }

  if (avgTravelers >= 3.2) {
    return {
      key: "family_planner",
      label: "Family Planner",
      description: "Plans around group comfort, low-friction transitions, and practical pacing.",
      traits: ["Group-aware", "Comfort pacing", "Safety preference"]
    };
  }

  if (/(adventure|trek|hiking)/.test(style)) {
    return {
      key: "explorer",
      label: "Explorer",
      description: "Prefers active, discovery-oriented plans with outdoor experiences.",
      traits: ["Adventure style", "Activity-heavy", "Nature-oriented"]
    };
  }

  if (Number(scores?.overall || 0) < 35) {
    return {
      ...basePersonality,
      description: "Learning your travel patterns. Generate and save more trips for stronger personalization."
    };
  }

  return basePersonality;
}

function createMemoryTimeline(memory) {
  const previousTrips = Array.isArray(memory?.previousTrips) ? memory.previousTrips : [];

  return [...previousTrips]
    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
    .slice(0, 12)
    .map((trip) => ({
      id: trip.id,
      type: trip.saved ? "saved" : "generated",
      destination: trip.destination,
      style: trip.travelStyle,
      budget: Number(trip.budgetTotal || 0),
      travelers: Number(trip.travelers || 1),
      days: Number(trip.days || 1),
      createdAt: Number(trip.createdAt || Date.now()),
      summary: trip.saved
        ? `Saved ${trip.destination} (${trip.days}d, ${trip.travelStyle})`
        : `Generated ${trip.destination} (${trip.days}d, ${trip.travelStyle})`
    }));
}

export const useProfileMemoryStore = defineStore("profileMemory", {
  state: () => ({
    userId: "guest",
    initialized: false,
    memory: null,
    scores: {
      overall: 0,
      confidenceBand: "Low",
      breakdown: {}
    },
    personality: {
      key: "explorer",
      label: "Explorer",
      description: "Learning your travel pattern.",
      traits: []
    },
    timeline: [],
    maxPreferenceProfiles: 5
  }),
  getters: {
    hasSignals: (state) => Number(state?.scores?.overall || 0) > 25,
    budgetTarget: (state) => Number(state?.memory?.preferences?.budgetPreference?.target || 0),
    topDestinations: (state) =>
      (state?.memory?.preferences?.favoriteDestinations || [])
        .slice(0, 5)
        .map((item) => item?.name)
        .filter(Boolean),
    preferredSettings: (state) => ({
      style: state?.memory?.preferences?.travelStyle || "Balanced",
      selectedCountry: state?.memory?.preferences?.selectedCountry || "India",
      transport: state?.memory?.preferences?.transportPreference || "Car",
      food: state?.memory?.preferences?.foodPreference || "mixed",
      stay: state?.memory?.preferences?.stayPreference || "mid-range"
    }),
    preferenceProfiles: (state) => {
      const profiles = Array.isArray(state?.memory?.preferenceProfiles) ? state.memory.preferenceProfiles : [];
      return profiles.map((profile) => {
        const prefs = profile?.preferences || {};
        const budgetTarget = Number(prefs?.budgetPreference?.target || 0);
        return {
          id: profile.id,
          name: profile.name || "Traveler",
          createdAt: Number(profile?.createdAt || 0),
          updatedAt: Number(profile?.updatedAt || 0),
          preferences: prefs,
          summary: [
            prefs.travelStyle || "Balanced",
            prefs.selectedCountry || "India",
            prefs.transportPreference || "Car",
            prefs.foodPreference || "mixed",
            prefs.stayPreference || "mid-range",
            budgetTarget > 0 ? `INR ${budgetTarget}` : "No budget"
          ].join(" | ")
        };
      });
    },
    activePreferenceProfileId: (state) => String(state?.memory?.activePreferenceProfileId || ""),
    activePreferenceProfile: (state) => {
      const profiles = Array.isArray(state?.memory?.preferenceProfiles) ? state.memory.preferenceProfiles : [];
      return profiles.find((profile) => profile.id === state?.memory?.activePreferenceProfileId) || profiles[0] || null;
    },
    canAddPreferenceProfile: (state) => {
      const count = Array.isArray(state?.memory?.preferenceProfiles) ? state.memory.preferenceProfiles.length : 0;
      return count < Number(state.maxPreferenceProfiles || 5);
    },
    historySummary: (state) => {
      const trips = Array.isArray(state?.memory?.previousTrips) ? state.memory.previousTrips : [];
      const totalBudgetSpent = trips.reduce((sum, trip) => sum + Number(trip?.budgetTotal || 0), 0);
      const avgTripCost = trips.length ? Math.round(totalBudgetSpent / trips.length) : 0;
      const avgGroupSize = safeAverage(trips.map((trip) => trip.travelers));

      return {
        totalTrips: trips.length,
        totalBudgetSpent,
        avgTripCost,
        avgGroupSize,
        favoriteDestinationType: inferFavoriteDestinationType(state.memory),
        travelStyleEvolution: [...new Set(trips.map((trip) => trip.travelStyle).filter(Boolean))].slice(0, 5)
      };
    },
    profileNudge: (state) => {
      const favorites = (state?.memory?.preferences?.favoriteDestinations || []).slice(0, 2).map((item) => item.name);
      const style = state?.memory?.preferences?.travelStyle || "Balanced";
      const budget = Number(state?.memory?.preferences?.budgetPreference?.target || 0);

      if (!favorites.length && !budget) {
        return "Generate and save trips to unlock adaptive profile memory nudges.";
      }

      const selectedCountry = state?.memory?.preferences?.selectedCountry || "India";
      return `We noticed you usually prefer ${favorites.join(" and ") || "diverse destinations"}, ${style} style, around INR ${budget || 1500} budget, and pricing context of ${selectedCountry}.`;
    }
  },
  actions: {
    refreshDerived() {
      this.scores = computeMemoryScores(this.memory);
      this.personality = inferTravelPersonality(this.memory, this.scores);
      this.timeline = createMemoryTimeline(this.memory);
    },

    initForUser(userId = "guest") {
      this.userId = String(userId || "guest");
      this.memory = loadProfileMemory(this.userId);
      this.initialized = true;
      this.refreshDerived();
    },

    ensureInitialized(userId = "guest") {
      if (!this.initialized || this.userId !== String(userId || "guest")) {
        this.initForUser(userId);
      }
    },

    createPlannerPersonalization(input) {
      this.ensureInitialized(this.userId || "guest");
      const plan = createPersonalizationPlan({
        input,
        profileMemory: this.memory
      });
      this.scores = plan.memoryScores;
      this.personality = inferTravelPersonality(this.memory, this.scores);
      return plan;
    },

    applyPreferencesPatch(patch = {}) {
      this.ensureInitialized(this.userId || "guest");
      this.memory = saveEditablePreferencesInStorage(this.userId, patch);
      this.refreshDerived();
      return this.memory;
    },

    saveNamedPreferenceProfile(payload = {}) {
      this.ensureInitialized(this.userId || "guest");
      this.memory = saveNamedPreferenceProfileInStorage(this.userId, payload);
      this.refreshDerived();
      return this.memory;
    },

    setActivePreferenceProfile(profileId = "") {
      this.ensureInitialized(this.userId || "guest");
      this.memory = setActivePreferenceProfileInStorage(this.userId, profileId);
      this.refreshDerived();
      return this.memory;
    },

    deleteNamedPreferenceProfile(profileId = "") {
      this.ensureInitialized(this.userId || "guest");
      this.memory = deleteNamedPreferenceProfileInStorage(this.userId, profileId);
      this.refreshDerived();
      return this.memory;
    },

    trackGeneratedTrip(trip = {}) {
      this.ensureInitialized(this.userId || "guest");
      this.memory = recordGeneratedTrip(this.userId, trip);
      this.refreshDerived();
      return this.memory;
    },

    trackSavedTrip(trip = {}) {
      this.ensureInitialized(this.userId || "guest");
      this.memory = recordSavedTrip(this.userId, trip);
      this.refreshDerived();
      return this.memory;
    }
  }
});
