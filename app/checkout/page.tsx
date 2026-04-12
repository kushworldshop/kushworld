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
  const [orderId] = useState(`KW-${Date.now().toString().slice(-8)}`);
  const [btcAddress] = useState("32Un3zH14ovKpSyfLWtk6pVex69CmSYVjp");
  const [qrUrl, setQrUrl] = useState("");

  const [customerInfo, setCustomerInfo] = useState({
    name: '', email: '', address: '', city: '', state: '', zip: '', phone: ''
  });

  // Loyalty redemption
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const discount = redeemPoints(pointsToRedeem); // This actually deducts points when called
  const finalTotal = Math.max(0, subtotal() - discount);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  };

  // Generate BTC QR
  useEffect(() => {
    if (paymentMethod === 'btc' && btcAddress) {
      const amountInBtc = (finalTotal / 95000).toFixed(8); // rough conversion
      const label = `KushWorld Order ${orderId}`;
      const qrData = `bitcoin:${btcAddress}?amount=${amountInBtc}&label=${encodeURIComponent(label)}`;
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrData)}`);
    }
  }, [paymentMethod, finalTotal, orderId, btcAddress]);

  const handlePlaceOrder = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.address) {
      alert("Please fill in all required shipping fields");
      return;
    }
    if (!paymentMethod) {
      alert("Please select a payment method");
      return;
    }

    // Save order to backend
    const orderData = {
      orderId,
      date: new Date().toISOString(),
      status: 'pending' as const,
      items,
      customerInfo,
      paymentMethod: paymentMethod,
      total: finalTotal,
      notes: pointsToRedeem > 0 ? `Redeemed ${pointsToRedeem} loyalty points ($${discount.toFixed(2)} discount)` : ''
    };

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      // Award new loyalty points on successful order (10 points per $1)
      const earnedPoints = Math.floor(finalTotal * 10);
      addPoints(earnedPoints);

      setOrderPlaced(true);
      clearCart();

      // Optional: clear 2FA if used
      localStorage.removeItem('customerEmail'); // optional logout after purchase

    } catch (error) {
      alert("Failed to place order. Please try again.");
    }
  };

  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
        <h2 className="text-4xl font-bold mb-4">Your cart is empty</h2>
        <Link href="/" className="text-[#00ff9d] text-xl hover:underline">← Continue Shopping</Link>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-5xl font-bold mb-4">Order Placed!</h1>
          <p className="text-2xl mb-8">Order #{orderId}</p>
          <p className="text-zinc-400 mb-10">
            Thank you! We received your order and will verify payment shortly.<br />
            You earned <span className="text-[#00ff9d]">{Math.floor(finalTotal * 10)}</span> loyalty points.
          </p>
          <Link href="/account" className="block w-full py-5 bg-[#00ff9d] text-black rounded-3xl font-bold text-xl">
            View Order in My Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-12">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-5 gap-10">
        {/* Shipping & Payment Form */}
        <div className="md:col-span-3 space-y-10">
          <div>
            <h1 className="text-4xl font-bold mb-2">Secure Checkout</h1>
            <p className="text-zinc-400">Complete your Kush World order</p>
          </div>

          {/* Shipping Info */}
          <div className="bg-zinc-900 rounded-3xl p-8">
            <h2 className="text-2xl font-semibold mb-6">Shipping Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input name="name" placeholder="Full Name" value={customerInfo.name} onChange={handleInputChange} className="bg-black border border-zinc-700 rounded-2xl px-6 py-4" required />
              <input name="email" type="email" placeholder="Email" value={customerInfo.email} onChange={handleInputChange} className="bg-black border border-zinc-700 rounded-2xl px-6 py-4" required />
              <input name="phone" placeholder="Phone Number" value={customerInfo.phone} onChange={handleInputChange} className="bg-black border border-zinc-700 rounded-2xl px-6 py-4" />
              <input name="address" placeholder="Street Address" value={customerInfo.address} onChange={handleInputChange} className="bg-black border border-zinc-700 rounded-2xl px-6 py-4 md:col-span-2" required />
              <input name="city" placeholder="City" value={customerInfo.city} onChange={handleInputChange} className="bg-black border border-zinc-700 rounded-2xl px-6 py-4" required />
              <input name="state" placeholder="State" value={customerInfo.state} onChange={handleInputChange} className="bg-black border border-zinc-700 rounded-2xl px-6 py-4" required />
              <input name="zip" placeholder="ZIP Code" value={customerInfo.zip} onChange={handleInputChange} className="bg-black border border-zinc-700 rounded-2xl px-6 py-4" required />
            </div>
          </div>

          {/* Loyalty Points Redemption */}
          {points > 0 && (
            <div className="bg-zinc-900 rounded-3xl p-8 border border-[#00ff9d]/30">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3">
                <i className="fa-solid fa-coins text-[#00ff9d]"></i> Loyalty Points
              </h2>
              <p className="text-zinc-400 mb-4">You have <span className="text-[#00ff9d] font-semibold">{points}</span> points available</p>
              
              <div className="flex gap-4 items-center">
                <input 
                  type="number" 
                  min="0" 
                  max={points}
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(Math.min(points, parseInt(e.target.value) || 0))}
                  className="bg-black border border-zinc-700 rounded-2xl px-6 py-4 w-40 text-center text-2xl"
                />
                <div>
                  <p className="text-sm text-zinc-400">Redeem points</p>
                  <p className="text-[#00ff9d] font-medium">-${discount.toFixed(2)} discount</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-3">1 point = $0.01 discount • Points will be deducted immediately</p>
            </div>
          )}

          {/* Payment Methods */}
          <div className="bg-zinc-900 rounded-3xl p-8">
            <h2 className="text-2xl font-semibold mb-6">Payment Method</h2>
            <div className="grid grid-cols-2 gap-4">
              {['zelle', 'paypal', 'chime', 'btc'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method as any)}
                  className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 hover:border-[#00ff9d] ${paymentMethod === method ? 'border-[#00ff9d] bg-black' : 'border-zinc-700'}`}
                >
                  <i className={`fa-solid text-4xl ${method === 'btc' ? 'fa-bitcoin' : method === 'paypal' ? 'fa-paypal' : 'fa-money-bill-wave'}`}></i>
                  <div>
                    <p className="font-semibold capitalize">{method}</p>
                    <p className="text-xs text-zinc-400">Manual • We verify</p>
                  </div>
                </button>
              ))}
            </div>

            {/* BTC QR Code */}
            {paymentMethod === 'btc' && qrUrl && (
              <div className="mt-10 p-8 bg-zinc-950 rounded-3xl border border-[#00ff9d]/30 text-center">
                <h3 className="font-semibold text-xl mb-6">Pay with Bitcoin</h3>
                <p className="mb-6">Send exactly <strong>${finalTotal.toFixed(2)} worth of BTC</strong></p>
                <div className="mx-auto mb-6">
                  <Image src={qrUrl} alt="Bitcoin QR" width={320} height={320} className="mx-auto rounded-2xl" />
                </div>
                <div className="bg-black p-5 rounded-2xl font-mono break-all text-sm mb-6">
                  {btcAddress}
                </div>
                <p className="text-xs text-amber-400">Scan or copy address. We verify manually and ship fast.</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="md:col-span-2">
          <div className="bg-zinc-900 rounded-3xl p-8 sticky top-8">
            <h2 className="text-2xl font-semibold mb-8">Order Summary</h2>

            <div className="space-y-6 mb-10">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4">
                  <div className="w-20 h-20 bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0">
                    <Image src={item.product.image} alt={item.product.name} width={80} height={80} className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    {item.size && <p className="text-sm text-zinc-400">Size: {item.size}</p>}
                    <p className="text-sm text-zinc-400">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right font-medium">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-700 pt-6 space-y-4 text-lg">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal().toFixed(2)}</span>
              </div>
              {pointsToRedeem > 0 && (
                <div className="flex justify-between text-[#00ff9d]">
                  <span>Loyalty Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-2xl border-t border-zinc-700 pt-4">
                <span>Total Today</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {paymentMethod && (
              <button 
                onClick={handlePlaceOrder}
                className="w-full mt-10 py-6 bg-[#00ff9d] text-black rounded-3xl font-bold text-xl hover:bg-[#00ff9d]/90 transition"
              >
                I HAVE SENT THE PAYMENT — CONFIRM ORDER #{orderId}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}