import { filterVisibleProducts, getProducts } from '@/lib/productCatalog';
import CoaPageClient from './CoaPageClient';

export default async function CoaPage() {
  const products = filterVisibleProducts(await getProducts()).filter((product) => product.category !== 'merch');
  return <CoaPageClient products={products} />;
}