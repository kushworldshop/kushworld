'use client';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';
import { useReferralStore } from '@/lib/referralStore';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CreditCardForm, { tokenizeCard } from '@/app/components/CreditCardForm';
import BtcPaymentScreen from '@/app/components/BtcPaymentScreen';
import SiteLayout from '@/app/components/SiteLayout';
import {
  calculateShipping,
  calculateTotals,
  getShippingOptions,
  MIN_ORDER_AMOUNT,
  RESTRICTED_STATES,
  FREE_SHIPPING_THRESHOLD,
  type ShippingCarrier,
} from '@/lib/checkout';
import { orderRequiresIdVerification } from '@/lib/products';
import { useAgeAccess } from '@/lib/useAgeAccess';
import {
  MIN_REDEMPTION_POINTS,
  calculateMaxRedeemablePoints,
  pointsToDollarDiscount,
} from '@/lib/loyaltyUtils';
import {
  computeSpinPrizePreview,
  isSpinPrizeActive,
  type SpinPrize,
} from '@/lib/spinWheelTypes';

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
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    source: 'coupon' | 'loyalty';
    referrerName?: string;
    referrerCode?: string;
  } | null>(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [lockedPoints, setLockedPoints] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);
  const [loyaltyMessage, setLoyaltyMessage] = useState('');
  const [activeSpinPrize, setActiveSpinPrize] = useState<SpinPrize | null>(null);
  const [useSpinPrize, setUseSpinPrize] = useState(false);
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

  const [btcEnabled, setBtcEnabled] = useState(true);
  const [btcPayment, setBtcPayment] = useState<{
    orderId: string;
    address: string;
    amountBtc: number;
    amountUsd: number;
    rateUsd: number;
    expiresAt: string;
    qrUrl: string;
  } | null>(null);
  const [btcPaymentComplete, setBtcPaymentComplete] = useState(false);

  const [shippingCarrier, setShippingCarrier] = useState<ShippingCarrier>('usps');

  const [customerInfo, setCustomerInfo] = useState({
    name: '', email: '', address: '', city: '', state: '', zip: '', phone: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  };

  const handleCardReadyChange = useCallback((ready: boolean) => {
    setCardReady(ready);
  }, []);

  useEffect(() => {
    fetch('/api/payments/config')
      .then((res) => res.json())
      .then((data) => setPaymentConfig(data))
      .catch(() => setPaymentConfig(null));

    fetch('/api/payments/btc/config')
      .then((res) => res.json())
      .then((data) => setBtcEnabled(!!data.enabled))
      .catch(() => setBtcEnabled(false));
  }, []);

  useEffect(() => {
    fetch('/api/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setIsLoggedIn(true);
          setAvailablePoints(data.user.redeemableLoyaltyPoints ?? data.user.loyaltyPoints ?? 0);
          setLockedPoints(data.user.lockedLoyaltyPoints ?? 0);
          const prize = data.user.activeSpinPrize ?? null;
          setActiveSpinPrize(isSpinPrizeActive(prize) ? prize : null);
          setUseSpinPrize(isSpinPrizeActive(prize));
        } else {
          setIsLoggedIn(false);
          setAvailablePoints(0);
          setLockedPoints(0);
          setActiveSpinPrize(null);
          setUseSpinPrize(false);
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
        setAvailablePoints(0);
        setLockedPoints(0);
      });
  }, []);

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
  const promoDiscount = appliedPromo?.discount ?? 0;
  const usingLoyaltyPromo = appliedPromo?.source === 'loyalty';
  const spinPreview = computeSpinPrizePreview(activeSpinPrize, sub, useSpinPrize);
  const spinDiscount = spinPreview.spinDiscount;
  const maxRedeemablePoints = calculateMaxRedeemablePoints(
    availablePoints,
    sub,
    promoDiscount + spinDiscount
  );
  const loyaltyDiscount = useLoyalty ? pointsToDollarDiscount(loyaltyPointsToUse) : 0;
  const discount = Math.min(sub, promoDiscount + loyaltyDiscount + spinDiscount);
  const isFirstOrder = customerInfo.email
    ? !localStorage.getItem(`ordered_${customerInfo.email}`)
    : true;
  const shippingOptions = getShippingOptions(sub);
  const selectedShipping = shippingOptions.find((option) => option.id === shippingCarrier) ?? shippingOptions[0];
  const baseTotals = calculateTotals(sub, discount, shippingCarrier);
  const shipping = spinPreview.freeShipping ? 0 : calculateShipping(sub, shippingCarrier);
  const total = Math.max(0, sub - discount + shipping);
  const totals = {
    ...baseTotals,
    shipping,
    total,
    freeShipping: shipping === 0 && sub > 0,
    shippingCarrier,
    shippingLabel: selectedShipping.label,
  };

  useEffect(() => {
    if (!storedReferralCode || sub <= 0) return;

    setCouponCode(storedReferralCode);
    const firstOrder = customerInfo.email
      ? !localStorage.getItem(`ordered_${customerInfo.email}`)
      : true;

    fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: storedReferralCode, subtotal: sub, isFirstOrder: firstOrder }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid && data.source === 'loyalty') {
          setAppliedPromo({
            code: data.code,
            discount: data.discount,
            source: 'loyalty',
            referrerName: data.referrerName || referrerName,
            referrerCode: data.referrerCode,
          });
          setCouponMessage(
            data.referrerName || referrerName
              ? `Promo from ${data.referrerName || referrerName}: -$${data.discount.toFixed(2)}`
              : `Promo applied: -$${data.discount.toFixed(2)}`
          );
        }
      })
      .catch(() => {});
  }, [storedReferralCode, sub, customerInfo.email, referrerName]);

  useEffect(() => {
    if (!useLoyalty) return;
    const max = calculateMaxRedeemablePoints(availablePoints, sub, promoDiscount + spinDiscount);
    if (loyaltyPointsToUse > max) {
      setLoyaltyPointsToUse(max >= MIN_REDEMPTION_POINTS ? max : 0);
    }
    if (max < MIN_REDEMPTION_POINTS) {
      setUseLoyalty(false);
      setLoyaltyPointsToUse(0);
      setLoyaltyMessage('');
    }
  }, [sub, promoDiscount, spinDiscount, availablePoints, useLoyalty, loyaltyPointsToUse]);

  const applyMaxLoyalty = () => {
    const max = calculateMaxRedeemablePoints(availablePoints, sub, promoDiscount + spinDiscount);
    if (max < MIN_REDEMPTION_POINTS) {
      setLoyaltyMessage(`Need at least ${MIN_REDEMPTION_POINTS} points and a $${(MIN_REDEMPTION_POINTS / 100).toFixed(2)} discountable balance`);
      return;
    }
    setUseLoyalty(true);
    setLoyaltyPointsToUse(max);
    setLoyaltyMessage(`Applying ${max} points (-$${pointsToDollarDiscount(max).toFixed(2)})`);
  };

  const applyCoupon = async () => {
    const firstOrder = customerInfo.email
      ? !localStorage.getItem(`ordered_${customerInfo.email}`)
      : true;
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode, subtotal: sub, isFirstOrder: firstOrder }),
    });
    const data = await res.json();
    if (data.valid) {
      setAppliedPromo({
        code: data.code,
        discount: data.discount,
        source: data.source,
        referrerName: data.referrerName,
        referrerCode: data.referrerCode,
      });
      setCouponMessage(
        data.source === 'loyalty' && data.referrerName
          ? `Promo from ${data.referrerName}: -$${data.discount.toFixed(2)}`
          : `Promo applied: -$${data.discount.toFixed(2)}`
      );
    } else {
      setAppliedPromo(null);
      setCouponMessage(data.error || 'Invalid promo code');
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
    if (useLoyalty && loyaltyPointsToUse > 0 && !isLoggedIn) {
      return 'Log in to redeem loyalty points.';
    }
    if (useLoyalty && loyaltyPointsToUse > 0 && loyaltyPointsToUse < MIN_REDEMPTION_POINTS) {
      return `Minimum ${MIN_REDEMPTION_POINTS} points to redeem.`;
    }
    if (useLoyalty && loyaltyPointsToUse > maxRedeemablePoints) {
      return 'Loyalty points exceed the allowed amount for this order.';
    }
    if (useSpinPrize && !isSpinPrizeActive(activeSpinPrize)) {
      return 'Your wheel prize is invalid or expired.';
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
          promoDiscount,
          loyaltyPointsUsed: useLoyalty ? loyaltyPointsToUse : 0,
          spinPrizeId: useSpinPrize && activeSpinPrize ? activeSpinPrize.id : undefined,
          promoCode: appliedPromo?.code,
          isFirstOrder,
          discount,
          shipping: totals.shipping,
          shippingCarrier,
          total: totals.total,
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

  const handleBtcPayment = async () => {
    setLoading(true);
    setPaymentError('');

    try {
      const res = await fetch('/api/payments/btc/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerInfo,
          items,
          subtotal: sub,
          promoDiscount,
          loyaltyPointsUsed: useLoyalty ? loyaltyPointsToUse : 0,
          spinPrizeId: useSpinPrize && activeSpinPrize ? activeSpinPrize.id : undefined,
          promoCode: appliedPromo?.code,
          isFirstOrder,
          discount,
          shipping: totals.shipping,
          shippingCarrier,
          total: totals.total,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        setPaymentError(result.error || 'Failed to create Bitcoin invoice');
        return;
      }

      setOrderId(result.orderId);
      setRequiresIdUpload(result.requiresIdUpload);
      setBtcPayment({
        orderId: result.orderId,
        ...result.payment,
      });
      setOrderPlaced(true);
      setPaymentComplete(false);
      clearCart();
      if (customerInfo.email) {
        localStorage.setItem(`ordered_${customerInfo.email}`, 'true');
      }
      if (storedReferralCode) {
        clearReferral();
      }
    } catch {
      setPaymentError('Network error. Please try again.');
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
      promoDiscount,
      loyaltyPointsUsed: useLoyalty ? loyaltyPointsToUse : 0,
      spinPrizeId: useSpinPrize && activeSpinPrize ? activeSpinPrize.id : undefined,
      promoCode: appliedPromo?.code,
      isFirstOrder,
      discount,
      shipping: totals.shipping,
      shippingCarrier,
      total: totals.total,
      paymentMethod,
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
    } else if (paymentMethod === 'btc') {
      await handleBtcPayment();
    } else {
      await handleManualOrder();
    }
  };

  if (orderPlaced && btcPayment && !btcPaymentComplete) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <BtcPaymentScreen
          orderId={btcPayment.orderId}
          payment={btcPayment}
          onPaid={() => setBtcPaymentComplete(true)}
        />
      </div>
    );
  }

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
          {(paymentComplete || btcPaymentComplete) && (
            <p className="text-green-400 mb-4">
              {paymentMethod === 'btc' ? 'Your Bitcoin payment was received.' : 'Your card payment was approved.'}
            </p>
          )}
          {idUploaded && (
            <p className="text-sm text-zinc-400 mb-4">
              Your ID has been submitted. We will verify and ship your order.
            </p>
          )}
          <p className="mb-8 text-zinc-400">
            {paymentComplete || btcPaymentComplete
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
              {promoDiscount > 0 && (
                <div className="flex justify-between text-[#00ff9d]">
                  <span>{usingLoyaltyPromo ? 'Promo code' : 'Coupon'} discount</span>
                  <span>-${promoDiscount.toFixed(2)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-[#00ff9d]">
                  <span>Loyalty ({loyaltyPointsToUse} pts)</span>
                  <span>-${loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
              {useSpinPrize && activeSpinPrize && (
                <div className="flex justify-between text-[#00ff9d]">
                  <span>Wheel: {activeSpinPrize.label}</span>
                  <span>
                    {spinDiscount > 0
                      ? `-$${spinDiscount.toFixed(2)}`
                      : spinPreview.freeShipping
                        ? 'Free ship'
                        : spinPreview.freeTshirt
                          ? 'Bonus item'
                          : 'Applied'}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping ({totals.shippingLabel})</span>
                <span>{totals.freeShipping ? 'FREE' : `$${totals.shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between font-bold text-xl pt-2"><span>Total</span><span className="text-[#00ff9d]">${totals.total.toFixed(2)}</span></div>
              {sub < FREE_SHIPPING_THRESHOLD && <p className="text-xs text-zinc-500">Free shipping at ${FREE_SHIPPING_THRESHOLD}+ on either carrier</p>}
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
            <input type="text" name="zip" placeholder="ZIP Code" value={customerInfo.zip} onChange={handleInputChange} className="w-full bg-zinc-900 p-4 rounded-2xl mb-6" required />

            <h3 className="text-lg font-semibold mb-3">Shipping Method</h3>
            <div className="space-y-3 mb-6">
              {shippingOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center justify-between gap-4 p-4 rounded-2xl border cursor-pointer transition ${
                    shippingCarrier === option.id
                      ? 'border-[#00ff9d] bg-[#00ff9d]/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shippingCarrier"
                      checked={shippingCarrier === option.id}
                      onChange={() => setShippingCarrier(option.id)}
                      className="mt-1 accent-[#00ff9d]"
                    />
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-zinc-400">{option.eta}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-[#00ff9d]">
                    {option.rate === 0 ? 'FREE' : `$${option.rate.toFixed(2)}`}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 mb-6">
              <input
                placeholder="Promo code (try FIRST20 or a friend's code)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm"
              />
              <button onClick={applyCoupon} type="button" className="bg-zinc-800 hover:bg-zinc-700 px-5 rounded-xl text-sm font-medium">
                Apply
              </button>
            </div>
            {couponMessage && <p className="text-sm text-[#00ff9d] mb-4">{couponMessage}</p>}

            {isLoggedIn && activeSpinPrize && (
              <div className="bg-zinc-900 border border-[#00ff9d]/30 rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Wheel Prize</h3>
                  <Link href="/account?tab=wheel" className="text-xs text-[#00ff9d] hover:underline">
                    Spin again
                  </Link>
                </div>
                <p className="text-sm text-[#00ff9d] mb-3">{activeSpinPrize.label}</p>
                <p className="text-xs text-zinc-500 mb-3">
                  Expires {new Date(activeSpinPrize.expiresAt).toLocaleDateString()}
                  {spinPreview.freeTshirt && ' · Free t-shirt will be added to your shipment'}
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSpinPrize}
                    onChange={(e) => setUseSpinPrize(e.target.checked)}
                    className="w-4 h-4 accent-[#00ff9d]"
                  />
                  <span className="text-sm">Apply wheel prize to this order</span>
                </label>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Loyalty Points</h3>
                {isLoggedIn ? (
                  <span className="text-sm text-[#00ff9d]">{availablePoints.toLocaleString()} pts available</span>
                ) : (
                  <Link href="/account" className="text-sm text-[#00ff9d] hover:underline">Log in to redeem</Link>
                )}
              </div>

              {isLoggedIn ? (
                <>
                  {lockedPoints > 0 && (
                    <p className="text-xs text-yellow-400 mb-2">
                      {lockedPoints.toLocaleString()} signup bonus pts locked until your first purchase completes
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 mb-3">
                    100 points = $1 off · Max {maxRedeemablePoints.toLocaleString()} pts on this order
                  </p>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="number"
                      min={0}
                      max={maxRedeemablePoints}
                      step={100}
                      value={loyaltyPointsToUse || ''}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setLoyaltyPointsToUse(val);
                        setUseLoyalty(val >= MIN_REDEMPTION_POINTS);
                        setLoyaltyMessage('');
                      }}
                      placeholder={`Min ${MIN_REDEMPTION_POINTS} pts`}
                      className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={applyMaxLoyalty}
                      className="bg-zinc-800 hover:bg-zinc-700 px-4 rounded-xl text-sm font-medium whitespace-nowrap"
                    >
                      Use Max
                    </button>
                  </div>
                  {loyaltyMessage && <p className="text-sm text-[#00ff9d]">{loyaltyMessage}</p>}
                  {useLoyalty && loyaltyDiscount > 0 && (
                    <p className="text-sm text-zinc-400 mt-2">
                      Loyalty savings: <span className="text-[#00ff9d]">-${loyaltyDiscount.toFixed(2)}</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-zinc-400">
                  Create an account to earn and redeem points at checkout.
                </p>
              )}
            </div>

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
                {btcEnabled && (
                  <button
                    onClick={() => setPaymentMethod('btc')}
                    className={`p-6 rounded-3xl border transition col-span-2 ${paymentMethod === 'btc' ? 'border-[#00ff9d] bg-zinc-900' : 'border-zinc-700'}`}
                  >
                    <p className="font-semibold">Bitcoin (BTC)</p>
                    <p className="text-xs text-zinc-400 mt-1">Scan QR · live rate · auto-detected</p>
                  </button>
                )}
                {(['zelle', 'paypal', 'chime'] as const).map((method) => (
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

            {paymentMethod === 'btc' && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30 text-sm text-zinc-400">
                <p className="font-semibold text-white mb-2">Pay with Bitcoin only</p>
                <p>After you place the order, you&apos;ll get a QR code and exact BTC amount based on the live exchange rate. Payment is detected automatically on the blockchain.</p>
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
                  : paymentMethod === 'btc'
                    ? `PLACE ORDER — PAY ${totals.total.toFixed(2)} IN BTC`
                    : 'PLACE ORDER — PAYMENT VERIFIED MANUALLY'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </SiteLayout>
  );
}