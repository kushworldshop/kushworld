import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { getAdminProducts, updateProductOverride } from '@/lib/productCatalog';

export async function GET(request: NextRequest) {
  const password = request.headers.get('x-admin-password');
  if (!isAdminAuthorized(password)) {
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
  const password = request.headers.get('x-admin-password');
  if (!isAdminAuthorized(password)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, price, image, description } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Product id required' }, { status: 400 });
    }

    const product = await updateProductOverride(id, {
      name: typeof name === 'string' ? name : undefined,
      price: price !== undefined ? Number(price) : undefined,
      image: typeof image === 'string' ? image : undefined,
      description: typeof description === 'string' ? description : undefined,
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
  }
}