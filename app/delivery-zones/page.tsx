import LegalPage from '@/app/components/LegalPage';
import { RESTRICTED_STATES } from '@/lib/checkout';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Delivery Zones — Where Kush World Ships',
  description:
    'See where Kush World ships hemp and merch across the United States. Review restricted states and delivery zone information before ordering.',
  path: '/delivery-zones',
  keywords: ['hemp shipping states', 'hemp delivery zones', 'Kush World shipping areas'],
});

export default function DeliveryZones() {
  return (
    <LegalPage title="Delivery Zones">
      <p>Kush World ships to most US states. Orders are shipped from our fulfillment center with discreet packaging.</p>

      <h2 className="text-xl font-bold text-white mt-8">We Ship To</h2>
      <p>All US states except those listed below as restricted.</p>

      <h2 className="text-xl font-bold text-white mt-8">Restricted States</h2>
      <p className="text-red-400">We cannot ship to: {RESTRICTED_STATES.join(', ')}</p>
      <p className="mt-4 text-sm text-zinc-500">
        State laws change frequently. If your state becomes restricted, we will notify you before processing your order.
      </p>

      <h2 className="text-xl font-bold text-white mt-8">International</h2>
      <p>We currently ship within the United States only.</p>
    </LegalPage>
  );
}