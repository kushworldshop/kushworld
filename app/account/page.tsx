'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';

interface Order {
  orderId: string;
  date: string;
  status: 'pending' | 'paid' | 'shipped';
  items: any[];
  customerInfo: any;
  paymentMethod: string;
  total: number;
  estimatedShipping?: string;
  review?: { rating: number; comment: string };
}

export default function CustomerAccount() {
  const { addToCart } = useCartStore();
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReset, setShowReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // 2FA state
  const [require2FA, setRequire2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('customerEmail');
    if (!savedEmail) {
      window.location.href = '/account/login';
      return;
    }
    setEmail(savedEmail);
    loadMyOrders(savedEmail);
    loadWishlist();
  }, []);

  const loadMyOrders = async (customerEmail: string) => {
    try {
      const res = await fetch('/api/orders');
      const allOrders = await res.json();
      const myOrders = allOrders
        .filter((order: any) => order.customerInfo.email.toLowerCase() === customerEmail.toLowerCase())
        .map((order: any) => ({
          ...order,
          estimatedShipping: order.status === 'shipped' 
            ? 'Shipped - Expected delivery in 3-7 days' 
            : order.status === 'paid' 
            ? 'Processing - Shipping in 1-3 business days' 
            : 'Pending verification'
        }));
      setOrders(myOrders);
    } catch (error) {
      console.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = () => {
    const saved = localStorage.getItem('wishlist');
    if (saved) setWishlist(JSON.parse(saved));
  };

  const toggleWishlist = (product: any) => {
    const exists = wishlist.some((p: any) => p.id === product.id);
    let newWishlist;
    if (exists) {
      newWishlist = wishlist.filter((p: any) => p.id !== product.id);
    } else {
      newWishlist = [...wishlist, product];
    }
    setWishlist(newWishlist);
    localStorage.setItem('wishlist', JSON.stringify(newWishlist));
  };

  const resetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    localStorage.setItem(`customer_${email}`, newPassword);
    setResetSuccess(true);
    setTimeout(() => {
      setShowReset(false);
      setNewPassword('');
      setResetSuccess(false);
    }, 1500);
  };

  const enable2FA = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    alert(`Your 2FA code is: ${code} (In real app this would be sent via email/SMS)`);
    setRequire2FA(true);
  };

  const verify2FA = () => {
    if (twoFactorCode === generatedCode) {
      alert("2FA verified successfully!");
      setRequire2FA(false);
      setTwoFactorCode('');
    } else {
      alert("Incorrect code. Please try again.");
    }
  };

  const submitReview = () => {
    if (!reviewComment.trim()) return;

    setOrders(prev => prev.map(order => 
      order.orderId === selectedOrderId 
        ? { ...order, review: { rating, comment: reviewComment } } 
        : order
    ));

    alert("Thank you for your review!");
    setShowReviewModal(false);
    setReviewComment('');
  };

  const logout = () => {
    localStorage.removeItem('customerEmail');
    window.location.href = '/';
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading your account...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold">My Kush World Account</h1>
            <p className="text-zinc-400 mt-1">Signed in as <span className="text-[#00ff9d]">{email}</span></p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowReset(!showReset)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl">Reset Password</button>
            <button onClick={enable2FA} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl">Setup 2FA</button>
            <button onClick={logout} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-2xl">Logout</button>
          </div>
        </div>

        {/* 2FA Section */}
        {require2FA && (
          <div className="bg-zinc-900 p-8 rounded-3xl mb-10 max-w-md">
            <h3 className="font-semibold mb-4">Two-Factor Authentication</h3>
            <p className="text-sm text-zinc-400 mb-4">Enter the 6-digit code sent to your email</p>
            <input
              type="text"
              maxLength={6}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-2xl px-6 py-4 text-center text-2xl tracking-widest mb-4"
              placeholder="000000"
            />
            <button onClick={verify2FA} className="w-full py-4 bg-[#00ff9d] text-black font-bold rounded-3xl">Verify Code</button>
          </div>
        )}

        {/* Reset Password */}
        {showReset && (
          <div className="bg-zinc-900 p-8 rounded-3xl mb-10 max-w-md">
            <h3 className="font-semibold mb-4">Reset Password</h3>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-2xl px-6 py-4 mb-4"
            />
            <button onClick={resetPassword} className="w-full py-4 bg-[#00ff9d] text-black font-bold rounded-3xl">Update Password</button>
            {resetSuccess && <p className="text-green-400 text-center mt-4">Password updated!</p>}
          </div>
        )}

        <h2 className="text-3xl font-semibold mb-8">Your Orders</h2>

        {orders.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-2xl">No orders yet.</p>
            <Link href="/" className="text-[#00ff9d] mt-6 inline-block">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => (
              <div key={order.orderId} className="bg-zinc-900 rounded-3xl p-8 border border-zinc-700">
                <div className="flex justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">Order #{order.orderId}</h3>
                    <p className="text-zinc-400">{new Date(order.date).toLocaleDateString()}</p>
                  </div>
                  <div className={`px-6 py-2 rounded-full text-sm capitalize ${order.status === 'shipped' ? 'bg-blue-600' : order.status === 'paid' ? 'bg-green-600' : 'bg-yellow-600'}`}>
                    {order.status}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <h4 className="font-semibold mb-4 text-[#00ff9d]">Items</h4>
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between py-2">
                        <span>{item.product.name} {item.size ? `(${item.size})` : ''}</span>
                        <span>×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-4 text-[#00ff9d]">Tracking</h4>
                    <p className="text-zinc-400">{order.estimatedShipping}</p>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <button 
                    onClick={() => {
                      setSelectedOrderId(order.orderId);
                      setShowReviewModal(true);
                    }}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl"
                  >
                    Leave a Review
                  </button>
                  <button onClick={() => order.items.forEach(item => addToCart(item.product, 1))} className="px-6 py-3 bg-[#00ff9d] text-black rounded-2xl font-medium">Reorder All</button>
                </div>

                {order.review && (
                  <div className="mt-6 p-6 bg-black rounded-2xl">
                    <p className="text-[#00ff9d]">Your Review: {order.review.rating} ★</p>
                    <p className="text-zinc-400 mt-2">"{order.review.comment}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Wishlist Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-semibold mb-8">Your Wishlist</h2>
          {wishlist.length === 0 ? (
            <p className="text-zinc-400">Your wishlist is empty.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {wishlist.map((product: any) => (
                <div key={product.id} className="bg-zinc-900 rounded-3xl p-6">
                  <img src={product.image} alt={product.name} className="w-full h-48 object-cover rounded-2xl mb-4" />
                  <h4 className="font-semibold">{product.name}</h4>
                  <p className="text-[#00ff9d]">${product.price}</p>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => addToCart(product, 1)} className="flex-1 py-3 bg-[#00ff9d] text-black rounded-2xl text-sm">Add to Cart</button>
                    <button onClick={() => toggleWishlist(product)} className="flex-1 py-3 bg-zinc-800 hover:bg-red-600 rounded-2xl text-sm">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000]">
          <div className="bg-zinc-900 p-10 rounded-3xl max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6">Review Order #{selectedOrderId}</h3>
            <div className="flex gap-2 mb-6">
              {[1,2,3,4,5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className={`text-4xl ${star <= rating ? 'text-yellow-400' : 'text-zinc-600'}`}>★</button>
              ))}
            </div>
            <textarea 
              value={reviewComment} 
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Write your review here..."
              className="w-full h-32 bg-black border border-zinc-700 rounded-2xl p-6 mb-6"
            />
            <div className="flex gap-4">
              <button onClick={() => setShowReviewModal(false)} className="flex-1 py-4 bg-zinc-800 rounded-3xl">Cancel</button>
              <button onClick={submitReview} className="flex-1 py-4 bg-[#00ff9d] text-black rounded-3xl font-bold">Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}