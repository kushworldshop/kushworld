import { RESTRICTED_STATES, MIN_ORDER_AMOUNT, type ShippingCarrier } from '@/lib/checkout';
import { FREE_EIGHTH_FULFILLMENT_NOTE } from '@/lib/firstOrderBonus';
import { resolveOrderTotals } from '@/lib/orderCheckout';
import { orderRequiresIdVerification } from '@/lib/products';
import { resolvePromoForOrder } from '@/lib/orderPromo';
import { isCustomerVerified } from '@/lib/verification';
import { validateCheckoutItems } from '@/lib/validateCheckout';

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
  loyaltyPointsUsed?: number;
  shippingCarrier?: string;
  spinPrizeId?: string;
  paymentMethod?: string;
}

export async function buildCheckoutOrder(body: CheckoutOrderInput, orderId: string) {
  const customer = body.customer ?? {};
  const email = customer.email;

  const validated = await validateCheckoutItems(
    (body.items || []) as Parameters<typeof validateCheckoutItems>[0],
    body.subtotal,
    email
  );

  const { items, subtotal, isFirstOrder, freeEighthBonus } = validated;

  const promoMeta = await resolvePromoForOrder({
    promoCode: body.promoCode,
    referralCode: body.referralCode,
    couponCode: body.couponCode,
    subtotal,
    isFirstOrder,
  });

  const resolved = await resolveOrderTotals({
    subtotal,
    promoDiscount: promoMeta.promoDiscount,
    loyaltyPointsUsed: body.loyaltyPointsUsed ?? 0,
    shippingCarrier: body.shippingCarrier as ShippingCarrier | undefined,
    spinPrizeId: body.spinPrizeId,
  });

  if (subtotal < MIN_ORDER_AMOUNT) {
    throw new Error(`Minimum order is $${MIN_ORDER_AMOUNT}`);
  }

  const state = String(customer.state ?? '').toUpperCase().trim();
  if (state && RESTRICTED_STATES.includes(state)) {
    throw new Error(`Cannot ship to ${state}`);
  }

  const alreadyVerified = email ? await isCustomerVerified(email) : false;
  const needsIdVerification = orderRequiresIdVerification(items);

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
    customer,
    items,
    subtotal,
    promoDiscount,
    loyaltyPointsUsed,
    loyaltyDiscount,
    spinDiscount: spinDiscount || undefined,
    spinPrizeId,
    spinPrizeLabel,
    freeTshirtNote: freeTshirt ? 'Wheel prize: Free T-Shirt — include in shipment' : undefined,
    freeEighthBonus: freeEighthBonus || undefined,
    freeEighthNote: freeEighthBonus ? FREE_EIGHTH_FULFILLMENT_NOTE : undefined,
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
    name: customer.name,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    phone: customer.phone,
    paymentMethod: body.paymentMethod || 'btc',
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