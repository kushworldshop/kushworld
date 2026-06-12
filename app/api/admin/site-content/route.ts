import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getSiteContent, updateSiteContent } from '@/lib/siteContent';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const content = await getSiteContent();
  return NextResponse.json({ success: true, content });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const content = await updateSiteContent(body);
    return NextResponse.json({ success: true, content });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update site content' }, { status: 500 });
  }
}