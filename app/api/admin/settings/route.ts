import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { getSettings, updateSettings } from '@/lib/settings';

export async function GET(request: NextRequest) {
  const password = request.headers.get('x-admin-password');
  if (!isAdminAuthorized(password)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getSettings();
  return NextResponse.json({ success: true, settings });
}

export async function PATCH(request: NextRequest) {
  const password = request.headers.get('x-admin-password');
  if (!isAdminAuthorized(password)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const settings = await updateSettings({
      referrerCommissionPercent: body.referrerCommissionPercent,
      referrerRewardPoints: body.referrerRewardPoints,
      promoCustomerDiscount: body.promoCustomerDiscount,
      promoFirstOrderOnly: body.promoFirstOrderOnly,
      promoMinOrder: body.promoMinOrder,
    });
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}