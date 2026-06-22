export type SubscriptionPlanId = 'monthly';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'paused'
  | 'pending';

export type SubscriptionPaymentMethod = 'card' | 'btc' | 'manual';

export interface SubscriptionPerk {
  id: string;
  label: string;
  description: string;
}

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  label: string;
  description: string;
  priceMonthly: number;
  currency: 'USD';
  interval: 'month';
  perks: SubscriptionPerk[];
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  email: string;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  price: number;
  currency: 'USD';
  paymentMethod: SubscriptionPaymentMethod;
  processor?: 'authorize_net_arb' | 'stripe' | 'manual';
  externalSubscriptionId?: string;
  externalCustomerId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  notes?: string;
}

export interface PublicSubscriptionSummary {
  id: string;
  planId: SubscriptionPlanId;
  planLabel: string;
  status: SubscriptionStatus;
  price: number;
  currency: 'USD';
  paymentMethod: SubscriptionPaymentMethod;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;
  cancelAtPeriodEnd?: boolean;
  perks: SubscriptionPerk[];
}

export const DEFAULT_MONTHLY_PERKS: SubscriptionPerk[] = [
  {
    id: 'monthly-box',
    label: 'Monthly curated box',
    description: 'A rotating selection of lab-tested hemp products shipped each cycle.',
  },
  {
    id: 'member-pricing',
    label: 'Member-only pricing',
    description: 'Exclusive discounts on shop orders while your subscription is active.',
  },
  {
    id: 'loyalty-boost',
    label: 'Bonus loyalty points',
    description: 'Earn extra points on every subscription renewal.',
  },
  {
    id: 'priority-support',
    label: 'Priority support',
    description: 'Faster responses for order and product questions.',
  },
];

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
  monthly: {
    id: 'monthly',
    label: 'Kush Club Monthly',
    description: 'Monthly membership with curated drops, member pricing, and loyalty perks.',
    priceMonthly: 49.99,
    currency: 'USD',
    interval: 'month',
    perks: DEFAULT_MONTHLY_PERKS,
  },
};

export function getSubscriptionPlan(planId: SubscriptionPlanId): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[planId];
}

export function isActiveSubscriptionStatus(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}