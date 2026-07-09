import { ref } from "vue";
import { lookupIpLocation } from "./geo/ipLookup";

export const userCurrency = ref({
  country: "Global",
  currency: "INR",
  symbol: "₹",
  rate: 83.5
});

const exchangeRates = {
  INR: 83.5,
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 158.0,
  AED: 3.67,
  CAD: 1.37,
  AUD: 1.51,
  SGD: 1.35
};

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AED: "AED ",
  CAD: "C$",
  AUD: "A$",
  SGD: "S$"
};

const countryToCurrency = {
  india: "INR",
  "united states": "USD",
  usa: "USD",
  "united kingdom": "GBP",
  uk: "GBP",
  france: "EUR",
  germany: "EUR",
  italy: "EUR",
  spain: "EUR",
  netherlands: "EUR",
  portugal: "EUR",
  japan: "JPY",
  "united arab emirates": "AED",
  uae: "AED",
  canada: "CAD",
  australia: "AUD",
  singapore: "SGD"
};

function getSymbol(code) {
  return currencySymbols[code] || code;
}

function getRate(code) {
  return exchangeRates[code] || 1.0;
}

function resolveCurrencyFromCountry(country) {
  const key = String(country || "").trim().toLowerCase();
  return countryToCurrency[key] || null;
}

function setCurrencyByCode(code, country = "Global") {
  const normalized = "INR";
  userCurrency.value = {
    country,
    currency: normalized,
    symbol: getSymbol(normalized),
    rate: getRate(normalized)
  };
}

export async function initUserCurrency(locationHint = null) {
  if (locationHint?.country) {
    setCurrencyByCode("INR", locationHint.country);
    return;
  }

  try {
    const data = await lookupIpLocation();
    if (data?.country) {
      setCurrencyByCode("INR", data.country);
      return;
    }
  } catch (e) {
    // Ignore and fallback to timezone check
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const tzLower = tz.toLowerCase();
  if (tzLower.includes("calcutta") || tzLower.includes("kolkata") || tzLower.includes("delhi") || tzLower.includes("bombay") || tzLower.includes("india")) {
    setCurrencyByCode("INR", "India");
  } else if (tzLower.includes("london") || tzLower.includes("gb") || tzLower.includes("europe/london")) {
    setCurrencyByCode("INR", "United Kingdom");
  } else if (tzLower.includes("europe") || tzLower.includes("paris") || tzLower.includes("berlin") || tzLower.includes("rome") || tzLower.includes("madrid") || tzLower.includes("amsterdam")) {
    setCurrencyByCode("INR", "Europe");
  } else if (tzLower.includes("tokyo") || tzLower.includes("japan")) {
    setCurrencyByCode("INR", "Japan");
  } else if (tzLower.includes("dubai") || tzLower.includes("abu_dhabi") || tzLower.includes("uae") || tzLower.includes("asia/dubai")) {
    setCurrencyByCode("INR", "United Arab Emirates");
  } else {
    setCurrencyByCode("INR", "Global");
  }
}

export function convertCurrency(amount, fromCurrency = "USD", toCurrency = "INR") {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return 0;
  }

  const fromRate = exchangeRates[fromCurrency] || 1.0;
  const toRate = exchangeRates[toCurrency] || exchangeRates.INR;
  const amountInUsd = Number(amount) / fromRate;
  return amountInUsd * toRate;
}

export function toInr(amount, baseCurrency = "USD") {
  return Math.round(convertCurrency(amount, baseCurrency, "INR"));
}

/**
 * Formats pricing by converting from baseCurrency (USD/INR) to user detected currency.
 * @param {number} amount - Price amount
 * @param {string} baseCurrency - Currency the input amount is in (default 'USD')
 */
export function formatPrice(amount, baseCurrency = "USD") {
  if (amount === null || amount === undefined || isNaN(amount)) return "N/A";

  const converted = toInr(amount, baseCurrency);
  return `₹${converted.toLocaleString("en-IN")}`;
}
