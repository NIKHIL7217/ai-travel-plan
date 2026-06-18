import { ref } from "vue";

export const userCurrency = ref({
  country: "Global",
  currency: "USD",
  symbol: "$",
  rate: 1.0
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

function getSymbol(code) {
  return currencySymbols[code] || code;
}

function getRate(code) {
  return exchangeRates[code] || 1.0;
}

export async function initUserCurrency() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      if (data.currency) {
        userCurrency.value = {
          country: data.country_name || "Global",
          currency: data.currency,
          symbol: getSymbol(data.currency),
          rate: getRate(data.currency)
        };
        console.log("Detected User Currency:", userCurrency.value);
        return;
      }
    }
  } catch (e) {
    // Ignore and fallback to timezone check
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const tzLower = tz.toLowerCase();
  if (tzLower.includes("calcutta") || tzLower.includes("kolkata") || tzLower.includes("delhi") || tzLower.includes("bombay") || tzLower.includes("india")) {
    userCurrency.value = { country: "India", currency: "INR", symbol: "₹", rate: 83.5 };
  } else if (tzLower.includes("london") || tzLower.includes("gb") || tzLower.includes("europe/london")) {
    userCurrency.value = { country: "United Kingdom", currency: "GBP", symbol: "£", rate: 0.79 };
  } else if (tzLower.includes("europe") || tzLower.includes("paris") || tzLower.includes("berlin") || tzLower.includes("rome") || tzLower.includes("madrid") || tzLower.includes("amsterdam")) {
    userCurrency.value = { country: "Europe", currency: "EUR", symbol: "€", rate: 0.92 };
  } else if (tzLower.includes("tokyo") || tzLower.includes("japan")) {
    userCurrency.value = { country: "Japan", currency: "JPY", symbol: "¥", rate: 158.0 };
  } else if (tzLower.includes("dubai") || tzLower.includes("abu_dhabi") || tzLower.includes("uae") || tzLower.includes("asia/dubai")) {
    userCurrency.value = { country: "United Arab Emirates", currency: "AED", symbol: "AED ", rate: 3.67 };
  } else {
    userCurrency.value = { country: "Global", currency: "USD", symbol: "$", rate: 1.0 };
  }
  console.log("Timezone Resolved User Currency:", userCurrency.value);
}

/**
 * Formats pricing by converting from baseCurrency (USD/INR) to user detected currency.
 * @param {number} amount - Price amount
 * @param {string} baseCurrency - Currency the input amount is in (default 'USD')
 */
export function formatPrice(amount, baseCurrency = "USD") {
  if (amount === null || amount === undefined || isNaN(amount)) return "N/A";
  
  // 1. Convert input price to USD first
  let priceInUsd = amount;
  const baseRate = exchangeRates[baseCurrency] || 1.0;
  priceInUsd = amount / baseRate;

  // 2. Convert from USD to target user currency
  const converted = Math.round(priceInUsd * userCurrency.value.rate);
  return `${userCurrency.value.symbol}${converted.toLocaleString()}`;
}
