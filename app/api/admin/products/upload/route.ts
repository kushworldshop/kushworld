import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isAdminRequest } from '@/lib/adminAuth';
import { updateProduct } from '@/lib/productCatalog';
import {
  ALLOWED_PRODUCT_IMAGE_TYPES,
  MAX_PRODUCT_IMAGE_BYTES,
  buildProductImageFilename,
  ensureProductImageDir,
  getPublicProductImagePath,
  PRODUCT_IMAGE_DIR,
} from '@/lib/productImages';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const productId = String(formData.get('productId') || '').trim();
    const file = formData.get('image');
    const saveToProduct = formData.get('saveToProduct') !== 'false';

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product id required' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Image file required' }, { status: 400 });
    }

    if (!ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_PRODUCT_IMAGE_TYPES)[number])) {
      return NextResponse.json(
        { success: false, error: 'Upload a JPG, PNG, WEBP, or GIF image' },
        { status: 400 }
      );
    }

    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      return NextResponse.json({ success: false, error: 'Image must be under 5MB' }, { status: 400 });
    }

    await ensureProductImageDir();

    const filename = buildProductImageFilename(productId, file.type);
    const storagePath = path.join(PRODUCT_IMAGE_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath, buffer);

    const image = getPublicProductImagePath(filename);

    if (saveToProduct) {
      const product = await updateProduct(productId, { image });
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        image,
        product,
        message: 'Image uploaded and saved to product',
      });
    }

    return NextResponse.json({
      success: true,
      image,
      message: 'Image uploaded',
    });
  } catch (error) {
    console.error('Product image upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload image' }, { status: 500 });
  }
}