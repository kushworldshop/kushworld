'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useCartStore } from '@/lib/cartStore';

export default function AccountPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const { addToCart } = useCartStore();

  useEffect(() => {
    const loggedIn = !!localStorage.getItem('loggedIn');
    setIsLoggedIn(loggedIn);

    if (loggedIn) {
      const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      setOrders(savedOrders);
    }
    setLoading(false);
  }, []);

  const reorder = (order: any) => {
    order.items.forEach((item: any) => {
      addToCart({
        id: item.id || item.product?.id || String(Date.now()),
        name: item.name || item.product?.name || 'Product',
        price: Number(item.price || item.product?.price || 0),
        image: item.image || item.product?.image || '/placeholder.jpg',
        selectedSize: item.selectedSize || item.product?.selectedSize,
      });
    });

    alert('Items added back to cart! Go to the shop page to review and checkout.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading account...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Please log in</h1>
          <p className="text-zinc-400">You need to be logged in to view your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-bold mb-10">My Account</h1>

        <div className="mb-12">
          <h2 className="text-3xl font-semibold mb-6">Order History</h2>
          
          {orders.length === 0 ? (
            <p className="text-zinc-400">No orders yet.</p>
          ) : (
            <div className="space-y-8">
              {orders.map((order, index) => (
                <div key={index} className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-sm text-zinc-500">
                        Order #{String(index + 1000).padStart(4, '0')}
                      </p>
                      <p className="text-xl font-medium mt-1">
                        {new Date(order.date || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => reorder(order)}
                      className="px-6 py-3 bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black font-bold rounded-2xl transition"
                    >
                      Reorder
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {order.items?.map((item: any, i: number) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-20 h-20 relative flex-shrink-0">
                          <Image
                            src={item.image || item.product?.image || '/placeholder.jpg'}
                            alt={item.name || 'product'}
                            fill
                            className="object-cover rounded-2xl"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.name || item.product?.name}</p>
                          {item.selectedSize && (
                            <p className="text-sm text-[#00ff9d]">Size: {item.selectedSize}</p>
                          )}
                          <p className="text-zinc-400 text-sm mt-1">
                            Qty: {item.quantity || 1} × ${Number(item.price || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-between text-lg font-medium">
                    <span>Total</span>
                    <span className="text-[#00ff9d]">
                      ${Number(order.total || 
                        order.items?.reduce((sum: number, it: any) => 
                          sum + Number(it.price || 0) * (it.quantity || 1), 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-zinc-500 text-sm">
          More features (loyalty points, profile edit, 2FA, etc.) coming soon.
        </div>
      </div>
    </div>
  );
}