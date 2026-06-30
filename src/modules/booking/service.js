/**
 * Booking module: flight / hotel / cab search.
 *
 * NOTE: This produces realistic, deterministic *estimated* inventory so the
 * booking experience works end-to-end without paid OTA contracts. Every option
 * is flagged `isEstimate: true`. The search functions are written so a real
 * provider (Amadeus, Skyscanner, Booking.com, etc.) can be dropped in later by
 * replacing the body while keeping the same return shape.
 */

const AIRLINES = [
  { code: "AI", name: "Air India" },
  { code: "6E", name: "IndiGo" },
  { code: "UK", name: "Vistara" },
  { code: "SG", name: "SpiceJet" },
  { code: "EK", name: "Emirates" },
  { code: "QR", name: "Qatar Airways" }
];

const HOTEL_BRANDS = [
  { name: "Taj", tier: "luxury" },
  { name: "ITC", tier: "luxury" },
  { name: "Marriott Courtyard", tier: "premium" },
  { name: "Lemon Tree", tier: "premium" },
  { name: "Ginger", tier: "budget" },
  { name: "OYO Townhouse", tier: "budget" }
];

const CAB_CLASSES = [
  { name: "Hatchback", seats: 4, perKm: 12, base: 80 },
  { name: "Sedan", seats: 4, perKm: 16, base: 120 },
  { name: "SUV", seats: 6, perKm: 22, base: 180 },
  { name: "Premium Sedan", seats: 4, perKm: 26, base: 220 }
];

function hashString(input) {
  const text = String(input || "seed");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededValue(seed, min, max) {
  const span = Math.max(0, max - min);
  return min + (hashString(seed) % (span + 1));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function minutesToLabel(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${pad(minutes)}m`;
}

function timeLabel(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

/**
 * Search estimated flights between two cities.
 */
export function searchFlights({ from, to, date, travelers = 1 } = {}) {
  const origin = String(from || "").trim() || "Delhi";
  const destination = String(to || "").trim() || "Goa";
  const seatCount = Math.max(1, Number(travelers) || 1);
  const baseSeed = `${origin}->${destination}|${date || ""}`;
  const baseDistanceKm = 600 + seededValue(baseSeed, 0, 1800);
  const durationMinutes = Math.round((baseDistanceKm / 650) * 60) + seededValue(`${baseSeed}d`, 20, 70);

  return AIRLINES.map((airline, index) => {
    const seed = `${baseSeed}|${airline.code}`;
    const departMinutes = 360 + seededValue(seed, 0, 720);
    const fare = Math.round((2200 + baseDistanceKm * 4.2 + seededValue(`${seed}f`, 0, 2600)) / 10) * 10;
    const stops = index % 3 === 2 ? 1 : 0;

    return {
      id: `flight_${airline.code}_${index}`,
      type: "flight",
      isEstimate: true,
      airlineCode: airline.code,
      airline: airline.name,
      flightNumber: `${airline.code}-${100 + seededValue(seed, 0, 899)}`,
      from: origin,
      to: destination,
      date: date || "",
      departTime: timeLabel(departMinutes),
      arriveTime: timeLabel(departMinutes + durationMinutes + stops * 75),
      durationLabel: minutesToLabel(durationMinutes + stops * 75),
      stops,
      stopsLabel: stops === 0 ? "Non-stop" : `${stops} stop`,
      cabin: "Economy",
      seats: seatCount,
      pricePerSeat: fare,
      price: fare * seatCount,
      currency: "INR"
    };
  }).sort((a, b) => a.price - b.price);
}

/**
 * Search estimated hotels in a city.
 */
export function searchHotels({ city, checkIn, nights = 2, travelers = 2 } = {}) {
  const place = String(city || "").trim() || "Goa";
  const nightCount = Math.max(1, Number(nights) || 1);
  const guestCount = Math.max(1, Number(travelers) || 1);

  return HOTEL_BRANDS.map((brand, index) => {
    const seed = `${place}|${brand.name}|${checkIn || ""}`;
    const tierMultiplier = brand.tier === "luxury" ? 3.4 : brand.tier === "premium" ? 1.9 : 1;
    const nightly = Math.round((1500 * tierMultiplier + seededValue(seed, 0, 2200)) / 10) * 10;
    const rating = Number((3.8 + (seededValue(`${seed}r`, 0, 11) / 10)).toFixed(1));

    return {
      id: `hotel_${index}_${hashString(seed)}`,
      type: "hotel",
      isEstimate: true,
      name: `${brand.name} ${place}`,
      tier: brand.tier,
      city: place,
      checkIn: checkIn || "",
      nights: nightCount,
      guests: guestCount,
      rating: Math.min(5, rating),
      reviews: 200 + seededValue(`${seed}v`, 0, 3200),
      amenities: ["Free WiFi", "Breakfast", brand.tier === "budget" ? "AC Rooms" : "Pool & Spa"],
      pricePerNight: nightly,
      price: nightly * nightCount,
      currency: "INR"
    };
  }).sort((a, b) => a.price - b.price);
}

/**
 * Search estimated cabs between two points.
 */
export function searchCabs({ from, to, date, distanceKm } = {}) {
  const origin = String(from || "").trim() || "Airport";
  const destination = String(to || "").trim() || "City Center";
  const seed = `${origin}->${destination}|${date || ""}`;
  const km = Number(distanceKm) > 0 ? Number(distanceKm) : 12 + seededValue(seed, 0, 38);

  return CAB_CLASSES.map((cab, index) => {
    const fare = Math.round((cab.base + km * cab.perKm + seededValue(`${seed}${cab.name}`, 0, 120)) / 10) * 10;
    const etaMinutes = 3 + seededValue(`${seed}${index}eta`, 0, 9);

    return {
      id: `cab_${index}_${hashString(seed)}`,
      type: "cab",
      isEstimate: true,
      name: cab.name,
      from: origin,
      to: destination,
      date: date || "",
      seats: cab.seats,
      distanceKm: Math.round(km),
      etaLabel: `${etaMinutes} min away`,
      price: fare,
      currency: "INR"
    };
  }).sort((a, b) => a.price - b.price);
}

export const BOOKING_DISCLAIMER =
  "Prices and availability are smart estimates for planning. Connect a live booking provider to enable real-time fares and instant ticketing.";
