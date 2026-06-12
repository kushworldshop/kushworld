import { RESTRICTED_STATES, MIN_ORDER_AMOUNT } from '@/lib/checkout';
import { resolveOrderTotals } from '@/lib/orderCheckout';
import { orderRequiresIdVerification } from '@/lib/products';
import { resolvePromoForOrder } from '@/lib/orderPromo';
import { isCustomerVerified } from '@/lib/verification';

export interface CheckoutOrderInput {
  customer?: {
    name?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
  };
  items?: unknown[];
  subtotal?: number;
  promoCode?: string;
  referralCode?: string;
  couponCode?: string;
  isFirstOrder?: boolean;
  loyaltyPointsUsed?: number;
  shipping?: number;
  shippingCarrier?: string;
  spinPrizeId?: string;
  paymentMethod?: string;
  [key: string]: unknown;
}

export async function buildCheckoutOrder(body: CheckoutOrderInput, orderId: string) {
  const customer = body.customer ?? {};
  const email = customer.email ?? (body.email as string | undefined);
  const subtotal = body.subtotal ?? 0;

  const promoMeta = await resolvePromoForOrder({
    promoCode: body.promoCode,
    referralCode: body.referralCode,
    couponCode: body.couponCode,
    subtotal,
    isFirstOrder: !!body.isFirstOrder,
  });

  const resolved = await resolveOrderTotals({
    subtotal,
    promoDiscount: promoMeta.promoDiscount,
    loyaltyPointsUsed: body.loyaltyPointsUsed ?? 0,
    shipping: body.shipping,
    shippingCarrier: body.shippingCarrier as 'usps' | 'fedex' | undefined,
    spinPrizeId: body.spinPrizeId,
  });

  if (subtotal < MIN_ORDER_AMOUNT) {
    throw new Error(`Minimum order is $${MIN_ORDER_AMOUNT}`);
  }

  const state = String(customer.state ?? body.state ?? '').toUpperCase().trim();
  if (state && RESTRICTED_STATES.includes(state)) {
    throw new Error(`Cannot ship to ${state}`);
  }

  const alreadyVerified = email ? await isCustomerVerified(email) : false;
  const needsIdVerification = orderRequiresIdVerification(
    (body.items || []) as { id: string; category?: string }[]
  );

  const {
    discount,
    shipping,
    shippingCarrier,
    shippingMethod,
    total,
    loyaltyPointsUsed,
    loyaltyDiscount,
    promoDiscount,
    spinDiscount,
    spinPrizeId,
    spinPrizeLabel,
    freeTshirt,
  } = resolved;

  const order = {
    id: orderId,
    ...body,
    customer,
    subtotal,
    promoDiscount,
    loyaltyPointsUsed,
    loyaltyDiscount,
    spinDiscount: spinDiscount || undefined,
    spinPrizeId,
    spinPrizeLabel,
    freeTshirtNote: freeTshirt ? 'Wheel prize: Free T-Shirt — include in shipment' : undefined,
    promoCode: promoMeta.promoCode,
    promoSource: promoMeta.promoSource,
    referrerCode: promoMeta.referrerCode,
    referrerName: promoMeta.referrerName,
    discount,
    shipping,
    shippingCarrier,
    shippingMethod,
    total,
    email,
    name: customer.name ?? body.name,
    address: customer.address ?? body.address,
    city: customer.city ?? body.city,
    state: customer.state ?? body.state,
    zip: customer.zip ?? body.zip,
    phone: customer.phone ?? body.phone,
    status: 'pending',
    idVerification: !needsIdVerification
      ? { status: 'verified', note: 'Merch-only order — no ID required' }
      : alreadyVerified
        ? { status: 'verified', note: 'Returning verified customer' }
        : { status: 'required' },
    createdAt: new Date().toISOString(),
    promoMeta,
    needsIdVerification,
    alreadyVerified,
  };

  return order;
}