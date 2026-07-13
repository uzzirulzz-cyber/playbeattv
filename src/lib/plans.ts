// Region-wise pricing configuration.
// Base prices are in USD; each region has a currency and optional fixed local price.

export interface RegionConfig {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  currency: string; // ISO 4217
  symbol: string;
  // Conversion rate from USD (1 USD = rate local). Used if no fixedPrice.
  rateFromUSD: number;
  // Optional fixed local prices per plan (overrides conversion).
  fixedPrices?: {
    monthly?: number;
    quarterly?: number;
    yearly?: number;
  };
}

export const REGIONS: Record<string, RegionConfig> = {
  PK: {
    code: "PK",
    name: "Pakistan",
    currency: "PKR",
    symbol: "₨",
    rateFromUSD: 280,
    // Subscription starts at $1.5 — in PKR that's ~420 (using 280/dollar).
    // Fixed local pricing for Pakistan (affordable tiers).
    fixedPrices: {
      monthly: 420,
      quarterly: 1050,
      yearly: 3360,
    },
  },
  US: { code: "US", name: "United States", currency: "USD", symbol: "$", rateFromUSD: 1 },
  GB: { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£", rateFromUSD: 0.79 },
  EU: { code: "EU", name: "European Union", currency: "EUR", symbol: "€", rateFromUSD: 0.92 },
  IN: { code: "IN", name: "India", currency: "INR", symbol: "₹", rateFromUSD: 83, fixedPrices: { monthly: 129, quarterly: 319, yearly: 999 } },
  BD: { code: "BD", name: "Bangladesh", currency: "BDT", symbol: "৳", rateFromUSD: 117, fixedPrices: { monthly: 150, quarterly: 380, yearly: 1200 } },
  AE: { code: "AE", name: "UAE", currency: "AED", symbol: "د.إ", rateFromUSD: 3.67 },
  SA: { code: "SA", name: "Saudi Arabia", currency: "SAR", symbol: "﷼", rateFromUSD: 3.75 },
  CA: { code: "CA", name: "Canada", currency: "CAD", symbol: "C$", rateFromUSD: 1.36 },
  AU: { code: "AU", name: "Australia", currency: "AUD", symbol: "A$", rateFromUSD: 1.52 },
};

export const DEFAULT_REGION = "PK";

export function getRegion(code?: string | null): RegionConfig {
  if (code && REGIONS[code]) return REGIONS[code];
  return REGIONS[DEFAULT_REGION];
}

export function getRegionList(): RegionConfig[] {
  return Object.values(REGIONS).sort((a, b) => a.name.localeCompare(b.name));
}

// Base USD plan prices — subscription starts at $1.5/month
export const PLANS = {
  monthly: {
    id: "monthly",
    name: "Monthly",
    priceUSD: 1.5,
    durationDays: 30,
    features: [
      "Full 10,000+ Live TV channels",
      "Complete Movies & Series library",
      "HD & 4K streaming",
      "1 simultaneous connection",
      "Cancel anytime",
    ],
  },
  quarterly: {
    id: "quarterly",
    name: "Quarterly",
    priceUSD: 3.99,
    durationDays: 90,
    features: [
      "Everything in Monthly",
      "Save 11% vs monthly",
      "2 simultaneous connections",
      "Priority support",
    ],
  },
  yearly: {
    id: "yearly",
    name: "Annual",
    priceUSD: 13.99,
    durationDays: 365,
    features: [
      "Everything in Quarterly",
      "Save 22% vs monthly",
      "3 simultaneous connections",
      "Early access to new content",
      "Premium support",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_LIST = Object.values(PLANS);

export function getPlanPrice(
  planId: PlanId,
  regionCode?: string | null
): { amount: number; currency: string; symbol: string } {
  const region = getRegion(regionCode);
  const plan = PLANS[planId];
  const fixed = region.fixedPrices?.[planId];
  const amount = fixed ?? Math.round(plan.priceUSD * region.rateFromUSD * 100) / 100;
  return { amount, currency: region.currency, symbol: region.symbol };
}

export function formatPrice(
  amount: number,
  currency: string,
  symbol: string
): string {
  // PKR and similar: no decimals; round to nearest.
  if (currency === "PKR" || currency === "INR" || currency === "BDT") {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

/** Fraction of content available to free (non-member) users. */
export const FREE_CONTENT_FRACTION = 0.1;
