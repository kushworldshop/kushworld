import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { listFreeEighthRecipients } from '@/lib/firstOrderBonusServer';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? '';
  const recipients = await listFreeEighthRecipients();
  const filtered = q
    ? recipients.filter(
        (entry) =>
          entry.email.toLowerCase().includes(q) ||
          (entry.name || '').toLowerCase().includes(q) ||
          entry.orderId.toLowerCase().includes(q)
      )
    : recipients;

  return NextResponse.json({
    success: true,
    recipients: filtered,
    total: filtered.length,
  });
}