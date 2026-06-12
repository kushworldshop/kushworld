'use client';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';
import { useReferralStore } from '@/lib/referralStore';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CreditCardForm, { tokenizeCard } from '@/app/components/CreditCardForm';
import SiteLayout from '@/app/components/SiteLayout';
import {
  calculateTotals,
  MIN_ORDER_AMOUNT,
  RESTRICTED_STATES,
  FREE_SHIPPING_THRESHOLD,
} from '@/lib/checkout';
import { orderRequiresIdVerification } from '@/lib/products';
import { useAgeAccess } from '@/lib/useAgeAccess';

type PaymentMethod = 'card' | 'zelle' | 'paypal' | 'chime' | 'btc';

export default function Checkout() {
  const { items, subtotal, clearCart } = useCartStore();
  const { isMerchOnly } = useAgeAccess();
  const { addPoints } = useLoyaltyStore();
  const { code: storedReferralCode, referrerName, clearReferral } = useReferralStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [requiresIdUpload, setRequiresIdUpload] = useState(false);
  const [idUploaded, setIdUploaded] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [referralMessage, setReferralMessage] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<{
    configured: boolean;
    apiLoginId: string;
    clientKey: string;
    acceptJsUrl: string;
    environment: string;
  } | null>(null);

  const btcAddress = "32Un3zH14ovKpSyfLWtk6pVex69CmSYVjp";

  const [customerInfo, setCustomerInfo] = useState({
    name: '', email: '', address: '', city: '', state: '', zip: '', phone: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  };

  const [qrUrl, setQrUrl] = useState("");

  const handleCardReadyChange = useCallback((ready: boolean) => {
    setCardReady(ready);
  }, []);

  useEffect(() => {
    fetch('/api/payments/config')
      .then((res) => res.json())
      .then((data) => setPaymentConfig(data))
      .catch(() => setPaymentConfig(null));
  }, []);

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
      const res = await fetch('/api/orders/upload-id', { method: 'POST', body: formData });
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

  const sub = subtotal();
  const discount = Math.max(couponDiscount, referralDiscount);
  const usingReferralDiscount = referralDiscount > 0 && referralDiscount >= couponDiscount;
  const isFirstOrder = customerInfo.email
    ? !localStorage.getItem(`ordered_${customerInfo.email}`)
    : true;
  const totals = calculateTotals(sub, discount);

  useEffect(() => {
    if (!storedReferralCode || sub <= 0) {
      setReferralDiscount(0);
      setReferralMessage('');
      return;
    }

    const isFirstOrder = customerInfo.email
      ? !localStorage.getItem(`ordered_${customerInfo.email}`)
      : true;

    fetch(
      `/api/referrals?code=${encodeURIComponent(storedReferralCode)}&subtotal=${sub}&isFirstOrder=${isFirstOrder}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.valid && data.discountResult?.valid) {
          setReferralDiscount(data.discountResult.discount);
          setReferralMessage(
            referrerName
              ? `Referral from ${referrerName}: -$${data.discountResult.discount.toFixed(2)}`
              : `Referral discount: -$${data.discountResult.discount.toFixed(2)}`
          );
        } else {
          setReferralDiscount(0);
          setReferralMessage(data.discountResult?.error || '');
        }
      })
      .catch(() => {
        setReferralDiscount(0);
        setReferralMessage('');
      });
  }, [storedReferralCode, sub, customerInfo.email, referrerName]);

  const applyCoupon = async () => {
    const isFirstOrder = !localStorage.getItem(`ordered_${customerInfo.email}`);
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode, subtotal: sub, isFirstOrder }),
    });
    const data = await res.json();
    if (data.valid) {
      setCouponDiscount(data.discount);
      setCouponMessage(`Coupon applied: -$${data.discount.toFixed(2)}`);
    } else {
      setCouponDiscount(0);
      setCouponMessage(data.error || 'Invalid coupon');
    }
  };

  const validateCheckout = (): string | null => {
    if (isMerchOnly && orderRequiresIdVerification(items)) {
      return 'Your cart contains age-restricted products. Remove them to checkout as merch-only, or verify you are 21+.';
    }
    if (sub < MIN_ORDER_AMOUNT) return `Minimum order is $${MIN_ORDER_AMOUNT}`;
    const state = customerInfo.state?.toUpperCase().trim();
    if (state && RESTRICTED_STATES.includes(state)) {
      return `We cannot ship to ${state}. See Delivery Zones.`;
    }
    if (!customerInfo.name || !customerInfo.email || !customerInfo.address) {
      return 'Please complete all required fields.';
    }
    return null;
  };

  const completeOrder = async (result: { orderId: string; requiresIdUpload: boolean }, paid: boolean) => {
    setOrderId(result.orderId);
    setRequiresIdUpload(result.requiresIdUpload);
    setPaymentComplete(paid);
    setOrderPlaced(true);
    clearCart();

    const sessionRes = await fetch('/api/users/me');
    if (sessionRes.ok) {
      await sessionRes.json();
    } else {
      addPoints(Math.floor(sub / 10));
    }
    if (customerInfo.email) {
      localStorage.setItem(`ordered_${customerInfo.email}`, 'true');
    }
    if (storedReferralCode) {
      clearReferral();
    }
  };

  const handleCardPayment = async () => {
    if (!paymentConfig?.configured) {
      setPaymentError('Credit card payments are not configured yet.');
      return;
    }

    if (!cardNumber || !expMonth || !expYear || !cardCode) {
      setPaymentError('Please enter your full card details.');
      return;
    }

    setLoading(true);
    setPaymentError('');

    try {
      const opaqueData = await tokenizeCard(paymentConfig, {
        cardNumber,
        expMonth,
        expYear,
        cardCode,
      });

      const res = await fetch('/api/payments/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerInfo,
          items,
          subtotal: sub,
          discount,
          shipping: totals.shipping,
          total: totals.total,
          couponCode: couponCode || undefined,
          referralCode: storedReferralCode && isFirstOrder ? storedReferralCode : undefined,
          opaqueData,
        }),
      });

      const result = await res.json();

      if (result.success) {
        completeOrder(result, true);
      } else {
        setPaymentError(result.error || 'Payment failed. Please try again.');
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualOrder = async () => {
    setLoading(true);
    setPaymentError('');

    const orderData = {
      customer: customerInfo,
      items,
      subtotal: sub,
      discount,
      shipping: totals.shipping,
      total: totals.total,
      couponCode: couponCode || undefined,
      referralCode: storedReferralCode && isFirstOrder ? storedReferralCode : undefined,
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
        completeOrder(result, false);
      } else {
        setPaymentError('Failed to save order. Try again.');
      }
    } catch {
      setPaymentError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    const err = validateCheckout();
    if (err) { setPaymentError(err); return; }
    if (!paymentMethod) { setPaymentError('Select a payment method.'); return; }

    if (paymentMethod === 'card') {
      await handleCardPayment();
    } else {
      await handleManualOrder();
    }
  };

  if (orderPlaced && requiresIdUpload && !idUploaded) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-zinc-900 border border-zinc-700 rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00ff9d]/20 text-[#00ff9d] text-2xl mb-4">✓</div>
            <h1 className="text-3xl font-bold text-[#00ff9d] mb-2">Order Placed!</h1>
            <p className="text-zinc-400">
              Order <span className="font-mono text-white">{orderId}</span> received.
              {paymentComplete && <span className="block mt-2 text-green-400">Payment approved.</span>}
            </p>
          </div>

          <div className="bg-black border border-[#00ff9d]/30 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-2">21+ ID Verification Required</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              As a new customer, you must upload a clear photo of your government-issued ID
              before we can process your order.
            </p>
          </div>

          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" onChange={handleIdFileChange} className="hidden" />

          <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 mb-4 border-2 border-dashed border-zinc-600 hover:border-[#00ff9d] rounded-2xl transition text-zinc-300 hover:text-white">
            {idFile ? 'Change ID Photo' : 'Take or Upload ID Photo'}
          </button>

          {idPreview && (
            <div className="mb-4 relative aspect-[3/2] rounded-2xl overflow-hidden border border-zinc-700">
              <img src={idPreview} alt="ID preview" className="w-full h-full object-cover" />
            </div>
          )}

          {uploadError && <p className="text-red-400 text-sm mb-4 text-center">{uploadError}</p>}

          <button onClick={handleUploadId} disabled={uploadingId || !idFile} className="w-full py-5 bg-[#00ff9d] text-black rounded-2xl font-bold text-lg disabled:opacity-50">
            {uploadingId ? 'Uploading...' : 'Submit ID & Complete Order'}
          </button>
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
          {paymentComplete && (
            <p className="text-green-400 mb-4">Your card payment was approved.</p>
          )}
          {idUploaded && (
            <p className="text-sm text-zinc-400 mb-4">
              Your ID has been submitted. We will verify and ship your order.
            </p>
          )}
          <p className="mb-8 text-zinc-400">
            {paymentComplete
              ? `Confirmation sent to ${customerInfo.email}.`
              : `We will contact you at ${customerInfo.email} once payment is verified.`}
          </p>
          <Link href="/" className="inline-block bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const cardConfigured = paymentConfig?.configured ?? false;

  return (
    <SiteLayout>
    <div className="p-6">
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
            <div className="mt-8 space-y-2 text-sm border-t border-zinc-800 pt-6">
              <div className="flex justify-between"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
              {discount > 0 && <div className="flex justify-between text-[#00ff9d]"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>Shipping</span><span>{totals.freeShipping ? 'FREE' : `$${totals.shipping.toFixed(2)}`}</span></div>
              <div className="flex justify-between font-bold text-xl pt-2"><span>Total</span><span className="text-[#00ff9d]">${totals.total.toFixed(2)}</span></div>
              {sub < FREE_SHIPPING_THRESHOLD && <p className="text-xs text-zinc-500">Free shipping at ${FREE_SHIPPING_THRESHOLD}+</p>}
            </div>
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

            <div className="flex gap-2 mb-6">
              <input
                placeholder="Coupon code (try FIRST20)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm"
              />
              <button onClick={applyCoupon} type="button" className="bg-zinc-800 hover:bg-zinc-700 px-5 rounded-xl text-sm font-medium">
                Apply
              </button>
            </div>
            {referralMessage && usingReferralDiscount && (
              <p className="text-sm text-[#00ff9d] mb-2">{referralMessage}</p>
            )}
            {storedReferralCode && referralDiscount > 0 && !usingReferralDiscount && (
              <p className="text-sm text-zinc-500 mb-2">
                Referral saved — a better coupon is applied.
              </p>
            )}
            {couponMessage && <p className="text-sm text-zinc-400 mb-4">{couponMessage}</p>}

            {orderRequiresIdVerification(items) && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 mb-6 text-sm text-zinc-400">
                <span className="text-[#00ff9d] font-medium">New customers:</span> ID upload required after checkout for 21+ verification.
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-xl mb-4">Payment Method</h3>
              <div className="grid grid-cols-2 gap-4">
                {cardConfigured && (
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-6 rounded-3xl border transition col-span-2 ${paymentMethod === 'card' ? 'border-[#00ff9d] bg-zinc-900' : 'border-zinc-700'}`}
                  >
                    <p className="font-semibold">Credit / Debit Card</p>
                    <p className="text-xs text-zinc-400 mt-1">Secure checkout via Authorize.net</p>
                  </button>
                )}
                {(['zelle', 'paypal', 'chime', 'btc'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-6 rounded-3xl border transition ${paymentMethod === method ? 'border-[#00ff9d] bg-zinc-900' : 'border-zinc-700'}`}
                  >
                    <p className="font-semibold capitalize">{method}</p>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'card' && cardConfigured && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30">
                <CreditCardForm
                  cardNumber={cardNumber}
                  expMonth={expMonth}
                  expYear={expYear}
                  cardCode={cardCode}
                  onCardNumberChange={setCardNumber}
                  onExpMonthChange={setExpMonth}
                  onExpYearChange={setExpYear}
                  onCardCodeChange={setCardCode}
                  onReadyChange={handleCardReadyChange}
                />
              </div>
            )}

            {paymentMethod === 'zelle' && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30">
                <p className="font-semibold mb-2">Send Zelle payment to:</p>
                <p className="text-[#00ff9d]">kushworldshop@gmail.com</p>
              </div>
            )}

            {paymentMethod === 'paypal' && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30">
                <p className="font-semibold mb-2">PayPal Friends & Family:</p>
                <p className="text-[#00ff9d]">@kushworldshop</p>
              </div>
            )}

            {paymentMethod === 'chime' && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30">
                <p className="font-semibold mb-2">Chime payment to:</p>
                <p className="text-[#00ff9d]">$KushWorldShop</p>
              </div>
            )}

            {paymentMethod === 'btc' && qrUrl && (
              <div className="mt-8 p-8 bg-zinc-900 rounded-3xl text-center border border-[#00ff9d]/30">
                <Image src={qrUrl} alt="BTC QR" width={300} height={300} className="mx-auto rounded-2xl" />
                <div className="font-mono break-all mt-6 text-sm">{btcAddress}</div>
              </div>
            )}

            {paymentError && (
              <p className="text-red-400 text-sm mt-6 text-center">{paymentError}</p>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={loading || (paymentMethod === 'card' && !cardReady)}
              className="w-full mt-10 py-6 bg-[#00ff9d] text-black rounded-3xl font-bold text-xl disabled:opacity-50"
            >
              {loading
                ? 'Processing...'
                : paymentMethod === 'card'
                  ? `PAY $${totals.total.toFixed(2)} NOW`
                  : 'PLACE ORDER — PAYMENT VERIFIED MANUALLY'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </SiteLayout>
  );
}