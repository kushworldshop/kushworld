import { FREE_EIGHTH_FULFILLMENT_NOTE, orderIncludesFreeEighth } from '@/lib/firstOrderBonus';
import type { ValidatedLineItem } from '@/lib/validateCheckout';
import type { ResolvedOrderTotals } from '@/lib/orderCheckout';
import type { resolvePromoForOrder } from '@/lib/orderPromo';

export interface BuildOrderRecordInput {
  id: string;
  customer: {
    name?: string;
    email?: string;
    address?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
  };
  items: ValidatedLineItem[];
  subtotal: number;
  paymentMethod: string;
  promoMeta: Awaited<ReturnType<typeof resolvePromoForOrder>>;
  resolved: ResolvedOrderTotals;
  idVerification: { status: string; note?: string };
  paymentStatus?: string;
  transactionId?: string;
  authCode?: string;
  status?: string;
  fulfillmentPending?: boolean;
  btcPayment?: Record<string, unknown>;
}

export function buildOrderRecord(input: BuildOrderRecordInput) {
  const {
    id,
    customer,
    items,
    subtotal,
    paymentMethod,
    promoMeta,
    resolved,
    idVerification,
    paymentStatus,
    transactionId,
    authCode,
    status = 'pending',
    fulfillmentPending,
    btcPayment,
  } = input;

  const email = customer.email?.trim();
  const freeEighthBonus = orderIncludesFreeEighth(items);

  return {
    id,
    customer,
    items,
    subtotal,
    promoDiscount: resolved.promoDiscount,
    loyaltyPointsUsed: resolved.loyaltyPointsUsed,
    loyaltyDiscount: resolved.loyaltyDiscount,
    spinDiscount: resolved.spinDiscount || undefined,
    spinPrizeId: resolved.spinPrizeId,
    spinPrizeLabel: resolved.spinPrizeLabel,
    freeTshirtNote: resolved.freeTshirt
      ? 'Wheel prize: Free T-Shirt — include in shipment'
      : undefined,
    freeEighthBonus: freeEighthBonus || undefined,
    freeEighthNote: freeEighthBonus ? FREE_EIGHTH_FULFILLMENT_NOTE : undefined,
    promoCode: promoMeta.promoCode,
    promoSource: promoMeta.promoSource,
    referrerCode: promoMeta.referrerCode,
    referrerName: promoMeta.referrerName,
    discount: resolved.discount,
    shipping: resolved.shipping,
    shippingCarrier: resolved.shippingCarrier,
    shippingMethod: resolved.shippingMethod,
    total: resolved.total,
    paymentMethod,
    paymentStatus,
    transactionId,
    authCode,
    email,
    name: customer.name,
    address: customer.address,
    address2: customer.address2,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    phone: customer.phone,
    status,
    fulfillmentPending,
    btcPayment,
    inventoryDeducted: true,
    inventoryRestored: false,
    idVerification,
    createdAt: new Date().toISOString(),
  };
}