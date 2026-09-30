import ShopPageClient from './ShopPageClient';
import { getProducts } from '@/lib/productCatalog';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const products = await getProducts();
  return <ShopPageClient initialProducts={products} />;
}