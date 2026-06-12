import LegalPage from '@/app/components/LegalPage';

export default function Terms() {
  return (
    <LegalPage title="Terms of Use">
      <p>By using kushworld.shop you agree to these terms. You must be 21 years or older to purchase.</p>
      <h2 className="text-xl font-bold text-white mt-8">Age Requirement</h2>
      <p>All customers must be 21+. New customers must submit valid government-issued ID for verification before orders are processed.</p>
      <h2 className="text-xl font-bold text-white mt-8">Products</h2>
      <p>All products are lab tested with COAs available. Products comply with applicable hemp/cannabis laws in permitted jurisdictions.</p>
      <h2 className="text-xl font-bold text-white mt-8">Orders & Payment</h2>
      <p>Minimum order $25. We reserve the right to cancel orders that violate shipping restrictions or fail verification.</p>
      <h2 className="text-xl font-bold text-white mt-8">Liability</h2>
      <p>Kush World is not responsible for misuse of products. Use responsibly and in accordance with local laws.</p>
    </LegalPage>
  );
}