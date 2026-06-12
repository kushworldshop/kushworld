import LegalPage from '@/app/components/LegalPage';

export default function Returns() {
  return (
    <LegalPage title="Returns & Refunds">
      <p>Due to the nature of our products, all sales are final once shipped. We do not accept returns on opened products.</p>
      <h2 className="text-xl font-bold text-white mt-8">Damaged or Wrong Items</h2>
      <p>If your order arrives damaged or incorrect, contact us within 48 hours with photos. We will replace or refund at our discretion.</p>
      <h2 className="text-xl font-bold text-white mt-8">Lost Packages</h2>
      <p>Insured shipments that are confirmed lost by the carrier will be reshipped or refunded. File a claim through our contact page.</p>
      <h2 className="text-xl font-bold text-white mt-8">Contact</h2>
      <p>Email <a href="mailto:kushworldshop@gmail.com" className="text-[#00ff9d]">kushworldshop@gmail.com</a> with your order ID.</p>
    </LegalPage>
  );
}