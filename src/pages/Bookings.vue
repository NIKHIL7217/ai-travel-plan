<script setup>
import { computed, reactive, ref } from "vue";
import { formatPrice } from "../services/currency";
import { useBookingStore } from "../stores/booking";
import { usePlannerSessionStore } from "../stores/plannerSession";
import {
  BOOKING_DISCLAIMER,
  searchCabs,
  searchFlights,
  searchHotels
} from "../modules/booking/service";

const bookingStore = useBookingStore();
const plannerSession = usePlannerSessionStore();

const activeTab = ref("flights");
const tabs = [
  { id: "flights", label: "Flights" },
  { id: "trains", label: "Trains" },
  { id: "bus", label: "Bus" },
  { id: "cabs", label: "Cabs" },
  { id: "bookings", label: "My Bookings" }
];

const plannerContext = computed(() => plannerSession.activeContext || {});

const flightForm = reactive({
  from: plannerContext.value.origin && plannerContext.value.origin !== "Current Location" ? plannerContext.value.origin : "Delhi",
  to: plannerContext.value.destination || "Goa",
  date: "",
  travelers: plannerContext.value.travelers || 1
});
const trainForm = reactive({
  from: plannerContext.value.origin && plannerContext.value.origin !== "Current Location" ? plannerContext.value.origin : "Delhi",
  to: plannerContext.value.destination || "Mumbai",
  date: "",
  travelers: plannerContext.value.travelers || 1,
  class: "sleeper"
});
const busForm = reactive({
  from: plannerContext.value.origin && plannerContext.value.origin !== "Current Location" ? plannerContext.value.origin : "Delhi",
  to: plannerContext.value.destination || "Agra",
  date: "",
  travelers: plannerContext.value.travelers || 1,
  busType: "ac-seater"
});
const hotelForm = reactive({
  city: plannerContext.value.destination || "Goa",
  checkIn: "",
  nights: Math.max(1, plannerContext.value.days || 2),
  travelers: plannerContext.value.travelers || 2
});
const cabForm = reactive({
  from: "Airport",
  to: plannerContext.value.destination || "City Center",
  date: ""
});

const flightResults = ref([]);
const trainResults = ref([]);
const busResults = ref([]);
const hotelResults = ref([]);
const cabResults = ref([]);
const hasSearchedFlights = ref(false);
const hasSearchedTrains = ref(false);
const hasSearchedBuses = ref(false);
const hasSearchedHotels = ref(false);
const hasSearchedCabs = ref(false);

const showCheckout = ref(false);
const confirmation = ref(null);
const payment = reactive({ name: "", method: "card" });
const paymentError = ref("");

function priceInr(amount) {
  return formatPrice(Number(amount || 0), "INR");
}

function runFlightSearch() {
  flightResults.value = searchFlights({ ...flightForm });
  hasSearchedFlights.value = true;
}

function runTrainSearch() {
  // Mock train search
  trainResults.value = [
    {
      id: `train_${Date.now()}_1`,
      type: "train",
      name: "Rajdhani Express",
      trainNumber: "12951",
      from: trainForm.from,
      to: trainForm.to,
      departTime: "16:00",
      arriveTime: "08:35",
      durationLabel: "16h 35m",
      class: trainForm.class,
      price: trainForm.class === "1ac" ? 4200 : trainForm.class === "2ac" ? 2800 : trainForm.class === "3ac" ? 1800 : 1200,
      seats: 42
    },
    {
      id: `train_${Date.now()}_2`,
      type: "train",
      name: "Shatabdi Express",
      trainNumber: "12001",
      from: trainForm.from,
      to: trainForm.to,
      departTime: "06:00",
      arriveTime: "14:25",
      durationLabel: "8h 25m",
      class: trainForm.class,
      price: trainForm.class === "1ac" ? 3500 : trainForm.class === "2ac" ? 2200 : trainForm.class === "3ac" ? 1400 : 950,
      seats: 65
    }
  ];
  hasSearchedTrains.value = true;
}

function runBusSearch() {
  // Mock bus search
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
      durationLabel: "8h",
      busType: busForm.busType,
      price: busForm.busType === "volvo" ? 1200 : busForm.busType === "ac-sleeper" ? 950 : busForm.busType === "ac-seater" ? 800 : 650,
      seats: 35
    },
    {
      id: `bus_${Date.now()}_2`,
      type: "bus",
      name: "VRL Travels",
      operator: "VRL Travels",
      from: busForm.from,
      to: busForm.to,
      departTime: "23:30",
      arriveTime: "07:30",
      durationLabel: "8h",
      busType: busForm.busType,
      price: busForm.busType === "volvo" ? 1350 : busForm.busType === "ac-sleeper" ? 1050 : busForm.busType === "ac-seater" ? 850 : 700,
      seats: 28
    }
  ];
  hasSearchedBuses.value = true;
}

function runHotelSearch() {
  hotelResults.value = searchHotels({ ...hotelForm });
  hasSearchedHotels.value = true;
}

function runCabSearch() {
  cabResults.value = searchCabs({ ...cabForm });
  hasSearchedCabs.value = true;
}

function add(item) {
  bookingStore.addToCart(item);
}

function openCheckout() {
  if (!bookingStore.cartCount) {
    return;
  }
  paymentError.value = "";
  payment.name = payment.name || plannerContext.value.travellerName || "";
  showCheckout.value = true;
}

async function confirmPayment() {
  if (!payment.name.trim()) {
    paymentError.value = "Please enter the lead traveller name.";
    return;
  }

  const record = await bookingStore.checkout({ name: payment.name, method: payment.method });
  if (record) {
    confirmation.value = record;
    showCheckout.value = false;
    activeTab.value = "bookings";
  }
}

function closeConfirmation() {
  confirmation.value = null;
}
</script>

<template>
  <div class="container booking-page animate-fade-in">
    <header class="booking-head">
      <div>
        <h1>Book Your Trip</h1>
        <p>Search flights, hotels and cabs, add them to your trip cart, and check out in one place.</p>
      </div>
      <button
        v-if="bookingStore.cartCount"
        type="button"
        class="btn btn-primary cart-pill"
        @click="openCheckout"
      >
        Cart · {{ bookingStore.cartCount }} · {{ priceInr(bookingStore.cartTotal) }}
      </button>
    </header>

    <p class="booking-note">{{ BOOKING_DISCLAIMER }}</p>

    <nav class="booking-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="booking-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span v-if="tab.id === 'bookings' && bookingStore.confirmedBookings.length" class="tab-badge">
          {{ bookingStore.confirmedBookings.length }}
        </span>
      </button>
    </nav>

    <div class="booking-layout">
      <main class="booking-main">
        <!-- FLIGHTS -->
        <section v-if="activeTab === 'flights'">
          <form class="search-card glass-card" @submit.prevent="runFlightSearch">
            <div class="search-grid">
              <label>From<input v-model="flightForm.from" class="form-input" placeholder="Origin city" /></label>
              <label>To<input v-model="flightForm.to" class="form-input" placeholder="Destination city" /></label>
              <label>Date<input v-model="flightForm.date" type="date" class="form-input" /></label>
              <label>Travellers<input v-model.number="flightForm.travelers" type="number" min="1" max="9" class="form-input" /></label>
            </div>
            <button type="submit" class="btn btn-primary">Search Flights</button>
          </form>

          <div v-if="flightResults.length" class="result-list">
            <article v-for="flight in flightResults" :key="flight.id" class="result-card glass-card">
              <div class="result-lead">
                <strong>{{ flight.airline }}</strong>
                <span class="muted">{{ flight.flightNumber }} · {{ flight.stopsLabel }}</span>
              </div>
              <div class="flight-time">
                <div><b>{{ flight.departTime }}</b><span class="muted">{{ flight.from }}</span></div>
                <div class="flight-dur"><span>{{ flight.durationLabel }}</span><i></i></div>
                <div><b>{{ flight.arriveTime }}</b><span class="muted">{{ flight.to }}</span></div>
              </div>
              <div class="result-cta">
                <strong class="price">{{ priceInr(flight.price) }}</strong>
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="bookingStore.isInCart(flight.id) ? 'btn-outline' : 'btn-primary'"
                  :disabled="bookingStore.isInCart(flight.id)"
                  @click="add(flight)"
                >
                  {{ bookingStore.isInCart(flight.id) ? "Added" : "Add" }}
                </button>
              </div>
            </article>
          </div>
          <p v-else-if="hasSearchedFlights" class="empty-text">No flights found. Try different cities.</p>
          <p v-else class="empty-text">Search to see available flights.</p>
        </section>

        <!-- TRAINS -->
        <section v-else-if="activeTab === 'trains'">
          <form class="search-card glass-card" @submit.prevent="runTrainSearch">
            <div class="search-grid">
              <label>From<input v-model="trainForm.from" class="form-input" placeholder="Origin station" /></label>
              <label>To<input v-model="trainForm.to" class="form-input" placeholder="Destination station" /></label>
              <label>Date<input v-model="trainForm.date" type="date" class="form-input" /></label>
              <label>Travellers<input v-model.number="trainForm.travelers" type="number" min="1" max="9" class="form-input" /></label>
              <label>Class
                <select v-model="trainForm.class" class="form-input">
                  <option value="sleeper">Sleeper</option>
                  <option value="3ac">3AC</option>
                  <option value="2ac">2AC</option>
                  <option value="1ac">1AC</option>
                </select>
              </label>
            </div>
            <button type="submit" class="btn btn-primary">Search Trains</button>
          </form>

          <div v-if="trainResults.length" class="result-list">
            <article v-for="train in trainResults" :key="train.id" class="result-card glass-card">
              <div class="result-lead">
                <strong>{{ train.name }}</strong>
                <span class="muted">{{ train.trainNumber }} · {{ train.class.toUpperCase() }}</span>
              </div>
              <div class="flight-time">
                <div><b>{{ train.departTime }}</b><span class="muted">{{ train.from }}</span></div>
                <div class="flight-dur"><span>{{ train.durationLabel }}</span><i></i></div>
                <div><b>{{ train.arriveTime }}</b><span class="muted">{{ train.to }}</span></div>
              </div>
              <div class="result-cta">
                <strong class="price">{{ priceInr(train.price) }}</strong>
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="bookingStore.isInCart(train.id) ? 'btn-outline' : 'btn-primary'"
                  :disabled="bookingStore.isInCart(train.id)"
                  @click="add(train)"
                >
                  {{ bookingStore.isInCart(train.id) ? "Added" : "Add" }}
                </button>
              </div>
            </article>
          </div>
          <p v-else-if="hasSearchedTrains" class="empty-text">No trains found. Try different stations.</p>
          <p v-else class="empty-text">Search to see available trains.</p>
        </section>

        <!-- BUS -->
        <section v-else-if="activeTab === 'bus'">
          <form class="search-card glass-card" @submit.prevent="runBusSearch">
            <div class="search-grid">
              <label>From<input v-model="busForm.from" class="form-input" placeholder="Origin city" /></label>
              <label>To<input v-model="busForm.to" class="form-input" placeholder="Destination city" /></label>
              <label>Date<input v-model="busForm.date" type="date" class="form-input" /></label>
              <label>Travellers<input v-model.number="busForm.travelers" type="number" min="1" max="9" class="form-input" /></label>
              <label>Bus Type
                <select v-model="busForm.busType" class="form-input">
                  <option value="ac-seater">AC Seater</option>
                  <option value="ac-sleeper">AC Sleeper</option>
                  <option value="non-ac-seater">Non-AC Seater</option>
                  <option value="volvo">Volvo</option>
                </select>
              </label>
            </div>
            <button type="submit" class="btn btn-primary">Search Buses</button>
          </form>

          <div v-if="busResults.length" class="result-list">
            <article v-for="bus in busResults" :key="bus.id" class="result-card glass-card">
              <div class="result-lead">
                <strong>{{ bus.name }}</strong>
                <span class="muted">{{ bus.operator }} · {{ bus.busType }}</span>
              </div>
              <div class="flight-time">
                <div><b>{{ bus.departTime }}</b><span class="muted">{{ bus.from }}</span></div>
                <div class="flight-dur"><span>{{ bus.durationLabel }}</span><i></i></div>
                <div><b>{{ bus.arriveTime }}</b><span class="muted">{{ bus.to }}</span></div>
              </div>
              <div class="result-cta">
                <strong class="price">{{ priceInr(bus.price) }}</strong>
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="bookingStore.isInCart(bus.id) ? 'btn-outline' : 'btn-primary'"
                  :disabled="bookingStore.isInCart(bus.id)"
                  @click="add(bus)"
                >
                  {{ bookingStore.isInCart(bus.id) ? "Added" : "Add" }}
                </button>
              </div>
            </article>
          </div>
          <p v-else-if="hasSearchedBuses" class="empty-text">No buses found. Try different cities.</p>
          <p v-else class="empty-text">Search to see available buses.</p>
        </section>

        <!-- HOTELS -->
        <section v-else-if="activeTab === 'hotels'">
          <form class="search-card glass-card" @submit.prevent="runHotelSearch">
            <div class="search-grid">
              <label>City<input v-model="hotelForm.city" class="form-input" placeholder="Destination city" /></label>
              <label>Check-in<input v-model="hotelForm.checkIn" type="date" class="form-input" /></label>
              <label>Nights<input v-model.number="hotelForm.nights" type="number" min="1" max="30" class="form-input" /></label>
              <label>Guests<input v-model.number="hotelForm.travelers" type="number" min="1" max="12" class="form-input" /></label>
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

        <!-- CABS -->
        <section v-else-if="activeTab === 'cabs'">
          <form class="search-card glass-card" @submit.prevent="runCabSearch">
            <div class="search-grid">
              <label>From<input v-model="cabForm.from" class="form-input" placeholder="Pickup" /></label>
              <label>To<input v-model="cabForm.to" class="form-input" placeholder="Drop" /></label>
              <label>Date<input v-model="cabForm.date" type="date" class="form-input" /></label>
            </div>
            <button type="submit" class="btn btn-primary">Search Cabs</button>
          </form>

          <div v-if="cabResults.length" class="result-list">
            <article v-for="cab in cabResults" :key="cab.id" class="result-card glass-card">
              <div class="result-lead">
                <strong>{{ cab.name }}</strong>
                <span class="muted">{{ cab.seats }} seats · {{ cab.distanceKm }} km · {{ cab.etaLabel }}</span>
              </div>
              <div class="result-cta">
                <strong class="price">{{ priceInr(cab.price) }}</strong>
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="bookingStore.isInCart(cab.id) ? 'btn-outline' : 'btn-primary'"
                  :disabled="bookingStore.isInCart(cab.id)"
                  @click="add(cab)"
                >
                  {{ bookingStore.isInCart(cab.id) ? "Added" : "Add" }}
                </button>
              </div>
            </article>
          </div>
          <p v-else-if="hasSearchedCabs" class="empty-text">No cabs found.</p>
          <p v-else class="empty-text">Search to see available cabs.</p>
        </section>

        <!-- MY BOOKINGS -->
        <section v-else-if="activeTab === 'bookings'">
          <div v-if="bookingStore.confirmedBookings.length" class="result-list">
            <article v-for="booking in bookingStore.confirmedBookings" :key="booking.id" class="result-card glass-card">
              <div class="result-lead">
                <strong>{{ booking.reference }}</strong>
                <span class="muted">{{ booking.items.length }} item(s) · {{ booking.travellerName }}</span>
                <ul class="booking-items">
                  <li v-for="item in booking.items" :key="item.id">
                    {{ item.type === "flight" ? item.airline : item.name }} — {{ priceInr(item.price) }}
                  </li>
                </ul>
              </div>
              <div class="result-cta">
                <span class="status" :class="booking.status">{{ booking.status }}</span>
                <strong class="price">{{ priceInr(booking.amount) }}</strong>
                <button
                  v-if="booking.status === 'confirmed'"
                  type="button"
                  class="btn btn-sm btn-outline"
                  @click="bookingStore.cancelBooking(booking.id)"
                >
                  Cancel
                </button>
              </div>
            </article>
          </div>
          <p v-else class="empty-text">No bookings yet. Search and book to see them here.</p>
        </section>
      </main>

      <!-- CART -->
      <aside class="booking-cart glass-card">
        <h3>Trip Cart</h3>
        <p v-if="!bookingStore.cartCount" class="empty-text small">Your cart is empty. Add flights, hotels or cabs.</p>
        <template v-else>
          <ul class="cart-items">
            <li v-for="item in bookingStore.cart" :key="item.id">
              <div>
                <strong>{{ item.type === "flight" ? item.airline : item.name }}</strong>
                <span class="muted">{{ item.type }}</span>
              </div>
              <div class="cart-item-end">
                <span>{{ priceInr(item.price) }}</span>
                <button type="button" class="link-btn" @click="bookingStore.removeFromCart(item.id)">Remove</button>
              </div>
            </li>
          </ul>
          <div class="cart-total">
            <span>Total</span>
            <strong>{{ priceInr(bookingStore.cartTotal) }}</strong>
          </div>
          <button type="button" class="btn btn-primary cart-checkout" @click="openCheckout">Checkout</button>
        </template>
      </aside>
    </div>

    <!-- CHECKOUT MODAL -->
    <div v-if="showCheckout" class="modal-backdrop" @click.self="showCheckout = false">
      <div class="modal-card glass-card">
        <h3>Secure Checkout</h3>
        <p class="muted">Demo payment · no real money is charged.</p>

        <label class="modal-field">Lead traveller name
          <input v-model="payment.name" class="form-input" placeholder="Full name" />
        </label>

        <label class="modal-field">Payment method
          <select v-model="payment.method" class="form-select">
            <option value="card">Credit / Debit Card</option>
            <option value="upi">UPI</option>
            <option value="netbanking">Net Banking</option>
            <option value="wallet">Wallet</option>
          </select>
        </label>

        <div class="modal-total">
          <span>Amount payable</span>
          <strong>{{ priceInr(bookingStore.cartTotal) }}</strong>
        </div>

        <p v-if="paymentError" class="error-text">{{ paymentError }}</p>

        <div class="modal-actions">
          <button type="button" class="btn btn-outline" @click="showCheckout = false">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="bookingStore.isProcessing" @click="confirmPayment">
            {{ bookingStore.isProcessing ? "Processing..." : `Pay ${priceInr(bookingStore.cartTotal)}` }}
          </button>
        </div>
      </div>
    </div>

    <!-- CONFIRMATION MODAL -->
    <div v-if="confirmation" class="modal-backdrop" @click.self="closeConfirmation">
      <div class="modal-card glass-card confirm-card">
        <div class="confirm-tick">✓</div>
        <h3>Booking Confirmed</h3>
        <p>Reference <strong>{{ confirmation.reference }}</strong></p>
        <p class="muted">{{ confirmation.items.length }} item(s) · {{ priceInr(confirmation.amount) }} paid via {{ confirmation.paymentMethod }}.</p>
        <button type="button" class="btn btn-primary" @click="closeConfirmation">View My Bookings</button>
      </div>
    </div>
  </div>
</template>

<style scoped src="./styles/Bookings.css"></style>
