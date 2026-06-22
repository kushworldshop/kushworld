import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isAdminRequest } from '@/lib/adminAuth';
import { getAllProducts, updateProduct } from '@/lib/productCatalog';
import {
  appendProductMedia,
  inferMediaTypeFromMime,
  setProductCoverMedia,
  syncProductMediaFields,
} from '@/lib/productMedia';
import {
  buildProductImageFilename,
  ensureProductImageDir,
  getMaxProductMediaBytes,
  getPublicProductImagePath,
  isAllowedProductMediaType,
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
    const mode = String(formData.get('mode') || 'gallery').trim();

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product id required' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Media file required' }, { status: 400 });
    }

    if (!isAllowedProductMediaType(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Upload a JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV file' },
        { status: 400 }
      );
    }

    const maxBytes = getMaxProductMediaBytes(file.type);
    if (file.size > maxBytes) {
      const limitLabel = file.type.startsWith('video/') ? '50MB' : '5MB';
      return NextResponse.json(
        { success: false, error: `File must be under ${limitLabel}` },
        { status: 400 }
      );
    }

    await ensureProductImageDir();

    const filename = buildProductImageFilename(productId, file.type);
    const storagePath = path.join(PRODUCT_IMAGE_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath, buffer);

    const url = getPublicProductImagePath(filename);
    const mediaItem = { type: inferMediaTypeFromMime(file.type), url };

    if (saveToProduct) {
      const products = await getAllProducts();
      const existing = products.find((product) => product.id === productId);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }

      const synced =
        mode === 'cover'
          ? setProductCoverMedia(existing, url)
          : mode === 'primary'
            ? syncProductMediaFields([mediaItem])
            : appendProductMedia(existing, mediaItem);

      const product = await updateProduct(productId, synced);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        image: url,
        media: synced.media,
        product,
        message:
          mediaItem.type === 'video'
            ? 'Video uploaded and added to product gallery'
            : 'Image uploaded and added to product gallery',
      });
    }

    return NextResponse.json({
      success: true,
      image: url,
      mediaItem,
      message: 'Media uploaded',
    });
  } catch (error) {
    console.error('Product media upload error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload media' }, { status: 500 });
  }
}