'use client';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Checkout() {
  const { items, subtotal, clearCart } = useCartStore();
  const { addPoints } = useLoyaltyStore();
  const [paymentMethod, setPaymentMethod] = useState<'zelle' | 'paypal' | 'chime' | 'btc' | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [requiresIdUpload, setRequiresIdUpload] = useState(false);
  const [idUploaded, setIdUploaded] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const btcAddress = "32Un3zH14ovKpSyfLWtk6pVex69CmSYVjp";

  const [customerInfo, setCustomerInfo] = useState({
    name: '', email: '', address: '', city: '', state: '', zip: '', phone: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  };

  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (paymentMethod === 'btc') {
      const amount = (subtotal() * 0.000008).toFixed(8);
      const label = `KushWorld Order`;
      const qrData = `bitcoin:${btcAddress}?amount=${amount}&label=${encodeURIComponent(label)}`;
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`);
    }
  }, [paymentMethod, subtotal]);

  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
  };

  const handleUploadId = async () => {
    if (!idFile || !orderId) {
      setUploadError('Please select a photo of your ID');
      return;
    }

    setUploadingId(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('idImage', idFile);

    try {
      const res = await fetch('/api/orders/upload-id', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        setIdUploaded(true);
      } else {
        setUploadError(result.error || 'Upload failed. Please try again.');
      }
    } catch {
      setUploadError('Network error. Please try again.');
    } finally {
      setUploadingId(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod || !customerInfo.name || !customerInfo.email) {
      alert("Please fill customer info and select payment method");
      return;
    }

    setLoading(true);

    const orderData = {
      customer: customerInfo,
      items: items,
      subtotal: subtotal(),
      paymentMethod,
      loyaltyUsed: 0,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await res.json();

      if (result.success) {
        setOrderId(result.orderId);
        setRequiresIdUpload(result.requiresIdUpload);
        setOrderPlaced(true);
        clearCart();
        addPoints(Math.floor(subtotal() / 10));
      } else {
        alert("Failed to save order. Try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced && requiresIdUpload && !idUploaded) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-zinc-900 border border-zinc-700 rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] text-2xl mb-4">
              ✓
            </div>
            <h1 className="text-3xl font-bold text-[#00ff9d] mb-2">Order Placed!</h1>
            <p className="text-zinc-400">
              Order <span className="font-mono text-white">{orderId}</span> received.
            </p>
          </div>

          <div className="bg-black border border-[#00ff9d]/30 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-2">21+ ID Verification Required</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              As a new customer, you must upload a clear photo of your government-issued ID
              before we can process your order. Your ID is stored securely and only used for age verification.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            capture="environment"
            onChange={handleIdFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 mb-4 border-2 border-dashed border-zinc-600 hover:border-[#00ff9d] rounded-2xl transition text-zinc-300 hover:text-white"
          >
            {idFile ? 'Change ID Photo' : 'Take or Upload ID Photo'}
          </button>

          {idPreview && (
            <div className="mb-4 relative aspect-[3/2] rounded-2xl overflow-hidden border border-zinc-700">
              <img src={idPreview} alt="ID preview" className="w-full h-full object-cover" />
            </div>
          )}

          {uploadError && (
            <p className="text-red-400 text-sm mb-4 text-center">{uploadError}</p>
          )}

          <button
            onClick={handleUploadId}
            disabled={uploadingId || !idFile}
            className="w-full py-5 bg-[#00ff9d] text-black rounded-2xl font-bold text-lg disabled:opacity-50"
          >
            {uploadingId ? 'Uploading...' : 'Submit ID & Complete Order'}
          </button>

          <p className="text-xs text-zinc-500 text-center mt-4">
            JPG, PNG, or WEBP • Max 5MB • Must show date of birth
          </p>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-[#00ff9d] mb-6">Thank You!</h1>
          <p className="text-xl mb-4">Order <span className="font-mono text-[#00ff9d]">{orderId}</span> received.</p>
          {idUploaded && (
            <p className="text-sm text-zinc-400 mb-4">
              Your ID has been submitted. We will verify your age and payment, then ship your order.
            </p>
          )}
          <p className="mb-8 text-zinc-400">We will contact you at {customerInfo.email} once payment is verified.</p>
          <Link href="/" className="inline-block bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-10">Checkout</h1>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl mb-6">Your Order</h2>
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 mb-6 border-b border-zinc-800 pb-6">
                <Image src={item.image} alt={item.name} width={80} height={80} className="rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  {item.selectedSize && <p className="text-sm text-zinc-400">Size: {item.selectedSize}</p>}
                  <p>${item.price} × {item.quantity}</p>
                </div>
              </div>
            ))}
            <div className="text-2xl font-bold mt-8">Total: ${subtotal().toFixed(2)}</div>
          </div>

          <div>
            <h2 className="text-2xl mb-6">Shipping & Payment</h2>
            <input type="text" name="name" placeholder="Full Name" value={customerInfo.name} onChange={handleInputChange} className="w-full bg-zinc-900 p-4 rounded-2xl mb-4" required />
            <input type="email" name="email" placeholder="Email" value={customerInfo.email} onChange={handleInputChange} className="w-full bg-zinc-900 p-4 rounded-2xl mb-4" required />
            <input type="tel" name="phone" placeholder="Phone" value={customerInfo.phone} onChange={handleInputChange} className="w-full bg-zinc-900 p-4 rounded-2xl mb-4" />
            <input type="text" name="address" placeholder="Street Address" value={customerInfo.address} onChange={handleInputChange} className="w-full bg-zinc-900 p-4 rounded-2xl mb-4" required />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input type="text" name="city" placeholder="City" value={customerInfo.city} onChange={handleInputChange} className="w-full bg-zinc-900 p-4 rounded-2xl" required />
              <input type="text" name="state" placeholder="State" value={customerInfo.state} onChange={handleInputChange} className="w-full bg-zinc-900 p-4 rounded-2xl" required />
            </div>
            <input type="text" name="zip" placeholder="ZIP Code" value={customerInfo.zip} onChange={handleInputChange} className="w-full bg-zinc-900 p-4 rounded-2xl mb-4" required />

            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 mb-6 text-sm text-zinc-400">
              <span className="text-[#00ff9d] font-medium">New customers:</span> You will be asked to upload a photo ID after placing your order for 21+ verification.
            </div>

            <div className="mt-8">
              <h3 className="text-xl mb-4">Payment Method</h3>
              <div className="grid grid-cols-2 gap-4">
                {['zelle', 'paypal', 'chime', 'btc'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method as 'zelle' | 'paypal' | 'chime' | 'btc')}
                    className={`p-6 rounded-3xl border transition ${paymentMethod === method ? 'border-[#00ff9d] bg-zinc-900' : 'border-zinc-700'}`}
                  >
                    <p className="font-semibold capitalize">{method}</p>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'zelle' && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30">
                <p className="font-semibold mb-2">Send Zelle payment to:</p>
                <p className="text-[#00ff9d]">kushworldshop@gmail.com</p>
                <p className="text-sm text-zinc-400 mt-3">Include your order ID in the memo after placing the order.</p>
              </div>
            )}

            {paymentMethod === 'paypal' && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30">
                <p className="font-semibold mb-2">PayPal Friends & Family:</p>
                <p className="text-[#00ff9d]">@kushworldshop</p>
                <p className="text-sm text-zinc-400 mt-3">Do not mention product names in the payment note.</p>
              </div>
            )}

            {paymentMethod === 'chime' && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30">
                <p className="font-semibold mb-2">Chime payment to:</p>
                <p className="text-[#00ff9d]">$KushWorldShop</p>
                <p className="text-sm text-zinc-400 mt-3">Send exact order total and include your order ID.</p>
              </div>
            )}

            {paymentMethod === 'btc' && qrUrl && (
              <div className="mt-8 p-8 bg-zinc-900 rounded-3xl text-center border border-[#00ff9d]/30">
                <Image src={qrUrl} alt="BTC QR" width={300} height={300} className="mx-auto rounded-2xl" />
                <div className="font-mono break-all mt-6 text-sm">{btcAddress}</div>
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={loading || !paymentMethod}
              className="w-full mt-10 py-6 bg-[#00ff9d] text-black rounded-3xl font-bold text-xl disabled:opacity-50"
            >
              {loading ? 'Saving Order...' : 'PLACE ORDER — PAYMENT WILL BE VERIFIED MANUALLY'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}