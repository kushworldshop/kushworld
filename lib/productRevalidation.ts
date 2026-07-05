import { revalidatePath } from 'next/cache';
import { getAllProducts } from '@/lib/productCatalog';
import { getProductSlug } from '@/lib/products';

export async function revalidateProductCatalog(productId?: string) {
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/coa');

  if (!productId) return;

  const product = (await getAllProducts()).find((item) => item.id === productId);
  if (!product) return;

  revalidatePath(`/products/${getProductSlug(product)}`);
}