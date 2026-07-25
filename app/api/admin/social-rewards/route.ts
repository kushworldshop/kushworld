import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import {
  listAllSubmissions,
  reviewSocialReward,
  type SocialRewardStatus,
} from '@/lib/socialRewards';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const statusParam = request.nextUrl.searchParams.get('status') || 'all';
    const status =
      statusParam === 'pending' || statusParam === 'approved' || statusParam === 'rejected'
        ? (statusParam as SocialRewardStatus)
        : 'all';
    const limit = Number(request.nextUrl.searchParams.get('limit') || 200);
    const data = await listAllSubmissions({ status, limit });
    return NextResponse.json({ success: true, ...data });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load social rewards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const submissionId = typeof body.submissionId === 'string' ? body.submissionId : '';
    const action = body.action === 'approve' || body.action === 'reject' ? body.action : null;
    const rejectReason = typeof body.rejectReason === 'string' ? body.rejectReason : undefined;

    if (!submissionId || !action) {
      return NextResponse.json(
        { success: false, error: 'submissionId and action (approve|reject) are required' },
        { status: 400 }
      );
    }

    const result = await reviewSocialReward({ submissionId, action, rejectReason });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const list = await listAllSubmissions({ status: 'all', limit: 200 });
    return NextResponse.json({
      success: true,
      submission: result.submission,
      ...list,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Review failed' }, { status: 500 });
  }
}