import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { isCustomProductId } from '@/lib/customProducts';
import {
  createProduct,
  deleteProducts,
  getAdminProducts,
  readProductOverrides,
  setProductsHidden,
  toAdminProductRecord,
  updateProduct,
} from '@/lib/productCatalog';
import { products as baseProducts } from '@/lib/products';
import { clampProductOptionGroups } from '@/lib/productOptions';
import { revalidateProductCatalog } from '@/lib/productRevalidation';

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

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      price,
      cost,
      description,
      category,
      subcategory,
      merchSubcategory,
      compareAtPrice,
      featured,
      bestSeller,
      isNew,
      optionGroups,
      inventory,
      hidden,
      thcaPercent,
      strainType,
      tier,
      effects,
    } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }

    if (price === undefined || price === null || Number.isNaN(Number(price))) {
      return NextResponse.json({ success: false, error: 'Price is required' }, { status: 400 });
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ success: false, error: 'Category is required' }, { status: 400 });
    }

    const product = await createProduct({
      name,
      price: Number(price),
      category,
      cost: cost !== undefined ? Number(cost) : undefined,
      description: typeof description === 'string' ? description : undefined,
      subcategory: typeof subcategory === 'string' ? subcategory : undefined,
      merchSubcategory: typeof merchSubcategory === 'string' ? merchSubcategory : undefined,
      compareAtPrice: compareAtPrice !== undefined ? Number(compareAtPrice) : undefined,
      featured: typeof featured === 'boolean' ? featured : undefined,
      bestSeller: typeof bestSeller === 'boolean' ? bestSeller : undefined,
      isNew: typeof isNew === 'boolean' ? isNew : undefined,
      optionGroups: Array.isArray(optionGroups) ? clampProductOptionGroups(optionGroups) : undefined,
      inventory: inventory !== undefined ? Number(inventory) : undefined,
      hidden: typeof hidden === 'boolean' ? hidden : undefined,
      thcaPercent: thcaPercent !== undefined ? Number(thcaPercent) : undefined,
      strainType: typeof strainType === 'string' ? strainType : undefined,
      tier: typeof tier === 'string' ? tier : undefined,
      effects: Array.isArray(effects)
        ? effects.filter((value): value is string => typeof value === 'string')
        : undefined,
    });

    await revalidateProductCatalog(product.id);

    return NextResponse.json({
      success: true,
      product: toAdminProductRecord(product, { isCustom: true }),
      message: `Created ${product.name}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    const status = message.includes('already exists') ? 409 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? body.ids.filter(
          (value: unknown): value is string => typeof value === 'string' && value.length > 0
        )
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Product ids required' }, { status: 400 });
    }

    const { deleted, skippedCatalogIds } = await deleteProducts(ids);
    return NextResponse.json({ success: true, deleted, skippedCatalogIds });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete products' }, { status: 500 });
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
      images,
      media,
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
      tierPricing,
      clearTierPricing,
      hideBulkPricing,
    } = body;

    if (Array.isArray(ids) && typeof hidden === 'boolean') {
      const productIds = ids.filter((value): value is string => typeof value === 'string' && value.length > 0);
      if (productIds.length === 0) {
        return NextResponse.json({ success: false, error: 'Product ids required' }, { status: 400 });
      }

      const updated = await setProductsHidden(productIds, hidden);
      await revalidateProductCatalog();
      return NextResponse.json({ success: true, updated, hidden });
    }

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Product id required' }, { status: 400 });
    }

    const product = await updateProduct(id, {
      name: typeof name === 'string' ? name : undefined,
      price: price !== undefined ? Number(price) : undefined,
      cost: cost !== undefined ? Number(cost) : undefined,
      inventory: inventory !== undefined ? Number(inventory) : undefined,
      clearInventory: trackInventory === false,
      image: typeof image === 'string' ? image : undefined,
      images: Array.isArray(images) ? images.filter((value): value is string => typeof value === 'string') : undefined,
      media: Array.isArray(media)
        ? media.filter(
            (value): value is { type: 'image' | 'video'; url: string } =>
              !!value &&
              typeof value === 'object' &&
              (value.type === 'image' || value.type === 'video') &&
              typeof value.url === 'string'
          )
        : undefined,
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
      tierPricing: Array.isArray(tierPricing) ? tierPricing : undefined,
      clearTierPricing: clearTierPricing === true,
      hideBulkPricing: typeof hideBulkPricing === 'boolean' ? hideBulkPricing : undefined,
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    await revalidateProductCatalog(id);

    const base = baseProducts.find((item) => item.id === id);
    const overrides = base ? await readProductOverrides() : {};
    return NextResponse.json({
      success: true,
      product: toAdminProductRecord(product, {
        isCustom: isCustomProductId(id),
        base: base ?? product,
        hasOverride: base ? !!overrides[id] : false,
      }),
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 });
  }
}