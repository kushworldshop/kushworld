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
import { formatCartItemOptions } from '@/lib/productOptions';
import {
  calculateShipping,
  calculateTotals,
  getShippingOptions,
  MIN_ORDER_AMOUNT,
  RESTRICTED_STATES,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_DIMENSION_NOTE,
  FEDEX_ALTERNATIVE_NOTE,
  type ShippingMethod,
} from '@/lib/checkout';
import { isFirstOrderBonusLineItem } from '@/lib/firstOrderBonus';
import { orderRequiresIdVerification } from '@/lib/products';
import { useAgeAccess } from '@/lib/useAgeAccess';
import { useSiteContent } from '@/lib/useSiteContent';
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

export const dynamic = 'force-dynamic';

export default function Checkout() {
  const { items, subtotal, clearCart, addFirstOrderBonus, removeFirstOrderBonus } = useCartStore();
  const { isMerchOnly } = useAgeAccess();
  const { content } = useSiteContent();
  const features = (content && content.features) || {};
  const { addPoints } = useLoyaltyStore();
  const { code: storedReferralCode, referrerName, clearReferral } = useReferralStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [requiresIdUpload, setRequiresIdUpload] = useState(false);
  const [idUploaded, setIdUploaded] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [orderAccessToken, setOrderAccessToken] = useState('');
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
  const [savedSpinCoupons, setSavedSpinCoupons] = useState<SpinPrize[]>([]);
  const [selectedSpinPrizeId, setSelectedSpinPrizeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFirstOrderStatus = (email: string) => {
    if (!email) return true;
    if (typeof window === 'undefined') return true;
    return !localStorage.getItem(`ordered_${email}`);
  };

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
    orderAccessToken: string;
    address: string;
    amountBtc: number;
    amountUsd: number;
    rateUsd: number;
    expiresAt: string;
    qrUrl: string;
  } | null>(null);
  const [btcPaymentComplete, setBtcPaymentComplete] = useState(false);

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('usps_ground');

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
          setCustomerInfo((prev) => ({
            ...prev,
            name: prev.name || data.user.name || '',
            email: prev.email || data.user.email || '',
            phone: prev.phone || data.user.phone || '',
            address: prev.address || data.user.shippingAddress?.address || '',
            city: prev.city || data.user.shippingAddress?.city || '',
            state: prev.state || data.user.shippingAddress?.state || '',
            zip: prev.zip || data.user.shippingAddress?.zip || '',
          }));
          const coupons = (data.user.savedSpinCoupons ?? []).filter((coupon: SpinPrize) =>
            isSpinPrizeActive(coupon)
          );
          setSavedSpinCoupons(coupons);
          setSelectedSpinPrizeId(coupons.length === 1 ? coupons[0].id : null);
        } else {
          setIsLoggedIn(false);
          setAvailablePoints(0);
          setLockedPoints(0);
          setSavedSpinCoupons([]);
          setSelectedSpinPrizeId(null);
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
        setAvailablePoints(0);
        setLockedPoints(0);
      });
  }, []);

  useEffect(() => {
    const paidItems = items.filter((item) => !isFirstOrderBonusLineItem(item));
    const hasHempItems = orderRequiresIdVerification(paidItems);

    if (isMerchOnly || !hasHempItems || paidItems.length === 0) {
      if (items.some(isFirstOrderBonusLineItem)) {
        removeFirstOrderBonus();
      }
      return;
    }

    const email = customerInfo.email.trim();
    if (!email.includes('@')) {
      if (items.some(isFirstOrderBonusLineItem)) {
        removeFirstOrderBonus();
      }
      return;
    }

    let cancelled = false;
    const phone = customerInfo.phone ? customerInfo.phone.trim() : '';
    fetch(
      `/api/first-order-bonus?email=${encodeURIComponent(email)}&hasHempItems=true${phone ? `&phone=${encodeURIComponent(phone)}` : ''}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.eligible) {
          addFirstOrderBonus();
        } else if (items.some(isFirstOrderBonusLineItem)) {
          removeFirstOrderBonus();
        }
      })
      .catch(() => {
        if (!cancelled && items.some(isFirstOrderBonusLineItem)) {
          removeFirstOrderBonus();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    items,
    customerInfo.email,
    customerInfo.phone,
    isMerchOnly,
    addFirstOrderBonus,
    removeFirstOrderBonus,
  ]);

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
    formData.append('orderAccessToken', orderAccessToken);
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
  const selectedSpinPrize =
    savedSpinCoupons.find((coupon) => coupon.id === selectedSpinPrizeId) ?? null;
  const useSpinPrize = !!selectedSpinPrizeId && isSpinPrizeActive(selectedSpinPrize);
  const spinPreview = computeSpinPrizePreview(selectedSpinPrize, sub, useSpinPrize);
  const spinDiscount = spinPreview.spinDiscount;
  const maxRedeemablePoints = calculateMaxRedeemablePoints(
    availablePoints,
    sub,
    promoDiscount + spinDiscount
  );
  const loyaltyDiscount = useLoyalty ? pointsToDollarDiscount(loyaltyPointsToUse) : 0;
  const discount = Math.min(sub, promoDiscount + loyaltyDiscount + spinDiscount);
  const isFirstOrder = getFirstOrderStatus(customerInfo.email);
  const shippingOptions = getShippingOptions(sub);
  const selectedShipping = shippingOptions.find((option) => option.id === shippingMethod) ?? shippingOptions[0];
  const baseTotals = calculateTotals(sub, discount, shippingMethod);
  const shipping = spinPreview.freeShipping ? 0 : calculateShipping(sub, shippingMethod);
  const total = Math.max(0, sub - discount + shipping);
  const totals = {
    ...baseTotals,
    shipping,
    total,
    freeShipping: shipping === 0 && sub > 0,
    shippingCarrier: shippingMethod,
    shippingLabel: selectedShipping.label,
  };

  useEffect(() => {
    if (!storedReferralCode || sub <= 0) return;

    setCouponCode(storedReferralCode);
    const firstOrder = getFirstOrderStatus(customerInfo.email);

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
    if (useSpinPrize) {
      setCouponMessage('Remove your wheel coupon first — promo codes cannot be combined with wheel prizes.');
      return;
    }
    const firstOrder = getFirstOrderStatus(customerInfo.email);
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode, subtotal: sub, isFirstOrder: firstOrder }),
    });
    const data = await res.json();
    if (data.valid) {
      if (selectedSpinPrizeId) {
        setSelectedSpinPrizeId(null);
        setCouponMessage('Wheel coupon removed — promo codes cannot stack with wheel prizes.');
      }
      setAppliedPromo({
        code: data.code,
        discount: data.discount,
        source: data.source,
        referrerName: data.referrerName,
        referrerCode: data.referrerCode,
      });
      if (!selectedSpinPrizeId) {
        setCouponMessage(
          data.source === 'loyalty' && data.referrerName
            ? `Promo from ${data.referrerName}: -$${data.discount.toFixed(2)}`
            : `Promo applied: -$${data.discount.toFixed(2)}`
        );
      }
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
    if (useSpinPrize && !isSpinPrizeActive(selectedSpinPrize)) {
      return 'Your wheel prize is invalid or expired.';
    }
    if (useSpinPrize && promoDiscount > 0) {
      return 'Wheel coupons cannot be combined with promo codes.';
    }
    return null;
  };

  const selectSpinPrize = (prizeId: string | null) => {
    setSelectedSpinPrizeId(prizeId);
    if (prizeId && appliedPromo) {
      setAppliedPromo(null);
      setCouponMessage('Promo removed — wheel coupons cannot stack with promo codes.');
    }
  };

  const completeOrder = async (
    result: { orderId: string; orderAccessToken?: string; requiresIdUpload: boolean },
    paid: boolean
  ) => {
    setOrderId(result.orderId);
    setOrderAccessToken(result.orderAccessToken || '');
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
    if (typeof window !== 'undefined' && customerInfo.email) {
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
          spinPrizeId: useSpinPrize && selectedSpinPrize ? selectedSpinPrize.id : undefined,
          promoCode: appliedPromo?.code,
          isFirstOrder,
          discount,
          shipping: totals.shipping,
          shippingCarrier: shippingMethod,
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
          spinPrizeId: useSpinPrize && selectedSpinPrize ? selectedSpinPrize.id : undefined,
          promoCode: appliedPromo?.code,
          isFirstOrder,
          discount,
          shipping: totals.shipping,
          shippingCarrier: shippingMethod,
          total: totals.total,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        setPaymentError(result.error || 'Failed to create Bitcoin invoice');
        return;
      }

      setOrderId(result.orderId);
      setOrderAccessToken(result.orderAccessToken || '');
      setRequiresIdUpload(result.requiresIdUpload);
      setBtcPayment({
        orderId: result.orderId,
        orderAccessToken: result.orderAccessToken || '',
        ...result.payment,
      });
      setOrderPlaced(true);
      setPaymentComplete(false);
      clearCart();
      if (typeof window !== 'undefined' && customerInfo.email) {
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
      spinPrizeId: useSpinPrize && selectedSpinPrize ? selectedSpinPrize.id : undefined,
      promoCode: appliedPromo?.code,
      isFirstOrder,
      discount,
      shipping: totals.shipping,
      shippingCarrier: shippingMethod,
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
          orderAccessToken={btcPayment.orderAccessToken}
          guideYoutubeUrl={features.paymentBitcoin?.guideYoutubeUrl}
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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

          {/* Prominent Kush Tracker link (like Domino's pizza tracker) */}
          <div className="mb-6">
            <Link
              href={`/track/${orderId}${orderAccessToken ? `?token=${encodeURIComponent(orderAccessToken)}` : ''}`}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition"
            >
              🌿 Track my order live <span className="text-xs opacity-70">(Kush Tracker)</span>
            </Link>
            <p className="text-[10px] text-zinc-500 mt-2">See every step from garden to your door — updates as we pack &amp; ship.</p>
          </div>

          <Link href="/" className="inline-block bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const cardConfigured = (paymentConfig?.configured ?? false) && (features.paymentCard?.enabled ?? false);
  const showBitcoin = btcEnabled && (features.paymentBitcoin?.enabled ?? false);
  const manualPaymentOptions = (
    [
      { id: 'zelle' as const, config: features.paymentZelle ?? { enabled: false } },
      { id: 'paypal' as const, config: features.paymentPaypal ?? { enabled: false } },
      { id: 'chime' as const, config: features.paymentChime ?? { enabled: false } },
    ] as const
  ).filter((option) => option.config.enabled);

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
                  {isFirstOrderBonusLineItem(item) && (
                    <p className="text-xs text-[#00ff9d] mt-1">
                      First-order bonus · strain selected at fulfillment
                    </p>
                  )}
                  {formatCartItemOptions(item) && (
                    <p className="text-sm text-zinc-400">{formatCartItemOptions(item)}</p>
                  )}
                  <p>
                    {isFirstOrderBonusLineItem(item) ? (
                      <span className="text-[#00ff9d]">FREE</span>
                    ) : (
                      <>${item.price} × {item.quantity}</>
                    )}
                  </p>
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
              {useSpinPrize && selectedSpinPrize && (
                <div className="flex justify-between text-[#00ff9d]">
                  <span>Wheel: {selectedSpinPrize.label}</span>
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
              {sub < FREE_SHIPPING_THRESHOLD && (
                <p className="text-xs text-zinc-500">Free shipping at ${FREE_SHIPPING_THRESHOLD}+</p>
              )}
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

            <h3 className="text-lg font-semibold mb-1">Shipping Method</h3>
            <p className="text-xs text-zinc-500 mb-3">{SHIPPING_DIMENSION_NOTE}</p>
            <div className="space-y-3 mb-6">
              {shippingOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center justify-between gap-4 p-4 rounded-2xl border cursor-pointer transition ${
                    shippingMethod === option.id
                      ? 'border-[#00ff9d] bg-[#00ff9d]/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethod === option.id}
                      onChange={() => setShippingMethod(option.id)}
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
            <p className="text-xs text-zinc-500 -mt-3 mb-6">{FEDEX_ALTERNATIVE_NOTE}</p>

            <div className="flex gap-2 mb-2">
              <input
                placeholder="Promo code (use a friend's code)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={useSpinPrize}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm disabled:opacity-50"
              />
              <button
                onClick={applyCoupon}
                type="button"
                disabled={useSpinPrize}
                className="bg-zinc-800 hover:bg-zinc-700 px-5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                Apply
              </button>
            </div>
            {useSpinPrize && (
              <p className="text-xs text-zinc-500 mb-4">
                Promo codes are disabled while a wheel coupon is applied.
              </p>
            )}
            {couponMessage && <p className="text-sm text-[#00ff9d] mb-4">{couponMessage}</p>}

            {isLoggedIn && savedSpinCoupons.length > 0 && (
              <div className="bg-zinc-900 border border-[#00ff9d]/30 rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Wheel Coupons</h3>
                  <Link href="/account?tab=wheel" className="text-xs text-[#00ff9d] hover:underline">
                    Spin again
                  </Link>
                </div>
                <p className="text-xs text-zinc-500 mb-3">
                  Pick one coupon for this order. Cannot combine with promo codes.
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2 hover:bg-zinc-800/50">
                    <input
                      type="radio"
                      name="wheelCoupon"
                      checked={!selectedSpinPrizeId}
                      onChange={() => selectSpinPrize(null)}
                      className="accent-[#00ff9d]"
                    />
                    <span className="text-sm text-zinc-400">No wheel coupon</span>
                  </label>
                  {savedSpinCoupons.map((coupon) => (
                    <label
                      key={coupon.id}
                      className={`flex items-start gap-3 cursor-pointer rounded-xl px-3 py-2 ${
                        selectedSpinPrizeId === coupon.id ? 'bg-[#00ff9d]/10' : 'hover:bg-zinc-800/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="wheelCoupon"
                        checked={selectedSpinPrizeId === coupon.id}
                        onChange={() => selectSpinPrize(coupon.id)}
                        className="mt-1 accent-[#00ff9d]"
                      />
                      <div>
                        <p className="text-sm text-[#00ff9d] font-medium">{coupon.label}</p>
                        <p className="text-xs text-zinc-500">
                          Expires {new Date(coupon.expiresAt!).toLocaleDateString()}
                          {coupon.type === 'free_tshirt' && selectedSpinPrizeId === coupon.id
                            ? ' · Free t-shirt added to shipment'
                            : ''}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
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

            {(features.idVerification?.enabled ?? false) && orderRequiresIdVerification(items) && (
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
                    <p className="font-semibold">{features.paymentCard?.label}</p>
                    {features.paymentCard?.subtitle && (
                      <p className="text-xs text-zinc-400 mt-1">{features.paymentCard?.subtitle}</p>
                    )}
                  </button>
                )}
                {showBitcoin && (
                  <button
                    onClick={() => setPaymentMethod('btc')}
                    className={`p-6 rounded-3xl border transition col-span-2 ${paymentMethod === 'btc' ? 'border-[#00ff9d] bg-zinc-900' : 'border-zinc-700'}`}
                  >
                    <p className="font-semibold">{features.paymentBitcoin?.label}</p>
                    {features.paymentBitcoin?.subtitle && (
                      <p className="text-xs text-zinc-400 mt-1">{features.paymentBitcoin?.subtitle}</p>
                    )}
                  </button>
                )}
                {manualPaymentOptions.map(({ id, config }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={`p-6 rounded-3xl border transition ${paymentMethod === id ? 'border-[#00ff9d] bg-zinc-900' : 'border-zinc-700'}`}
                  >
                    <p className="font-semibold">{config.label}</p>
                    {config.subtitle && <p className="text-xs text-zinc-400 mt-1">{config.subtitle}</p>}
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

            {paymentMethod === 'zelle' && (features.paymentZelle?.enabled ?? false) && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30">
                {features.paymentZelle?.payToLabel && (
                  <p className="font-semibold mb-2">{features.paymentZelle?.payToLabel}</p>
                )}
                {features.paymentZelle?.payToValue && (
                  <p className="text-[#00ff9d]">{features.paymentZelle?.payToValue}</p>
                )}
                {features.paymentZelle?.instructions && (
                  <p className="text-sm text-zinc-400 mt-3 whitespace-pre-line">{features.paymentZelle?.instructions}</p>
                )}
              </div>
            )}

            {paymentMethod === 'paypal' && (features.paymentPaypal?.enabled ?? false) && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30">
                {features.paymentPaypal?.payToLabel && (
                  <p className="font-semibold mb-2">{features.paymentPaypal?.payToLabel}</p>
                )}
                {features.paymentPaypal?.payToValue && (
                  <p className="text-[#00ff9d]">{features.paymentPaypal?.payToValue}</p>
                )}
                {features.paymentPaypal?.instructions && (
                  <p className="text-sm text-zinc-400 mt-3 whitespace-pre-line">{features.paymentPaypal?.instructions}</p>
                )}
              </div>
            )}

            {paymentMethod === 'chime' && (features.paymentChime?.enabled ?? false) && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30">
                {features.paymentChime?.payToLabel && (
                  <p className="font-semibold mb-2">{features.paymentChime?.payToLabel}</p>
                )}
                {features.paymentChime?.payToValue && (
                  <p className="text-[#00ff9d]">{features.paymentChime?.payToValue}</p>
                )}
                {features.paymentChime?.instructions && (
                  <p className="text-sm text-zinc-400 mt-3 whitespace-pre-line">{features.paymentChime?.instructions}</p>
                )}
              </div>
            )}

            {paymentMethod === 'btc' && (
              <div className="mt-8 p-6 bg-zinc-900 rounded-3xl border border-[#00ff9d]/30 text-sm text-zinc-400 space-y-4">
                <div>
                  {features.paymentBitcoin?.detailTitle && (
                    <p className="font-semibold text-white mb-2">{features.paymentBitcoin?.detailTitle}</p>
                  )}
                  {features.paymentBitcoin?.detailBody && (
                    <p className="whitespace-pre-line">{features.paymentBitcoin?.detailBody}</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">
                  <Link
                    href="/pay-with-bitcoin"
                    className="inline-flex items-center justify-center bg-[#00ff9d] text-black px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#00ff9d]/90"
                  >
                    How to pay with Cash App & more
                  </Link>
                  <Link
                    href="/pay-with-bitcoin?print=1"
                    className="inline-flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm"
                  >
                    Print / Save guide as PDF
                  </Link>
                  {features.paymentBitcoin?.guideYoutubeUrl && (
                    <a
                      href={features.paymentBitcoin?.guideYoutubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm"
                    >
                      Watch video guide ↗
                    </a>
                  )}
                </div>
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