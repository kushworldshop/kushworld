import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { importProductFiles } from '@/lib/productBulkImport';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const category = String(formData.get('category') || 'flower').trim() || 'flower';
    const defaultPrice = Math.max(0, Number(formData.get('defaultPrice') || 700));

    const files = formData
      .getAll('images')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'Add at least one image file' }, { status: 400 });
    }

    const { groups, results } = await importProductFiles(files, { category, defaultPrice });
    const created = results.filter((result) => result.status === 'created').length;
    const skipped = results.filter((result) => result.status === 'skipped').length;
    const failed = results.filter((result) => result.status === 'error').length;

    return NextResponse.json({
      success: true,
      groups,
      created,
      skipped,
      failed,
      results,
      message: `Imported ${created} product${created === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}${failed ? `, failed ${failed}` : ''}`,
    });
  } catch (error) {
    console.error('Product bulk import error:', error);
    return NextResponse.json({ success: false, error: 'Failed to import products' }, { status: 500 });
  }
}