import LegalPage from '@/app/components/LegalPage';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Shipping Policy — Discreet Nationwide Delivery',
  description:
    'Kush World shipping policy. Discreet insured delivery, free shipping thresholds, processing times, and tracking info for hemp and merch orders.',
  path: '/shipping-policy',
  keywords: ['hemp shipping', 'discreet cannabis delivery', 'Kush World shipping policy'],
});

export default function ShippingPolicy() {
  return (
    <LegalPage title="Shipping Policy">
      <p>All Kush World orders ship discreetly with plain packaging. No product names appear on the outside of packages.</p>
      <h2 className="text-xl font-bold text-white mt-8">Processing Time</h2>
      <p>Orders are processed within 1–3 business days after payment and ID verification (for new customers) are confirmed.</p>
      <h2 className="text-xl font-bold text-white mt-8">Shipping Rates</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Flat rate shipping: $9.99 on orders under $200</li>
        <li>FREE shipping on orders $200 and above</li>
      </ul>
      <h2 className="text-xl font-bold text-white mt-8">Delivery</h2>
      <p>Estimated delivery is 3–7 business days after shipment. Tracking is provided via email when available.</p>
      <h2 className="text-xl font-bold text-white mt-8">Insurance</h2>
      <p>All shipments are insured. Contact us immediately if your package arrives damaged.</p>
    </LegalPage>
  );
}