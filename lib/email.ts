const FROM_EMAIL = process.env.EMAIL_FROM || 'orders@kushworld.shop';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function sendOrderConfirmation(
  to: string,
  order: {
    id: string;
    total: number;
    subtotal: number;
    shipping: number;
    discount: number;
    paymentMethod: string;
    items: { name: string; quantity: number; price: number }[];
  }
) {
  const itemsList = order.items
    .map((i) => `• ${i.name} × ${i.quantity} — $${(i.price * i.quantity).toFixed(2)}`)
    .join('\n');

  const body = `Thank you for your Kush World order!

Order ID: ${order.id}
Payment: ${order.paymentMethod}

Items:
${itemsList}

Subtotal: $${order.subtotal.toFixed(2)}
Discount: -$${order.discount.toFixed(2)}
Shipping: $${order.shipping.toFixed(2)}
Total: $${order.total.toFixed(2)}

We'll notify you when your order ships.
— Kush World Team`;

  if (!RESEND_API_KEY) {
    console.log(`[Email stub] To: ${to}\n${body}`);
    return { sent: false, stub: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: `Kush World Order Confirmation — ${order.id}`,
      text: body,
    }),
  });

  return { sent: res.ok };
}

export type EmailSendResult =
  | { sent: true; stub: false }
  | { sent: false; stub: true }
  | { sent: false; stub: false; error: string };

export async function sendVerificationEmail(to: string, code: string): Promise<EmailSendResult> {
  const body = `Welcome to Kush World!

Your email verification code is: ${code}

This code expires in 15 minutes.

Once you verify your email, you'll receive $10 in loyalty points (1,000 pts). Complete your first purchase to unlock them at checkout.

— Kush World Team`;

  if (!RESEND_API_KEY) {
    console.log(`[Email stub] To: ${to}\n${body}`);
    return { sent: false, stub: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject: 'Verify your Kush World account',
        text: body,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('[Resend] Verification email failed:', res.status, errBody);
      return {
        sent: false,
        stub: false,
        error: 'Could not send verification email. Try again or contact support.',
      };
    }

    return { sent: true, stub: false };
  } catch (err) {
    console.error('[Resend] Verification email error:', err);
    return {
      sent: false,
      stub: false,
      error: 'Could not send verification email. Try again or contact support.',
    };
  }
}

export function isEmailVerificationConfigured(): boolean {
  return !!RESEND_API_KEY;
}

export type ShippingEmailKind = 'shipped' | 'tracking_update';

export async function sendShippingNotification(
  to: string,
  order: {
    id: string;
    name?: string;
    trackingNumber?: string;
    trackingUrl?: string | null;
    carrierLabel?: string;
  },
  kind: ShippingEmailKind = 'shipped'
): Promise<EmailSendResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kushworld.shop';
  const accountUrl = `${siteUrl}/account?tab=orders`;
  const greeting = order.name?.trim() ? `Hi ${order.name.trim()},` : 'Hi there,';
  const tracking = order.trackingNumber?.trim();

  const trackingBlock = tracking
    ? `Tracking number: ${tracking}
${order.carrierLabel ? `Carrier: ${order.carrierLabel}` : ''}
${order.trackingUrl ? `Track your package: ${order.trackingUrl}` : 'Track your package from your account page.'}`
    : '';

  const body =
    kind === 'tracking_update'
      ? `${greeting}

Your Kush World order now has tracking available.

Order ID: ${order.id}

${trackingBlock}

View all order details: ${accountUrl}

— Kush World Team`
      : `${greeting}

Great news — your Kush World order has shipped!

Order ID: ${order.id}

${trackingBlock || 'Tracking will be added to your account as soon as it is available.'}

View shipping status anytime: ${accountUrl}

— Kush World Team`;

  const subject =
    kind === 'tracking_update'
      ? `Tracking added — Kush World order ${order.id}`
      : `Your Kush World order has shipped — ${order.id}`;

  if (!RESEND_API_KEY) {
    console.log(`[Email stub] To: ${to}\nSubject: ${subject}\n${body}`);
    return { sent: false, stub: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('[Resend] Shipping email failed:', res.status, errBody);
      return {
        sent: false,
        stub: false,
        error: 'Could not send shipping notification email.',
      };
    }

    return { sent: true, stub: false };
  } catch (err) {
    console.error('[Resend] Shipping email error:', err);
    return {
      sent: false,
      stub: false,
      error: 'Could not send shipping notification email.',
    };
  }
}