import { NextRequest, NextResponse } from 'next/server';
import { getSiteContent } from '@/lib/siteContent';
import { getProducts } from '@/lib/productCatalog';
import {
  getBestSellerProducts,
  getNewArrivalProducts,
  getOnSaleProducts,
} from '@/lib/productCollections';

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  const content = await getSiteContent();
  const products = await getProducts();

  switch (type) {
    case 'best-sellers':
      if (!content.features.bestSellers.enabled) {
        return NextResponse.json({ products: [] });
      }
      return NextResponse.json({
        products: getBestSellerProducts(products, content.features.bestSellers),
      });
    case 'new-arrivals':
      if (!content.features.newArrivals.enabled) {
        return NextResponse.json({ products: [] });
      }
      return NextResponse.json({
        products: getNewArrivalProducts(products, content.features.newArrivals),
      });
    case 'on-sale':
      if (!content.features.onSale.enabled) {
        return NextResponse.json({ products: [] });
      }
      return NextResponse.json({
        products: getOnSaleProducts(products, content.features.onSale),
      });
    default:
      return NextResponse.json({ error: 'Invalid collection type' }, { status: 400 });
  }
}