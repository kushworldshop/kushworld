import { isFirstOrderBonusLineItem } from '@/lib/firstOrderBonus';
import { getAllProducts, updateProduct } from '@/lib/productCatalog';

export interface OrderLineItem {
  id: string;
  quantity: number;
  name?: string;
}

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryError';
  }
}

export function isInventoryTracked(inventory: number | undefined): boolean {
  return inventory !== undefined;
}

function aggregateQuantities(items: OrderLineItem[]): Map<string, number> {
  const qtyByProduct = new Map<string, number>();
  for (const item of items) {
    if (!item.id || isFirstOrderBonusLineItem(item)) continue;
    const qty = Math.max(1, Number(item.quantity) || 1);
    qtyByProduct.set(item.id, (qtyByProduct.get(item.id) || 0) + qty);
  }
  return qtyByProduct;
}

export async function validateOrderInventory(items: OrderLineItem[]): Promise<void> {
  const products = await getAllProducts();
  const productMap = new Map(products.map((product) => [product.id, product]));
  const qtyByProduct = aggregateQuantities(items);

  for (const [productId, qty] of qtyByProduct) {
    const product = productMap.get(productId);
    if (!product || !isInventoryTracked(product.inventory)) continue;

    const available = product.inventory ?? 0;
    if (qty > available) {
      throw new InventoryError(
        `Insufficient stock for ${product.name}. Only ${available} available.`
      );
    }
  }
}

export async function deductInventoryForOrder(items: OrderLineItem[]): Promise<void> {
  await validateOrderInventory(items);

  const products = await getAllProducts();
  const productMap = new Map(products.map((product) => [product.id, product]));
  const qtyByProduct = aggregateQuantities(items);

  for (const [productId, qty] of qtyByProduct) {
    const product = productMap.get(productId);
    if (!product || !isInventoryTracked(product.inventory)) continue;

    const newInventory = Math.max(0, (product.inventory ?? 0) - qty);
    await updateProduct(productId, { inventory: newInventory });
  }
}

export async function restoreInventoryForOrder(items: OrderLineItem[]): Promise<void> {
  const products = await getAllProducts();
  const productMap = new Map(products.map((product) => [product.id, product]));
  const qtyByProduct = aggregateQuantities(items);

  for (const [productId, qty] of qtyByProduct) {
    const product = productMap.get(productId);
    if (!product || !isInventoryTracked(product.inventory)) continue;

    const newInventory = (product.inventory ?? 0) + qty;
    await updateProduct(productId, { inventory: newInventory });
  }
}