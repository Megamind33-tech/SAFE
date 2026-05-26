export type CoverPlanType = 'trip' | 'daily' | 'monthly';

export type CoverPlanDefinition = {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: 'ZMW';
  durationMinutes: number;
  benefits: string[];
  coverType: CoverPlanType;
  isPopular?: boolean;
  isAvailable: boolean;
};

/** Server-side plan catalog — mobile must fetch via GET /cover/plans. */
export const COVER_PLAN_CATALOG: CoverPlanDefinition[] = [
  {
    id: 'basic',
    name: 'Basic Trip Cover',
    description: 'Emergency accident cash support for your commute.',
    price: 3,
    currency: 'ZMW',
    durationMinutes: 240,
    coverType: 'trip',
    benefits: ['Up to K3,000 emergency payout', 'Valid for one trip window', 'Claim support included'],
    isPopular: false,
    isAvailable: true,
  },
  {
    id: 'plus',
    name: 'Plus Trip Cover',
    description: 'Higher payout plus accident and disability support.',
    price: 5,
    currency: 'ZMW',
    durationMinutes: 240,
    coverType: 'trip',
    benefits: ['Up to K5,000 emergency payout', 'Accident and disability support', 'Priority claim handling'],
    isPopular: true,
    isAvailable: true,
  },
  {
    id: 'daily',
    name: 'Daily Cover',
    description: 'All-day protection for multiple trips.',
    price: 12,
    currency: 'ZMW',
    durationMinutes: 24 * 60,
    coverType: 'daily',
    benefits: ['Covers trips through the day', 'Up to K5,000 payout tier', 'Policy details in app'],
    isPopular: false,
    isAvailable: true,
  },
  {
    id: 'monthly',
    name: 'Monthly Cover',
    description: 'Monthly commuter protection.',
    price: 45,
    currency: 'ZMW',
    durationMinutes: 30 * 24 * 60,
    coverType: 'monthly',
    benefits: ['Rolling monthly protection', 'Best for daily commuters', 'Renewal reminders'],
    isPopular: false,
    isAvailable: false,
  },
];

export function getCoverPlanById(planId: string) {
  return COVER_PLAN_CATALOG.find((p) => p.id === planId) ?? null;
}

export function listAvailableCoverPlans() {
  return COVER_PLAN_CATALOG.map((plan) => ({ ...plan }));
}
