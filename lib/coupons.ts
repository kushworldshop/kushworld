import fs from 'fs/promises';
import path from 'path';

const COUPONS_FILE = path.join(process.cwd(), 'data', 'coupons.json');

export interface Coupon {
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  minOrder?: number;
  firstOrderOnly?: boolean;
  active: boolean;
}

const DEFAULT_COUPONS: Coupon[] = [
  { code: 'FIRST20', type: 'fixed', value: 20, minOrder: 25, firstOrderOnly: true, active: true },
  { code: 'KUSH10', type: 'percent', value: 10, minOrder: 50, firstOrderOnly: false, active: true },
];

async function ensureCouponsFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(COUPONS_FILE);
  } catch {
    await fs.writeFile(COUPONS_FILE, JSON.stringify(DEFAULT_COUPONS, null, 2));
  }
}

export async function getCoupons(): Promise<Coupon[]> {
  await ensureCouponsFile();
  const data = await fs.readFile(COUPONS_FILE, 'utf8');
  return JSON.parse(data);
}

export async function validateCoupon(
  code: string,
  subtotal: number,
  isFirstOrder: boolean
): Promise<{ valid: boolean; discount: number; error?: string; coupon?: Coupon }> {
  const coupons = await getCoupons();
  const coupon = coupons.find((c) => c.code.toUpperCase() === code.toUpperCase() && c.active);

  if (!coupon) {
    return { valid: false, discount: 0, error: 'Invalid coupon code' };
  }

  if (coupon.firstOrderOnly && !isFirstOrder) {
    return { valid: false, discount: 0, error: 'This coupon is for first orders only' };
  }

  if (coupon.minOrder && subtotal < coupon.minOrder) {
    return { valid: false, discount: 0, error: `Minimum order of $${coupon.minOrder} required` };
  }

  const discount =
    coupon.type === 'percent'
      ? Math.round(subtotal * (coupon.value / 100) * 100) / 100
      : Math.min(coupon.value, subtotal);

  return { valid: true, discount, coupon };
}