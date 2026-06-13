import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getAdminProducts, setProductsHidden, updateProductOverride } from '@/lib/productCatalog';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await getAdminProducts();
    return NextResponse.json({ success: true, products });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load products' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      ids,
      name,
      price,
      cost,
      inventory,
      trackInventory,
      image,
      description,
      optionGroups,
      hidden,
      category,
      subcategory,
      merchSubcategory,
      compareAtPrice,
      featured,
      bestSeller,
      isNew,
    } = body;

    if (Array.isArray(ids) && typeof hidden === 'boolean') {
      const productIds = ids.filter((value): value is string => typeof value === 'string' && value.length > 0);
      if (productIds.length === 0) {
        return NextResponse.json({ success: false, error: 'Product ids required' }, { status: 400 });
      }

      const updated = await setProductsHidden(productIds, hidden);
      return NextResponse.json({ success: true, updated, hidden });
    }

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Product id required' }, { status: 400 });
    }

    const product = await updateProductOverride(id, {
      name: typeof name === 'string' ? name : undefined,
      price: price !== undefined ? Number(price) : undefined,
      cost: cost !== undefined ? Number(cost) : undefined,
      inventory: inventory !== undefined ? Number(inventory) : undefined,
      clearInventory: trackInventory === false,
      image: typeof image === 'string' ? image : undefined,
      description: typeof description === 'string' ? description : undefined,
      optionGroups: Array.isArray(optionGroups) ? optionGroups : undefined,
      hidden: typeof hidden === 'boolean' ? hidden : undefined,
      category: typeof category === 'string' ? category : undefined,
      subcategory: typeof subcategory === 'string' ? subcategory : undefined,
      merchSubcategory: typeof merchSubcategory === 'string' ? merchSubcategory : undefined,
      compareAtPrice: compareAtPrice !== undefined ? Number(compareAtPrice) : undefined,
      featured: typeof featured === 'boolean' ? featured : undefined,
      bestSeller: typeof bestSeller === 'boolean' ? bestSeller : undefined,
      isNew: typeof isNew === 'boolean' ? isNew : undefined,
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
  }
}