import { defineStore } from "pinia";
import { computed, ref } from "vue";

const CART_KEY = "travel_os_booking_cart_v1";
const BOOKINGS_KEY = "travel_os_bookings_v1";

function safeRead(key) {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function safeWrite(key, value) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Persistence is best-effort.
  }
}

function generateReference() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const random = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `WA-${stamp}${random}`;
}

export const useBookingStore = defineStore("booking", () => {
  const cart = ref(safeRead(CART_KEY));
  const bookings = ref(safeRead(BOOKINGS_KEY));
  const isProcessing = ref(false);

  const cartCount = computed(() => cart.value.length);
  const cartTotal = computed(() => cart.value.reduce((sum, item) => sum + Number(item.price || 0), 0));
  const confirmedBookings = computed(() =>
    [...bookings.value].sort((a, b) => Number(b.bookedAt || 0) - Number(a.bookedAt || 0))
  );

  function persistCart() {
    safeWrite(CART_KEY, cart.value);
  }

  function persistBookings() {
    safeWrite(BOOKINGS_KEY, bookings.value);
  }

  function isInCart(itemId) {
    return cart.value.some((item) => item.id === itemId);
  }

  function addToCart(item) {
    if (!item || !item.id || isInCart(item.id)) {
      return;
    }
    cart.value = [...cart.value, { ...item, addedAt: Date.now() }];
    persistCart();
  }

  function removeFromCart(itemId) {
    cart.value = cart.value.filter((item) => item.id !== itemId);
    persistCart();
  }

  function clearCart() {
    cart.value = [];
    persistCart();
  }

  /**
   * Simulates a payment + ticketing step. A real Razorpay/Stripe flow would
   * replace the timeout with a gateway order + verification handshake.
   */
  async function checkout(payment = {}) {
    if (!cart.value.length || isProcessing.value) {
      return null;
    }

    isProcessing.value = true;

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));

      const reference = generateReference();
      const record = {
        id: `booking_${Date.now()}`,
        reference,
        items: cart.value.map((item) => ({ ...item })),
        amount: cartTotal.value,
        currency: cart.value[0]?.currency || "INR",
        status: "confirmed",
        paymentMethod: String(payment.method || "card"),
        travellerName: String(payment.name || "Guest Traveller"),
        bookedAt: Date.now()
      };

      bookings.value = [record, ...bookings.value].slice(0, 100);
      persistBookings();
      clearCart();

      return record;
    } finally {
      isProcessing.value = false;
    }
  }

  function cancelBooking(bookingId) {
    bookings.value = bookings.value.map((booking) =>
      booking.id === bookingId ? { ...booking, status: "cancelled" } : booking
    );
    persistBookings();
  }

  return {
    cart,
    bookings,
    isProcessing,
    cartCount,
    cartTotal,
    confirmedBookings,
    isInCart,
    addToCart,
    removeFromCart,
    clearCart,
    checkout,
    cancelBooking
  };
});
