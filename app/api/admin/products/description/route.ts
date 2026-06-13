import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { isFeatureEnabled } from '@/lib/featureTypes';
import { generateProductDescriptionWithGrok } from '@/lib/grokProductDescription';
import { getSiteContent } from '@/lib/siteContent';
import { isXaiConfigured } from '@/lib/xai';

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

    const result = await generateProductDescriptionWithGrok({
      productId,
      name,
      category,
      subcategory: typeof body.subcategory === 'string' ? body.subcategory : undefined,
      merchSubcategory: typeof body.merchSubcategory === 'string' ? body.merchSubcategory : undefined,
      price,
      existingDescription: typeof body.existingDescription === 'string' ? body.existingDescription : undefined,
    });

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, description: result.description });
  } catch (error) {
    console.error('Grok product description error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate description' }, { status: 500 });
  }
}