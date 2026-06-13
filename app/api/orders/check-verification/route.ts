import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getUserById } from '@/lib/users';
import { isCustomerVerified } from '@/lib/verification';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user || user.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const verified = await isCustomerVerified(email);
  return NextResponse.json({
    success: true,
    verified,
    requiresUpload: !verified,
  });
}