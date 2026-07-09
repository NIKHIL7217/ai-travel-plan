<script setup>
import { computed, reactive, ref, watch } from "vue";
import { formatPrice } from "../../services/currency";
import { useBookingStore } from "../../stores/booking";
import { usePlannerSessionStore } from "../../stores/plannerSession";
import { getFuelPriceInfo, getTollPricesForRoute } from "../../services/fuel-prices";
import { userLocation } from "../../services/location";
import { trackEvent } from "../../core/monitoring";
import { isFeatureEnabled } from "../../config/featureFlags";
import { backendTrackBookingFunnelEvent } from "../../services/api/backendClient";
import { searchFlights as estimateFlights, searchHotels as estimateHotels, searchCabs as estimateCabs, BOOKING_DISCLAIMER } from "../../modules/booking/service";
import { geocodePlace, getRouteDistance } from "../../services/gemini";
import { fetchNearbyPlaces } from "../../services/travel/places.service";

const props = defineProps({
  destination: { type: String, default: "" },
  currentLocation: { type: String, default: "Delhi" },
  travelers: { type: Number, default: 2 },
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" }
});

const bookingStore = useBookingStore();
const plannerSession = usePlannerSessionStore();

// Active section tracking (Booking, Roadtrip, Stay, My Bookings)
const activeSection = ref("booking");
const sections = [
  { id: "booking", label: "🎫 Booking", subtitle: "Flights, Trains, Bus, Cabs" },
  { id: "roadtrip", label: "🚗 Roadtrip", subtitle: "Car & Bike Planning" },
  { id: "stay", label: "🏨 Stay", subtitle: "Hotels & Restaurants" },
  { id: "my-bookings", label: "📋 My Bookings", subtitle: "Your booking history" }
];

const plannerContext = computed(() => plannerSession.activeContext || {});
const bookingDisclaimer = BOOKING_DISCLAIMER;

function trackBookingEvent(type, payload = {}) {
  if (!isFeatureEnabled("FEATURE_BOOKING_ANALYTICS")) {
    return;
  }

  const basePayload = {
    destination: props.destination || plannerContext.value?.destination || "",
    origin: props.currentLocation || plannerContext.value?.origin || "",
    ...payload
  };

  trackEvent(type, basePayload);

  backendTrackBookingFunnelEvent({
    eventType: type,
    stage: String(type || "").split(".").slice(1).join(".") || "unknown",
    destination: basePayload.destination,
    amount: Number(basePayload.cartTotalInr || basePayload.amountInr || 0),
    revenueImpact: type === "booking.checkout.success",
    meta: basePayload
  });
}

// ========== BOOKING SECTION ==========
const bookingTab = ref("flights");
const bookingTabs = [
  { id: "flights", label: "✈️ Flights" },
  { id: "trains", label: "🚆 Trains" },
  { id: "bus", label: "🚌 Bus" },
  { id: "cabs", label: "🚕 Cabs" }
];

// Forms
const flightForm = reactive({
  from: props.currentLocation || "Delhi",
  to: props.destination || "Mumbai",
  date: props.startDate || "",
  travelers: props.travelers || 1,
  class: "economy"
});

const trainForm = reactive({
  from: props.currentLocation || "Delhi",
  to: props.destination || "Mumbai",
  date: props.startDate || "",
  travelers: props.travelers || 1,
  class: "sleeper"
});

const busForm = reactive({
  from: props.currentLocation || "Delhi",
  to: props.destination || "Agra",
  date: props.startDate || "",
  travelers: props.travelers || 1,
  busType: "ac-seater"
});

const cabForm = reactive({
  from: "Airport",
  to: props.destination || "City Center",
  date: props.startDate || "",
  cabType: "sedan"
});

// Watch for prop changes and update forms
watch(
  () => [props.destination, props.currentLocation, props.travelers, props.startDate],
  ([newDest, newLoc, newTravelers, newDate]) => {
    if (newDest) {
      flightForm.to = newDest;
      trainForm.to = newDest;
      busForm.to = newDest;
      cabForm.to = newDest;
      roadtripForm.to = newDest;
      hotelForm.city = newDest;
      restaurantForm.city = newDest;
    }
    if (newLoc) {
      flightForm.from = newLoc;
      trainForm.from = newLoc;
      busForm.from = newLoc;
      roadtripForm.from = newLoc;
    }
    if (newTravelers) {
      flightForm.travelers = newTravelers;
      trainForm.travelers = newTravelers;
      busForm.travelers = newTravelers;
      hotelForm.guests = newTravelers;
    }
    if (newDate) {
      flightForm.date = newDate;
      trainForm.date = newDate;
      busForm.date = newDate;
      cabForm.date = newDate;
      hotelForm.checkIn = newDate;
    }

    flightResults.value = [];
    trainResults.value = [];
    busResults.value = [];
    cabResults.value = [];
    hotelResults.value = [];
    restaurantResults.value = [];

    hasSearchedBooking.flights = false;
    hasSearchedBooking.trains = false;
    hasSearchedBooking.bus = false;
    hasSearchedBooking.cabs = false;
    hasSearchedStay.hotels = false;
    hasSearchedStay.restaurants = false;
  }
);

const flightResults = ref([]);
const trainResults = ref([]);
const busResults = ref([]);
const cabResults = ref([]);
const hasSearchedBooking = reactive({
  flights: false,
  trains: false,
  bus: false,
  cabs: false
});

// ========== ROADTRIP SECTION ==========
const roadtripVehicle = ref("car");
const vehicleTypes = [
  { id: "car", label: "🚗 Car" },
  { id: "bike", label: "🏍️ Bike" }
];

const carFuelTypes = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "cng", label: "CNG" },
  { value: "ev", label: "Electric (EV)" },
  { value: "hybrid", label: "Hybrid" }
];

const bikeFuelTypes = [
  { value: "petrol", label: "Petrol" },
  { value: "cng", label: "CNG" },
  { value: "ev", label: "Electric (EV)" }
];

const roadtripForm = reactive({
  from: props.currentLocation || "Delhi",
  to: props.destination || "Jaipur",
  vehicle: "car",
  fuelType: "petrol",
  distance: 280
});

// Vehicle mileage settings
const vehicleMileage = ref({
  enabled: false,
  mileage: 0
});

const showFuelPriceInfo = ref(false);
const showTollBreakdown = ref(false);
const detailedTollInfo = ref(null);

const roadtripResults = ref(null);

// ========== STAY SECTION ==========
const stayTab = ref("hotels");
const stayTabs = [
  { id: "hotels", label: "🏨 Hotels" },
  { id: "restaurants", label: "🍽️ Restaurants" }
];

const hotelForm = reactive({
  city: props.destination || "Jaipur",
  checkIn: props.startDate || "",
  nights: 2,
  rooms: 1,
  guests: props.travelers || 2
});

const restaurantForm = reactive({
  city: props.destination || "Jaipur",
  cuisine: "all",
  priceRange: "medium"
});

const hotelResults = ref([]);
const restaurantResults = ref([]);
const hasSearchedStay = reactive({
  hotels: false,
  restaurants: false
});

// ========== Helper Functions ==========
function priceInr(amount) {
  return formatPrice(Number(amount || 0), "INR");
}

async function resolveDistanceKm(from, to) {
  const origin = String(from || "").trim();
  const destination = String(to || "").trim();
  if (!origin || !destination) {
    return null;
  }

  try {
    const [originGeo, destinationGeo] = await Promise.all([
      geocodePlace(origin),
      geocodePlace(destination)
    ]);
    if (!originGeo || !destinationGeo) {
      return null;
    }

    const route = await getRouteDistance(
      { lat: Number(originGeo.lat), lng: Number(originGeo.lng) },
      { lat: Number(destinationGeo.lat), lng: Number(destinationGeo.lng) }
    );
    return route && Number(route.distance) > 0 ? Number(route.distance) : null;
  } catch {
    return null;
  }
}

function estimateTrainFare(distanceKm, classCode) {
  const distance = Math.max(80, Number(distanceKm || 300));
  const classMultiplier = classCode === "1ac" ? 2.7 : classCode === "2ac" ? 1.9 : classCode === "3ac" ? 1.35 : 1;
  return Math.round((distance * 1.55 * classMultiplier) / 10) * 10;
}

function estimateBusFare(distanceKm, busType) {
  const distance = Math.max(60, Number(distanceKm || 260));
  const typeMultiplier = busType === "volvo" ? 1.8 : busType === "ac-sleeper" ? 1.5 : busType === "ac-seater" ? 1.25 : 1;
  return Math.round((distance * 1.12 * typeMultiplier) / 10) * 10;
}

async function searchFlights() {
  hasSearchedBooking.flights = true;
  const estimated = estimateFlights({
    from: flightForm.from,
    to: flightForm.to,
    date: flightForm.date,
    travelers: flightForm.travelers
  });

  flightResults.value = estimated.map((item) => ({
    id: item.id,
    type: item.type,
    airline: item.airline,
    from: item.from,
    to: item.to,
    departure: item.departTime,
    arrival: item.arriveTime,
    duration: item.durationLabel,
    price: item.price,
    source: item.isEstimate ? "estimated" : "live"
  }));

  trackBookingEvent("booking.search.flights", {
    from: flightForm.from,
    to: flightForm.to,
    travelers: flightForm.travelers,
    resultCount: flightResults.value.length
  });
}

async function searchTrains() {
  hasSearchedBooking.trains = true;
  const distanceKm = await resolveDistanceKm(trainForm.from, trainForm.to);
  const distance = Math.max(90, Number(distanceKm || 300));
  const baseDurationHours = Math.max(3, Math.round((distance / 58) * 10) / 10);

  trainResults.value = [
    {
      id: `train_${Date.now()}_1`,
      type: "train",
      name: "Rajdhani Express",
      trainNumber: "12951",
      from: trainForm.from,
      to: trainForm.to,
      departTime: "16:00",
      arriveTime: "06:30",
      duration: `${baseDurationHours.toFixed(1)}h`,
      class: trainForm.class,
      price: estimateTrainFare(distance, trainForm.class),
      source: distanceKm ? "live-distance" : "estimated"
    },
    {
      id: `train_${Date.now()}_2`,
      type: "train",
      name: "Shatabdi Express",
      trainNumber: "12001",
      from: trainForm.from,
      to: trainForm.to,
      departTime: "06:20",
      arriveTime: "15:10",
      duration: `${Math.max(2.5, baseDurationHours * 0.86).toFixed(1)}h`,
      class: trainForm.class,
      price: Math.round(estimateTrainFare(distance, trainForm.class) * 1.08),
      source: distanceKm ? "live-distance" : "estimated"
    }
  ];

  trackBookingEvent("booking.search.trains", {
    from: trainForm.from,
    to: trainForm.to,
    travelers: trainForm.travelers,
    resultCount: trainResults.value.length
  });
}

async function searchBuses() {
  hasSearchedBooking.bus = true;
  const distanceKm = await resolveDistanceKm(busForm.from, busForm.to);
  const distance = Math.max(70, Number(distanceKm || 240));
  const baseDurationHours = Math.max(2.5, Math.round((distance / 48) * 10) / 10);

  busResults.value = [
    {
      id: `bus_${Date.now()}_1`,
      type: "bus",
      name: "RedBus AC Sleeper",
      operator: "RedBus",
      from: busForm.from,
      to: busForm.to,
      departTime: "22:00",
      arriveTime: "06:00",
      duration: `${baseDurationHours.toFixed(1)}h`,
      busType: busForm.busType,
      price: estimateBusFare(distance, busForm.busType),
      source: distanceKm ? "live-distance" : "estimated"
    },
    {
      id: `bus_${Date.now()}_2`,
      type: "bus",
      name: "VRL Travels",
      operator: "VRL Travels",
      from: busForm.from,
      to: busForm.to,
      departTime: "23:10",
      arriveTime: "07:45",
      duration: `${Math.max(2, baseDurationHours * 1.05).toFixed(1)}h`,
      busType: busForm.busType,
      price: Math.round(estimateBusFare(distance, busForm.busType) * 1.06),
      source: distanceKm ? "live-distance" : "estimated"
    }
  ];

  trackBookingEvent("booking.search.bus", {
    from: busForm.from,
    to: busForm.to,
    travelers: busForm.travelers,
    resultCount: busResults.value.length
  });
}

async function searchCabs() {
  hasSearchedBooking.cabs = true;
  const distanceKm = await resolveDistanceKm(cabForm.from, cabForm.to);
  const estimated = estimateCabs({
    from: cabForm.from,
    to: cabForm.to,
    date: cabForm.date,
    distanceKm: distanceKm || undefined
  });

  cabResults.value = estimated.slice(0, 3).map((item, index) => ({
    id: item.id,
    type: item.type,
    service: index % 2 === 0 ? "Uber" : "Ola",
    from: item.from,
    to: item.to,
    cabType: item.name,
    estimatedTime: item.etaLabel,
    price: item.price,
    source: distanceKm ? "live-distance" : "estimated"
  }));

  trackBookingEvent("booking.search.cabs", {
    from: cabForm.from,
    to: cabForm.to,
    resultCount: cabResults.value.length
  });
}

function calculateRoadtrip() {
  // Get real-time fuel price based on location
  const fuelTypeMap = {
    'petrol': 'Petrol',
    'diesel': 'Diesel',
    'cng': 'CNG',
    'ev': 'Electric',
    'hybrid': 'Petrol'  // Hybrid uses petrol price
  };
  
  const realFuelPrice = getFuelPriceInfo(fuelTypeMap[roadtripForm.fuelType] || 'Petrol').price;
  
  // Determine fuel efficiency (use custom mileage if enabled, else defaults)
  let fuelEfficiency;
  if (vehicleMileage.value.enabled && vehicleMileage.value.mileage > 0) {
    fuelEfficiency = vehicleMileage.value.mileage;
  } else {
    // Default mileage values
    if (roadtripForm.fuelType === "ev") {
      fuelEfficiency = roadtripForm.vehicle === "bike" ? 8 : 6.5; // km per kWh
    } else {
      fuelEfficiency = roadtripForm.vehicle === "bike" ? 45 : roadtripForm.vehicle === "bus" ? 5 : 15; // km per L/kg
    }
  }
  
  const fuelNeeded = roadtripForm.fuelType === "ev" 
    ? roadtripForm.distance / fuelEfficiency  // kWh needed
    : roadtripForm.distance / fuelEfficiency; // L or kg needed
    
  const fuelCost = fuelNeeded * realFuelPrice;
  
  const tollEstimate = Math.round(roadtripForm.distance * (roadtripForm.vehicle === "bike" ? 0.35 : roadtripForm.vehicle === "bus" ? 1.55 : 1.2));
  
  roadtripResults.value = {
    distance: roadtripForm.distance,
    fuelNeeded: fuelNeeded.toFixed(2),
    fuelCost: Math.round(fuelCost),
    fuelPrice: realFuelPrice,
    fuelUnit: roadtripForm.fuelType === "ev" ? "kWh" : roadtripForm.fuelType === "cng" ? "kg" : "L",
    tollEstimate: tollEstimate,
    totalCost: Math.round(fuelCost + tollEstimate),
    isCustomMileage: vehicleMileage.value.enabled && vehicleMileage.value.mileage > 0,
    location: userLocation.value.city + ", " + userLocation.value.state
  };
  
  // Fetch detailed toll info
  fetchTollBreakdown();
}

async function searchHotels() {
  hasSearchedStay.hotels = true;
  const estimated = estimateHotels({
    city: hotelForm.city,
    checkIn: hotelForm.checkIn,
    nights: hotelForm.nights,
    travelers: hotelForm.guests
  });

  hotelResults.value = estimated.slice(0, 6).map((item) => ({
    id: item.id,
    type: item.type,
    name: item.name,
    location: item.city,
    rating: item.rating,
    price: item.price,
    pricePerNight: item.pricePerNight,
    source: item.isEstimate ? "estimated" : "live"
  }));

  trackBookingEvent("booking.search.hotels", {
    city: hotelForm.city,
    nights: hotelForm.nights,
    guests: hotelForm.guests,
    resultCount: hotelResults.value.length
  });
}

async function searchRestaurants() {
  hasSearchedStay.restaurants = true;
  const city = String(restaurantForm.city || "").trim();
  let list = [];

  try {
    const geo = await geocodePlace(city);
    if (geo) {
      list = await fetchNearbyPlaces(Number(geo.lat), Number(geo.lng), "restaurant", city);
    }
  } catch {
    list = [];
  }

  if (Array.isArray(list) && list.length) {
    restaurantResults.value = list.slice(0, 8).map((item) => ({
      id: `rest_${item.name}_${item.lat || "na"}`,
      type: "restaurant",
      name: item.name,
      cuisine: item.type || "Local",
      rating: Number(item.rating || 4.1),
      priceForTwo: Math.round(Number(item.averagePrice || 700) * 2),
      location: item.address || city,
      source: "live"
    }));
  } else {
    restaurantResults.value = [
      {
        id: `rest_${Date.now()}_1`,
        type: "restaurant",
        name: `${city || "City"} Local Kitchen`,
        cuisine: "Local",
        rating: 4.2,
        priceForTwo: 1000,
        location: city || "City Center",
        source: "estimated"
      },
      {
        id: `rest_${Date.now()}_2`,
        type: "restaurant",
        name: `${city || "City"} Bistro`,
        cuisine: "Multi-cuisine",
        rating: 4.0,
        priceForTwo: 850,
        location: city || "Downtown",
        source: "estimated"
      }
    ];
  }

  trackBookingEvent("booking.search.restaurants", {
    city: restaurantForm.city,
    cuisine: restaurantForm.cuisine,
    resultCount: restaurantResults.value.length
  });
}

function addToCart(item) {
  bookingStore.addToCart({
    ...item,
    name: item.name || item.airline || item.operator || item.service,
    bookedAt: new Date().toISOString()
  });

  trackBookingEvent("booking.cart.add", {
    itemType: item.type || "unknown",
    itemName: item.name || item.airline || item.operator || item.service || "",
    amountInr: Number(item.price || item.priceForNight || item.priceForTwo || 0)
  });
}

function removeFromHistory(id) {
  bookingStore.removeFromHistory(id);
}

function onVehicleChange() {
  roadtripForm.vehicle = roadtripVehicle.value;
  roadtripForm.fuelType = "petrol";
}

async function fetchTollBreakdown() {
  if (!roadtripResults.value) return;
  
  try {
    detailedTollInfo.value = await getTollPricesForRoute({
      distanceKm: roadtripForm.distance,
      travelMode: roadtripForm.vehicle === "car" ? "Car" : roadtripForm.vehicle === "bike" ? "Bike" : "Bus",
      routeName: `${roadtripForm.from} to ${roadtripForm.to}`
    });
  } catch (e) {
    console.warn("Could not fetch toll breakdown", e);
  }
}

function getCurrentFuelPriceInfo() {
  const fuelTypeMap = {
    'petrol': 'Petrol',
    'diesel': 'Diesel',
    'cng': 'CNG',
    'ev': 'Electric',
    'hybrid': 'Petrol'
  };
  return getFuelPriceInfo(fuelTypeMap[roadtripForm.fuelType] || 'Petrol');
}

const currentFuelTypes = computed(() => {
  return roadtripVehicle.value === "car" ? carFuelTypes : bikeFuelTypes;
});

const showCartDetails = ref(false);
const checkoutStatus = ref({ type: "", text: "" });

async function proceedToCheckout() {
  if (!bookingStore.cartCount) {
    checkoutStatus.value = { type: "error", text: "Cart is empty. Please add items before proceeding to checkout." };
    trackBookingEvent("booking.checkout.blocked", { reason: "empty_cart" });
    return;
  }

  trackBookingEvent("booking.checkout.started", {
    cartCount: bookingStore.cartCount,
    cartTotalInr: Number(bookingStore.cartTotal || 0)
  });

  const result = await bookingStore.checkout({
    method: "card",
    name: "Wander Traveller"
  });

  if (!result) {
    checkoutStatus.value = { type: "error", text: "Checkout process could not be completed. Please retry." };
    trackBookingEvent("booking.checkout.failed", {
      cartCount: bookingStore.cartCount,
      cartTotalInr: Number(bookingStore.cartTotal || 0)
    });
    return;
  }

  checkoutStatus.value = {
    type: "success",
    text: `Booking confirmed: ${result.reference}`
  };
  trackBookingEvent("booking.checkout.success", {
    reference: result.reference,
    cartCount: bookingStore.cartCount,
    cartTotalInr: Number(bookingStore.cartTotal || 0)
  });
  showCartDetails.value = false;
  activeSection.value = "my-bookings";
}
</script>

<template>
  <div class="travel-plan-container">
    <header class="travel-plan-header">
      <h1>🗺️ Travel Plan</h1>
      <p>Book transport, plan roadtrips, find hotels, and manage all your travel in one place</p>
    </header>

    <!-- Section Navigation -->
    <nav class="section-nav">
      <button
        v-for="section in sections"
        :key="section.id"
        class="section-nav-btn"
        :class="{ active: activeSection === section.id }"
        @click="activeSection = section.id"
      >
        <span class="section-label">{{ section.label }}</span>
        <span class="section-subtitle">{{ section.subtitle }}</span>
      </button>
    </nav>

    <!-- ========== BOOKING SECTION ========== -->
    <section v-if="activeSection === 'booking'" class="booking-section">
      <p class="booking-disclaimer">{{ bookingDisclaimer }}</p>
      <div class="booking-tabs">
        <button
          v-for="tab in bookingTabs"
          :key="tab.id"
          class="booking-tab"
          :class="{ active: bookingTab === tab.id }"
          @click="bookingTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Flights -->
      <div v-if="bookingTab === 'flights'" class="booking-content">
        <div class="search-card">
          <h3>✈️ Search Flights</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>From</label>
              <input v-model="flightForm.from" type="text" class="form-input" placeholder="Origin city" />
            </div>
            <div class="form-group">
              <label>To</label>
              <input v-model="flightForm.to" type="text" class="form-input" placeholder="Destination" />
            </div>
            <div class="form-group">
              <label>Date</label>
              <input v-model="flightForm.date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>Travelers</label>
              <input v-model.number="flightForm.travelers" type="number" min="1" class="form-input" />
            </div>
            <div class="form-group">
              <label>Class</label>
              <select v-model="flightForm.class" class="form-input">
                <option value="economy">Economy</option>
                <option value="premium-economy">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First Class</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" @click="searchFlights">Search Flights</button>
        </div>

        <div v-if="hasSearchedBooking.flights && flightResults.length" class="results-grid">
          <div v-for="flight in flightResults" :key="flight.id" class="result-card glass-card">
            <div class="result-header">
              <strong>{{ flight.airline }}</strong>
              <span class="price">{{ priceInr(flight.price) }}</span>
            </div>
            <div class="result-details">
              <div>{{ flight.from }} → {{ flight.to }}</div>
              <div>{{ flight.departure }} - {{ flight.arrival }}</div>
              <div class="muted">{{ flight.duration }}</div>
            </div>
            <button class="btn btn-outline btn-sm" @click="addToCart(flight)">Add to Cart</button>
          </div>
        </div>
      </div>

      <!-- Trains -->
      <div v-if="bookingTab === 'trains'" class="booking-content">
        <div class="search-card glass-card">
          <h3>🚆 Search Trains</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>From</label>
              <input v-model="trainForm.from" type="text" class="form-input" placeholder="Origin station" />
            </div>
            <div class="form-group">
              <label>To</label>
              <input v-model="trainForm.to" type="text" class="form-input" placeholder="Destination station" />
            </div>
            <div class="form-group">
              <label>Date</label>
              <input v-model="trainForm.date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>Travelers</label>
              <input v-model.number="trainForm.travelers" type="number" min="1" class="form-input" />
            </div>
            <div class="form-group">
              <label>Class</label>
              <select v-model="trainForm.class" class="form-input">
                <option value="sleeper">Sleeper</option>
                <option value="3ac">3AC</option>
                <option value="2ac">2AC</option>
                <option value="1ac">1AC</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" @click="searchTrains">Search Trains</button>
        </div>

        <div v-if="hasSearchedBooking.trains && trainResults.length" class="results-grid">
          <div v-for="train in trainResults" :key="train.id" class="result-card glass-card">
            <div class="result-header">
              <strong>{{ train.name }}</strong>
              <span class="badge">{{ train.trainNumber }}</span>
            </div>
            <div class="result-details">
              <div>{{ train.from }} → {{ train.to }}</div>
              <div>{{ train.departTime }} - {{ train.arriveTime }}</div>
              <div class="muted">{{ train.duration }} · {{ train.class.toUpperCase() }}</div>
            </div>
            <div class="result-footer">
              <span class="price">{{ priceInr(train.price) }}</span>
              <button class="btn btn-outline btn-sm" @click="addToCart(train)">Add to Cart</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bus -->
      <div v-if="bookingTab === 'bus'" class="booking-content">
        <div class="search-card glass-card">
          <h3>🚌 Search Buses</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>From</label>
              <input v-model="busForm.from" type="text" class="form-input" placeholder="Origin city" />
            </div>
            <div class="form-group">
              <label>To</label>
              <input v-model="busForm.to" type="text" class="form-input" placeholder="Destination city" />
            </div>
            <div class="form-group">
              <label>Date</label>
              <input v-model="busForm.date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>Travelers</label>
              <input v-model.number="busForm.travelers" type="number" min="1" class="form-input" />
            </div>
            <div class="form-group">
              <label>Bus Type</label>
              <select v-model="busForm.busType" class="form-input">
                <option value="ac-seater">AC Seater</option>
                <option value="ac-sleeper">AC Sleeper</option>
                <option value="non-ac-seater">Non-AC Seater</option>
                <option value="volvo">Volvo</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" @click="searchBuses">Search Buses</button>
        </div>

        <div v-if="hasSearchedBooking.bus && busResults.length" class="results-grid">
          <div v-for="bus in busResults" :key="bus.id" class="result-card glass-card">
            <div class="result-header">
              <strong>{{ bus.name }}</strong>
              <span class="badge">{{ bus.busType }}</span>
            </div>
            <div class="result-details">
              <div>{{ bus.from }} → {{ bus.to }}</div>
              <div>{{ bus.departTime }} - {{ bus.arriveTime }}</div>
              <div class="muted">{{ bus.duration }}</div>
            </div>
            <div class="result-footer">
              <span class="price">{{ priceInr(bus.price) }}</span>
              <button class="btn btn-outline btn-sm" @click="addToCart(bus)">Add to Cart</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cabs -->
      <div v-if="bookingTab === 'cabs'" class="booking-content">
        <div class="search-card glass-card">
          <h3>🚕 Book a Cab</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Pickup</label>
              <input v-model="cabForm.from" type="text" class="form-input" placeholder="Pickup location" />
            </div>
            <div class="form-group">
              <label>Drop</label>
              <input v-model="cabForm.to" type="text" class="form-input" placeholder="Drop location" />
            </div>
            <div class="form-group">
              <label>Date & Time</label>
              <input v-model="cabForm.date" type="datetime-local" class="form-input" />
            </div>
            <div class="form-group">
              <label>Cab Type</label>
              <select v-model="cabForm.cabType" class="form-input">
                <option value="mini">Mini</option>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" @click="searchCabs">Find Cabs</button>
        </div>

        <div v-if="hasSearchedBooking.cabs && cabResults.length" class="results-grid">
          <div v-for="cab in cabResults" :key="cab.id" class="result-card glass-card">
            <div class="result-header">
              <strong>{{ cab.service }}</strong>
              <span class="badge">{{ cab.cabType }}</span>
            </div>
            <div class="result-details">
              <div>{{ cab.from }} → {{ cab.to }}</div>
              <div class="muted">{{ cab.estimatedTime }}</div>
            </div>
            <div class="result-footer">
              <span class="price">{{ priceInr(cab.price) }}</span>
              <button class="btn btn-outline btn-sm" @click="addToCart(cab)">Book Now</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== ROADTRIP SECTION ========== -->
    <section v-if="activeSection === 'roadtrip'" class="roadtrip-section">
      <h2>🚗 Roadtrip Planner</h2>

      <div class="vehicle-selector">
        <button
          v-for="vehicle in vehicleTypes"
          :key="vehicle.id"
          class="booking-tab"
          :class="{ active: roadtripVehicle === vehicle.id }"
          @click="roadtripVehicle = vehicle.id; onVehicleChange()"
        >
          {{ vehicle.label }}
        </button>
      </div>

      <div class="search-card glass-card">
        <h3>{{ roadtripVehicle === 'car' ? '🚗 Car' : '🏍️ Bike' }} Trip Details</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>From</label>
            <input v-model="roadtripForm.from" type="text" class="form-input" placeholder="Starting point" />
          </div>
          <div class="form-group">
            <label>To</label>
            <input v-model="roadtripForm.to" type="text" class="form-input" placeholder="Destination" />
          </div>
          <div class="form-group">
            <label>Fuel Type</label>
            <select v-model="roadtripForm.fuelType" class="form-input">
              <option v-for="fuel in currentFuelTypes" :key="fuel.value" :value="fuel.value">
                {{ fuel.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Distance (km)</label>
            <input v-model.number="roadtripForm.distance" type="number" min="1" class="form-input" />
          </div>
        </div>

        <!-- ✅ Feature #2: Vehicle Mileage Section -->
        <div class="vehicle-mileage-section">
          <div class="mileage-header">
            <label class="checkbox-label">
              <input type="checkbox" v-model="vehicleMileage.enabled" />
              <span>Use my vehicle's actual average</span>
            </label>
            <small>Apni gaadi ka real average dalo for accurate fuel calculation</small>
          </div>
          <div v-if="vehicleMileage.enabled" class="mileage-input-row">
            <label>
              <span>Your {{ roadtripForm.fuelType === 'ev' ? 'Electric' : roadtripForm.fuelType.charAt(0).toUpperCase() + roadtripForm.fuelType.slice(1) }} mileage</span>
              <div class="input-with-unit">
                <input 
                  class="form-input" 
                  type="number" 
                  min="1" 
                  step="0.1" 
                  :placeholder="roadtripForm.fuelType === 'ev' ? 'km per kWh' : (roadtripForm.fuelType === 'cng' ? 'km per kg' : 'km per liter')" 
                  v-model.number="vehicleMileage.mileage" 
                />
                <span class="input-unit">{{ roadtripForm.fuelType === 'ev' ? 'km/kWh' : (roadtripForm.fuelType === 'cng' ? 'km/kg' : 'km/L') }}</span>
              </div>
            </label>
          </div>
        </div>

        <button class="btn btn-primary" @click="calculateRoadtrip">Calculate Trip</button>
      </div>

      <div v-if="roadtripResults" class="results-stats glass-card">
        <h3>Trip Summary</h3>
        
        <!-- ✅ Feature #3: Location Badge -->
        <div class="location-info">
          <span class="location-badge">📍 Prices based on {{ roadtripResults.location }}</span>
        </div>

        <div class="stats-grid">
          <!-- ✅ Feature #1: Enhanced Distance Display -->
          <div class="stat-card distance-highlight">
            <div class="stat-label">Total Distance</div>
            <div class="stat-value-large">{{ roadtripResults.distance }} km</div>
            <small class="stat-sub">Real distance A to B</small>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">
              Fuel Needed
              <span v-if="roadtripResults.isCustomMileage" class="custom-badge">Your avg</span>
            </div>
            <div class="stat-value">{{ roadtripResults.fuelNeeded }} {{ roadtripResults.fuelUnit }}</div>
          </div>
          
          <!-- ✅ Feature #4: Fuel Cost with Info Button -->
          <div class="stat-card">
            <div class="stat-label">
              Fuel Cost
              <button 
                type="button" 
                class="info-btn-small" 
                @mouseenter="showFuelPriceInfo = true"
                @mouseleave="showFuelPriceInfo = false"
                :title="'Real-time ' + roadtripForm.fuelType + ' price'"
              >ⓘ</button>
            </div>
            <div class="stat-value">{{ priceInr(roadtripResults.fuelCost) }}</div>
            <div v-if="showFuelPriceInfo" class="price-info-popup">
              <p><strong>{{ getCurrentFuelPriceInfo().formattedPrice }}</strong> in {{ getCurrentFuelPriceInfo().location }}</p>
              <p class="price-note">Current real-time rate</p>
            </div>
          </div>
          
          <!-- ✅ Feature #5: Toll with Breakdown -->
          <div class="stat-card">
            <div class="stat-label">
              Toll (Est.)
              <button 
                type="button" 
                class="info-btn-small" 
                v-if="detailedTollInfo"
                @mouseenter="showTollBreakdown = true"
                @mouseleave="showTollBreakdown = false"
                title="View toll breakdown"
              >ⓘ</button>
            </div>
            <div class="stat-value">{{ priceInr(roadtripResults.tollEstimate) }}</div>
          </div>
          
          <!-- ✅ Feature #6: Total Cost -->
          <div class="stat-card highlighted">
            <div class="stat-label">Total Cost</div>
            <div class="stat-value">{{ priceInr(roadtripResults.totalCost) }}</div>
          </div>
        </div>

        <!-- Toll Breakdown Detail -->
        <div v-if="detailedTollInfo && showTollBreakdown" class="toll-breakdown-card">
          <h4>Toll Breakdown</h4>
          <p><strong>{{ detailedTollInfo.tollPlazas }}</strong> toll plazas expected on this route</p>
          <div class="toll-items">
            <div v-for="(plaza, idx) in detailedTollInfo.breakdown" :key="idx" class="toll-item-row">
              <span>{{ plaza.name }}</span>
              <span>{{ plaza.location }}</span>
              <strong>{{ priceInr(plaza.amount) }}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== STAY SECTION ========== -->
    <section v-if="activeSection === 'stay'" class="stay-section">
      <h2>🏨 Stay & Dining</h2>

      <div class="stay-tabs">
        <button
          v-for="tab in stayTabs"
          :key="tab.id"
          class="stay-tab"
          :class="{ active: stayTab === tab.id }"
          @click="stayTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Hotels -->
      <div v-if="stayTab === 'hotels'" class="stay-content">
        <div class="search-card glass-card">
          <h3>🏨 Find Hotels</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>City</label>
              <input v-model="hotelForm.city" type="text" class="form-input" placeholder="City name" />
            </div>
            <div class="form-group">
              <label>Check-in</label>
              <input v-model="hotelForm.checkIn" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>Nights</label>
              <input v-model.number="hotelForm.nights" type="number" min="1" class="form-input" />
            </div>
            <div class="form-group">
              <label>Guests</label>
              <input v-model.number="hotelForm.guests" type="number" min="1" class="form-input" />
            </div>
          </div>
          <button class="btn btn-primary" @click="searchHotels">Search Hotels</button>
        </div>

        <div v-if="hasSearchedStay.hotels && hotelResults.length" class="results-grid">
          <div v-for="hotel in hotelResults" :key="hotel.id" class="result-card glass-card">
            <div class="result-header">
              <strong>{{ hotel.name }}</strong>
              <span class="rating">⭐ {{ hotel.rating }}</span>
            </div>
            <div class="result-details">
              <div>📍 {{ hotel.location }}</div>
              <div class="muted">{{ priceInr(hotel.pricePerNight) }}/night</div>
            </div>
            <div class="result-footer">
              <span class="price">{{ priceInr(hotel.price) }}</span>
              <button class="btn btn-outline btn-sm" @click="addToCart(hotel)">Book</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Restaurants -->
      <div v-if="stayTab === 'restaurants'" class="stay-content">
        <div class="search-card glass-card">
          <h3>🍽️ Find Restaurants</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>City</label>
              <input v-model="restaurantForm.city" type="text" class="form-input" placeholder="City name" />
            </div>
            <div class="form-group">
              <label>Cuisine</label>
              <select v-model="restaurantForm.cuisine" class="form-input">
                <option value="all">All Cuisines</option>
                <option value="north-indian">North Indian</option>
                <option value="south-indian">South Indian</option>
                <option value="chinese">Chinese</option>
                <option value="rajasthani">Rajasthani</option>
              </select>
            </div>
            <div class="form-group">
              <label>Price Range</label>
              <select v-model="restaurantForm.priceRange" class="form-input">
                <option value="budget">Budget (₹₹)</option>
                <option value="medium">Medium (₹₹₹)</option>
                <option value="premium">Premium (₹₹₹₹)</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" @click="searchRestaurants">Find Restaurants</button>
        </div>

        <div v-if="hasSearchedStay.restaurants && restaurantResults.length" class="results-grid">
          <div v-for="restaurant in restaurantResults" :key="restaurant.id" class="result-card glass-card">
            <div class="result-header">
              <strong>{{ restaurant.name }}</strong>
              <span class="rating">⭐ {{ restaurant.rating }}</span>
            </div>
            <div class="result-details">
              <div>🍽️ {{ restaurant.cuisine }}</div>
              <div>📍 {{ restaurant.location }}</div>
            </div>
            <div class="result-footer">
              <span class="price">{{ priceInr(restaurant.priceForTwo) }} for 2</span>
              <button class="btn btn-outline btn-sm" @click="addToCart(restaurant)">Add</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== MY BOOKINGS SECTION ========== -->
    <section v-if="activeSection === 'my-bookings'" class="my-bookings-section">
      <h2>📋 My Bookings</h2>

      <div v-if="!bookingStore.history.length" class="empty-state glass-card">
        <div class="empty-icon">📋</div>
        <h3>No bookings yet</h3>
        <p>Your travel bookings will appear here</p>
      </div>

      <div v-else class="bookings-list">
        <div v-for="booking in bookingStore.history" :key="booking.id" class="booking-card glass-card">
          <div class="booking-header">
            <div>
              <strong>{{ booking.name }}</strong>
              <span class="booking-type">{{ booking.type }}</span>
            </div>
            <button class="btn-icon" @click="removeFromHistory(booking.id)">🗑️</button>
          </div>
          <div class="booking-details">
            <div v-if="booking.from">{{ booking.from }} → {{ booking.to }}</div>
            <div v-if="booking.location">📍 {{ booking.location }}</div>
            <div class="booking-meta">
              <span class="muted">Booked: {{ new Date(booking.bookedAt).toLocaleDateString() }}</span>
              <span class="price">{{ priceInr(booking.price) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Cart Summary (Fixed Footer) -->
    <div v-if="bookingStore.cartCount" class="cart-summary-container">
      <!-- Cart Details Popup -->
      <div v-if="showCartDetails" class="cart-details glass-card">
        <div class="cart-details-header">
          <h3>Your Cart</h3>
          <button class="btn-icon" @click="showCartDetails = false">✖</button>
        </div>
        <div class="cart-items">
          <div v-for="item in bookingStore.cart" :key="item.id" class="cart-item">
            <div class="item-info">
              <strong>{{ item.name }}</strong>
              <span class="item-type">{{ item.type }}</span>
            </div>
            <div class="item-price-action">
              <span class="price">{{ priceInr(item.price) }}</span>
              <button class="btn-icon text-danger" @click="bookingStore.removeFromCart(item.id)" title="Remove item">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <div class="cart-summary">
        <div class="cart-info" @click="showCartDetails = !showCartDetails" style="cursor: pointer; user-select: none;" title="View Cart Details">
          <span>🛒 Cart: {{ bookingStore.cartCount }} items</span>
          <span class="cart-total">{{ priceInr(bookingStore.cartTotal) }}</span>
          <span class="dropdown-icon" style="font-size: 0.8rem; margin-left: 0.5rem;">{{ showCartDetails ? '▼' : '▲' }}</span>
        </div>
        <div class="cart-actions" style="display: flex; gap: 10px;">
          <button class="btn btn-outline" @click="bookingStore.clearCart()">Clear Cart</button>
          <button class="btn btn-primary" @click="proceedToCheckout">Proceed to Checkout</button>
        </div>
      </div>
      <p
        v-if="checkoutStatus.text"
        class="checkout-status"
        :class="checkoutStatus.type === 'success' ? 'checkout-status-success' : 'checkout-status-error'"
      >
        {{ checkoutStatus.text }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.travel-plan-container {
  padding: 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 100px;
}

.travel-plan-header {
  text-align: center;
  margin-bottom: 2rem;
}

.travel-plan-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.travel-plan-header p {
  color: var(--color-text-secondary, #64748b);
}

.booking-disclaimer {
  margin: 0 0 0.8rem;
  font-size: 0.82rem;
  color: var(--color-text-muted, #64748b);
  background: rgba(226, 232, 240, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
}

/* Section Navigation */
.section-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.section-nav-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.section-nav-btn:hover {
  border-color: #0ea5e9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
}

.section-nav-btn.active {
  border-color: #0ea5e9;
  background: #f0f9ff;
}

.section-label {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.section-subtitle {
  font-size: 0.85rem;
  color: #64748b;
}

/* Tabs */
.booking-tabs,
.stay-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
  flex-wrap: wrap;
}

.booking-tab,
.stay-tab {
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.booking-tab:hover,
.stay-tab:hover {
  background: #f8fafc;
}

.booking-tab.active,
.stay-tab.active {
  border-bottom-color: #0ea5e9;
  color: #0ea5e9;
}

/* Forms */
.search-card {
  padding: 1.5rem;
  color: black;
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  font-size: 0.9rem;
  color: #334155;
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

/* Results */
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.result-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #64748b;
}

.result-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f766e;
}

.rating {
  color: #f59e0b;
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #dbeafe;
  color: #0369a1;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.muted {
  color: #94a3b8;
  font-size: 0.9rem;
}

/* Vehicle Selector */
.vehicle-selector {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.vehicle-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.2s;
}

.vehicle-btn:hover {
  border-color: #0ea5e9;
  transform: translateY(-2px);
}

.vehicle-btn.active {
  border-color: #0ea5e9;
  background: #f0f9ff;
}

/* Stats */
.results-stats {
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat-card {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;
}

.stat-card.highlighted {
  background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
  color: white;
}

.stat-label {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.stat-card.highlighted .stat-label {
  color: rgba(255, 255, 255, 0.9);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.checkout-status {
  margin-top: 10px;
  font-size: 0.9rem;
  font-weight: 600;
}

.checkout-status-success {
  color: #0f766e;
}

.checkout-status-error {
  color: #b91c1c;
}

/* Bookings List */
.bookings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.booking-card {
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.booking-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.booking-type {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #dbeafe;
  color: #0369a1;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.booking-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: #64748b;
}

.booking-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.btn-icon {
  padding: 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-icon:hover {
  opacity: 1;
}

/* Empty State */
.empty-state {
  padding: 3rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #64748b;
}

/* Cart Summary */
.cart-summary-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.cart-details {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  max-height: 400px;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -10px 15px -3px rgba(0, 0, 0, 0.1);
  border-radius: 16px 16px 0 0;
  backdrop-filter: blur(10px);
}

.cart-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.cart-details-header h3 {
  margin: 0;
}

.cart-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px dashed #e2e8f0;
}

.cart-item:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-type {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
}

.item-price-action {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.text-danger {
  color: #ef4444;
}

.cart-summary {
  background: white;
  border-top: 2px solid #e2e8f0;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
}

.cart-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.cart-total {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f766e;
}

/* Glass Card */
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #0ea5e9;
  color: white;
}

.btn-primary:hover {
  background: #0284c7;
}

.btn-outline {
  background: transparent;
  border: 2px solid #0ea5e9;
  color: #0ea5e9;
}

.btn-outline:hover {
  background: #f0f9ff;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .travel-plan-header h1 {
    font-size: 2rem;
  }

  .section-nav {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .results-grid {
    grid-template-columns: 1fr;
  }

  .cart-summary {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .cart-info {
    width: 100%;
    justify-content: space-between;
  }

  .cart-summary .btn {
    width: 100%;
  }
}

/* ========== NEW ROADTRIP FEATURES STYLES ========== */

/* Vehicle Mileage Section */
.vehicle-mileage-section {
  background: rgba(224, 242, 254, 0.3);
  border: 1px solid rgba(3, 105, 161, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.mileage-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label span {
  -webkit-user-select: none;
  user-select: none;
}

.mileage-header small {
  font-size: 0.8rem;
  color: #64748b;
  padding-left: 26px;
}

.mileage-input-row {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.mileage-input-row label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mileage-input-row label span {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-unit input {
  flex: 1;
  padding-right: 70px;
}

.input-unit {
  position: absolute;
  right: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  pointer-events: none;
}

/* Location Badge */
.location-info {
  text-align: center;
  margin-bottom: 1rem;
}

.location-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: rgba(224, 242, 254, 0.6);
  color: #0369a1;
  font-weight: 600;
}

/* Enhanced Distance Display */
.distance-highlight {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.06)) !important;
  border: 2px solid rgba(99, 102, 241, 0.25) !important;
}

.stat-value-large {
  font-size: 2rem;
  font-weight: 800;
  color: #6366f1;
  margin-top: 0.25rem;
}

.stat-sub {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
  display: block;
}

/* Custom Badge */
.custom-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  margin-left: 4px;
}

/* Info Button */
.info-btn-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.15);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  margin-left: 4px;
  transition: all 0.2s;
  padding: 0;
}

.info-btn-small:hover {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.4);
  color: #6366f1;
  transform: scale(1.1);
}

/* Price Info Popup */
.price-info-popup {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.8rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.price-info-popup p {
  margin: 0 0 0.5rem;
}

.price-info-popup p:last-child {
  margin-bottom: 0;
}

.price-note {
  font-size: 0.75rem;
  color: #64748b;
}

/* Toll Breakdown Card */
.toll-breakdown-card {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.toll-breakdown-card h4 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.toll-breakdown-card p {
  margin: 0 0 1rem;
  color: #475569;
  font-size: 0.9rem;
}

.toll-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toll-item-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 0.85rem;
}

.toll-item-row span:nth-child(2) {
  color: #64748b;
  font-size: 0.8rem;
}

.toll-item-row strong {
  text-align: right;
  color: #0369a1;
}

/* Vehicle Selector */
.vehicle-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.vehicle-btn {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.vehicle-btn:hover {
  border-color: #0ea5e9;
}

.vehicle-btn.active {
  border-color: #0ea5e9;
  background: #f0f9ff;
  color: #0369a1;
}

/* Stat Card Relative Position for Popup */
.stat-card {
  position: relative;
}

@media (max-width: 640px) {
  .toll-item-row {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
  
  .toll-item-row span:nth-child(2) {
    order: 2;
  }
  
  .toll-item-row strong {
    order: 3;
    text-align: left;
  }
  
  .distance-highlight {
    grid-column: 1 / -1;
  }
  
  .stat-value-large {
    font-size: 1.5rem;
  }
}
</style>
