import { getAuthorizeNetConfig } from '@/lib/authorizeNet';
import type { SubscriptionPlanId } from '@/lib/subscriptionTypes';

export type SubscriptionProcessorId = 'none' | 'authorize_net_arb' | 'stripe';

export interface SubscriptionProcessorConfig {
  processor: SubscriptionProcessorId;
  configured: boolean;
  message: string;
}

export interface CreateSubscriptionInput {
  userId: string;
  email: string;
  planId: SubscriptionPlanId;
  price: number;
  paymentNonce?: string;
}

export interface CreateSubscriptionResult {
  ok: boolean;
  error?: string;
  externalSubscriptionId?: string;
  externalCustomerId?: string;
}

export function getSubscriptionProcessorConfig(): SubscriptionProcessorConfig {
  const processor = (process.env.SUBSCRIPTION_PROCESSOR || 'none').trim() as SubscriptionProcessorId;

  if (processor === 'none' || !processor) {
    return {
      processor: 'none',
      configured: false,
      message: 'Subscription billing is not connected yet. Payment processor setup is pending.',
    };
  }

  if (processor === 'authorize_net_arb') {
    const authNet = getAuthorizeNetConfig();
    if (!authNet.isConfigured) {
      return {
        processor,
        configured: false,
        message: 'Authorize.net recurring billing is selected but merchant credentials are missing.',
      };
    }
    return {
      processor,
      configured: false,
      message: 'Authorize.net ARB integration is scaffolded but not wired yet.',
    };
  }

  if (processor === 'stripe') {
    const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
    return {
      processor,
      configured: hasStripe,
      message: hasStripe
        ? 'Stripe subscription checkout is scaffolded but not wired yet.'
        : 'Stripe is selected but STRIPE_SECRET_KEY is missing.',
    };
  }

  return {
    processor: 'none',
    configured: false,
    message: 'Unknown subscription processor configuration.',
  };
}

export async function createSubscriptionWithProcessor(
  _input: CreateSubscriptionInput
): Promise<CreateSubscriptionResult> {
  const config = getSubscriptionProcessorConfig();
  if (!config.configured) {
    return { ok: false, error: config.message };
  }

  return {
    ok: false,
    error: 'Subscription processor integration is not implemented yet.',
  };
}