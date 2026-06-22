import { NextResponse } from 'next/server';
import { getSubscriptionFeatureConfig, isSubscriptionsFeatureEnabled } from '@/lib/subscriptionAccess';
import { getSubscriptionProcessorConfig } from '@/lib/subscriptionProcessor';
import { SUBSCRIPTION_PLANS } from '@/lib/subscriptionTypes';

export async function GET() {
  const enabled = await isSubscriptionsFeatureEnabled();
  if (!enabled) {
    return NextResponse.json({ enabled: false });
  }

  const feature = await getSubscriptionFeatureConfig();
  const processor = getSubscriptionProcessorConfig();
  const monthly = SUBSCRIPTION_PLANS.monthly;

  return NextResponse.json({
    enabled: true,
    label: feature.label,
    tagline: feature.tagline,
    perksHeadline: feature.perksHeadline,
    monthlyPrice: feature.monthlyPrice ?? monthly.priceMonthly,
    plans: [
      {
        id: monthly.id,
        label: feature.label || monthly.label,
        description: feature.tagline || monthly.description,
        priceMonthly: feature.monthlyPrice ?? monthly.priceMonthly,
        currency: monthly.currency,
        interval: monthly.interval,
        perks: monthly.perks,
      },
    ],
    billing: {
      processor: processor.processor,
      ready: processor.configured,
      message: processor.message,
    },
  });
}