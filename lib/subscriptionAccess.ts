import { getSiteContent } from '@/lib/siteContent';
import { isFeatureEnabled } from '@/lib/featureTypes';

export async function isSubscriptionsFeatureEnabled(): Promise<boolean> {
  const content = await getSiteContent();
  return isFeatureEnabled(content.features, 'subscriptions');
}

export async function getSubscriptionFeatureConfig() {
  const content = await getSiteContent();
  return content.features.subscriptions;
}