export const MANUAL_PAYMENT_METHODS = [
  'zelle',
  'paypal',
  'chime',
  'venmo',
  'cashapp',
] as const;

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export const CRYPTO_PAYMENT_METHODS = ['btc', 'xrp'] as const;

export type CryptoPaymentMethod = (typeof CRYPTO_PAYMENT_METHODS)[number];

export const CHECKOUT_PAYMENT_METHODS = [
  ...CRYPTO_PAYMENT_METHODS,
  ...MANUAL_PAYMENT_METHODS,
] as const;

export function isManualPaymentMethod(method?: string): method is ManualPaymentMethod {
  return !!method && MANUAL_PAYMENT_METHODS.includes(method as ManualPaymentMethod);
}

export function isCryptoPaymentMethod(method?: string): method is CryptoPaymentMethod {
  return !!method && CRYPTO_PAYMENT_METHODS.includes(method as CryptoPaymentMethod);
}

export function getManualPaymentStatus(): 'awaiting_manual' {
  return 'awaiting_manual';
}

export function getCryptoAwaitingStatus(method: CryptoPaymentMethod): string {
  return method === 'btc' ? 'awaiting_btc' : 'awaiting_xrp';
}

export function orderNeedsPaymentConfirmation(order: {
  paymentMethod?: string;
  paymentStatus?: string;
}): boolean {
  const status = order.paymentStatus;
  if (status === 'paid' || status === 'refunded') return false;

  if (order.paymentMethod === 'btc' && status === 'awaiting_btc') return true;
  if (order.paymentMethod === 'xrp' && status === 'awaiting_xrp') return true;
  if (isManualPaymentMethod(order.paymentMethod) && (status === 'awaiting_manual' || !status)) {
    return true;
  }

  return false;
}

export function getPaymentMethodLabel(method?: string): string {
  switch (method) {
    case 'btc':
      return 'Bitcoin';
    case 'xrp':
      return 'XRP';
    case 'zelle':
      return 'Zelle';
    case 'paypal':
      return 'PayPal';
    case 'chime':
      return 'Chime';
    case 'venmo':
      return 'Venmo';
    case 'cashapp':
      return 'Cash App';
    case 'card':
      return 'Card';
    case 'manual':
      return 'Manual';
    default:
      return method || 'Unknown';
  }
}