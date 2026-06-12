import LegalPage from '@/app/components/LegalPage';

export default function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>Kush World respects your privacy. This policy explains how we collect and use your information.</p>
      <h2 className="text-xl font-bold text-white mt-8">Information We Collect</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Name, email, shipping address, and phone for order fulfillment</li>
        <li>Government ID images for 21+ age verification (new customers)</li>
        <li>Payment information processed securely via Authorize.net (we never store card numbers)</li>
      </ul>
      <h2 className="text-xl font-bold text-white mt-8">How We Use Your Data</h2>
      <p>Order processing, age verification, shipping, and customer support. We do not sell your personal information.</p>
      <h2 className="text-xl font-bold text-white mt-8">ID Verification</h2>
      <p>ID images are stored securely on our server and used solely for age verification. Only authorized admin staff can access them.</p>
      <h2 className="text-xl font-bold text-white mt-8">Contact</h2>
      <p>Questions? Email <a href="mailto:kushworldshop@gmail.com" className="text-[#00ff9d]">kushworldshop@gmail.com</a></p>
    </LegalPage>
  );
}