'use client';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Checkout() {
  const { items, subtotal, clearCart } = useCartStore();
  const { points, redeemPoints, addPoints } = useLoyaltyStore();
  const [paymentMethod, setPaymentMethod] = useState<'zelle' | 'paypal' | 'chime' | 'btc' | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);

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
      const amount = (subtotal() * 0.000008).toFixed(8); // rough BTC estimate - adjust as needed
      const label = `KushWorld Order`;
      const qrData = `bitcoin:${btcAddress}?amount=${amount}&label=${encodeURIComponent(label)}`;
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`);
    }
  }, [paymentMethod, subtotal]);

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
      loyaltyUsed: 0, // you can add redemption logic here later
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
        setOrderPlaced(true);
        clearCart();
        // Optional: add points for future orders
        addPoints(Math.floor(subtotal() / 10));
        alert(`Order ${result.orderId} placed! We will verify payment manually and ship soon.`);
      } else {
        alert("Failed to save order. Try again.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-[#00ff9d] mb-6">Thank You!</h1>
          <p className="text-xl mb-8">Order <span className="font-mono text-[#00ff9d]">{orderId}</span> received.</p>
          <p className="mb-8">We will contact you at {customerInfo.email} once payment is verified.</p>
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

        {/* Order Summary */}
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

          {/* Customer + Payment */}
          <div>
            <h2 className="text-2xl mb-6">Shipping & Payment</h2>
            {/* Customer form fields - abbreviated for space, add all inputs */}
            <input type="text" name="name" placeholder="Full Name" onChange={handleInputChange} className="w-full bg-zinc-900 p-4 rounded-2xl mb-4" required />
            <input type="email" name="email" placeholder="Email" onChange={handleInputChange} className="w-full bg-zinc-900 p-4 rounded-2xl mb-4" required />
            {/* Add address, city, state, zip, phone similarly */}

            <div className="mt-8">
              <h3 className="text-xl mb-4">Payment Method</h3>
              <div className="grid grid-cols-2 gap-4">
                {['zelle', 'paypal', 'chime', 'btc'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method as any)}
                    className={`p-6 rounded-3xl border transition ${paymentMethod === method ? 'border-[#00ff9d] bg-zinc-900' : 'border-zinc-700'}`}
                  >
                    <p className="font-semibold capitalize">{method}</p>
                  </button>
                ))}
              </div>
            </div>

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