<script setup>
import { computed, reactive, ref } from "vue";
import { formatPrice } from "../../services/currency";
import { useBookingStore } from "../../stores/booking";
import { usePlannerSessionStore } from "../../stores/plannerSession";
import { searchHotels } from "../../modules/booking/service";

const bookingStore = useBookingStore();
const plannerSession = usePlannerSessionStore();
defineEmits(["openCheckout"]);

const activeTab = ref("hotels");
const tabs = [
  { id: "hotels", label: "Hotels" },
  { id: "restaurants", label: "Restaurants" }
];

const plannerContext = computed(() => plannerSession.activeContext || {});

const hotelForm = reactive({
  city: plannerContext.value.destination || "Jaipur",
  checkIn: "",
  nights: Math.max(1, plannerContext.value.days || 2),
  travelers: plannerContext.value.travelers || 2,
  hotelType: "standard"
});

const restaurantForm = reactive({
  city: plannerContext.value.destination || "Jaipur",
  cuisine: "all",
  priceRange: "medium"
});

const hotelResults = ref([]);
const restaurantResults = ref([]);
const hasSearchedHotels = ref(false);
const hasSearchedRestaurants = ref(false);

function priceInr(amount) {
  return formatPrice(Number(amount || 0), "INR");
}

function runHotelSearch() {
  hotelResults.value = searchHotels({ ...hotelForm });
  hasSearchedHotels.value = true;
}

function runRestaurantSearch() {
  // Mock restaurant search
  restaurantResults.value = [
    {
      id: `rest_${Date.now()}_1`,
      type: "restaurant",
      name: "Chokhi Dhani",
      cuisine: "Rajasthani",
      rating: 4.5,
      reviews: 1240,
      priceForTwo: 1200,
      location: restaurantForm.city,
      distance: "3.2 km",
      timings: "6:00 PM - 11:00 PM",
      speciality: "Traditional Rajasthani Thali"
    },
    {
      id: `rest_${Date.now()}_2`,
      type: "restaurant",
      name: "Laxmi Mishthan Bhandar",
      cuisine: "North Indian, Sweets",
      rating: 4.3,
      reviews: 890,
      priceForTwo: 600,
      location: restaurantForm.city,
      distance: "1.8 km",
      timings: "8:00 AM - 10:30 PM",
      speciality: "Ghewar, Kachori"
    },
    {
      id: `rest_${Date.now()}_3`,
      type: "restaurant",
      name: "Spice Court",
      cuisine: "Multi-cuisine",
      rating: 4.1,
      reviews: 650,
      priceForTwo: 900,
      location: restaurantForm.city,
      distance: "2.5 km",
      timings: "12:00 PM - 11:00 PM",
      speciality: "Rooftop Dining"
    }
  ];
  hasSearchedRestaurants.value = true;
}

function add(item) {
  bookingStore.addToCart(item);
}
</script>

<template>
  <div class="container stay-panel animate-fade-in">
    <header class="stay-head">
      <div>
        <h1>🏨 Stay & Dining</h1>
        <p>Find the best hotels and restaurants for your trip</p>
      </div>
      <button
        v-if="bookingStore.cartCount"
        type="button"
        class="btn btn-primary cart-pill"
        @click="$emit('openCheckout')"
      >
        Cart · {{ bookingStore.cartCount }} · {{ priceInr(bookingStore.cartTotal) }}
      </button>
    </header>

    <nav class="stay-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="stay-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="stay-layout">
      <main class="stay-main">
        <!-- HOTELS -->
        <section v-if="activeTab === 'hotels'">
          <form class="search-card glass-card" @submit.prevent="runHotelSearch">
            <div class="search-grid">
              <label>City<input v-model="hotelForm.city" class="form-input" placeholder="Destination city" /></label>
              <label>Check-in<input v-model="hotelForm.checkIn" type="date" class="form-input" /></label>
              <label>Nights<input v-model.number="hotelForm.nights" type="number" min="1" max="30" class="form-input" /></label>
              <label>Guests<input v-model.number="hotelForm.travelers" type="number" min="1" max="12" class="form-input" /></label>
              <label>Hotel Type
                <select v-model="hotelForm.hotelType" class="form-input">
                  <option value="budget">Budget</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="luxury">Luxury</option>
                </select>
              </label>
            </div>
            <button type="submit" class="btn btn-primary">Search Hotels</button>
          </form>

          <div v-if="hotelResults.length" class="result-list">
            <article v-for="hotel in hotelResults" :key="hotel.id" class="result-card glass-card">
              <div class="result-lead">
                <strong>{{ hotel.name }}</strong>
                <span class="muted">{{ hotel.rating }}★ · {{ hotel.reviews }} reviews · {{ hotel.tier }}</span>
                <div class="amenity-row">
                  <span v-for="amenity in hotel.amenities" :key="amenity" class="amenity">{{ amenity }}</span>
                </div>
              </div>
              <div class="result-cta">
                <strong class="price">{{ priceInr(hotel.price) }}</strong>
                <span class="muted">{{ priceInr(hotel.pricePerNight) }}/night · {{ hotel.nights }}n</span>
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="bookingStore.isInCart(hotel.id) ? 'btn-outline' : 'btn-primary'"
                  :disabled="bookingStore.isInCart(hotel.id)"
                  @click="add(hotel)"
                >
                  {{ bookingStore.isInCart(hotel.id) ? "Added" : "Add" }}
                </button>
              </div>
            </article>
          </div>
          <p v-else-if="hasSearchedHotels" class="empty-text">No stays found. Try another city.</p>
          <p v-else class="empty-text">Search to see available stays.</p>
        </section>

        <!-- RESTAURANTS -->
        <section v-else-if="activeTab === 'restaurants'">
          <form class="search-card glass-card" @submit.prevent="runRestaurantSearch">
            <div class="search-grid">
              <label>City<input v-model="restaurantForm.city" class="form-input" placeholder="City name" /></label>
              <label>Cuisine
                <select v-model="restaurantForm.cuisine" class="form-input">
                  <option value="all">All Cuisines</option>
                  <option value="north-indian">North Indian</option>
                  <option value="south-indian">South Indian</option>
                  <option value="chinese">Chinese</option>
                  <option value="continental">Continental</option>
                  <option value="italian">Italian</option>
                  <option value="rajasthani">Rajasthani</option>
                </select>
              </label>
              <label>Price Range
                <select v-model="restaurantForm.priceRange" class="form-input">
                  <option value="budget">Budget (₹₹)</option>
                  <option value="medium">Medium (₹₹₹)</option>
                  <option value="premium">Premium (₹₹₹₹)</option>
                </select>
              </label>
            </div>
            <button type="submit" class="btn btn-primary">Find Restaurants</button>
          </form>

          <div v-if="restaurantResults.length" class="result-list">
            <article v-for="restaurant in restaurantResults" :key="restaurant.id" class="result-card glass-card">
              <div class="result-lead">
                <strong>{{ restaurant.name }}</strong>
                <span class="muted">{{ restaurant.rating }}★ · {{ restaurant.reviews }} reviews</span>
                <div class="restaurant-info">
                  <span class="info-item">🍽️ {{ restaurant.cuisine }}</span>
                  <span class="info-item">📍 {{ restaurant.distance }}</span>
                  <span class="info-item">🕐 {{ restaurant.timings }}</span>
                </div>
                <p class="speciality">✨ {{ restaurant.speciality }}</p>
              </div>
              <div class="result-cta">
                <strong class="price">{{ priceInr(restaurant.priceForTwo) }}</strong>
                <span class="muted">for two</span>
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="bookingStore.isInCart(restaurant.id) ? 'btn-outline' : 'btn-primary'"
                  :disabled="bookingStore.isInCart(restaurant.id)"
                  @click="add(restaurant)"
                >
                  {{ bookingStore.isInCart(restaurant.id) ? "Added" : "Add" }}
                </button>
              </div>
            </article>
          </div>
          <p v-else-if="hasSearchedRestaurants" class="empty-text">No restaurants found. Try different filters.</p>
          <p v-else class="empty-text">Search to see restaurants in your destination.</p>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.stay-panel {
  padding: 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.stay-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.stay-head h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stay-head p {
  color: var(--color-text-secondary);
}

.cart-pill {
  white-space: nowrap;
}

.stay-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
  flex-wrap: wrap;
}

.stay-tab {
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.stay-tab:hover {
  background: #f8fafc;
}

.stay-tab.active {
  border-bottom-color: #0ea5e9;
  color: #0ea5e9;
}

.stay-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stay-main {
  flex: 1;
}

.search-card {
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.search-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.search-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.form-input {
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: #0ea5e9;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-card {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
}

.result-lead {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-lead strong {
  font-size: 1.1rem;
}

.muted {
  color: #64748b;
  font-size: 0.9rem;
}

.amenity-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.amenity {
  padding: 0.25rem 0.5rem;
  background: #dbeafe;
  color: #0369a1;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.restaurant-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.info-item {
  font-size: 0.85rem;
  color: #475569;
}

.speciality {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #0ea5e9;
  font-style: italic;
}

.result-cta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  min-width: 120px;
}

.price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f766e;
}

.empty-text {
  text-align: center;
  color: #64748b;
  padding: 2rem;
}

@media (max-width: 768px) {
  .stay-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .stay-head h1 {
    font-size: 1.75rem;
  }

  .result-card {
    flex-direction: column;
  }

  .result-cta {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .search-grid {
    grid-template-columns: 1fr;
  }
}
</style>
