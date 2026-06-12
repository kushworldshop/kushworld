import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getAdminProducts, updateProductOverride } from '@/lib/productCatalog';

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
      compareAtPrice,
      featured,
      bestSeller,
      isNew,
    } = body;

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