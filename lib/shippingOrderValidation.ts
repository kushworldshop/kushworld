import { RESTRICTED_STATES } from '@/lib/checkout';
import { orderToBtcPostageAddress } from '@/lib/btcPostage';

export interface ShippingCheck {
  id: string;
  label: string;
  passed: boolean;
  note?: string;
}

export interface OrderForShippingValidation {
  id: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  shipping?: number;
  shippingMethod?: string;
  shippingCarrier?: string;
  total?: number;
  items?: Array<{ name?: string; quantity?: number; price?: number; category?: string }>;
  customer?: {
    name?: string;
    email?: string;
    address?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
  };
  name?: string;
  email?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  trackingNumber?: string;
  btcPostageOrderId?: string;
}

export function validateOrderForShipping(
  order: OrderForShippingValidation,
  options?: { allowUnpaid?: boolean }
): { checks: ShippingCheck[]; ready: boolean; address: ReturnType<typeof orderToBtcPostageAddress> } {
  const address = orderToBtcPostageAddress(order);
  const state = (address.state || '').toUpperCase().trim();
  const zip = (address.zip || '').trim();
  const zipValid = /^\d{5}(-\d{4})?$/.test(zip);
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const paid =
    order.paymentStatus === 'paid' ||
    order.status === 'processing' ||
    order.status === 'packing' ||
    order.status === 'sealed' ||
    order.status === 'shipped';

  const checks: ShippingCheck[] = [
    {
      id: 'payment',
      label: 'Order is paid or approved to ship',
      passed: paid || Boolean(options?.allowUnpaid),
      note: order.paymentStatus ? `paymentStatus: ${order.paymentStatus}` : undefined,
    },
    {
      id: 'items',
      label: 'Order has line items',
      passed: itemCount > 0,
      note: itemCount > 0 ? `${itemCount} item(s)` : 'No items on order',
    },
    {
      id: 'name',
      label: 'Recipient name present',
      passed: Boolean(address.name?.trim()),
    },
    {
      id: 'street',
      label: 'Street address present',
      passed: Boolean(address.street?.trim()),
    },
    {
      id: 'city',
      label: 'City present',
      passed: Boolean(address.city?.trim()),
    },
    {
      id: 'state',
      label: 'State present',
      passed: Boolean(state),
    },
    {
      id: 'zip',
      label: 'ZIP code format valid',
      passed: zipValid,
      note: zip || 'missing',
    },
    {
      id: 'restricted_state',
      label: 'Destination state is shippable',
      passed: !state || !RESTRICTED_STATES.includes(state),
      note: state && RESTRICTED_STATES.includes(state) ? `${state} is restricted` : undefined,
    },
    {
      id: 'existing_label',
      label: 'No existing BTC Postage label on order',
      passed: !order.btcPostageOrderId,
      note: order.btcPostageOrderId ? `Already has label order ${order.btcPostageOrderId}` : undefined,
    },
    {
      id: 'tracking',
      label: 'No tracking number already assigned',
      passed: !order.trackingNumber?.trim(),
      note: order.trackingNumber ? 'Tracking already set — use manual update if replacing' : undefined,
    },
  ];

  return {
    checks,
    ready: checks.every((check) => check.passed),
    address,
  };
}

export function summarizeOrderForGrok(order: OrderForShippingValidation) {
  const address = orderToBtcPostageAddress(order);
  return {
    orderId: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    shippingMethod: order.shippingMethod,
    shippingCarrier: order.shippingCarrier,
    shippingPaid: order.shipping,
    total: order.total,
    items: (order.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      category: item.category,
    })),
    shipTo: address,
  };
}