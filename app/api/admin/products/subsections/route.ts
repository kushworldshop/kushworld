import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getSiteContent, updateSiteContent } from '@/lib/siteContent';
import { addSubsectionForProductCategory } from '@/lib/shopNavigation';

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const productCategory = String(body.productCategory || '').trim();
    const label = String(body.label || '').trim();

    if (!productCategory) {
      return NextResponse.json({ success: false, error: 'Product category required' }, { status: 400 });
    }
    if (!label) {
      return NextResponse.json({ success: false, error: 'Sub-section name required' }, { status: 400 });
    }

    const content = await getSiteContent();
    const result = addSubsectionForProductCategory(content.shopNavigation, productCategory, label);
    if (!result) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    let shopNavigation = content.shopNavigation;
    if (result.created) {
      const updated = await updateSiteContent({
        shopNavigation: result.navigation,
      });
      shopNavigation = updated.shopNavigation;
    }

    return NextResponse.json({
      success: true,
      subsection: result.subsection,
      created: result.created,
      shopNavigation,
      message: result.created ? `Created sub-section "${result.subsection.label}"` : 'Sub-section already exists',
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to create sub-section' }, { status: 500 });
  }
}