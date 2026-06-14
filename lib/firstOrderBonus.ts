export const FIRST_ORDER_BONUS_ITEM_ID = 'first-order-free-eighth';

export const FIRST_ORDER_BONUS_NAME = 'Free 1/8th — First Order Bonus';

export const FIRST_ORDER_BONUS_IMAGE = '/products/kaws-cake.jpg';

export const FREE_EIGHTH_FULFILLMENT_NOTE =
  'First-order bonus: include free 1/8th flower in shipment (strain selected at fulfillment).';

export interface FirstOrderBonusLineItem {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  category?: string;
  isFirstOrderBonus?: boolean;
}

export function isFirstOrderBonusLineItem(item: FirstOrderBonusLineItem): boolean {
  return item.isFirstOrderBonus === true || item.id === FIRST_ORDER_BONUS_ITEM_ID;
}

export function createFirstOrderBonusCartItem() {
  return {
    id: FIRST_ORDER_BONUS_ITEM_ID,
    name: FIRST_ORDER_BONUS_NAME,
    price: 0,
    image: FIRST_ORDER_BONUS_IMAGE,
    quantity: 1,
    category: 'flower',
    isFirstOrderBonus: true as const,
  };
}

export function orderIncludesFreeEighth(
  items: FirstOrderBonusLineItem[] | undefined
): boolean {
  return (items ?? []).some(isFirstOrderBonusLineItem);
}