import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { isFeatureEnabled } from '@/lib/featureTypes';
import { isCustomProductId } from '@/lib/customProducts';
import {
  flowerMetadataToProductFields,
  isFlowerProductCategory,
} from '@/lib/flowerStrainResearch';
import { generateProductDescriptionWithGrok } from '@/lib/grokProductDescription';
import {
  readProductOverrides,
  toAdminProductRecord,
  updateProduct,
} from '@/lib/productCatalog';
import { products as baseProducts } from '@/lib/products';
import { getSiteContent } from '@/lib/siteContent';
import { isXaiConfigured } from '@/lib/xai';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isXaiConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Grok is not configured. Add XAI_API_KEY on the server.' },
      { status: 503 }
    );
  }

  const siteContent = await getSiteContent();
  if (!isFeatureEnabled(siteContent.features, 'grokAssistant')) {
    return NextResponse.json(
      { success: false, error: 'Enable Grok assistant in Admin → Features first.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const productId = typeof body.productId === 'string' ? body.productId : '';
    const name = typeof body.name === 'string' ? body.name : '';
    const category = typeof body.category === 'string' ? body.category : '';
    const price = Number(body.price);

    if (!productId || !name || !category || Number.isNaN(price)) {
      return NextResponse.json({ success: false, error: 'Invalid product data' }, { status: 400 });
    }

    const media = Array.isArray(body.media)
      ? body.media.filter((value: unknown): value is { type: 'image' | 'video'; url: string } => {
          if (!value || typeof value !== 'object') return false;
          const item = value as { type?: unknown; url?: unknown };
          return (
            (item.type === 'image' || item.type === 'video') && typeof item.url === 'string'
          );
        })
      : undefined;

    const result = await generateProductDescriptionWithGrok({
      productId,
      name,
      category,
      subcategory: typeof body.subcategory === 'string' ? body.subcategory : undefined,
      merchSubcategory: typeof body.merchSubcategory === 'string' ? body.merchSubcategory : undefined,
      price,
      image: typeof body.image === 'string' ? body.image : undefined,
      media,
      existingDescription: typeof body.existingDescription === 'string' ? body.existingDescription : undefined,
      tone: body.tone,
    });

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    let savedProduct:
      | ReturnType<typeof toAdminProductRecord>
      | undefined;

    if (isFlowerProductCategory(category) && result.suggestedFlowerMetadata) {
      const meta = flowerMetadataToProductFields(result.suggestedFlowerMetadata);
      const product = await updateProduct(productId, {
        description: result.description,
        strainType: meta.strainType,
        tier: meta.tier,
        effects: meta.effects,
        subcategory: meta.subcategory,
        ...(result.suggestedName?.trim() ? { name: result.suggestedName.trim() } : {}),
        ...(result.suggestedOptionGroups?.length
          ? { optionGroups: result.suggestedOptionGroups }
          : {}),
      });

      if (product) {
        const base = baseProducts.find((item) => item.id === productId);
        const overrides = base ? await readProductOverrides() : {};
        savedProduct = toAdminProductRecord(product, {
          isCustom: isCustomProductId(productId),
          base: base ?? product,
          hasOverride: base ? !!overrides[productId] : false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      description: result.description,
      suggestedName: result.suggestedName,
      suggestedOptionGroups: result.suggestedOptionGroups,
      suggestedFlowerMetadata: result.suggestedFlowerMetadata,
      insights: result.insights,
      product: savedProduct,
      autoSaved: Boolean(savedProduct),
    });
  } catch (error) {
    console.error('Grok product description error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate description' }, { status: 500 });
  }
}