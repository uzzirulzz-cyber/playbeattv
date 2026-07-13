export const PLANS = {
  monthly: {
    id: "monthly",
    name: "Monthly",
    price: 9.99,
    currency: "USD",
    durationDays: 30,
    features: [
      "10,000+ Live TV channels",
      "Full Movies & Series library",
      "HD & 4K streaming",
      "1 simultaneous connection",
      "Cancel anytime",
    ],
  },
  quarterly: {
    id: "quarterly",
    name: "Quarterly",
    price: 24.99,
    currency: "USD",
    durationDays: 90,
    features: [
      "Everything in Monthly",
      "Save 17% vs monthly",
      "2 simultaneous connections",
      "Priority support",
    ],
  },
  yearly: {
    id: "yearly",
    name: "Annual",
    price: 79.99,
    currency: "USD",
    durationDays: 365,
    features: [
      "Everything in Quarterly",
      "Save 33% vs monthly",
      "3 simultaneous connections",
      "Early access to new content",
      "Premium support",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const PLAN_LIST = Object.values(PLANS);
