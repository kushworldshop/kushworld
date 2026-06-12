import { sendOrderConfirmation } from '@/lib/email';
import { awardPurchaseLoyalty, finalizeLoyaltyRedemption } from '@/lib/loyalty';
import { recordReferralConversion } from '@/lib/referrals';
import { creditReferrerForConversion } from '@/lib/referralRewards';
import { getSessionUserId } from '@/lib/auth';
import { markUserSpinPrizeUsed, unlockLoyaltyPointsAfterPurchase } from '@/lib/users';

interface FulfillmentOrder {
  id: string;
  subtotal?: number;
  total?: number;
  shipping?: number;
  discount?: number;
  referrerCode?: string;
  loyaltyPointsUsed?: number;
  spinPrizeId?: string;
  email?: string;
  customer?: { email?: string };
  paymentMethod?: string;
  items?: { name: string; quantity: number; price: number }[];
}

export async function fulfillPaidOrder(order: FulfillmentOrder) {
  const email = order.customer?.email || order.email;
  const subtotal = order.subtotal ?? 0;

  if (order.referrerCode) {
    await recordReferralConversion(order.referrerCode, order.id, subtotal);
    await creditReferrerForConversion(order.referrerCode);
  }

  const userId = await getSessionUserId();
  if (userId) {
    if ((order.loyaltyPointsUsed ?? 0) > 0) {
      await finalizeLoyaltyRedemption(userId, order.loyaltyPointsUsed!);
    }
    if (order.spinPrizeId) {
      await markUserSpinPrizeUsed(userId, order.spinPrizeId);
    }
    await awardPurchaseLoyalty(userId, subtotal);
    await unlockLoyaltyPointsAfterPurchase(userId);
  }

  if (email) {
    await sendOrderConfirmation(email, {
      id: order.id,
      total: order.total ?? 0,
      subtotal,
      shipping: order.shipping ?? 0,
      discount: order.discount ?? 0,
      paymentMethod: order.paymentMethod || 'btc',
      items: (order.items || []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    });
  }
}