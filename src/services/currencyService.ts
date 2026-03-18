// Currency definitions and conversion utilities

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
];

// Approximate exchange rates relative to INR (fallback when offline)
const FALLBACK_RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 84.0,
  EUR: 91.0,
  GBP: 106.0,
  JPY: 0.56,
  AUD: 54.0,
  CAD: 61.0,
  CHF: 95.0,
  CNY: 11.5,
  SGD: 62.0,
  AED: 22.9,
  THB: 2.4,
};

let cachedRates: Record<string, number> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Fetch latest exchange rates from a free API.
 * Falls back to hardcoded approximations if the request fails.
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  if (cachedRates && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const response = await fetch(
      "https://api.exchangerate-data.com/v1/latest?base=INR",
    );
    if (response.ok) {
      const data = await response.json();
      if (data.rates) {
        // Convert rates: API gives "1 INR = X foreign", we want "1 foreign = X INR"
        const rates: Record<string, number> = { INR: 1 };
        for (const [code, rate] of Object.entries(data.rates)) {
          rates[code] = 1 / (rate as number);
        }
        cachedRates = rates;
        lastFetchTime = Date.now();
        return rates;
      }
    }
  } catch {
    // Silently fall back
  }

  return FALLBACK_RATES_TO_INR;
}

/**
 * Convert an amount between currencies.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number> = FALLBACK_RATES_TO_INR,
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = rates[fromCurrency] ?? 1;
  const toRate = rates[toCurrency] ?? 1;

  // Convert to INR first, then to target
  const inINR = amount * fromRate;
  return inINR / toRate;
}

/**
 * Format an amount with its currency symbol.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = "INR",
): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  const symbol = currency?.symbol ?? currencyCode;
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Get a currency by code.
 */
export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES.find((c) => c.code === code);
}
