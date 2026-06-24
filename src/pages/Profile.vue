<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatPrice } from "../services/currency";
import { getSavedTripsFromDb } from "../services/firebase";
import { useAuthStore } from "../stores/auth";
import { useProfileMemoryStore } from "../stores/profileMemory";
import { useVaultStore } from "../stores/vault";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const profileMemoryStore = useProfileMemoryStore();
const vaultStore = useVaultStore();

const loading = ref(true);
const trips = ref([]);
const loadError = ref("");

const selectedSection = computed(() => String(route.query.section || "overview").trim().toLowerCase());
const history = computed(() => profileMemoryStore.historySummary);
const personality = computed(() => profileMemoryStore.personality);
const preferences = computed(() => profileMemoryStore.memory?.preferences || {});
const timeline = computed(() => profileMemoryStore.timeline || []);
const preferenceProfiles = computed(() => profileMemoryStore.preferenceProfiles || []);
const activePreferenceProfileId = computed(() => profileMemoryStore.activePreferenceProfileId || "");
const maxPreferenceProfiles = computed(() => Number(profileMemoryStore.maxPreferenceProfiles || 5));

const profileEditorOpen = ref(false);
const profileEditorMode = ref("create");
const profileEditorError = ref("");
const profileActionMessage = ref("");
const profileActionError = ref("");
const editingProfileId = ref("");
const profileDraft = ref({
  name: "",
  style: "Balanced",
  travelMode: "Car",
  foodPreference: "mixed",
  stayPreference: "mid-range",
  budgetTarget: 1500,
  favoriteDestination: ""
});

const uniqueDestinations = computed(() => {
  const names = trips.value
    .map((trip) => String(trip?.destination || "").trim())
    .filter(Boolean);

  return [...new Set(names)];
});

const countriesVisited = computed(() => {
  const countries = uniqueDestinations.value
    .map((destination) => {
      const parts = destination.split(",").map((part) => part.trim()).filter(Boolean);
      return parts.length > 1 ? parts[parts.length - 1] : "";
    })
    .filter(Boolean);

  return [...new Set(countries)];
});

const citiesVisited = computed(() => {
  const cities = uniqueDestinations.value
    .map((destination) => destination.split(",")[0]?.trim() || "")
    .filter(Boolean);

  return [...new Set(cities)];
});

const averageTripCost = computed(() => {
  const totalTrips = Number(history.value?.totalTrips || 0);
  if (!totalTrips) {
    return 0;
  }

  return Math.round(Number(history.value?.totalBudgetSpent || 0) / totalTrips);
});

const travelStyleCounts = computed(() => {
  const counts = {};
  for (const trip of trips.value) {
    const style = String(trip?.style || "Balanced").trim() || "Balanced";
    counts[style] = (counts[style] || 0) + 1;
  }

  return counts;
});

const favoriteStyle = computed(() => {
  const pairs = Object.entries(travelStyleCounts.value);
  if (!pairs.length) {
    return preferences.value.travelStyle || "Balanced";
  }

  return pairs.sort((left, right) => Number(right[1]) - Number(left[1]))[0]?.[0] || "Balanced";
});

const budgetPattern = computed(() => {
  const values = trips.value
    .map((trip) => Number(trip?.budget?.total || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!values.length) {
    return {
      label: "Getting Started",
      detail: "Save a few trips to unlock your spending pattern.",
      min: 0,
      max: 0,
      avg: 0
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

  let label = "Balanced Curator";
  let detail = "You optimize cost and comfort with steady spending.";

  if (avg < 1200) {
    label = "Lean Explorer";
    detail = "You maximize travel frequency with efficient budgets.";
  } else if (avg > 2800) {
    label = "Premium Voyager";
    detail = "You prefer high-comfort travel experiences.";
  }

  return {
    label,
    detail,
    min,
    max,
    avg
  };
});

const travelMapPins = computed(() => {
  const list = uniqueDestinations.value.slice(0, 14);
  return list.map((destination, index) => {
    const seed = destination.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const top = 10 + ((seed + index * 17) % 72);
    const left = 8 + ((seed + index * 23) % 82);

    return {
      id: `${destination}-${index}`,
      label: destination.split(",")[0] || destination,
      style: {
        top: `${top}%`,
        left: `${left}%`
      }
    };
  });
});

const achievements = computed(() => {
  const rows = [];
  const totalTrips = Number(history.value?.totalTrips || 0);
  const avgGroupSize = Number(history.value?.avgGroupSize || 0);
  const score = Number(profileMemoryStore.scores?.overall || 0);

  if (totalTrips >= 1) rows.push({ id: "first", title: "First Journey", detail: "You started your travel memory timeline." });
  if (totalTrips >= 5) rows.push({ id: "streak", title: "Explorer Streak", detail: "You completed 5 or more saved trips." });
  if (totalTrips >= 10) rows.push({ id: "collector", title: "Memory Collector", detail: "Your travel story is now rich and diverse." });
  if (avgGroupSize >= 3) rows.push({ id: "group", title: "Group Navigator", detail: "You often plan for larger travel groups." });
  if (score >= 65) rows.push({ id: "profile", title: "High Confidence Profile", detail: "Personalization confidence is now advanced." });

  if (!rows.length) {
    rows.push({ id: "starter", title: "Ready To Wrap", detail: "Save more trips to unlock profile milestones." });
  }

  return rows;
});

const vaultDocs = computed(() => vaultStore.documents || []);

const wrappedHeroImage = computed(() => {
  const focus = String(uniqueDestinations.value[0] || "travel adventure").trim() || "travel adventure";
  return `https://source.unsplash.com/1600x900/?${encodeURIComponent(`${focus} cinematic travel`)}`;
});

function formatDate(timestamp) {
  return new Date(Number(timestamp || Date.now())).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function openSection(sectionId) {
  router.replace({
    path: "/profile",
    query: {
      ...route.query,
      section: sectionId
    }
  });
}

function defaultProfileDraft() {
  return {
    name: "",
    style: "Balanced",
    travelMode: "Car",
    foodPreference: "mixed",
    stayPreference: "mid-range",
    budgetTarget: 1500,
    favoriteDestination: ""
  };
}

function openPreferenceEditor(mode = "create", profile = null) {
  profileEditorError.value = "";
  profileActionMessage.value = "";
  profileActionError.value = "";
  profileEditorMode.value = mode;

  if (mode === "edit" && profile) {
    const prefs = profile.preferences || {};
    const destination = Array.isArray(prefs.favoriteDestinations)
      ? prefs.favoriteDestinations
        .map((item) => (typeof item === "string" ? item : item?.name))
        .find(Boolean) || ""
      : "";

    editingProfileId.value = profile.id;
    profileDraft.value = {
      name: profile.name || "",
      style: prefs.travelStyle || "Balanced",
      travelMode: prefs.transportPreference || "Car",
      foodPreference: prefs.foodPreference || "mixed",
      stayPreference: prefs.stayPreference || "mid-range",
      budgetTarget: Number(prefs?.budgetPreference?.target || 1500),
      favoriteDestination: destination
    };
  } else {
    const activePrefs = profileMemoryStore.activePreferenceProfile?.preferences || {};
    const defaultDestination = Array.isArray(activePrefs.favoriteDestinations)
      ? activePrefs.favoriteDestinations
        .map((item) => (typeof item === "string" ? item : item?.name))
        .find(Boolean) || ""
      : "";

    editingProfileId.value = "";
    profileDraft.value = {
      ...defaultProfileDraft(),
      style: activePrefs.travelStyle || "Balanced",
      travelMode: activePrefs.transportPreference || "Car",
      foodPreference: activePrefs.foodPreference || "mixed",
      stayPreference: activePrefs.stayPreference || "mid-range",
      budgetTarget: Number(activePrefs?.budgetPreference?.target || 1500),
      favoriteDestination: defaultDestination
    };
  }

  profileEditorOpen.value = true;
}

function closePreferenceEditor() {
  profileEditorOpen.value = false;
  profileEditorError.value = "";
  editingProfileId.value = "";
}

function showProfileActionMessage(message) {
  profileActionError.value = "";
  profileActionMessage.value = String(message || "").trim();
  if (!profileActionMessage.value) {
    return;
  }

  setTimeout(() => {
    profileActionMessage.value = "";
  }, 2200);
}

function showProfileActionError(message) {
  profileActionMessage.value = "";
  profileActionError.value = String(message || "").trim();
  if (!profileActionError.value) {
    return;
  }

  setTimeout(() => {
    profileActionError.value = "";
  }, 2600);
}

function savePreferenceProfile() {
  const name = String(profileDraft.value.name || "").trim();
  if (!name) {
    profileEditorError.value = "Profile name is required.";
    return;
  }

  if (
    profileEditorMode.value === "create" &&
    preferenceProfiles.value.length >= maxPreferenceProfiles.value
  ) {
    profileEditorError.value = `Only ${maxPreferenceProfiles.value} profiles can be saved.`;
    return;
  }

  const budgetTarget = Math.max(100, Math.round(Number(profileDraft.value.budgetTarget || 1500)));
  const favoriteDestination = String(profileDraft.value.favoriteDestination || "").trim();

  profileMemoryStore.saveNamedPreferenceProfile({
    id: profileEditorMode.value === "edit" ? editingProfileId.value : undefined,
    name,
    preferences: {
      travelStyle: profileDraft.value.style,
      transportPreference: profileDraft.value.travelMode,
      foodPreference: profileDraft.value.foodPreference,
      stayPreference: profileDraft.value.stayPreference,
      budgetPreference: {
        target: budgetTarget,
        min: Math.max(50, Math.round(budgetTarget * 0.35)),
        max: Math.max(200, Math.round(budgetTarget * 1.85))
      },
      favoriteDestinations: favoriteDestination ? [favoriteDestination] : []
    },
    setActive: true
  });

  showProfileActionMessage(`${name} profile saved and activated.`);
  closePreferenceEditor();
}

function setActivePreferenceProfile(profileId) {
  profileMemoryStore.setActivePreferenceProfile(profileId);
  const profile = preferenceProfiles.value.find((item) => item.id === profileId);
  if (profile) {
    showProfileActionMessage(`${profile.name} profile is now active.`);
  }
}

function deletePreferenceProfile(profile) {
  if (!profile || !profile.id) {
    showProfileActionError("Invalid profile selected for deletion.");
    return;
  }

  if (preferenceProfiles.value.length <= 1) {
    showProfileActionError("At least one profile must remain.");
    return;
  }

  const beforeCount = preferenceProfiles.value.length;
  const nextMemory = profileMemoryStore.deleteNamedPreferenceProfile(profile.id);
  const afterCount = Array.isArray(nextMemory?.preferenceProfiles) ? nextMemory.preferenceProfiles.length : beforeCount;

  if (afterCount < beforeCount) {
    showProfileActionMessage(`${profile.name} profile removed.`);
  } else {
    showProfileActionError("Could not delete this profile. Please try again.");
  }
}

async function removeVaultDocument(documentId) {
  vaultStore.removeDocument(documentId);
}

async function loadProfile() {
  loading.value = true;
  loadError.value = "";

  try {
    await authStore.initAuth();
    if (!authStore.user?.uid) {
      router.replace({ path: "/login", query: { redirect: "/profile" } });
      return;
    }

    profileMemoryStore.initForUser(authStore.user.uid);
    vaultStore.initForUser(authStore.user.uid);
    trips.value = await getSavedTripsFromDb(authStore.user.uid);
  } catch (error) {
    loadError.value = error?.message || "Unable to load profile summary.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadProfile);

watch(
  () => authStore.user?.uid,
  (nextUserId) => {
    if (!nextUserId) {
      return;
    }

    profileMemoryStore.initForUser(nextUserId);
    vaultStore.initForUser(nextUserId);
  }
);
</script>

<template>
  <div class="profile-page container animate-fade-in" style="padding-top: 100px;">
    <header class="profile-hero glass-card">
      <img :src="wrappedHeroImage" alt="Travel wrapped hero" class="profile-hero-image" loading="lazy" />
      <div class="profile-hero-shade"></div>
      <div>
        <span class="hero-badge">TRAVEL WRAPPED</span>
        <h1>Your Year In Travel</h1>
        <p>From personality to milestones, your full journey identity is now one cinematic profile.</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="btn btn-outline" @click="openSection('overview')">Overview</button>
        <button type="button" class="btn btn-outline" @click="openSection('vault')">Vault</button>
      </div>
    </header>

    <section v-if="loading" class="glass-card loading-panel mt-6">
      <p>Loading your travel wrapped profile...</p>
    </section>

    <section v-else-if="loadError" class="glass-card error-panel mt-6">
      <p>{{ loadError }}</p>
    </section>

    <template v-else>
      <section class="kpi-grid mt-6">
        <article class="glass-card kpi">
          <span>Total Trips</span>
          <strong>{{ history.totalTrips }}</strong>
        </article>
        <article class="glass-card kpi">
          <span>Countries Visited</span>
          <strong>{{ countriesVisited.length }}</strong>
        </article>
        <article class="glass-card kpi">
          <span>Cities Visited</span>
          <strong>{{ citiesVisited.length }}</strong>
        </article>
        <article class="glass-card kpi">
          <span>Avg Trip Cost</span>
          <strong>{{ formatPrice(averageTripCost) }}</strong>
        </article>
      </section>

      <section class="identity-grid mt-6">
        <article class="glass-card identity-card">
          <div class="card-head">
            <h3>Travel Personality</h3>
            <span class="score-pill">{{ profileMemoryStore.scores?.overall || 0 }}/100</span>
          </div>
          <h4>{{ personality?.label }}</h4>
          <p class="card-copy">{{ personality?.description }}</p>
          <div class="tag-row mt-3">
            <span v-for="trait in personality?.traits || []" :key="trait" class="tag-pill">{{ trait }}</span>
          </div>
        </article>

        <article class="glass-card identity-card">
          <h3>Favorite Style</h3>
          <h4>{{ favoriteStyle }}</h4>
          <p class="card-copy">Preferred transport: {{ preferences.transportPreference || 'Car' }}</p>
          <p class="card-copy">Food pattern: {{ preferences.foodPreference || 'Mixed' }}</p>
          <p class="card-copy">Stay preference: {{ preferences.stayPreference || 'Mid-range' }}</p>
        </article>

        <article class="glass-card identity-card">
          <h3>Budget Pattern</h3>
          <h4>{{ budgetPattern.label }}</h4>
          <p class="card-copy">{{ budgetPattern.detail }}</p>
          <div class="budget-range mt-3">
            <span>Min: {{ formatPrice(budgetPattern.min) }}</span>
            <span>Avg: {{ formatPrice(budgetPattern.avg) }}</span>
            <span>Max: {{ formatPrice(budgetPattern.max) }}</span>
          </div>
        </article>
      </section>

      <section class="glass-card pref-profiles-panel mt-6">
        <div class="card-head">
          <h3>Trip Preference Profiles</h3>
          <div class="hero-actions">
            <small>{{ preferenceProfiles.length }}/{{ maxPreferenceProfiles }} saved</small>
            <button
              type="button"
              class="btn btn-outline btn-xs"
              :disabled="preferenceProfiles.length >= maxPreferenceProfiles"
              @click="openPreferenceEditor('create')"
            >
              Add Profile
            </button>
          </div>
        </div>

        <p class="card-copy mt-2">
          Save up to {{ maxPreferenceProfiles }} named profiles. Family members can keep their own travel style and use it directly in Planner.
        </p>

        <p v-if="profileActionMessage" class="profile-action-success mt-2">{{ profileActionMessage }}</p>
        <p v-if="profileActionError" class="profile-action-error mt-2">{{ profileActionError }}</p>

        <div class="pref-profile-list mt-3">
          <article
            v-for="profile in preferenceProfiles"
            :key="profile.id"
            class="pref-profile-item"
            :class="{ active: activePreferenceProfileId === profile.id }"
          >
            <div>
              <strong>{{ profile.name }}</strong>
              <p>{{ profile.summary }}</p>
            </div>
            <div class="pref-profile-actions">
              <button
                type="button"
                class="btn btn-outline btn-xs"
                :disabled="activePreferenceProfileId === profile.id"
                @click="setActivePreferenceProfile(profile.id)"
              >
                {{ activePreferenceProfileId === profile.id ? 'Active' : 'Set Active' }}
              </button>
              <button type="button" class="btn btn-outline btn-xs" @click="openPreferenceEditor('edit', profile)">Edit</button>
              <button
                type="button"
                class="btn btn-danger btn-xs"
                @click="deletePreferenceProfile(profile)"
              >
                Delete
              </button>
            </div>
          </article>
        </div>

        <article v-if="profileEditorOpen" class="profile-editor-inline mt-3">
          <div class="card-head">
            <h3>{{ profileEditorMode === 'edit' ? 'Edit Preference Profile' : 'Create Preference Profile' }}</h3>
            <button type="button" class="btn btn-outline btn-xs" @click="closePreferenceEditor">Close</button>
          </div>

          <p class="card-copy mt-2">
            This profile will be available in Planner Saved Preferences drawer for one-click trip application.
          </p>

          <p v-if="profileEditorError" class="planner-error mt-2">{{ profileEditorError }}</p>

          <div class="pref-form-grid mt-3">
            <label>
              <span>Name</span>
              <input
                class="form-input"
                :value="profileDraft.name"
                @input="profileDraft.name = $event.target.value"
                placeholder="e.g. Mom, Rahul, Family, Solo"
              />
            </label>

            <label>
              <span>Style</span>
              <select class="form-select" :value="profileDraft.style" @change="profileDraft.style = $event.target.value">
                <option value="Balanced">Balanced</option>
                <option value="Budget">Budget</option>
                <option value="Comfort">Comfort</option>
                <option value="Luxury">Luxury</option>
                <option value="Adventure">Adventure</option>
              </select>
            </label>

            <label>
              <span>Transport</span>
              <select class="form-select" :value="profileDraft.travelMode" @change="profileDraft.travelMode = $event.target.value">
                <option value="Flight">Flight</option>
                <option value="Train">Train</option>
                <option value="Bus">Bus</option>
                <option value="Car">Car</option>
                <option value="Bike">Bike</option>
              </select>
            </label>

            <label>
              <span>Stay</span>
              <select class="form-select" :value="profileDraft.stayPreference" @change="profileDraft.stayPreference = $event.target.value">
                <option value="hostel">Hostel</option>
                <option value="budget">Budget</option>
                <option value="mid-range">Mid-range</option>
                <option value="premium">Premium</option>
                <option value="luxury">Luxury</option>
              </select>
            </label>

            <label>
              <span>Food</span>
              <select class="form-select" :value="profileDraft.foodPreference" @change="profileDraft.foodPreference = $event.target.value">
                <option value="street">Street</option>
                <option value="local">Local</option>
                <option value="mixed">Mixed</option>
                <option value="fine-dining">Fine Dining</option>
              </select>
            </label>

            <label>
              <span>Budget Target (USD)</span>
              <input
                class="form-input"
                type="number"
                min="100"
                step="50"
                :value="profileDraft.budgetTarget"
                @input="profileDraft.budgetTarget = Number($event.target.value || profileDraft.budgetTarget)"
              />
            </label>

            <label>
              <span>Favorite Destination</span>
              <input
                class="form-input"
                :value="profileDraft.favoriteDestination"
                @input="profileDraft.favoriteDestination = $event.target.value"
                placeholder="e.g. Goa, Tokyo, Himachal"
              />
            </label>
          </div>

          <div class="hero-actions mt-3">
            <button type="button" class="btn btn-outline" @click="closePreferenceEditor">Cancel</button>
            <button type="button" class="btn btn-primary" @click="savePreferenceProfile">Save Profile</button>
          </div>
        </article>
      </section>

      <section v-if="selectedSection !== 'vault'" class="map-layout mt-6">
        <article class="glass-card map-card">
          <div class="card-head">
            <h3>Travel Map</h3>
            <small>{{ uniqueDestinations.length }} pinned destinations</small>
          </div>
          <div class="map-canvas mt-3">
            <div v-for="pin in travelMapPins" :key="pin.id" class="map-pin" :style="pin.style">
              <span>{{ pin.label }}</span>
            </div>
          </div>
        </article>

        <article class="glass-card list-card">
          <h3>Countries Visited</h3>
          <div class="pill-list mt-3" v-if="countriesVisited.length > 0">
            <span v-for="country in countriesVisited" :key="country" class="outline-pill">{{ country }}</span>
          </div>
          <p v-else class="empty-copy mt-3">Countries list will grow as destination details become richer.</p>

          <h3 class="mt-6">Cities Visited</h3>
          <div class="pill-list mt-3" v-if="citiesVisited.length > 0">
            <span v-for="city in citiesVisited" :key="city" class="outline-pill">{{ city }}</span>
          </div>
          <p v-else class="empty-copy mt-3">Cities list will appear from saved trips.</p>
        </article>
      </section>

      <section v-if="selectedSection !== 'vault'" class="detail-grid mt-6">
        <article class="glass-card detail-card">
          <h3>Achievements</h3>
          <div class="achievement-list mt-3">
            <article v-for="achievement in achievements" :key="achievement.id" class="achievement-item">
              <strong>{{ achievement.title }}</strong>
              <p>{{ achievement.detail }}</p>
            </article>
          </div>
        </article>

        <article class="glass-card detail-card">
          <h3>Timeline</h3>
          <div class="timeline-list mt-3" v-if="timeline.length > 0">
            <article v-for="event in timeline" :key="event.id" class="timeline-item">
              <div>
                <strong>{{ event.destination }}</strong>
                <p>{{ event.summary }}</p>
              </div>
              <small>{{ formatDate(event.createdAt) }}</small>
            </article>
          </div>
          <p v-else class="empty-copy mt-3">Timeline appears after generating and saving journeys.</p>
        </article>
      </section>

      <section v-if="selectedSection === 'vault'" class="glass-card vault-panel mt-6">
        <div class="card-head">
          <h3>Document Vault</h3>
          <small>{{ vaultStore.encryptionStatusLabel }}</small>
        </div>

        <div class="vault-kpis mt-4">
          <article class="vault-kpi">
            <span>Total Docs</span>
            <strong>{{ vaultDocs.length }}</strong>
          </article>
          <article class="vault-kpi">
            <span>Encrypted</span>
            <strong>{{ vaultStore.encryptedDocumentCount }}</strong>
          </article>
          <article class="vault-kpi">
            <span>Emergency Pack</span>
            <strong>{{ vaultStore.emergencyPackCount }}</strong>
          </article>
          <article class="vault-kpi">
            <span>Storage</span>
            <strong>{{ vaultStore.totalSizeLabel }}</strong>
          </article>
        </div>

        <div v-if="vaultDocs.length === 0" class="empty-copy mt-4">No vault documents uploaded yet.</div>

        <div v-else class="vault-list mt-4">
          <article v-for="doc in vaultDocs" :key="doc.id" class="vault-item">
            <div>
              <strong>{{ doc.name }}</strong>
              <p>{{ doc.tag }} | {{ doc.sizeLabel }} | key v{{ doc.keyVersion }}</p>
            </div>
            <button type="button" class="btn btn-danger btn-xs" @click="removeVaultDocument(doc.id)">Remove</button>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 36px;
}

.profile-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  padding: 22px;
  background: linear-gradient(140deg, rgba(224, 242, 254, 0.84), rgba(236, 253, 245, 0.8));
  border: 1px solid rgba(14, 165, 233, 0.24);
}

.profile-hero > * {
  position: relative;
  z-index: 2;
}

.profile-hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.22;
}

.profile-hero-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.2));
}

.hero-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #0369a1;
  background: rgba(224, 242, 254, 0.9);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
}

.profile-hero h1 {
  margin-top: 8px;
  font-size: clamp(2rem, 5vw, 3.2rem);
  letter-spacing: -0.04em;
}

.profile-hero p {
  margin-top: 6px;
  color: var(--color-text-secondary);
  max-width: 760px;
}

.hero-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mt-6 {
  margin-top: 24px;
}

.mt-4 {
  margin-top: 16px;
}

.mt-3 {
  margin-top: 12px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.kpi {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.kpi span {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.kpi strong {
  display: block;
  margin-top: 4px;
  font-size: 1rem;
}

.identity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.identity-card,
.map-card,
.list-card,
.detail-card,
.vault-panel,
.pref-profiles-panel,
.loading-panel,
.error-panel {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.28);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.score-pill {
  border: 1px solid rgba(14, 165, 233, 0.26);
  border-radius: var(--radius-full);
  background: rgba(224, 242, 254, 0.72);
  color: #0369a1;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 5px 10px;
}

.identity-card h4 {
  margin-top: 8px;
  font-size: 1.1rem;
}

.card-copy {
  margin-top: 6px;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-pill {
  border: 1px solid rgba(14, 165, 233, 0.24);
  border-radius: var(--radius-full);
  background: rgba(224, 242, 254, 0.74);
  color: #0369a1;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 5px 10px;
}

.budget-range {
  display: grid;
  gap: 5px;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.map-layout {
  display: grid;
  grid-template-columns: 1.45fr 0.85fr;
  gap: 10px;
}

.map-canvas {
  position: relative;
  min-height: 340px;
  border-radius: var(--radius-lg);
  border: 1px dashed rgba(14, 165, 233, 0.34);
  background:
    radial-gradient(circle at 16% 24%, rgba(14, 165, 233, 0.16) 0%, rgba(14, 165, 233, 0) 34%),
    radial-gradient(circle at 78% 68%, rgba(16, 185, 129, 0.14) 0%, rgba(16, 185, 129, 0) 34%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(240, 249, 255, 0.9));
  overflow: hidden;
}

.map-pin {
  position: absolute;
  transform: translate(-50%, -50%);
}

.map-pin span {
  display: inline-block;
  border: 1px solid rgba(14, 165, 233, 0.32);
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.94);
  color: #0369a1;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 5px 8px;
  white-space: nowrap;
  box-shadow: var(--shadow-sm);
}

.pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.outline-pill {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-full);
  background: #ffffff;
  color: var(--color-text-secondary);
  padding: 5px 10px;
  font-size: 0.72rem;
  font-weight: 700;
}

.empty-copy {
  color: var(--color-text-muted);
  font-size: 0.82rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.achievement-list,
.timeline-list,
.vault-list {
  display: grid;
  gap: 8px;
}

.achievement-item,
.timeline-item,
.vault-item {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.9);
  padding: 9px;
}

.achievement-item {
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.96), rgba(240, 249, 255, 0.9));
  position: relative;
  overflow: hidden;
}

.achievement-item::after {
  content: "";
  position: absolute;
  inset: auto -20% -40% 40%;
  height: 70px;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.16), rgba(14, 165, 233, 0));
}

.achievement-item p,
.timeline-item p,
.vault-item p {
  margin-top: 4px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.timeline-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  position: relative;
  padding-left: 16px;
}

.timeline-item::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.64), rgba(16, 185, 129, 0.48));
}

.timeline-item small {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.vault-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.vault-kpi {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.92);
  padding: 8px;
}

.vault-kpi span {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.vault-kpi strong {
  display: block;
  margin-top: 4px;
  font-size: 0.86rem;
}

.vault-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.btn-xs {
  font-size: 0.72rem;
  padding: 6px 9px;
}

.pref-profile-list {
  display: grid;
  gap: 8px;
}

.pref-profile-item {
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.92);
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.pref-profile-item.active {
  border-color: rgba(16, 185, 129, 0.44);
  background: rgba(209, 250, 229, 0.42);
}

.pref-profile-item p {
  margin-top: 4px;
  font-size: 0.78rem;
  color: var(--color-text-secondary);
}

.pref-profile-actions {
  display: grid;
  gap: 6px;
}

.profile-editor-inline {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.96);
  padding: 12px;
}

.pref-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pref-form-grid label {
  display: grid;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.planner-error {
  color: #dc2626;
  font-size: 0.82rem;
}

.profile-action-success {
  color: #047857;
  font-size: 0.82rem;
  font-weight: 600;
}

.profile-action-error {
  color: #b91c1c;
  font-size: 0.82rem;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .kpi-grid,
  .identity-grid,
  .detail-grid,
  .vault-kpis {
    grid-template-columns: 1fr 1fr;
  }

  .map-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .profile-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .kpi-grid,
  .identity-grid,
  .detail-grid,
  .vault-kpis {
    grid-template-columns: 1fr;
  }

  .timeline-item,
  .vault-item,
  .pref-profile-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .pref-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>