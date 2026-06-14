import { getTierPrice } from '@/lib/checkout';
import {
  createFirstOrderBonusCartItem,
  isFirstOrderBonusLineItem,
} from '@/lib/firstOrderBonus';
import { isEligibleForFreeEighth } from '@/lib/firstOrderBonusServer';
import { getAllProducts, isProductHidden } from '@/lib/productCatalog';
import {
  getSelectedOptionsUnitPrice,
  validateSelectedOptions,
  type SelectedProductOptions,
} from '@/lib/productOptions';
import { getTierPricing } from '@/lib/products';
import { isEmailFirstOrder } from '@/lib/firstOrder';

export interface CheckoutLineItem {
  id: string;
  name?: string;
  price?: number;
  quantity?: number;
  selectedOptions?: SelectedProductOptions;
  selectedSize?: string;
  category?: string;
}

export interface ValidatedLineItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  selectedOptions?: SelectedProductOptions;
  selectedSize?: string;
  isFirstOrderBonus?: boolean;
}

export interface ValidatedCheckout {
  items: ValidatedLineItem[];
  subtotal: number;
  isFirstOrder: boolean;
  freeEighthBonus: boolean;
}

const SUBTOTAL_TOLERANCE = 0.05;

export { isEmailFirstOrder } from '@/lib/firstOrder';

export async function validateCheckoutItems(
  items: CheckoutLineItem[],
  clientSubtotal?: number,
  email?: string,
  phone?: string
): Promise<ValidatedCheckout> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty');
  }

  const products = await getAllProducts();
  const productMap = new Map(products.map((product) => [product.id, product]));
  const validated: ValidatedLineItem[] = [];
  let subtotal = 0;
  let bonusItemCount = 0;

  for (const item of items) {
    if (!item?.id) {
      throw new Error('Invalid cart item');
    }

    if (isFirstOrderBonusLineItem(item)) {
      bonusItemCount += Math.max(1, Math.floor(Number(item.quantity) || 1));
      continue;
    }

    const product = productMap.get(item.id);
    if (!product || isProductHidden(product)) {
      throw new Error(`Product not available: ${item.name || item.id}`);
    }

    const quantity = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
    const selectedOptions = item.selectedOptions;

    if (selectedOptions && Object.keys(selectedOptions).length > 0) {
      const optionCheck = validateSelectedOptions(product, selectedOptions);
      if (!optionCheck.valid) {
        throw new Error(`Invalid option selection for ${product.name}`);
      }
    }

    const tiers = getTierPricing(product);
    const unitPrice = getSelectedOptionsUnitPrice(product, selectedOptions || {}, quantity, (base, qty) =>
      getTierPrice(base, qty, tiers)
    );

    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
    subtotal += lineTotal;

    validated.push({
      id: product.id,
      name: product.name,
      price: unitPrice,
      quantity,
      category: product.category,
      selectedOptions:
        selectedOptions && Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      selectedSize: item.selectedSize,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;

  if (clientSubtotal !== undefined) {
    const diff = Math.abs(subtotal - Number(clientSubtotal));
    if (diff > SUBTOTAL_TOLERANCE) {
      throw new Error('Cart pricing is out of date. Refresh the page and try again.');
    }
  }

  const isFirstOrder = await isEmailFirstOrder(email, phone);
  const hasHempItems = validated.some((item) => item.category !== 'merch');

  if (bonusItemCount > 1) {
    throw new Error('Only one free 1/8th bonus is allowed per order');
  }

  let freeEighthBonus = false;
  if (bonusItemCount === 1) {
    if (!(await isEligibleForFreeEighth(email, hasHempItems, phone))) {
      throw new Error('Free 1/8th first-order bonus is not available for this customer');
    }

    const bonus = createFirstOrderBonusCartItem();
    validated.push({
      id: bonus.id,
      name: bonus.name,
      price: 0,
      quantity: 1,
      category: bonus.category,
      isFirstOrderBonus: true,
    });
    freeEighthBonus = true;
  }

  return { items: validated, subtotal, isFirstOrder, freeEighthBonus };
}