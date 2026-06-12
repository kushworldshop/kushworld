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

export async function sendVerificationEmail(to: string, code: string) {
  const body = `Welcome to Kush World!

Your email verification code is: ${code}

This code expires in 15 minutes.

Once you verify your email, you'll receive $10 in loyalty points (1,000 pts). Complete your first purchase to unlock them at checkout.

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
      subject: 'Verify your Kush World account',
      text: body,
    }),
  });

  return { sent: res.ok, stub: false };
}