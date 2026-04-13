'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';

export default function Checkout() {
  const { items, subtotal, clearCart } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<'zelle' | 'paypal' | 'chime' | 'btc' | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId] = useState(`KW-${Date.now().toString().slice(-8)}`);

  // Your BTC address
  const [btcAddress] = useState("32Un3zH14ovKpSyfLWtk6pVex69CmSYVjp");

  const [customerInfo, setCustomerInfo] = useState({
    name: '', email: '', address: '', city: '', state: '', zip: '', phone: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  };

  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (paymentMethod === 'btc' && btcAddress) {
      const amount = (subtotal() * 0.00000001).toFixed(8); // placeholder conversion
      const label = `KushWorld Order ${orderId}`;
      const qrData = `bitcoin:${btcAddress}?amount=${amount}&label=${encodeURIComponent(label)}`;
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`);
    }
  }, [paymentMethod, subtotal, orderId, btcAddress]);

  const handlePlaceOrder = () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.address) {
      alert("Please fill in your name, email, and address.");
      return;
    }

    // Save order (for now to localStorage - we'll make it server-side next)
    const order = {
      id: orderId,
      date: new Date().toISOString(),
      items: items,
      total: subtotal(),
      customer: customerInfo,
      paymentMethod: paymentMethod,
      status: 'pending'
    };

    const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    localStorage.setItem('orders', JSON.stringify([...existingOrders, order]));

    setOrderPlaced(true);
    setTimeout(() => {
      clearCart();
      window.location.href = '/account';
    }, 2000);
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-[#00ff9d] mb-4">Thank You!</h1>
          <p className="text-xl">Order #{orderId} received.</p>
          <p className="text-zinc-400 mt-2">We will verify payment and ship soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-5xl font-bold mb-10 text-center">Checkout</h1>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Order Summary */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Your Order</h2>
            <div className="space-y-6">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 bg-zinc-900 p-4 rounded-2xl">
                  <div className="w-24 h-24 relative flex-shrink-0">
                    <Image 
                      src={item.image} 
                      alt={item.name} 
                      fill 
                      className="object-cover rounded-xl" 
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    {item.selectedSize && <p className="text-sm text-[#00ff9d]">Size: {item.selectedSize}</p>}
                    <p className="text-[#00ff9d] mt-1">
                      ${item.price} × {item.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-zinc-900 rounded-3xl">
              <div className="flex justify-between text-xl font-medium">
                <span>Subtotal</span>
                <span className="text-[#00ff9d]">${subtotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info + Payment */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Shipping Info</h2>
            <div className="space-y-4">
              {['name', 'email', 'address', 'city', 'state', 'zip', 'phone'].map((field) => (
                <input
                  key={field}
                  type={field === 'email' ? 'email' : 'text'}
                  name={field}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={customerInfo[field as keyof typeof customerInfo]}
                  onChange={handleInputChange}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4 text-white placeholder-zinc-500 focus:border-[#00ff9d] outline-none"
                />
              ))}
            </div>

            <h2 className="text-2xl font-semibold mt-10 mb-6">Payment Method</h2>
            <div className="grid grid-cols-2 gap-4">
              {['zelle', 'paypal', 'chime', 'btc'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method as any)}
                  className={`p-6 rounded-3xl border transition ${paymentMethod === method ? 'border-[#00ff9d] bg-zinc-900' : 'border-zinc-700 hover:border-zinc-600'}`}
                >
                  <p className="font-semibold capitalize">{method}</p>
                </button>
              ))}
            </div>

            {paymentMethod === 'btc' && qrUrl && (
              <div className="mt-8 p-8 bg-zinc-900 rounded-3xl text-center border border-[#00ff9d]/30">
                <h3 className="text-xl mb-4">Pay with Bitcoin</h3>
                <Image src={qrUrl} alt="BTC QR" width={280} height={280} className="mx-auto rounded-2xl" />
                <div className="mt-6 font-mono text-sm break-all bg-black p-4 rounded-xl">
                  {btcAddress}
                </div>
                <p className="text-xs text-amber-400 mt-4">Send exactly the subtotal in BTC. We verify manually.</p>
              </div>
            )}

            {paymentMethod && (
              <button 
                onClick={handlePlaceOrder}
                className="w-full mt-10 py-6 bg-[#00ff9d] text-black font-bold text-xl rounded-3xl hover:bg-[#00ff9d]/90 transition"
              >
                I HAVE SENT PAYMENT — CONFIRM ORDER
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}