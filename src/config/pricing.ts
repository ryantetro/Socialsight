/**
 * Single source of truth for plans and pricing.
 * Use this everywhere instead of hardcoded prices or labels.
 */

export const PLANS = {
  free: {
    scans: 3,
    name: 'Free',
  },
  pro: {
    priceMonthly: 19,
    name: 'Pro',
  },
  featured: {
    priceMonthly: 25,
    name: 'Featured',
    description: 'Landing & leaderboard placement',
  },
  lifetime: {
    price: 99,
    name: 'Lifetime',
  },
} as const;

/** Stripe price IDs (from env). Use these for checkout. */
export const STRIPE_PRICE_IDS = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_FOUNDER ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  featured: process.env.NEXT_PUBLIC_STRIPE_PRICE_FEATURED,
  lifetime: process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD,
  /** Legacy / all-access one-time; map to lifetime for display. */
  allAccess: process.env.NEXT_PUBLIC_STRIPE_PRICE_ALL_ACCESS,
} as const;

/** Primary CTA labels. One verb per plan. */
export const CTA_LABELS = {
  startPro: 'Start Pro',
  getFeatured: 'Get Featured',
  getLifetime: 'Get Lifetime Access',
} as const;

/** Display strings for pricing (e.g. in cards). */
export const PRICE_DISPLAY = {
  pro: `$${PLANS.pro.priceMonthly}/month`,
  proShort: `$19/month`,
  featured: `$${PLANS.featured.priceMonthly}/month`,
  featuredShort: `$25/month`,
  lifetime: `$${PLANS.lifetime.price} one-time`,
  lifetimeShort: `$99 one-time`,
} as const;

export const RISK_REVERSAL = '7-day money-back guarantee';
